import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  AiStudioAgent,
  AiStudioAgentId,
  AiStudioConversation,
} from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioSidebarComponent {
  readonly agents = input.required<AiStudioAgent[]>();
  readonly activeAgentId = input.required<AiStudioAgentId>();
  readonly conversations = input.required<AiStudioConversation[]>();
  readonly activeConversationId = input<string | null>(null);

  readonly agentSelected = output<AiStudioAgentId>();
  readonly conversationSelected = output<string>();
  readonly newConversation = output<void>();

  protected formatUpdatedAt(value: string): string {
    const date = new Date(value);

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  protected trackByConversationId(_index: number, conversation: AiStudioConversation): string {
    return conversation.id;
  }

  protected trackByAgentId(_index: number, agent: AiStudioAgent): string {
    return agent.id;
  }
}
