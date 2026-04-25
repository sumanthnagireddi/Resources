import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiChatStore } from './services/ai-chat.store';
import { AiAgentId, AiAttachment } from './models/ai-chat.models';
import { AiSidebarComponent } from './components/ai-sidebar/ai-sidebar.component';
import { AiThreadComponent } from './components/ai-thread/ai-thread.component';
import { AiComposerComponent } from './components/ai-composer/ai-composer.component';

@Component({
  selector: 'app-ai-workspace',
  standalone: true,
  imports: [CommonModule, AiSidebarComponent, AiThreadComponent, AiComposerComponent],
  templateUrl: './ai-workspace.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AiChatStore],
  host: {
    class: 'block h-full min-h-0',
  },
})
export class AiWorkspaceComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly store = inject(AiChatStore);

  @ViewChild('messageContainer') private readonly messageContainer?: ElementRef<HTMLDivElement>;

  protected readonly composerText = signal('');
  protected readonly attachments = signal<AiAttachment[]>([]);
  protected readonly sidebarOpen = signal(false);

  private shouldScrollToBottom = false;

  ngOnInit(): void {
    this.store.initialize();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom) {
      return;
    }

    this.messageContainer?.nativeElement.scrollTo({
      top: this.messageContainer.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
    this.shouldScrollToBottom = false;
  }

  ngOnDestroy(): void {
    this.revokeAttachmentUrls(this.attachments());
    this.store.destroy();
  }

  protected selectAgent(agentId: AiAgentId): void {
    this.store.selectAgent(agentId);
  }

  protected startFreshChat(): void {
    this.store.newConversation();
    this.closeSidebar();
  }

  protected openConversation(id: string): void {
    this.store.openConversation(id);
    this.shouldScrollToBottom = true;
    this.closeSidebar();
  }

  protected deleteConversation(id: string): void {
    this.store.deleteConversation(id);
  }

  protected togglePin(id: string): void {
    this.store.toggleConversationPin(id);
  }

  protected updateSearchTerm(term: string): void {
    this.store.setSearchTerm(term);
  }

  protected useSuggestion(prompt: string): void {
    this.composerText.set(prompt);
    this.sendMessage();
  }

  protected async handleFilesSelected(files: File[]): Promise<void> {
    if (!files.length) {
      return;
    }

    const nextAttachments = [...this.attachments()];
    for (const file of files.slice(0, 4)) {
      nextAttachments.push(await this.buildAttachment(file));
    }

    this.attachments.set(nextAttachments);
  }

  protected removeAttachment(id: string): void {
    const next = this.attachments().filter((attachment) => {
      if (attachment.id !== id) {
        return true;
      }

      if (attachment.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }

      return false;
    });

    this.attachments.set(next);
  }

  protected toggleOption(option: 'webSearch' | 'deepThink'): void {
    this.store.updateComposerOption(option);
  }

  protected updateComposerText(text: string): void {
    this.composerText.set(text);
  }

  protected sendMessage(): void {
    const sent = this.store.sendMessage(this.composerText(), this.attachments());
    if (!sent) {
      return;
    }

    this.composerText.set('');
    this.revokeAttachmentUrls(this.attachments());
    this.attachments.set([]);
    this.shouldScrollToBottom = true;
  }

  protected stopGeneration(): void {
    this.store.stopGeneration();
  }

  protected regenerate(): void {
    const regenerated = this.store.regenerateLastResponse();
    if (regenerated) {
      this.shouldScrollToBottom = true;
    }
  }

  protected reactToMessage(event: { messageId: string; reaction: 'up' | 'down' }): void {
    this.store.rateMessage(event.messageId, event.reaction);
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  private async buildAttachment(file: File): Promise<AiAttachment> {
    const mimeType = file.type || this.inferMimeType(file.name);
    const kind = mimeType.startsWith('image/')
      ? 'image'
      : this.isTextFile(file.name, mimeType)
        ? 'text'
        : 'file';

    const attachment: AiAttachment = {
      id: this.createId(),
      name: file.name,
      size: file.size,
      mimeType,
      kind,
      status: kind === 'file' ? 'limited' : 'ready',
    };

    if (kind === 'image') {
      attachment.previewUrl = URL.createObjectURL(file);
      attachment.status = 'limited';
      return attachment;
    }

    if (kind === 'text') {
      const text = await file.text();
      attachment.extractedText =
        text.length > 12000 ? `${text.slice(0, 12000)}\n...[truncated]` : text;
      return attachment;
    }

    return attachment;
  }

  private isTextFile(name: string, mimeType: string): boolean {
    if (mimeType.startsWith('text/')) {
      return true;
    }

    return /\.(txt|md|json|js|ts|tsx|jsx|html|css|scss|java|py|go|sql|xml|yml|yaml)$/i.test(
      name,
    );
  }

  private inferMimeType(name: string): string {
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)) {
      return 'image/*';
    }

    if (this.isTextFile(name, '')) {
      return 'text/plain';
    }

    return 'application/octet-stream';
  }

  private revokeAttachmentUrls(attachments: AiAttachment[]): void {
    for (const attachment of attachments) {
      if (attachment.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
