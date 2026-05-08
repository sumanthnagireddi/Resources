import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AiStudioAgent, AiStudioConversation } from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioHeaderComponent {
  readonly activeConversation = input<AiStudioConversation | null>(null);
  readonly activeAgent = input.required<AiStudioAgent>();
  readonly conversationCount = input.required<number>();
  readonly contextCount = input.required<number>();
  readonly commandCount = input.required<number>();
  readonly insertCount = input.required<number>();
  readonly isGenerating = input(false);
  readonly responseMode = input<'unknown' | 'live' | 'local'>('unknown');

  readonly newConversation = output<void>();
  readonly workspaceRequested = output<void>();

  protected title(): string {
    return this.activeConversation()?.title || 'AI Copilot';
  }

  protected subtitle(): string {
    if (this.isGenerating()) {
      return 'Streaming response with live progress.';
    }

    if (this.activeConversation()) {
      return 'Use `/` to switch workflows and keep the thread focused.';
    }

    return 'Ask, plan, build, review, and summarize from one clean canvas.';
  }

  protected modeLabel(): string {
    if (this.responseMode() === 'local') {
      return 'Local preview';
    }

    if (this.responseMode() === 'live') {
      return 'Live AI';
    }

    return 'Ready';
  }

  protected browserPath(): string {
    const title = this.activeConversation()?.title?.trim();
    if (!title) {
      return 'resources.local/ai/workspace';
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 36);

    return `resources.local/ai/${slug || 'thread'}`;
  }
}
