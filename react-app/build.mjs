import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const projectRoot = resolve(__dirname, '..');
const outfile = resolve(__dirname, '../src/assets/my-react-app.bundle.js');
const watch = process.argv.includes('--watch');
const atlaskitEmojiUtilsShim = resolve(__dirname, 'src/shims/atlaskit-emoji-utils.ts');
const reactTailwindConfig = resolve(__dirname, 'tailwind.config.cjs');
const reactTailwindInput = resolve(__dirname, 'src/tailwind.css');
const atlaskitSingletonPackages = [
  /^@atlaskit\/adf-schema(?:\/.*)?$/,
  /^@atlaskit\/editor-prosemirror(?:\/.*)?$/,
  /^prosemirror-model$/,
];

function resolveFromProjectRoot(specifier) {
  return require.resolve(specifier, { paths: [projectRoot] });
}

function resolveImportPath(specifier, resolveDir) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return resolve(resolveDir, specifier);
  }

  return require.resolve(specifier, { paths: [resolveDir, projectRoot] });
}

function createInjectedCssModule(cssSource, filePath) {
  const styleId = `interview-react-css-${createHash('sha1')
    .update(filePath)
    .digest('hex')
    .slice(0, 12)}`;

  return `
const cssText = ${JSON.stringify(cssSource)};
const styleId = ${JSON.stringify(styleId)};
const registryKey = '__interviewReactCssRegistry';
const globalRegistry = globalThis;

if (!Array.isArray(globalRegistry[registryKey])) {
  globalRegistry[registryKey] = [];
}

const registry = globalRegistry[registryKey];

if (!registry.some((entry) => entry.id === styleId)) {
  registry.push({ id: styleId, cssText });
}

export default cssText;
`;
}

async function compileTailwindStyles() {
  const source = await readFile(reactTailwindInput, 'utf8');
  const result = await postcss([
    tailwindcss({
      config: reactTailwindConfig,
    }),
  ]).process(source, {
    from: reactTailwindInput,
  });

  return result.css;
}

const options = {
  entryPoints: [resolve(__dirname, 'src/main.tsx')],
  outfile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: !watch,
  sourcemap: watch,
  loader: {
    '.svg': 'dataurl',
    '.png': 'dataurl',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
    'process.env.REACT_SSR': 'undefined',
    'process.env.CI': 'false',
    'process.env.CLOUD_ENV': JSON.stringify('browser'),
  },
  logLevel: 'info',
  banner: {
    js: [
      '/* Generated from react-app/src. Do not edit this bundle directly. */',
      'var process = globalThis.process || { env: {}, versions: {} };',
      'globalThis.process = process;',
    ].join('\n'),
  },
  plugins: [
    {
      name: 'react-tailwind-virtual-module',
      setup(build) {
        let compiledTailwindCss = '';

        build.onStart(async () => {
          compiledTailwindCss = await compileTailwindStyles();
        });

        build.onResolve({ filter: /^virtual:react-tailwind$/ }, () => ({
          path: 'virtual:react-tailwind',
          namespace: 'react-tailwind',
        }));

        build.onLoad({ filter: /.*/, namespace: 'react-tailwind' }, async () => ({
          contents: compiledTailwindCss || (await compileTailwindStyles()),
          loader: 'text',
          watchFiles: [reactTailwindConfig, reactTailwindInput],
        }));
      },
    },
    {
      name: 'atlaskit-emoji-utils-shim',
      setup(build) {
        build.onResolve({ filter: /^@atlaskit\/emoji\/utils$/ }, () => ({
          path: atlaskitEmojiUtilsShim,
        }));
      },
    },
    {
      name: 'css-import-handling',
      setup(build) {
        build.onResolve({ filter: /\.css(?:\?inline)?$/ }, (args) => {
          const [specifier, query] = args.path.split('?');

          return {
            path: resolveImportPath(specifier, args.resolveDir),
            namespace: query === 'inline' ? 'css-inline' : 'css-inject',
          };
        });

        build.onLoad({ filter: /\.css$/, namespace: 'css-inline' }, async (args) => ({
          contents: await readFile(args.path, 'utf8'),
          loader: 'text',
          watchFiles: [args.path],
        }));

        build.onLoad({ filter: /\.css$/, namespace: 'css-inject' }, async (args) => {
          const cssSource = await readFile(args.path, 'utf8');

          return {
            contents: createInjectedCssModule(cssSource, args.path),
            loader: 'js',
            watchFiles: [args.path],
          };
        });
      },
    },
    {
      name: 'dedupe-atlaskit-singletons',
      setup(build) {
        for (const filter of atlaskitSingletonPackages) {
          build.onResolve({ filter }, (args) => ({
            path: resolveFromProjectRoot(args.path),
          }));
        }
      },
    },
  ],
};

await mkdir(dirname(outfile), { recursive: true });

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log(`Watching React app and writing ${outfile}`);
} else {
  await esbuild.build(options);
}
