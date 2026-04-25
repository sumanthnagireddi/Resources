import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { AiAgent, AiAgentId, AiConversation } from '../../models/ai-chat.models';

@Component({
  selector: 'app-ai-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full',
  },
})
export class AiSidebarComponent {
  readonly isOpen = input(false);
  readonly agents = input<AiAgent[]>([]);
  readonly selectedAgentId = input<AiAgentId>('general');
  readonly searchTerm = input('');
  readonly conversations = input<AiConversation[]>([]);
  readonly activeConversationId = input<string | null>(null);

  readonly closeSidebar = output<void>();
  readonly newChat = output<void>();
  readonly searchTermChange = output<string>();
  readonly agentSelected = output<AiAgentId>();
  readonly conversationOpened = output<string>();
  readonly conversationDeleted = output<string>();
  readonly conversationPinned = output<string>();

  protected handleSearchInput(event: Event): void {
    this.searchTermChange.emit((event.target as HTMLInputElement).value);
  }

  protected openConversation(id: string): void {
    this.conversationOpened.emit(id);
  }

  protected handleConversationKeydown(event: Event, id: string): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
      return;
    }

    keyboardEvent.preventDefault();
    this.openConversation(id);
  }

  protected selectAgent(agentId: AiAgentId): void {
    this.agentSelected.emit(agentId);
  }

  protected deleteConversation(event: Event, id: string): void {
    event.stopPropagation();
    this.conversationDeleted.emit(id);
  }

  protected pinConversation(event: Event, id: string): void {
    event.stopPropagation();
    this.conversationPinned.emit(id);
  }

  protected close(): void {
    this.closeSidebar.emit();
  }

  protected createChat(): void {
    this.newChat.emit();
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  }
}
