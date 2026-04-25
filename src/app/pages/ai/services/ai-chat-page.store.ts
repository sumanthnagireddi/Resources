import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AiService } from '../../../services/ai.service';
import { SPINNER_VERBS } from '../../../model/spinnerVerbs';
import { AiPageConversation, AiPageMessage } from '../models/ai-page.models';

const STORAGE_KEY = 'aria_chats';

type PersistedConversation = Partial<AiPageConversation> & {
  messages?: Partial<AiPageMessage>[];
};

@Injectable()
export class AiChatPageStore {
  private readonly aiService = inject(AiService);
  private readonly conversationsState = signal<AiPageConversation[]>([]);
  private readonly activeConversationIdState = signal<string | null>(null);
  private readonly draftState = signal('');
  private readonly generatingState = signal(false);
  private readonly spinnerVerbState = signal('');
  private readonly scrollVersionState = signal(0);

  private spinnerInterval: ReturnType<typeof setInterval> | null = null;

  readonly suggestions = [
    'Explain quantum computing',
    'Write a short poem',
    'Help me brainstorm ideas',
    'Summarise a topic for me',
  ];

  readonly draft = this.draftState.asReadonly();
  readonly isGenerating = this.generatingState.asReadonly();
  readonly spinnerVerb = this.spinnerVerbState.asReadonly();
  readonly scrollVersion = this.scrollVersionState.asReadonly();

  readonly currentMessages = computed(() => {
    const activeId = this.activeConversationIdState();
    const activeConversation = this.conversationsState().find(
      (conversation) => conversation.id === activeId,
    );

    return activeConversation?.messages ?? [];
  });

  readonly hasActiveConversation = computed(() => !!this.activeConversationIdState());

  initialize(): void {
    this.restore();
  }

  destroy(): void {
    this.stopSpinner();
  }

  updateDraft(text: string): void {
    this.draftState.set(text);
  }

  sendDraft(): boolean {
    return this.sendMessage(this.draftState());
  }

  sendSuggestion(suggestion: string): boolean {
    return this.sendMessage(suggestion);
  }

  private sendMessage(rawText: string): boolean {
    const text = rawText.trim();
    if (!text || this.generatingState()) {
      return false;
    }

    const conversation = this.ensureConversation(text);
    const userMessage = this.createMessage('user', text);

    this.updateConversation(conversation.id, (currentConversation) => ({
      ...currentConversation,
      updatedAt: userMessage.createdAt,
      messages: [...currentConversation.messages, userMessage],
    }));

    this.draftState.set('');
    this.generatingState.set(true);
    this.startSpinner();
    this.bumpScrollVersion();

    this.aiService
      .askLegacy(text)
      .pipe(
        finalize(() => {
          this.generatingState.set(false);
          this.stopSpinner();
          this.bumpScrollVersion();
        }),
      )
      .subscribe({
        next: (response) => {
          this.appendAssistantMessage(
            conversation.id,
            response.text || 'Sorry, I could not generate a response this time.',
          );
        },
        error: () => {
          this.appendAssistantMessage(
            conversation.id,
            'Sorry, something went wrong. Please try again.',
          );
        },
      });

    return true;
  }

  private ensureConversation(initialMessage: string): AiPageConversation {
    const activeId = this.activeConversationIdState();
    const activeConversation = this.conversationsState().find(
      (conversation) => conversation.id === activeId,
    );

    if (activeConversation) {
      return activeConversation;
    }

    const now = new Date().toISOString();
    const conversation: AiPageConversation = {
      id: this.createId(),
      title: this.createTitle(initialMessage),
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    this.conversationsState.update((conversations) => [conversation, ...conversations]);
    this.activeConversationIdState.set(conversation.id);
    this.persist();

    return conversation;
  }

  private appendAssistantMessage(conversationId: string, text: string): void {
    const assistantMessage = this.createMessage('assistant', text);

    this.updateConversation(conversationId, (conversation) => ({
      ...conversation,
      updatedAt: assistantMessage.createdAt,
      messages: [...conversation.messages, assistantMessage],
    }));
  }

  private updateConversation(
    conversationId: string,
    updater: (conversation: AiPageConversation) => AiPageConversation,
  ): void {
    this.conversationsState.update((conversations) =>
      conversations.map((conversation) =>
        conversation.id === conversationId ? updater(conversation) : conversation,
      ),
    );
    this.persist();
  }

  private startSpinner(): void {
    this.stopSpinner();
    this.spinnerVerbState.set(this.randomSpinnerVerb());
    this.spinnerInterval = setInterval(() => {
      this.spinnerVerbState.set(this.randomSpinnerVerb());
    }, 2500);
  }

  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }

    this.spinnerVerbState.set('');
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as PersistedConversation[];
      if (!Array.isArray(parsed)) {
        return;
      }

      this.conversationsState.set(
        parsed
          .map((conversation) => this.normalizeConversation(conversation))
          .filter((conversation): conversation is AiPageConversation => !!conversation),
      );
    } catch {
      this.conversationsState.set([]);
    }
  }

  private normalizeConversation(raw: PersistedConversation): AiPageConversation | null {
    if (!raw?.id) {
      return null;
    }

    const createdAt = raw.createdAt ?? new Date().toISOString();
    const updatedAt = raw.updatedAt ?? createdAt;
    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .map((message) => this.normalizeMessage(message))
          .filter((message): message is AiPageMessage => !!message)
      : [];

    return {
      id: raw.id,
      title: raw.title ?? 'New conversation',
      createdAt,
      updatedAt,
      messages,
    };
  }

  private normalizeMessage(raw: Partial<AiPageMessage>): AiPageMessage | null {
    if (typeof raw.content !== 'string') {
      return null;
    }

    return {
      id: raw.id ?? this.createId(),
      role: raw.role === 'assistant' ? 'assistant' : 'user',
      content: raw.content,
      createdAt: raw.createdAt ?? new Date().toISOString(),
    };
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.conversationsState()));
  }

  private createMessage(role: AiPageMessage['role'], content: string): AiPageMessage {
    return {
      id: this.createId(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };
  }

  private createTitle(text: string): string {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length <= 45) {
      return compact;
    }

    return `${compact.slice(0, 45)}...`;
  }

  private bumpScrollVersion(): void {
    this.scrollVersionState.update((version) => version + 1);
  }

  private randomSpinnerVerb(): string {
    return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)] || 'Thinking';
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
