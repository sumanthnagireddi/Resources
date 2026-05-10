import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AtlasEditorAppearance,
  AtlasEditorComponent,
  AtlasEditorDocumentChangeDetail,
} from '../../component/editor/editor.component';

@Component({
  selector: 'app-react-playground',
  standalone: true,
  imports: [CommonModule, AtlasEditorComponent],
  templateUrl: './react-playground.component.html',
  styleUrl: './react-playground.component.css',
})
export class ReactPlaygroundComponent {
  readonly bundlePath = 'src/assets/my-react-app.bundle.js';

  heading = 'Documentation workspace';
  description =
    'A richer Atlaskit editing surface for long-form docs, slash commands, tables, and code blocks.';
  placeholder = 'Type "/" to insert tables, code blocks, panels, and more...';
  appearance: AtlasEditorAppearance = 'full-page';
  minHeight = 520;
  lastEvent = 'Waiting for the first document update from the React editor.';
  lastSerializedLength = 0;

  get payloadLabel(): string {
    if (!this.lastSerializedLength) {
      return 'No ADF emitted yet';
    }

    return `${this.lastSerializedLength.toLocaleString()} chars synced`;
  }

  loadCommentPreset(): void {
    this.heading = 'Embedded Atlaskit editor';
    this.description =
      'React-powered rich text editing mounted inside the Angular shell.';
    this.placeholder = 'Capture a short response or working draft...';
    this.appearance = 'comment';
    this.minHeight = 360;
  }

  loadDocsPreset(): void {
    this.heading = 'Documentation workspace';
    this.description =
      'A wider editing surface tuned for longer notes, docs, and reference pages.';
    this.placeholder = 'Type "/" to insert tables, code blocks, panels, and more...';
    this.appearance = 'full-width';
    this.minHeight = 520;
  }

  loadReviewPreset(): void {
    this.heading = 'Review notes';
    this.description =
      'A compact editor configuration for review comments, punch lists, and follow-ups.';
    this.placeholder = 'Summarize the feedback and next steps...';
    this.appearance = 'comment';
    this.minHeight = 320;
  }

  handleDocumentChange(detail: AtlasEditorDocumentChangeDetail): void {
    this.lastSerializedLength = detail.serialized.length;

    const updatedAt = new Date(detail.timestamp).toLocaleTimeString();
    this.lastEvent = `ADF document updated at ${updatedAt}.`;
  }
}
