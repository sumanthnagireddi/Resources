import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';

import { Marked, Renderer } from 'marked';

// ── Language registration ──────────────────────────────────────────────────────
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('java', plaintext);

// ── Display labels ─────────────────────────────────────────────────────────────
const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  json: 'JSON',
  bash: 'Bash',
  shell: 'Shell',
  sh: 'Shell',
  python: 'Python',
  sql: 'SQL',
  markdown: 'Markdown',
  plaintext: 'Text',
};

// ── Language accent dot (Tailwind bg class) ────────────────────────────────────
const LANGUAGE_DOT: Record<string, string> = {
  javascript: 'bg-yellow-400',
  typescript: 'bg-blue-400',
  html:       'bg-orange-400',
  xml:        'bg-orange-300',
  css:        'bg-sky-400',
  json:       'bg-emerald-400',
  bash:       'bg-violet-400',
  shell:      'bg-violet-400',
  sh:         'bg-violet-400',
  python:     'bg-cyan-400',
  sql:        'bg-rose-400',
  markdown:   'bg-slate-400',
  plaintext:  'bg-gray-400',
  java:       'bg-green-400',
};

// ── hljs token colors: dark  (One Dark Pro  ×  VS2015) ───────────────────────
const DARK_TOKENS = `
  /* Base */
  .hljs                                         { background:transparent!important; color:#dcdcdc }

  /* Keywords — VS2015 blue-violet  */
  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-built_in,
  .hljs-name,
  .hljs-tag                                     { color:#569cd6 }

  /* Strings — One Dark green */
  .hljs-string,
  .hljs-symbol,
  .hljs-bullet,
  .hljs-addition                                { color:#98c379 }

  /* Attributes / JSON keys — One Dark red */
  .hljs-attr                                    { color:#e06c75 }

  /* Numbers & literals — VS2015 light-green */
  .hljs-number,
  .hljs-literal                                 { color:#b5cea8 }

  /* Functions / method names — VS2015 yellow */
  .hljs-title,
  .hljs-title.class_,
  .hljs-title.function_,
  .hljs-function > .hljs-title                  { color:#dcdcaa }

  /* Types / class names — VS2015 teal */
  .hljs-type,
  .hljs-class .hljs-title                       { color:#4ec9b0 }

  /* Variables / params — One Dark red */
  .hljs-variable,
  .hljs-template-variable,
  .hljs-params                                  { color:#e06c75 }

  /* Comments — VS2015 olive-green italic */
  .hljs-comment,
  .hljs-quote,
  .hljs-deletion,
  .hljs-meta                                    { color:#6a9955; font-style:italic }

  /* Operators / punctuation — VS2015 light-grey */
  .hljs-operator,
  .hljs-punctuation                             { color:#d4d4d4 }

  /* Regexp — One Dark cyan */
  .hljs-regexp                                  { color:#56b6c2 }

  /* HTML/XML attributes — VS2015 light-blue */
  .hljs-attribute                               { color:#9cdcfe }

  /* Selectors — VS2015 teal / yellow */
  .hljs-selector-id                             { color:#4ec9b0 }
  .hljs-selector-class                          { color:#dcdcaa }

  /* Markdown sections */
  .hljs-section                                 { color:#569cd6; font-weight:bold }

  /* Template expressions / subst */
  .hljs-variable.language_,
  .hljs-subst                                   { color:#e06c75 }
`;

// ── hljs token colors: light  (GitHub Light  ×  VS) ──────────────────────────
const LIGHT_TOKENS = `
  /* Base */
  .hljs                                         { background:transparent!important; color:#000000 }

  /* Keywords — VS blue */
  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-built_in,
  .hljs-name,
  .hljs-tag                                     { color:#0000ff }

  /* Strings — VS red-brown */
  .hljs-string,
  .hljs-symbol,
  .hljs-bullet,
  .hljs-addition                                { color:#a31515 }

  /* Attributes / JSON keys — GitHub purple */
  .hljs-attr                                    { color:#6f42c1 }

  /* Numbers & literals — VS dark-red */
  .hljs-number,
  .hljs-literal                                 { color:#098658 }

  /* Functions / method names — VS dark-violet */
  .hljs-title,
  .hljs-title.class_,
  .hljs-title.function_,
  .hljs-function > .hljs-title                  { color:#795e26 }

  /* Types / class names — VS teal */
  .hljs-type,
  .hljs-class .hljs-title                       { color:#267f99 }

  /* Variables / params — VS dark text */
  .hljs-variable,
  .hljs-template-variable,
  .hljs-params                                  { color:#001080 }

  /* Comments — VS green italic */
  .hljs-comment,
  .hljs-quote,
  .hljs-deletion,
  .hljs-meta                                    { color:#008000; font-style:italic }

  /* Operators / punctuation — plain black */
  .hljs-operator,
  .hljs-punctuation                             { color:#000000 }

  /* Regexp — VS dark-blue */
  .hljs-regexp                                  { color:#811f3f }

  /* HTML/XML attributes — VS dark-red */
  .hljs-attribute                               { color:#ff0000 }

  /* Selectors */
  .hljs-selector-id                             { color:#267f99 }
  .hljs-selector-class                          { color:#795e26 }

  /* Markdown sections */
  .hljs-section                                 { color:#0000ff; font-weight:bold }

  /* Template expressions / subst */
  .hljs-variable.language_,
  .hljs-subst                                   { color:#001080 }
`;

// ── Copy-button state CSS (data-attribute driven, zero JS class toggles) ────────
const COPY_STATE_CSS = `
  .ai-copy-btn[data-copied] .ai-icon-copy  { display:none }
  .ai-copy-btn[data-copied] .ai-icon-check { display:block }
  .ai-copy-btn[data-copied] .ai-copy-text  { display:none }
  .ai-copy-btn[data-copied]::after         { content:'Copied!'; font-size:11px; font-weight:500 }
`;

export type MarkdownTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class AiMarkdownService {
  private static readonly TOKEN_STYLE_ID    = 'ai-md-tokens';
  private static readonly COPY_STYLE_ID     = 'ai-md-copy';

  private readonly document = inject(DOCUMENT);
  private readonly parser: Marked;
  private currentTheme: MarkdownTheme = 'dark';

  constructor() {
    this.injectStyle(AiMarkdownService.TOKEN_STYLE_ID, DARK_TOKENS);
    this.injectStyle(AiMarkdownService.COPY_STYLE_ID, COPY_STATE_CSS);

    const renderer = new Renderer();

    // ── Code Block ────────────────────────────────────────────────────────────
    renderer.code = ({ text, lang }) => {
      const raw      = lang?.trim().toLowerCase() ?? '';
      const isValid  = raw && hljs.getLanguage(raw);
      const resolved = isValid ? raw : 'plaintext';
      const result   = hljs.highlight(text.trimEnd(), { language: resolved });
      const label    = LANGUAGE_LABELS[resolved] ?? (resolved.toUpperCase() || 'Text');
      const dot      = LANGUAGE_DOT[resolved] ?? 'bg-gray-400';

      return /* html */`
<div class="ai-code-block group my-5 overflow-hidden rounded-xl
            border border-zinc-200 bg-white
            dark:border-white/[0.08] dark:bg-[#0d0d0d]">

  <!-- Header -->
  <div class="flex items-center justify-between
              border-b border-zinc-200 bg-zinc-50 px-4 py-2
              dark:border-white/[0.07] dark:bg-[#1a1a1a]">

    <!-- Language pill -->
    <div class="flex items-center gap-2">
      <span class="inline-block h-[7px] w-[7px] rounded-full ${dot} shadow-sm"></span>
      <span class="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]
                   text-zinc-400 dark:text-zinc-500">
        ${label}
      </span>
    </div>

    <!-- Copy button -->
    <button
      type="button"
      aria-label="Copy code"
      onclick="(function(b){
        const code = b.closest('.ai-code-block').querySelector('code');
        navigator.clipboard.writeText(code.innerText).then(()=>{
          b.dataset.copied='1';
          setTimeout(()=>delete b.dataset.copied,2000);
        });
      })(this)"
      class="ai-copy-btn group/copy flex items-center gap-1.5 rounded-md px-2.5 py-1
             text-[11px] font-medium
             border border-transparent
             text-zinc-400 transition-all duration-150
             hover:border-zinc-200 hover:bg-white hover:text-zinc-700 hover:shadow-sm
             dark:text-zinc-500 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200
             data-[copied]:border-emerald-400/30 data-[copied]:text-emerald-500
             dark:data-[copied]:border-emerald-400/20 dark:data-[copied]:text-emerald-400">

      <!-- Copy icon -->
      <svg class="ai-icon-copy h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>

      <!-- Check icon (visible when data-copied set) -->
      <svg class="ai-icon-check hidden h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>

      <span class="ai-copy-text material-symbols-outlined">copy</span>
    </button>
  </div>

  <!-- Code body -->
  <div class="overflow-x-auto bg-white dark:bg-[#0d0d0d]">
    <pre class="m-0 px-5 py-4 text-left"
    ><code class="hljs language-${resolved} block font-mono text-[12.5px] leading-[1.8] tracking-normal"
    >${result.value}</code></pre>
  </div>
</div>`;
    };

    // ── Inline Code ───────────────────────────────────────────────────────────
    renderer.codespan = ({ text }) =>
      `<code class="rounded-md px-1.5 py-0.5 font-mono text-[0.83em] font-medium
                    bg-zinc-100 text-rose-600 ring-1 ring-inset ring-zinc-200/80
                    dark:bg-zinc-800/80 dark:text-rose-400 dark:ring-zinc-700/60">${text}</code>`;

    // ── Blockquote ────────────────────────────────────────────────────────────
    renderer.blockquote = ({ tokens }) => {
      const body = (this.parser as any)?.parser?.parse(tokens) ?? '';
      return `<blockquote class="my-4 rounded-r-lg border-l-[3px] border-zinc-300 bg-zinc-50/80
                                  py-3 pl-4 pr-3 text-[14.5px] italic text-zinc-500
                                  dark:border-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400">${body}</blockquote>`;
    };

    // ── Table ─────────────────────────────────────────────────────────────────
    renderer.table = (token: any) => {
      const ths = token.header
        .map((c: any) => `<th class="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold
                               uppercase tracking-wider text-zinc-500 dark:text-zinc-400">${c.text}</th>`)
        .join('');

      const rows = token.rows
        .map((row: any[]) => {
          const tds = row
            .map((c: any) => `<td class="px-4 py-2.5 text-[13.5px] leading-relaxed
                                         text-zinc-700 dark:text-zinc-300">${c.text}</td>`)
            .join('');
          return `<tr class="border-t border-zinc-100 transition-colors
                              hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">${tds}</tr>`;
        })
        .join('');

      return `<div class="my-5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700/60">
  <table class="w-full border-collapse">
    <thead class="bg-zinc-50 dark:bg-zinc-800/70"><tr>${ths}</tr></thead>
    <tbody class="bg-white dark:bg-zinc-900">${rows}</tbody>
  </table>
</div>`;
    };

    this.parser = new Marked({ gfm: true, breaks: true, renderer });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  render(markdown: string): string {
    if (!markdown?.trim()) return '';
    const rendered = this.parser.parse(markdown);
    return typeof rendered === 'string' ? this.decorateHtml(rendered) : '';
  }

  /**
   * Toggle code-token syntax colors between dark and light themes.
   * Call this whenever your app's theme changes.
   *
   * @example
   *   // In your theme service / toggle:
   *   this.markdownService.setTheme(isDark ? 'dark' : 'light');
   */
  setTheme(theme: MarkdownTheme): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.injectStyle(
      AiMarkdownService.TOKEN_STYLE_ID,
      theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS
    );
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Replace-or-insert a <style> tag by id */
  private injectStyle(id: string, css: string): void {
    if (!this.document?.head) return;
    this.document.getElementById(id)?.remove();
    const el = this.document.createElement('style');
    el.id = id;
    el.textContent = css;
    this.document.head.appendChild(el);
  }

  /** Post-process marked HTML output with Tailwind prose classes */
  private decorateHtml(html: string): string {
    return html
      // Paragraphs
      .replace(/<p>/g,
        '<p class="mb-4 break-words text-[15px] leading-7 text-zinc-700 dark:text-zinc-200">')

      // Headings
      .replace(/<h1>/g,
        '<h1 class="mb-4 mt-8 text-[1.5rem] font-bold tracking-tight text-zinc-900 dark:text-white">')
      .replace(/<h2>/g,
        '<h2 class="mb-3 mt-7 text-[1.25rem] font-semibold tracking-tight text-zinc-900 dark:text-white">')
      .replace(/<h3>/g,
        '<h3 class="mb-3 mt-6 text-[1.0625rem] font-semibold text-zinc-900 dark:text-white">')
      .replace(/<h4>/g,
        '<h4 class="mb-2 mt-5 text-[0.9375rem] font-semibold text-zinc-800 dark:text-zinc-100">')

      // Lists
      .replace(/<ul>/g,
        '<ul class="mb-4 list-disc space-y-1.5 pl-6 text-[15px] text-zinc-700 dark:text-zinc-200">')
      .replace(/<ol>/g,
        '<ol class="mb-4 list-decimal space-y-1.5 pl-6 text-[15px] text-zinc-700 dark:text-zinc-200">')
      .replace(/<li>/g,
        '<li class="leading-7 marker:text-zinc-400 dark:marker:text-zinc-500">')

      // Links
      .replace(/<a href=/g,
        '<a class="font-medium text-blue-600 underline underline-offset-2 decoration-blue-400/50 transition-colors hover:text-blue-700 hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer" href=')

      // HR
      .replace(/<hr>/g,
        '<hr class="my-6 border-0 border-t border-zinc-200 dark:border-zinc-700/60">')

      // Strong
      .replace(/<strong>/g,
        '<strong class="font-semibold text-zinc-900 dark:text-white">')

      // Em
      .replace(/<em>/g,
        '<em class="italic text-zinc-600 dark:text-zinc-300">');
  }
}