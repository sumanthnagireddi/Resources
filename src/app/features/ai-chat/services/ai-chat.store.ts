import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AiService } from '../../../services/ai.service';
import { AI_AGENT_MAP, AI_CHAT_AGENTS, AI_CHAT_STORAGE_KEY, AI_SPINNER_STATES } from '../data/ai-chat.config';
import {
  AiAgentId,
  AiAttachment,
  AiChatMessage,
  AiComposerOptions,
  AiConversation,
} from '../models/ai-chat.models';

const LEGACY_STORAGE_KEY = 'aria_chats';

type PersistedConversation = Partial<AiConversation> & {
  messages?: Partial<AiChatMessage>[];
};

@Injectable()
export class AiChatStore {
  private readonly aiService = inject(AiService);
  private readonly conversationsState = signal<AiConversation[]>([]);
  private readonly activeConversationIdState = signal<string | null>(null);
  private readonly selectedAgentIdState = signal<AiAgentId>('general');
  private readonly searchTermState = signal('');
  private readonly generatingState = signal(false);
  private readonly thinkingState = signal('');
  private readonly composerOptionsState = signal<AiComposerOptions>({
    webSearch: true,
    deepThink: true,
  });

  private thinkingInterval: ReturnType<typeof setInterval> | null = null;
  private generationSub: Subscription | null = null;
  private initialized = false;

  readonly agents = AI_CHAT_AGENTS;
  readonly conversations = this.conversationsState.asReadonly();
  readonly activeConversationId = this.activeConversationIdState.asReadonly();
  readonly selectedAgentId = this.selectedAgentIdState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly isGenerating = this.generatingState.asReadonly();
  readonly currentThinking = this.thinkingState.asReadonly();
  readonly composerOptions = this.composerOptionsState.asReadonly();

  readonly activeConversation = computed(() => {
    const activeId = this.activeConversationIdState();
    return this.conversationsState().find((chat) => chat.id === activeId) ?? null;
  });

  readonly selectedAgent = computed(
    () => AI_AGENT_MAP[this.selectedAgentIdState()] ?? AI_CHAT_AGENTS[0],
  );

  readonly filteredConversations = computed(() => {
    const term = this.searchTermState().trim().toLowerCase();
    const sorted = [...this.conversationsState()].sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

    if (!term) {
      return sorted;
    }

    return sorted.filter((chat) => {
      const contentMatch = chat.messages.some((message) =>
        message.content.toLowerCase().includes(term),
      );

      return chat.title.toLowerCase().includes(term) || contentMatch;
    });
  });

  readonly welcomePrompts = computed(() => this.selectedAgent().welcomePrompts);

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.restore();
  }

  destroy(): void {
    this.stopGeneration();
    this.stopThinking();
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
  }

  selectAgent(agentId: AiAgentId): void {
    this.selectedAgentIdState.set(agentId);

    const active = this.activeConversation();
    if (!active || active.messages.length > 0) {
      return;
    }

    this.updateConversation(active.id, (chat) => ({
      ...chat,
      agentId,
      updatedAt: new Date().toISOString(),
    }));
  }

  updateComposerOption(option: keyof AiComposerOptions): void {
    this.composerOptionsState.update((current) => ({
      ...current,
      [option]: !current[option],
    }));
  }

  newConversation(): void {
    this.activeConversationIdState.set(null);
    this.searchTermState.set('');
  }

  openConversation(id: string): void {
    const chat = this.conversationsState().find((conversation) => conversation.id === id);
    if (!chat) {
      return;
    }

    this.activeConversationIdState.set(id);
    this.selectedAgentIdState.set(chat.agentId);
  }

  deleteConversation(id: string): void {
    this.conversationsState.update((conversations) =>
      conversations.filter((conversation) => conversation.id !== id),
    );

    if (this.activeConversationIdState() === id) {
      this.activeConversationIdState.set(null);
    }

    this.persist();
  }

  toggleConversationPin(id: string): void {
    this.updateConversation(id, (chat) => ({
      ...chat,
      pinned: !chat.pinned,
      updatedAt: new Date().toISOString(),
    }));
  }

  rateMessage(messageId: string, reaction: 'up' | 'down'): void {
    const active = this.activeConversation();
    if (!active) {
      return;
    }

    this.updateConversation(active.id, (chat) => ({
      ...chat,
      messages: chat.messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reaction: message.reaction === reaction ? null : reaction,
            }
          : message,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  regenerateLastResponse(): boolean {
    if (this.generatingState()) {
      return false;
    }

    const active = this.activeConversation();
    if (!active) {
      return false;
    }

    const userMessages = active.messages.filter((message) => message.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];

    if (!latestUserMessage) {
      return false;
    }

    const trimmedMessages = [...active.messages];
    const lastMessage = trimmedMessages[trimmedMessages.length - 1];
    if (lastMessage?.role === 'assistant') {
      trimmedMessages.pop();
    }

    this.updateConversation(active.id, (chat) => ({
      ...chat,
      messages: trimmedMessages,
      updatedAt: new Date().toISOString(),
    }));

    return this.requestAssistantReply(
      active.id,
      latestUserMessage.content,
      latestUserMessage.attachments,
      latestUserMessage.options ?? this.composerOptionsState(),
    );
  }

  sendMessage(rawInput: string, attachments: AiAttachment[]): boolean {
    const text = rawInput.trim();
    const cleanedAttachments = attachments.map((attachment) => ({ ...attachment }));

    if (!text && cleanedAttachments.length === 0) {
      return false;
    }

    if (this.generatingState()) {
      return false;
    }

    const options = this.composerOptionsState();
    const conversation = this.ensureConversation();
    const now = new Date().toISOString();
    const content = text || 'Please analyze the attached context and help me move forward.';

    const userMessage: AiChatMessage = {
      id: this.createId(),
      role: 'user',
      content,
      createdAt: now,
      status: 'complete',
      agentId: this.selectedAgentIdState(),
      reaction: null,
      attachments: cleanedAttachments.map((attachment) => this.toPersistedAttachment(attachment)),
      options,
    };

    this.updateConversation(conversation.id, (chat) => ({
      ...chat,
      agentId: this.selectedAgentIdState(),
      title: chat.messages.length === 0 ? this.createTitle(content) : chat.title,
      updatedAt: now,
      messages: [...chat.messages, userMessage],
    }));

    return this.requestAssistantReply(
      conversation.id,
      content,
      cleanedAttachments,
      options,
    );
  }

  stopGeneration(): void {
    if (!this.generatingState()) {
      return;
    }

    this.generationSub?.unsubscribe();
    this.generationSub = null;

    const active = this.activeConversation();
    if (active) {
      const lastMessage = active.messages[active.messages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.status === 'streaming') {
        this.updateConversation(active.id, (chat) => ({
          ...chat,
          updatedAt: new Date().toISOString(),
          messages: chat.messages.map((message) =>
            message.id === lastMessage.id
              ? {
                  ...message,
                  status: 'stopped',
                  errorMessage: 'Stopped before the answer finished.',
                }
              : message,
          ),
        }));
      }
    }

    this.generatingState.set(false);
    this.stopThinking();
  }

  private requestAssistantReply(
    conversationId: string,
    userText: string,
    attachments: AiAttachment[],
    options: AiComposerOptions,
  ): boolean {
    const assistantId = this.createId();
    const now = new Date().toISOString();

    const assistantPlaceholder: AiChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: now,
      status: 'streaming',
      agentId: this.selectedAgentIdState(),
      reaction: null,
      attachments: [],
      options,
    };

    this.updateConversation(conversationId, (chat) => ({
      ...chat,
      updatedAt: now,
      messages: [...chat.messages, assistantPlaceholder],
    }));

    this.generatingState.set(true);
    this.startThinking();

    const finalPrompt = this.buildPrompt(userText, attachments, options, this.selectedAgentIdState());

    let streamedAnyToken = false;

    this.generationSub = this.aiService.askStream(finalPrompt).subscribe({
      next: (token) => {
        streamedAnyToken = true;
        this.patchAssistantMessage(conversationId, assistantId, (message) => ({
          ...message,
          content: `${message.content}${token}`,
        }));
      },
      complete: () => {
        this.finishAssistantReply(conversationId, assistantId, 'complete');
      },
      error: () => {
        if (streamedAnyToken) {
          this.finishAssistantReply(conversationId, assistantId, 'error');
          return;
        }

        this.aiService.ask(finalPrompt).subscribe({
          next: (response) => {
            this.patchAssistantMessage(conversationId, assistantId, (message) => ({
              ...message,
              content: response.text,
            }));
            this.finishAssistantReply(conversationId, assistantId, 'complete');
          },
          error: () => {
            this.patchAssistantMessage(conversationId, assistantId, (message) => ({
              ...message,
              content:
                'Sorry, something went wrong while generating the answer. Please try again in a moment.',
              errorMessage: 'The response could not be generated.',
            }));
            this.finishAssistantReply(conversationId, assistantId, 'error');
          },
        });
      },
    });

    return true;
  }

  private finishAssistantReply(
    conversationId: string,
    assistantId: string,
    status: 'complete' | 'error',
  ): void {
    this.patchAssistantMessage(conversationId, assistantId, (message) => ({
      ...message,
      status,
    }));

    this.generatingState.set(false);
    this.stopThinking();
    this.generationSub?.unsubscribe();
    this.generationSub = null;
  }

  private patchAssistantMessage(
    conversationId: string,
    assistantId: string,
    updater: (message: AiChatMessage) => AiChatMessage,
  ): void {
    this.updateConversation(conversationId, (chat) => ({
      ...chat,
      updatedAt: new Date().toISOString(),
      messages: chat.messages.map((message) =>
        message.id === assistantId ? updater(message) : message,
      ),
    }));
  }

  private ensureConversation(): AiConversation {
    const active = this.activeConversation();
    if (active) {
      return active;
    }

    const now = new Date().toISOString();
    const conversation: AiConversation = {
      id: this.createId(),
      title: 'New conversation',
      createdAt: now,
      updatedAt: now,
      agentId: this.selectedAgentIdState(),
      pinned: false,
      messages: [],
    };

    this.conversationsState.update((conversations) => [conversation, ...conversations]);
    this.activeConversationIdState.set(conversation.id);
    this.persist();

    return conversation;
  }

  private startThinking(): void {
    this.stopThinking();
    this.thinkingState.set(this.getThinkingState());
    this.thinkingInterval = setInterval(() => {
      this.thinkingState.set(this.getThinkingState());
    }, 2200);
  }

  private stopThinking(): void {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }

    this.thinkingState.set('');
  }

  private getThinkingState(): string {
    return AI_SPINNER_STATES[Math.floor(Math.random() * AI_SPINNER_STATES.length)];
  }

  private updateConversation(
    conversationId: string,
    updater: (conversation: AiConversation) => AiConversation,
  ): void {
    this.conversationsState.update((conversations) =>
      conversations.map((conversation) =>
        conversation.id === conversationId ? updater(conversation) : conversation,
      ),
    );

    this.persist();
  }

  private buildPrompt(
    userText: string,
    attachments: AiAttachment[],
    options: AiComposerOptions,
    agentId: AiAgentId,
  ): string {
    const agent = AI_AGENT_MAP[agentId];

    const attachmentContext = attachments.length
      ? [
          'Attached context:',
          ...attachments.map((attachment) => {
            const preview = attachment.extractedText?.trim();
            if (preview) {
              const trimmedPreview = preview.length > 5000 ? `${preview.slice(0, 5000)}\n...[truncated]` : preview;
              return `- ${attachment.name} (${attachment.mimeType})\n${trimmedPreview}`;
            }

            return `- ${attachment.name} (${attachment.mimeType}) [binary or preview-only attachment]`;
          }),
        ].join('\n')
      : '';

    const instructionBlocks = [
      agent.systemPrompt,
      options.deepThink
        ? 'Think carefully, organize the answer well, and include tradeoffs or next steps where useful.'
        : 'Keep the answer direct and lightweight.',
      options.webSearch
        ? 'If the topic may depend on changing information, explicitly mention that live verification may be needed.'
        : 'Answer from the available context without implying live web lookup.',
      attachmentContext,
      `User request:\n${userText}`,
    ];

    return instructionBlocks.filter(Boolean).join('\n\n');
  }

  private createTitle(text: string): string {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length <= 52) {
      return compact;
    }

    return `${compact.slice(0, 52)}...`;
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private toPersistedAttachment(attachment: AiAttachment): AiAttachment {
    return {
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType,
      kind: attachment.kind,
      status: attachment.status,
    };
  }

  private restore(): void {
    try {
      const raw =
        localStorage.getItem(AI_CHAT_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as PersistedConversation[];
      if (!Array.isArray(parsed)) {
        return;
      }

      const normalized = parsed
        .map((conversation) => this.normalizeConversation(conversation))
        .filter((conversation): conversation is AiConversation => !!conversation);

      this.conversationsState.set(normalized);
      if (normalized.length > 0) {
        this.activeConversationIdState.set(normalized[0].id);
        this.selectedAgentIdState.set(normalized[0].agentId);
      }
    } catch {
      this.conversationsState.set([]);
    }
  }

  private normalizeConversation(raw: PersistedConversation): AiConversation | null {
    if (!raw?.id) {
      return null;
    }

    const createdAt = raw.createdAt ?? new Date().toISOString();
    const updatedAt = raw.updatedAt ?? createdAt;
    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .map((message) => this.normalizeMessage(message, raw.agentId ?? 'general'))
          .filter((message): message is AiChatMessage => !!message)
      : [];

    return {
      id: raw.id,
      title: raw.title ?? 'New conversation',
      createdAt,
      updatedAt,
      agentId: this.normalizeAgentId(raw.agentId),
      pinned: !!raw.pinned,
      messages,
    };
  }

  private normalizeMessage(
    raw: Partial<AiChatMessage>,
    fallbackAgentId: AiAgentId,
  ): AiChatMessage | null {
    if (!raw?.content && raw?.content !== '') {
      return null;
    }

    return {
      id: raw.id ?? this.createId(),
      role: raw.role === 'assistant' ? 'assistant' : 'user',
      content: raw.content ?? '',
      createdAt: raw.createdAt ?? new Date().toISOString(),
      status:
        raw.status === 'streaming' || raw.status === 'error' || raw.status === 'stopped'
          ? raw.status
          : 'complete',
      agentId: this.normalizeAgentId(raw.agentId ?? fallbackAgentId),
      reaction: raw.reaction === 'up' || raw.reaction === 'down' ? raw.reaction : null,
      attachments: Array.isArray(raw.attachments)
        ? raw.attachments.map((attachment) => ({
            id: attachment.id ?? this.createId(),
            name: attachment.name ?? 'Attachment',
            size: attachment.size ?? 0,
            mimeType: attachment.mimeType ?? 'application/octet-stream',
            kind:
              attachment.kind === 'image' || attachment.kind === 'text'
                ? attachment.kind
                : 'file',
            status: attachment.status === 'limited' ? 'limited' : 'ready',
          }))
        : [],
      options: raw.options ?? this.composerOptionsState(),
      errorMessage: raw.errorMessage,
    };
  }

  private normalizeAgentId(agentId: unknown): AiAgentId {
    return agentId === 'research' || agentId === 'builder' || agentId === 'reviewer'
      ? agentId
      : 'general';
  }

  private persist(): void {
    const payload = this.conversationsState().map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => ({
        ...message,
        attachments: message.attachments.map((attachment) => this.toPersistedAttachment(attachment)),
      })),
    }));

    localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(payload));
  }
}
