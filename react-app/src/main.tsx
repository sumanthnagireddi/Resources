import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  getThemeHtmlAttrs,
  SUBTREE_THEME_ATTRIBUTE,
  THEME_DATA_ATTRIBUTE,
  themeImportMap,
} from '@atlaskit/tokens';
import {
  App,
  type AppProps,
  type AtlasEditorAppearance,
  type AtlasEditorContentWidth,
  type AtlasEditorMode,
  type WidgetDocumentChangeDetail,
} from './App';
import tailwindStyles from 'virtual:react-tailwind';
import componentStyles from './styles.css?inline';

type MountOptions = AppProps;
type EditorContent = AppProps['content'];

const elementTagName = 'atlas-editor-angular';
const roots = new WeakMap<Node, Root>();
const localStyleId = 'interview-react-app-styles';
const styles = [tailwindStyles, componentStyles].join('\n');
const injectedCssRegistryKey = '__interviewReactCssRegistry';
const runtimeStyleSourceAttribute = 'data-interview-runtime-style-id';
const runtimeStyleCloneAttribute = 'data-interview-runtime-style-clone';
const runtimeStyleSelector = 'style[data-cmpld], style[data-emotion]';
const supportedAppearances = new Set<AtlasEditorAppearance>([
  'comment',
  'full-page',
  'full-width',
]);
const supportedContentWidths = new Set<AtlasEditorContentWidth>(['full-width', 'narrow']);
const supportedModes = new Set<AtlasEditorMode>(['edit', 'view']);
type AtlaskitColorMode = 'light' | 'dark';
type RegisteredCssEntry = {
  id: string;
  cssText: string;
};
type StyleRootTarget = Document | ShadowRoot;
const atlaskitThemeIds = ['light', 'dark', 'spacing', 'shape', 'typography', 'motion'] as const;
let themeSyncInitialized = false;
let themeObserver: MutationObserver | null = null;
let bodyThemeObserved = false;
let runtimeStyleObserver: MutationObserver | null = null;
let runtimeStyleSyncIntervalId: number | null = null;
let runtimeStyleSyncInitialized = false;
let runtimeStyleSourceCounter = 0;
const atlaskitThemeStylesByRoot = new WeakMap<StyleRootTarget, Promise<void>>();
const themeRoots = new Set<HTMLElement>();
const shadowStyleRoots = new Set<ShadowRoot>();

function getStyleContainer(styleRoot: StyleRootTarget): HTMLHeadElement | ShadowRoot {
  return styleRoot instanceof Document ? styleRoot.head : styleRoot;
}

function ensureStyleTag(
  styleRoot: StyleRootTarget,
  options: {
    cssText: string;
    id?: string;
    markerAttribute?: {
      name: string;
      value: string;
    };
  },
) {
  const container = getStyleContainer(styleRoot);
  const selector = options.id
    ? `style[id="${options.id}"]`
    : options.markerAttribute
      ? `style[${options.markerAttribute.name}="${options.markerAttribute.value}"]`
      : null;

  if (selector && container.querySelector(selector)) {
    return;
  }

  const style = document.createElement('style');

  if (options.id) {
    style.id = options.id;
  }

  if (options.markerAttribute) {
    style.setAttribute(options.markerAttribute.name, options.markerAttribute.value);
  }

  style.textContent = options.cssText;
  container.append(style);
}

function getRegisteredCssEntries(): RegisteredCssEntry[] {
  const registry = (globalThis as typeof globalThis & Record<string, unknown>)[
    injectedCssRegistryKey
  ];

  if (!Array.isArray(registry)) {
    return [];
  }

  return registry.filter(
    (entry): entry is RegisteredCssEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      'id' in entry &&
      'cssText' in entry &&
      typeof (entry as RegisteredCssEntry).id === 'string' &&
      typeof (entry as RegisteredCssEntry).cssText === 'string',
  );
}

function ensureRootStyles(styleRoot: StyleRootTarget) {
  getRegisteredCssEntries().forEach(({ id, cssText }) => {
    ensureStyleTag(styleRoot, {
      id,
      cssText,
    });
  });

  ensureStyleTag(styleRoot, {
    id: localStyleId,
    cssText: styles,
  });
}

function getStyleRoot(target: Node): StyleRootTarget {
  const rootNode = target.getRootNode();
  return rootNode instanceof ShadowRoot ? rootNode : document;
}

function isShadowStyleRoot(styleRoot: StyleRootTarget): styleRoot is ShadowRoot {
  return styleRoot instanceof ShadowRoot;
}

function getRuntimeStyleSourceId(styleElement: HTMLStyleElement): string {
  const existingId = styleElement.getAttribute(runtimeStyleSourceAttribute);

  if (existingId) {
    return existingId;
  }

  runtimeStyleSourceCounter += 1;
  const nextId = `runtime-style-${runtimeStyleSourceCounter}`;
  styleElement.setAttribute(runtimeStyleSourceAttribute, nextId);
  return nextId;
}

function readStyleText(styleElement: HTMLStyleElement): string {
  try {
    if (styleElement.sheet?.cssRules?.length) {
      return Array.from(styleElement.sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
    }
  } catch {
    // Some browser-managed sheets may not expose cssRules. Fall back to textContent.
  }

  return styleElement.textContent ?? '';
}

function syncRuntimeHeadStylesToRoot(styleRoot: StyleRootTarget) {
  if (!isShadowStyleRoot(styleRoot)) {
    return;
  }

  const sourceStyles = Array.from(
    document.head.querySelectorAll<HTMLStyleElement>(runtimeStyleSelector),
  );
  const activeIds = new Set<string>();
  const localStyleAnchor = styleRoot.querySelector<HTMLStyleElement>(
    `style[id="${localStyleId}"]`,
  );

  sourceStyles.forEach((sourceStyle) => {
    const sourceId = getRuntimeStyleSourceId(sourceStyle);
    activeIds.add(sourceId);

    let clone = styleRoot.querySelector<HTMLStyleElement>(
      `style[${runtimeStyleCloneAttribute}="${sourceId}"]`,
    );

    if (!clone) {
      clone = document.createElement('style');
      clone.setAttribute(runtimeStyleCloneAttribute, sourceId);

      Array.from(sourceStyle.attributes).forEach(({ name, value }) => {
        clone!.setAttribute(name, value);
      });

      clone.setAttribute(runtimeStyleCloneAttribute, sourceId);

      if (localStyleAnchor) {
        styleRoot.insertBefore(clone, localStyleAnchor);
      } else {
        styleRoot.append(clone);
      }
    }

    const nextCssText = readStyleText(sourceStyle);

    if (clone.textContent !== nextCssText) {
      clone.textContent = nextCssText;
    }
  });

  Array.from(
    styleRoot.querySelectorAll<HTMLStyleElement>(`style[${runtimeStyleCloneAttribute}]`),
  ).forEach((clone) => {
    const cloneId = clone.getAttribute(runtimeStyleCloneAttribute);

    if (!cloneId || activeIds.has(cloneId)) {
      return;
    }

    clone.remove();
  });
}

function syncAllShadowStyleRoots() {
  shadowStyleRoots.forEach((styleRoot) => {
    syncRuntimeHeadStylesToRoot(styleRoot);
  });
}

function stopRuntimeStyleSync() {
  if (runtimeStyleObserver) {
    runtimeStyleObserver.disconnect();
    runtimeStyleObserver = null;
  }

  if (runtimeStyleSyncIntervalId !== null) {
    window.clearInterval(runtimeStyleSyncIntervalId);
    runtimeStyleSyncIntervalId = null;
  }

  runtimeStyleSyncInitialized = false;
}

function ensureRuntimeStyleSync() {
  if (typeof document === 'undefined' || shadowStyleRoots.size === 0) {
    return;
  }

  syncAllShadowStyleRoots();

  if (runtimeStyleSyncInitialized || typeof MutationObserver === 'undefined') {
    return;
  }

  runtimeStyleObserver = new MutationObserver(() => {
    syncAllShadowStyleRoots();
  });

  runtimeStyleObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });

  runtimeStyleSyncIntervalId = window.setInterval(() => {
    syncAllShadowStyleRoots();
  }, 250);

  runtimeStyleSyncInitialized = true;
}

function isDarkModeEnabled() {
  return (
    document.documentElement.classList.contains('dark') ||
    document.body?.classList.contains('dark') ||
    false
  );
}

function ensureAtlaskitThemeStyles(styleRoot: StyleRootTarget) {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  const existingPromise = atlaskitThemeStylesByRoot.get(styleRoot);

  if (existingPromise) {
    return existingPromise;
  }

  const themeStylesPromise = Promise.all(
    atlaskitThemeIds.map(async (themeId) => {
      if (getStyleContainer(styleRoot).querySelector(`style[${THEME_DATA_ATTRIBUTE}="${themeId}"]`)) {
        return;
      }

      const { default: themeCss } = await themeImportMap[themeId]();
      ensureStyleTag(styleRoot, {
        cssText: themeCss,
        markerAttribute: {
          name: THEME_DATA_ATTRIBUTE,
          value: themeId,
        },
      });
    }),
  )
    .then(() => undefined)
    .catch((error) => {
      atlaskitThemeStylesByRoot.delete(styleRoot);
      throw error;
    });

  atlaskitThemeStylesByRoot.set(styleRoot, themeStylesPromise);

  return themeStylesPromise;
}

function syncAtlaskitThemeAttributes(root: HTMLElement) {
  const isDark = isDarkModeEnabled();
  const colorMode: AtlaskitColorMode = isDark ? 'dark' : 'light';
  const attrs = getThemeHtmlAttrs({
    colorMode,
    dark: 'dark',
    light: 'light',
    motion: 'motion',
    shape: 'shape',
    spacing: 'spacing',
    typography: 'typography',
  });

  root.setAttribute(SUBTREE_THEME_ATTRIBUTE, '');

  for (const [name, value] of Object.entries(attrs)) {
    root.setAttribute(name, String(value));
  }

  root.style.colorScheme = colorMode;
}

function syncAllThemeRoots() {
  themeRoots.forEach((root) => {
    syncAtlaskitThemeAttributes(root);
  });
}

function registerThemeRoot(
  root: HTMLElement,
  styleRoot: StyleRootTarget = getStyleRoot(root),
) {
  themeRoots.add(root);
  syncAtlaskitThemeAttributes(root);
  ensureRootStyles(styleRoot);
  if (isShadowStyleRoot(styleRoot)) {
    shadowStyleRoots.add(styleRoot);
    ensureRuntimeStyleSync();
  }
  syncRuntimeHeadStylesToRoot(styleRoot);
  void ensureAtlaskitThemeStyles(styleRoot);
  ensureAtlaskitThemeSync();
}

function unregisterThemeRoot(root: HTMLElement) {
  themeRoots.delete(root);
  const styleRoot = getStyleRoot(root);

  if (isShadowStyleRoot(styleRoot)) {
    shadowStyleRoots.delete(styleRoot);

    if (shadowStyleRoots.size === 0) {
      stopRuntimeStyleSync();
    }
  }
}

function observeBodyThemeChanges(observer: MutationObserver) {
  if (bodyThemeObserved || !document.body) {
    return;
  }

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });
  bodyThemeObserved = true;
}

function ensureAtlaskitThemeSync() {
  if (typeof document === 'undefined') {
    return;
  }

  syncAllThemeRoots();

  if (themeSyncInitialized || typeof MutationObserver === 'undefined') {
    return;
  }

  themeObserver = new MutationObserver(() => {
    syncAllThemeRoots();

    if (themeObserver) {
      observeBodyThemeChanges(themeObserver);
    }
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  observeBodyThemeChanges(themeObserver);
  themeSyncInitialized = true;
}

function renderApp(target: Element, options: MountOptions = {}) {
  let root = roots.get(target);

  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<App {...options} />);
}

function mount(target: Element | string, options: MountOptions = {}) {
  const element =
    typeof target === 'string' ? document.querySelector(target) : target;

  if (!element) {
    throw new Error('React mount target was not found.');
  }

  if (element instanceof HTMLElement) {
    registerThemeRoot(element, getStyleRoot(element));
  }

  renderApp(element, options);
}

function unmount(target: Element | string) {
  const element =
    typeof target === 'string' ? document.querySelector(target) : target;

  if (!element) {
    return;
  }

  if (element instanceof HTMLElement) {
    unregisterThemeRoot(element);
  }

  roots.get(element)?.unmount();
  roots.delete(element);
}

class InterviewReactWidgetElement extends HTMLElement {
  static get observedAttributes() {
    return ['appearance', 'content-width', 'description', 'heading', 'mode', 'placeholder', 'width'];
  }

  private readonly widgetShadowRoot: ShadowRoot;
  private readonly mountPoint: HTMLDivElement;
  private contentValue?: AppProps['content'];
  private minHeightValue?: number;

  constructor() {
    super();
    this.widgetShadowRoot = this.attachShadow({ mode: 'open' });
    this.mountPoint = document.createElement('div');
    this.mountPoint.dataset.reactWidgetMount = 'true';
    this.widgetShadowRoot.append(this.mountPoint);
  }

  connectedCallback() {
    registerThemeRoot(this.mountPoint, this.widgetShadowRoot);

    this.upgradeProperty('appearance');
    this.upgradeProperty('contentWidth');
    this.upgradeProperty('content');
    this.upgradeProperty('description');
    this.upgradeProperty('heading');
    this.upgradeProperty('minHeight');
    this.upgradeProperty('mode');
    this.upgradeProperty('placeholder');
    this.upgradeProperty('width');
    this.renderElement();
  }

  disconnectedCallback() {
    unregisterThemeRoot(this.mountPoint);
    roots.get(this.mountPoint)?.unmount();
    roots.delete(this.mountPoint);
  }

  attributeChangedCallback() {
    this.renderElement();
  }

  get appearance(): AtlasEditorAppearance | undefined {
    const value = this.getAttribute('appearance');

    return isAppearance(value) ? value : undefined;
  }

  set appearance(value: AtlasEditorAppearance | null | undefined) {
    this.setStringAttribute('appearance', value);
  }

  get contentWidth(): AtlasEditorContentWidth | undefined {
    const value = this.getAttribute('content-width') ?? this.getAttribute('width');

    return isContentWidth(value) ? value : undefined;
  }

  set contentWidth(value: AtlasEditorContentWidth | null | undefined) {
    this.setStringAttribute('content-width', value);
  }

  get content() {
    return this.contentValue;
  }

  set content(value: EditorContent | null | undefined) {
    const parsedContent = parseEditorContent(value);

    if (this.contentValue === parsedContent) {
      return;
    }

    this.contentValue = parsedContent;
    this.renderElement();
  }

  get description() {
    return this.getAttribute('description') ?? undefined;
  }

  set description(value: string | null | undefined) {
    this.setStringAttribute('description', value);
  }

  get heading() {
    return this.getAttribute('heading') ?? undefined;
  }

  set heading(value: string | null | undefined) {
    this.setStringAttribute('heading', value);
  }

  get minHeight() {
    return this.minHeightValue;
  }

  set minHeight(value: number | null | undefined) {
    const nextValue =
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;

    if (this.minHeightValue === nextValue) {
      return;
    }

    this.minHeightValue = nextValue;
    this.renderElement();
  }

  get mode(): AtlasEditorMode | undefined {
    const value = this.getAttribute('mode');

    return isMode(value) ? value : undefined;
  }

  set mode(value: AtlasEditorMode | null | undefined) {
    this.setStringAttribute('mode', value);
  }

  get placeholder() {
    return this.getAttribute('placeholder') ?? undefined;
  }

  set placeholder(value: string | null | undefined) {
    this.setStringAttribute('placeholder', value);
  }

  get width(): AtlasEditorContentWidth | undefined {
    const value = this.getAttribute('width') ?? this.getAttribute('content-width');

    return isContentWidth(value) ? value : undefined;
  }

  set width(value: AtlasEditorContentWidth | null | undefined) {
    this.setStringAttribute('width', value);
  }

  private upgradeProperty(
    propertyName:
      | 'appearance'
      | 'contentWidth'
      | 'content'
      | 'description'
      | 'heading'
      | 'minHeight'
      | 'mode'
      | 'placeholder'
      | 'width',
  ) {
    if (!Object.prototype.hasOwnProperty.call(this, propertyName)) {
      return;
    }

    const value = (this as InterviewReactWidgetElement & Record<string, unknown>)[propertyName];
    delete (this as InterviewReactWidgetElement & Record<string, unknown>)[propertyName];
    (this as InterviewReactWidgetElement & Record<string, unknown>)[propertyName] = value;
  }

  private setStringAttribute(
    name:
      | 'appearance'
      | 'content-width'
      | 'description'
      | 'heading'
      | 'mode'
      | 'placeholder'
      | 'width',
    value: string | null | undefined,
  ) {
    if (!value) {
      this.removeAttribute(name);
      return;
    }

    if (this.getAttribute(name) === value) {
      return;
    }

    this.setAttribute(name, value);
  }

  private renderElement() {
    renderApp(this.mountPoint, {
      appearance: this.appearance,
      contentWidth: this.contentWidth,
      content: this.contentValue,
      description:
        this.description ?? 'Draft notes, documentation, and structured content.',
      heading: this.heading ?? 'Atlaskit Editor',
      minHeight: this.minHeightValue ?? 360,
      mode: this.mode ?? 'edit',
      onDocumentChange: (detail: WidgetDocumentChangeDetail) => {
        this.dispatchEvent(
          new CustomEvent<WidgetDocumentChangeDetail>('editordocumentchange', {
            detail,
            bubbles: true,
            composed: true,
          }),
        );
      },
      placeholder: this.placeholder ?? 'Start writing here...',
    });
  }
}

function defineCustomElement() {
  if (!customElements.get(elementTagName)) {
    customElements.define(elementTagName, InterviewReactWidgetElement);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'atlas-editor-angular': InterviewReactWidgetElement;
  }

  interface Window {
    InterviewReactApp?: {
      mount: typeof mount;
      unmount: typeof unmount;
      defineCustomElement: typeof defineCustomElement;
      tagName: typeof elementTagName;
    };
  }
}

defineCustomElement();

window.InterviewReactApp = {
  mount,
  unmount,
  defineCustomElement,
  tagName: elementTagName,
};

document.querySelectorAll('[data-react-app-root]').forEach((element) => {
  mount(element);
});

function isAppearance(value: string | null): value is AtlasEditorAppearance {
  return value !== null && supportedAppearances.has(value as AtlasEditorAppearance);
}

function isContentWidth(value: string | null): value is AtlasEditorContentWidth {
  return value !== null && supportedContentWidths.has(value as AtlasEditorContentWidth);
}

function isMode(value: string | null): value is AtlasEditorMode {
  return value !== null && supportedModes.has(value as AtlasEditorMode);
}

function isDocumentNode(value: unknown): value is AppProps['content'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type?: unknown }).type === 'doc'
  );
}

function parseEditorContent(
  value: EditorContent | null | undefined,
): AppProps['content'] | undefined {
  if (!value) {
    return undefined;
  }

  if (isDocumentNode(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return isDocumentNode(parsed) ? parsed : value;
  } catch {
    return value;
  }
}
