import { CommonModule } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';

export type AtlasEditorAppearance = 'comment' | 'full-page' | 'full-width';
export type AtlasEditorMode = 'edit' | 'view';
export type AtlasEditorContentWidth = 'full-width' | 'narrow';

export type AtlasEditorDocumentChangeDetail = {
  adf: Record<string, unknown>;
  serialized: string;
  timestamp: string;
};

const widgetTagName = 'atlas-editor-angular';
const widgetBundleScriptAttribute = 'data-atlas-editor-angular-bundle';
let widgetBundlePromise: Promise<void> | null = null;

function ensureReactWidgetBundle(): Promise<void> {
  if (typeof document === 'undefined' || typeof customElements === 'undefined') {
    return Promise.resolve();
  }

  if (customElements.get(widgetTagName)) {
    return Promise.resolve();
  }

  if (widgetBundlePromise) {
    return widgetBundlePromise;
  }

  widgetBundlePromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[${widgetBundleScriptAttribute}]`,
    );

    const handleLoad = () => {
      if (customElements.get(widgetTagName)) {
        resolve();
        return;
      }

      widgetBundlePromise = null;
      reject(new Error('The React editor bundle loaded without defining the widget.'));
    };

    const handleError = () => {
      widgetBundlePromise = null;
      reject(new Error('The React editor bundle failed to load.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = new URL('assets/my-react-app.bundle.js', document.baseURI).toString();
    script.setAttribute(widgetBundleScriptAttribute, 'true');
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.append(script);
  });

  return widgetBundlePromise;
}

@Component({
  selector: 'app-atlas-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AtlasEditorComponent implements OnInit {
  @Input() heading = 'Atlaskit Editor';
  @Input() description = 'Draft notes, documentation, and structured content.';
  @Input() placeholder = 'Start writing here...';
  @Input() appearance: AtlasEditorAppearance = 'full-width';
  @Input() mode: AtlasEditorMode = 'view';
  @Input() minHeight = 360;

  private contentValue: string | Record<string, unknown> | null = null;
  private contentWidthValue: AtlasEditorContentWidth | null = null;
  private widthAliasValue: AtlasEditorContentWidth | null = null;

  @Input()
  set content(value: string | Record<string, unknown> | null) {
    this.contentValue = value;
  }

  get content(): string | Record<string, unknown> | null {
    return this.contentValue;
  }

  @Input()
  set data(value: string | Record<string, unknown> | null) {
    this.contentValue = value;
  }

  get data(): string | Record<string, unknown> | null {
    return this.contentValue;
  }

  @Input()
  set contentWidth(value: AtlasEditorContentWidth | null) {
    this.contentWidthValue = value;
  }

  get contentWidth(): AtlasEditorContentWidth | null {
    return this.contentWidthValue;
  }

  @Input()
  set width(value: AtlasEditorContentWidth | null) {
    this.widthAliasValue = value;
  }

  get width(): AtlasEditorContentWidth | null {
    return this.widthAliasValue;
  }

  @Output() documentChange = new EventEmitter<AtlasEditorDocumentChangeDetail>();

  widgetBundleReady = false;
  widgetBundleError: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      await ensureReactWidgetBundle();
      this.widgetBundleReady = true;
    } catch (error) {
      this.widgetBundleError =
        error instanceof Error ? error.message : 'The editor bundle could not be loaded.';
    }
  }

  get appearanceLabel(): string {
    switch (this.resolvedAppearance) {
      case 'full-page':
        return 'Full Page';
      case 'full-width':
        return 'Full Width';
      default:
        return 'Comment';
    }
  }

  get resolvedContentWidth(): AtlasEditorContentWidth {
    if (this.contentWidthValue) {
      return this.contentWidthValue;
    }

    if (this.widthAliasValue) {
      return this.widthAliasValue;
    }

    if (this.appearance === 'full-page') {
      return 'narrow';
    }

    return 'full-width';
  }

  get resolvedAppearance(): AtlasEditorAppearance {
    if (this.appearance === 'comment') {
      return 'comment';
    }

    return this.resolvedContentWidth === 'narrow' ? 'full-page' : 'full-width';
  }

  get resolvedContent(): string | Record<string, unknown> | null {
    return this.contentValue;
  }

  handleDocumentChange(event: Event): void {
    const customEvent = event as CustomEvent<AtlasEditorDocumentChangeDetail>;
    this.documentChange.emit(customEvent.detail);
  }
}
