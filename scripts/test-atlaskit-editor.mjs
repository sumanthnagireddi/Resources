import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const remoteDebuggingPort = Number(process.env.EDITOR_SMOKE_PORT || '9223');
const requestedUrl =
  process.argv.find((arg) => arg.startsWith('--url='))?.slice('--url='.length) ||
  null;
const screenshotPath = resolve(
  process.argv.find((arg) => arg.startsWith('--screenshot='))?.slice('--screenshot='.length) ||
    'artifacts/editor-smoke.png',
);
const assetsRoot = resolve('src/assets');
const editorContext = [
  "const host = document.getElementById('smoke-editor');",
  'const root = host?.shadowRoot;',
  'const editor = root?.querySelector(\'.ProseMirror[contenteditable="true"]\');',
].join('\n');

class CDPClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);

    await new Promise((resolvePromise, rejectPromise) => {
      this.socket.once('open', () => resolvePromise());
      this.socket.once('error', rejectPromise);
    });

    this.socket.on('message', (payload) => {
      const message = JSON.parse(payload.toString());

      if (message.id) {
        const pendingRequest = this.pending.get(message.id);

        if (!pendingRequest) {
          return;
        }

        this.pending.delete(message.id);

        if (message.error) {
          pendingRequest.reject(new Error(message.error.message));
          return;
        }

        pendingRequest.resolve(message.result);
        return;
      }

      const listeners = this.eventListeners.get(message.method) || [];

      for (const listener of listeners) {
        listener(message.params);
      }
    });
  }

  async send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });

    const response = new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, {
        resolve: resolvePromise,
        reject: rejectPromise,
      });
    });

    this.socket.send(payload);
    return response;
  }

  on(method, listener) {
    const listeners = this.eventListeners.get(method) || [];
    listeners.push(listener);
    this.eventListeners.set(method, listeners);
  }

  async close() {
    if (!this.socket) {
      return;
    }

    this.socket.close();
    await delay(100);
  }
}

async function fetchJson(url, timeoutMs = 1000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForDevTools(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`, 800);
      const pageTarget = targets.find((target) => target.type === 'page');

      if (pageTarget?.webSocketDebuggerUrl) {
        return pageTarget;
      }
    } catch {
      await delay(250);
    }
  }

  throw new Error(`Timed out waiting for Chrome DevTools on port ${port}.`);
}

async function waitForExpression(client, expression, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await evaluate(client, expression);

    if (value) {
      return value;
    }

    await delay(200);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });

  return result.result?.value;
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url });
  await waitForExpression(client, 'document.readyState === "complete"', 'page load');
}

async function focusEditor(client) {
  const focused = await evaluate(
    client,
    `(() => {
      ${editorContext}
      if (!editor || !root || !host) {
        return false;
      }

      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      return root.activeElement === editor || document.activeElement === host;
    })()`,
  );

  if (!focused) {
    throw new Error('Unable to focus the ProseMirror editor.');
  }
}

async function insertText(client, text) {
  const inserted = await evaluate(
    client,
    `(() => {
      ${editorContext}
      if (!editor) {
        return false;
      }

      editor.focus();

      try {
        if (document.execCommand?.('insertText', false, ${JSON.stringify(text)})) {
          return true;
        }
      } catch {
        // Fall through to the CDP-level text insertion below.
      }

      return false;
    })()`,
  );

  if (inserted) {
    return;
  }

  await client.send('Input.insertText', { text });
}

async function pressEnter(client) {
  const insertedParagraph = await evaluate(
    client,
    `(() => {
      ${editorContext}
      if (!editor) {
        return false;
      }

      editor.focus();

      try {
        if (document.execCommand?.('insertParagraph')) {
          return true;
        }
      } catch {
        // Fall through to keyboard events below.
      }

      return false;
    })()`,
  );

  if (insertedParagraph) {
    return;
  }

  const shared = {
    code: 'Enter',
    key: 'Enter',
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  };

  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    text: '\r',
    unmodifiedText: '\r',
    ...shared,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    ...shared,
  });
}

async function clickCommandItem(client, labels) {
  const clicked = await evaluate(
    client,
    `(() => {
      ${editorContext}
      if (!root) {
        return false;
      }

      const labels = ${JSON.stringify(labels)};
      const items = Array.from(
        root.querySelectorAll('[role="menuitem"], [role="option"], button, [data-testid]')
      );

      const match = items.find((element) => {
        const candidates = [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('data-testid'),
        ]
          .filter(Boolean)
          .map((value) => value.trim().toLowerCase());

        return labels.some((label) =>
          candidates.some((candidate) => candidate.includes(label.toLowerCase())),
        );
      });

      if (!match) {
        return false;
      }

      match.click();
      return true;
    })()`,
  );

  if (!clicked) {
    throw new Error(`Unable to find quick insert item matching: ${labels.join(', ')}`);
  }
}

async function dispatchSyntheticPaste(client, text) {
  const pasted = await evaluate(
    client,
    `(() => {
      ${editorContext}
      if (!editor) {
        return false;
      }

      editor.focus();

      try {
        const clipboard = new DataTransfer();
        clipboard.setData('text/plain', ${JSON.stringify(text)});
        const event = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, 'clipboardData', {
          value: clipboard,
        });

        editor.dispatchEvent(event);

        if (editor.innerText.includes(${JSON.stringify(text)})) {
          return true;
        }

        return document.execCommand?.('insertText', false, ${JSON.stringify(text)}) ?? false;
      } catch (error) {
        return false;
      }
    })()`,
  );

  return Boolean(pasted);
}

async function pasteFromClipboard(client, text, origin) {
  try {
    await client.send('Browser.grantPermissions', {
      origin,
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    });
  } catch {
    // Some page sockets do not expose Browser.grantPermissions.
  }

  const wroteClipboard = await evaluate(
    client,
    `navigator.clipboard?.writeText(${JSON.stringify(text)})
      .then(() => true)
      .catch(() => false)`,
  );

  if (!wroteClipboard) {
    return false;
  }

  const controlKey = {
    code: 'ControlLeft',
    key: 'Control',
    nativeVirtualKeyCode: 17,
    windowsVirtualKeyCode: 17,
  };
  const pasteKey = {
    code: 'KeyV',
    key: 'v',
    modifiers: 2,
    nativeVirtualKeyCode: 86,
    windowsVirtualKeyCode: 86,
  };

  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    modifiers: 2,
    ...controlKey,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    ...pasteKey,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    ...pasteKey,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    ...controlKey,
  });

  return true;
}

async function captureScreenshot(client, outputPath) {
  const result = await client.send('Page.captureScreenshot', {
    captureBeyondViewport: true,
    format: 'png',
    fromSurface: true,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(result.data, 'base64'));
}

async function hoverFirstBlock(client) {
  const point = await evaluate(
    client,
    `(() => {
      ${editorContext}
      if (!root) {
        return null;
      }

      const firstBlock =
        root.querySelector('.ProseMirror p') ||
        root.querySelector('.ProseMirror h1, .ProseMirror h2, .ProseMirror h3');

      if (!firstBlock) {
        return null;
      }

      const rect = firstBlock.getBoundingClientRect();

      return {
        x: Math.round(rect.left + Math.min(24, rect.width / 4)),
        y: Math.round(rect.top + rect.height / 2),
      };
    })()`,
  );

  if (!point) {
    throw new Error('Unable to locate a block to hover for drag-handle checks.');
  }

  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
  });

  await waitForExpression(
    client,
    `(() => {
      const handle = document
        .getElementById('smoke-editor')
        ?.shadowRoot?.querySelector('[data-testid="block-ctrl-drag-handle"]');

      if (!handle) {
        return false;
      }

      const rect = handle.getBoundingClientRect();
      const styles = getComputedStyle(handle);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        styles.visibility !== 'hidden' &&
        Number.parseFloat(styles.opacity || '1') > 0
      );
    })()`,
    'drag handle visibility',
  );
}

async function collectSnapshot(client) {
  return evaluate(
    client,
    `(() => {
      ${editorContext}
      const dragHandle = root?.querySelector('[data-testid="block-ctrl-drag-handle"]');
      const firstBlock =
        root?.querySelector('.ProseMirror p') ||
        root?.querySelector('.ProseMirror h1, .ProseMirror h2, .ProseMirror h3');
      const themeRoot = root?.querySelector('[data-subtree-theme][data-color-mode]');
      const toolbarLabels = Array.from(
        root?.querySelectorAll('[role="toolbar"] button') || []
      )
        .map((button) => button.getAttribute('aria-label') || button.textContent || '')
        .map((value) => value.trim())
        .filter(Boolean);

      return {
        adf: window.__editorSmoke?.lastChange?.adf ?? null,
        colorMode:
          themeRoot?.getAttribute('data-color-mode') ??
          (document.documentElement.classList.contains('dark') ? 'dark' : null),
        dragHandle:
          dragHandle && firstBlock
            ? {
                backgroundColor: getComputedStyle(dragHandle).backgroundColor,
                color: getComputedStyle(dragHandle).color,
                rect: dragHandle.getBoundingClientRect().toJSON(),
              }
            : null,
        editorWidth:
          document.querySelector('[data-atlas-editor-root]')?.getBoundingClientRect().width ?? 0,
        fullWidthMode: Boolean(root?.querySelector('.fabric-editor--full-width-mode')),
        firstBlockRect: firstBlock?.getBoundingClientRect().toJSON() ?? null,
        hasCodeBlock:
          Boolean(root?.querySelector('pre, code, [data-node-type="codeBlock"], [data-testid*="code"]')) ||
          JSON.stringify(window.__editorSmoke?.lastChange?.adf ?? {}).includes('"type":"codeBlock"') ||
          /console\\.log\\(/.test(editor?.innerText || ''),
        hasTable:
          Boolean(root?.querySelector('table')) ||
          JSON.stringify(window.__editorSmoke?.lastChange?.adf ?? {}).includes('"type":"table"'),
        rootRect: root?.querySelector('[data-atlas-editor-root]')?.getBoundingClientRect().toJSON() ?? null,
        parentWidth:
          document.getElementById('smoke-editor')?.parentElement?.getBoundingClientRect().width ?? 0,
        ready: window.__editorSmoke?.ready ?? false,
        text: editor?.innerText || '',
        toolbarLabels,
        viewerHasEditableSurface: Boolean(
          document
            .getElementById('smoke-viewer')
            ?.shadowRoot?.querySelector('.ProseMirror[contenteditable="true"]'),
        ),
        viewerMode:
          document
            .getElementById('smoke-viewer')
            ?.shadowRoot?.querySelector('[data-atlas-editor-mode]')
            ?.getAttribute('data-atlas-editor-mode') ?? null,
        viewerText:
          document
            .getElementById('smoke-viewer')
            ?.shadowRoot?.querySelector('[data-atlas-editor-root]')
            ?.textContent ?? '',
      };
    })()`,
  );
}

function getContentType(filePath) {
  switch (extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function startStaticServer(rootDir) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      const relativePath = pathname === '/' ? 'editor-smoke.html' : pathname.replace(/^\/+/, '');
      const filePath = resolve(rootDir, relativePath);

      if (!filePath.startsWith(rootDir)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const file = await readFile(filePath);
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Content-Type': getContentType(filePath),
      });
      response.end(file);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine the local smoke server address.');
  }

  return {
    close: () =>
      new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }

          resolvePromise();
        });
      }),
    url: `http://127.0.0.1:${address.port}/editor-smoke.html`,
  };
}

async function run() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'atlaskit-editor-smoke-'));
  const smokeServer = requestedUrl ? null : await startStaticServer(assetsRoot);
  const targetUrl = requestedUrl || smokeServer.url;
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${remoteDebuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1440,2200',
      'about:blank',
    ],
    {
      stdio: 'ignore',
    },
  );

  let client;

  try {
    const target = await waitForDevTools(remoteDebuggingPort);
    client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    await navigate(client, targetUrl);
    await waitForExpression(
      client,
      'Boolean(window.__editorSmoke?.ready)',
      'custom element readiness',
    );
    await waitForExpression(
      client,
      'Boolean(document.getElementById("smoke-editor")?.shadowRoot?.querySelector(".ProseMirror[contenteditable=\\"true\\"]"))',
      'editable ProseMirror surface',
    );

    await focusEditor(client);
    await insertText(client, 'Smoke paragraph from automation.');
    await pressEnter(client);

    const pasteText = 'Pasted line from automation.';
    const smokeOrigin = new URL(targetUrl).origin;
    let pasteMode = 'clipboard';
    let pasteWorked = await pasteFromClipboard(client, pasteText, smokeOrigin);

    if (!pasteWorked) {
      pasteMode = 'synthetic';
      pasteWorked = await dispatchSyntheticPaste(client, pasteText);
    }

    await waitForExpression(
      client,
      'document.getElementById("smoke-editor")?.shadowRoot?.querySelector(".ProseMirror")?.innerText.includes("Smoke paragraph from automation.")',
      'typed text to appear',
    );

    if (pasteWorked) {
      try {
        await waitForExpression(
          client,
          'document.getElementById("smoke-editor")?.shadowRoot?.querySelector(".ProseMirror")?.innerText.includes("Pasted line from automation.")',
          'pasted text to appear',
          8000,
        );
      } catch {
        pasteWorked = false;
      }
    }

    await pressEnter(client);
    await clickCommandItem(client, ['code block', 'code snippet']);
    await waitForExpression(
      client,
      `(() => {
        const root = document.getElementById("smoke-editor")?.shadowRoot;
        const adf = JSON.stringify(window.__editorSmoke?.lastChange?.adf ?? {});

        return (
          Boolean(root?.querySelector('pre, code, [data-node-type="codeBlock"], [data-testid*="code"]')) ||
          adf.includes('"type":"codeBlock"')
        );
      })()`,
      'code block insertion',
    );
    await insertText(client, "console.log('smoke test');");
    await pressEnter(client);
    await pressEnter(client);

    await clickCommandItem(client, ['table']);
    await waitForExpression(
      client,
      `(() => {
        const root = document.getElementById("smoke-editor")?.shadowRoot;
        const adf = JSON.stringify(window.__editorSmoke?.lastChange?.adf ?? {});

        return Boolean(root?.querySelector("table")) || adf.includes('"type":"table"');
      })()`,
      'table insertion',
    );
    await insertText(client, 'A1');
    await hoverFirstBlock(client);

    const snapshot = await collectSnapshot(client);
    await captureScreenshot(client, screenshotPath);

    const failures = [];

    if (!snapshot.ready) {
      failures.push('Smoke harness never reported ready.');
    }

    if (!snapshot.text.includes('Smoke paragraph from automation.')) {
      failures.push('Typed paragraph text was not found in the editor.');
    }

    if (!snapshot.hasCodeBlock) {
      failures.push('Code block was not detected after slash insert.');
    }

    if (!snapshot.hasTable) {
      failures.push('Table was not detected after slash insert.');
    }

    if (!snapshot.adf) {
      failures.push('The editor never emitted ADF through the custom event.');
    }

    if (!snapshot.fullWidthMode) {
      failures.push('The editable smoke widget did not enter full-width mode.');
    }

    if (!snapshot.dragHandle || !snapshot.firstBlockRect || !snapshot.rootRect) {
      failures.push('Drag handle metrics were not captured after hovering the first block.');
    } else {
      const handleLeftGap = snapshot.dragHandle.rect.x - snapshot.rootRect.x;

      if (handleLeftGap < 0) {
        failures.push(
          `Drag handle is clipped beyond the editor edge (${handleLeftGap.toFixed(1)}px).`,
        );
      }
    }

    if (snapshot.colorMode !== 'dark') {
      failures.push(`Expected dark mode, received ${snapshot.colorMode || 'none'}.`);
    }

    if (snapshot.editorWidth > snapshot.parentWidth + 2) {
      failures.push(
        `Editor exceeded its parent width (${snapshot.editorWidth}px > ${snapshot.parentWidth}px).`,
      );
    }

    if (snapshot.viewerMode !== 'view') {
      failures.push(`Expected view-mode widget, received ${snapshot.viewerMode || 'none'}.`);
    }

    if (snapshot.viewerHasEditableSurface) {
      failures.push('The view-mode widget still exposed an editable ProseMirror surface.');
    }

    if (!snapshot.viewerText.includes('Rendered in view mode')) {
      failures.push('The view-mode widget did not render its read-only content.');
    }

    console.log(`Smoke URL: ${targetUrl}`);
    console.log(`Screenshot: ${screenshotPath}`);
    console.log(`Toolbar buttons detected: ${snapshot.toolbarLabels.length}`);
    console.log(
      `Paste coverage: ${
        pasteWorked ? `yes (${pasteMode})` : 'warning: browser automation could not verify paste'
      }`,
    );

    if (failures.length) {
      console.error('\nSmoke test failures:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('\nAtlaskit editor smoke test passed.');
  } finally {
    await client?.close();
    chrome.kill('SIGTERM');
    await delay(1000);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    await smokeServer?.close().catch(() => {});
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
