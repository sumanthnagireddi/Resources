// @ts-nocheck
import React, { useCallback, useMemo } from 'react';
import { ComposableEditor } from '@atlaskit/editor-core/composable-editor';
import { useUniversalPreset } from '@atlaskit/editor-core/preset-universal';
import { createADFFromHTML } from '@atlaskit/editor-common/dist/esm/utils/create-adf-from-html';
import type { JSONDocNode } from '@atlaskit/editor-json-transformer';

export type AtlasEditorAppearance = 'comment' | 'full-page' | 'full-width';
export type AtlasEditorMode = 'edit' | 'view';
export type AtlasEditorContentWidth = 'full-width' | 'narrow';
export type AtlasEditorContent = JSONDocNode | string;

export type WidgetDocumentChangeDetail = {
  adf: JSONDocNode;
  serialized: string;
  timestamp: string;
};

export type AppProps = {
  heading?: string;
  description?: string;
  placeholder?: string;
  appearance?: AtlasEditorAppearance;
  contentWidth?: AtlasEditorContentWidth;
  content?: AtlasEditorContent;
  minHeight?: number;
  mode?: AtlasEditorMode;
  onDocumentChange?: (detail: WidgetDocumentChangeDetail) => void;
};

const defaultHeading = 'Atlaskit Editor';
const defaultPlaceholder = 'Start writing here...';
const defaultAppearance: AtlasEditorAppearance = 'full-width';
const defaultContentWidth: AtlasEditorContentWidth = 'full-width';
const defaultMinHeight = 520;
const defaultMode: AtlasEditorMode = 'edit';

function escapeHtmlText(content: string) {
  return content
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function normalizeStringContent(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) {
    return '<p></p>';
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return `<p>${escapeHtmlText(content)}</p>`;
}

function normalizeInitialContent(content?: AtlasEditorContent) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  return createADFFromHTML(normalizeStringContent(content));
}

function resolveContentWidth(
  appearance?: AtlasEditorAppearance,
  contentWidth?: AtlasEditorContentWidth,
): AtlasEditorContentWidth {
  if (contentWidth) {
    return contentWidth;
  }

  if (appearance === 'full-page') {
    return 'narrow';
  }

  return defaultContentWidth;
}

function resolveAppearance(
  appearance?: AtlasEditorAppearance,
  contentWidth?: AtlasEditorContentWidth,
): AtlasEditorAppearance {
  if (appearance === 'comment') {
    return 'comment';
  }

  if (contentWidth) {
    return contentWidth === 'narrow' ? 'full-page' : 'full-width';
  }

  return appearance ?? defaultAppearance;
}

function createEditorProps(
  appearance: AtlasEditorAppearance,
  placeholder: string,
  disabled: boolean,
) {
  const isDocumentEditor = appearance !== 'comment';

  return {
    appearance,
    allowBlockType: true,
    allowBreakout: isDocumentEditor,
    allowDate: true,
    allowExpand: isDocumentEditor
      ? {
          allowInsertion: true,
          allowInteractiveExpand: true,
        }
      : false,
    allowFindReplace: isDocumentEditor,
    allowHelpDialog: true,
    allowIndentation: isDocumentEditor,
    allowLayouts: isDocumentEditor,
    allowNestedTasks: true,
    allowPanel: true,
    allowRule: true,
    allowStatus: true,
    allowTables: isDocumentEditor
      ? {
          advanced: true,
          allowBackgroundColor: true,
          allowColumnResizing: true,
          allowControls: true,
          allowDistributeColumns: true,
          allowHeaderColumn: true,
          allowHeaderRow: true,
          allowMergeCells: true,
          allowNestedTables: true,
          allowNumberColumn: true,
          allowTableAlignment: true,
          allowTableResizing: true,
          stickyHeaders: true,
        }
      : false,
    allowTasksAndDecisions: true,
    allowTemplatePlaceholders: true,
    allowTextAlignment: isDocumentEditor,
    allowTextColor: true,
    allowUndoRedoButtons: true,
    disabled,
    placeholder,
    quickInsert: true,
    useStickyToolbar: appearance === 'comment',
  };
}

function AtlasEditor({
  appearance,
  contentWidth,
  content,
  minHeight,
  mode,
  onDocumentChange,
  placeholder,
}: Required<
  Pick<AppProps, 'appearance' | 'contentWidth' | 'minHeight' | 'mode' | 'placeholder'>
> &
  Pick<AppProps, 'content' | 'onDocumentChange'>) {
  const [editorShell, setEditorShell] = React.useState<HTMLDivElement | null>(null);
  const [popupsMountPoint, setPopupsMountPoint] = React.useState<HTMLDivElement | null>(null);
  const initialContent = useMemo(() => normalizeInitialContent(content), [content]);
  const isReadOnly = mode === 'view';
  const editorProps = useMemo(
    () => createEditorProps(appearance, placeholder, isReadOnly),
    [appearance, isReadOnly, placeholder],
  );

  const initialPluginConfiguration = useMemo(
    () => ({
      blockControlsPlugin:
        appearance === 'comment'
          ? {
              enabled: false,
            }
          : {
              enabled: true,
              quickInsertButtonEnabled: true,
              rightSideControlsEnabled: true,
            },
      blockMenuPlugin: {
        enabled: appearance !== 'comment',
        useStandardNodeWidth: appearance !== 'comment',
      },
      insertBlockPlugin:
        appearance === 'comment'
          ? undefined
          : {
              toolbarShowPlusInsertOnly: false,
            },
    }),
    [appearance],
  );

  const preset = useUniversalPreset({
    props: editorProps,
    initialPluginConfiguration,
  });

  const documentKey = useMemo(() => {
    if (!initialContent) {
      return 'empty-document';
    }

    return JSON.stringify(initialContent);
  }, [initialContent]);

  const handleChange = useCallback(
    (editorView: { state: { doc: { toJSON: () => JSONDocNode } } }) => {
      if (!onDocumentChange) {
        return;
      }

      const adfDocument = editorView.state.doc.toJSON();

      onDocumentChange({
        adf: adfDocument,
        serialized: JSON.stringify(adfDocument),
        timestamp: new Date().toISOString(),
      });
    },
    [onDocumentChange],
  );

  return (
    <div
      ref={setEditorShell}
      className={`atlas-editor-shell ${
        appearance === 'comment'
          ? 'atlas-editor-shell--comment'
          : 'atlas-editor-shell--document'
      } atlas-editor-shell--${mode} atlas-editor-shell--content-${contentWidth}`}
      data-atlas-editor-mode={mode}
      data-atlas-editor-content-width={contentWidth}
      style={
        {
          '--atlas-editor-min-height': `${minHeight}px`,
        } as React.CSSProperties
      }
    >
      <ComposableEditor
        key={documentKey}
        appearance={appearance}
        defaultValue={initialContent ?? createADFFromHTML('<p></p>')}
        disabled={isReadOnly}
        minHeight={appearance === 'comment' ? minHeight : undefined}
        onChange={handleChange}
        placeholder={placeholder}
        popupsBoundariesElement={editorShell ?? undefined}
        popupsMountPoint={popupsMountPoint ?? undefined}
        popupsScrollableElement={editorShell ?? undefined}
        preset={preset}
      />
      <div ref={setPopupsMountPoint} className="atlas-editor-popups" />
    </div>
  );
}

export function App({
  heading = defaultHeading,
  placeholder = defaultPlaceholder,
  appearance,
  contentWidth,
  content,
  minHeight = defaultMinHeight,
  mode = defaultMode,
  onDocumentChange,
}: AppProps) {
  const resolvedContentWidth = resolveContentWidth(appearance, contentWidth);
  const resolvedAppearance = resolveAppearance(appearance, contentWidth);

  return (
    <section
      data-atlas-editor-root
      className="w-full min-w-0 max-w-full text-[color:var(--atlas-editor-text-primary)]"
      aria-label={`${heading} editor surface`}
    >
      <AtlasEditor
        appearance={resolvedAppearance}
        contentWidth={resolvedContentWidth}
        content={content}
        minHeight={minHeight}
        mode={mode}
        onDocumentChange={onDocumentChange}
        placeholder={placeholder}
      />
    </section>
  );
}
