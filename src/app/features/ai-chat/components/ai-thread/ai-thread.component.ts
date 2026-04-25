import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AI_AGENT_MAP } from '../../data/ai-chat.config';
import { AiConversation, AiChatMessage } from '../../models/ai-chat.models';
import { AiMarkdownService } from '../../services/ai-markdown.service';

@Component({
  selector: 'app-ai-thread',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-thread.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full',
  },
})
export class AiThreadComponent {
  private readonly markdown = inject(AiMarkdownService);

  readonly activeConversation = input<AiConversation | null>(null);
  readonly currentThinking = input('');
  readonly welcomePrompts = input<string[]>([]);

  readonly suggestionSelected = output<string>();
  readonly messageReaction = output<{ messageId: string; reaction: 'up' | 'down' }>();

  protected renderMarkdown(content: string): string {
    return this.markdown.render(content);
  }

  protected getAgentLabel(agentId: string): string {
    return AI_AGENT_MAP[agentId as keyof typeof AI_AGENT_MAP]?.label ?? 'Assistant';
  }

  protected chooseSuggestion(prompt: string): void {
    this.suggestionSelected.emit(prompt);
  }

  protected react(messageId: string, reaction: 'up' | 'down'): void {
    this.messageReaction.emit({ messageId, reaction });
  }

  protected copyMessage(message: AiChatMessage): void {
    navigator.clipboard?.writeText(message.content);
  }

  protected formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  protected trackByValue(_index: number, value: string): string {
    return value;
  }
}
