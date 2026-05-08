import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AiService } from '../../../services/ai.service';
import { environment } from '../../../../environments/environment';
import {
  AI_STUDIO_AGENTS,
  AI_STUDIO_COMMANDS,
  AI_STUDIO_CONTEXTS,
  AI_STUDIO_EDITOR_INSERTS,
  AI_STUDIO_STARTER_PROMPTS,
} from '../data/ai-studio.data';
import {
  AiStudioAgent,
  AiStudioAgentId,
  AiStudioArtifact,
  AiStudioCommandId,
  AiStudioContextChip,
  AiStudioConversation,
  AiStudioEditorInsert,
  AiStudioEditorInsertId,
  AiStudioLiveRun,
  AiStudioMessage,
  AiStudioPersistedState,
  AiStudioRunStep,
  AiStudioSlashCommand,
  AiStudioStarterPrompt,
} from '../models/ai-studio.models';

const STORAGE_KEY = 'aria_ai_workspace_v2';
const LEGACY_STORAGE_KEY = 'aria_chats';
const DEFAULT_AGENT_ID: AiStudioAgentId = 'generalist';
const DEFAULT_CONTEXT_IDS = ['repo', 'knowledge', 'artifacts', 'guardrails'];

type LegacyConversation = {
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: Array<{
    id?: string;
    role?: string;
    content?: string;
    createdAt?: string;
  }>;
};

@Injectable()
export class AiStudioStore {
  private readonly aiService = inject(AiService);

  private readonly conversationsState = signal<AiStudioConversation[]>([]);
  private readonly activeConversationIdState = signal<string | null>(null);
  private readonly activeAgentIdState = signal<AiStudioAgentId>(DEFAULT_AGENT_ID);
  private readonly activeContextIdsState = signal<string[]>([...DEFAULT_CONTEXT_IDS]);
  private readonly draftState = signal('');
  private readonly generatingState = signal(false);
  private readonly liveRunState = signal<AiStudioLiveRun | null>(null);
  private readonly lastUsedInsertIdState = signal<AiStudioEditorInsertId | null>(null);
  private readonly responseModeState = signal<'unknown' | 'live' | 'local'>('unknown');
  private readonly scrollVersionState = signal(0);

  private responseSubscription: Subscription | null = null;
  private stepTimer: ReturnType<typeof setInterval> | null = null;

  readonly agents = AI_STUDIO_AGENTS;
  readonly slashCommands = AI_STUDIO_COMMANDS;
  readonly starterPrompts = AI_STUDIO_STARTER_PROMPTS;
  readonly editorInserts = AI_STUDIO_EDITOR_INSERTS;

  readonly draft = this.draftState.asReadonly();
  readonly isGenerating = this.generatingState.asReadonly();
  readonly liveRun = this.liveRunState.asReadonly();
  readonly responseMode = this.responseModeState.asReadonly();
  readonly scrollVersion = this.scrollVersionState.asReadonly();

  readonly conversations = this.conversationsState.asReadonly();

  readonly activeConversation = computed(() => {
    const activeId = this.activeConversationIdState();
    return this.conversationsState().find((conversation) => conversation.id === activeId) ?? null;
  });

  readonly activeAgent = computed(
    () => this.findAgent(this.activeAgentIdState()) ?? AI_STUDIO_AGENTS[0],
  );

  readonly currentMessages = computed(() => this.activeConversation()?.messages ?? []);

  readonly contextChips = computed<AiStudioContextChip[]>(() =>
    AI_STUDIO_CONTEXTS.map((chip) => ({
      ...chip,
      active: this.activeContextIdsState().includes(chip.id),
    })),
  );

  readonly activeContextCount = computed(
    () => this.contextChips().filter((chip) => chip.active).length,
  );

  readonly activeDraftCommand = computed(() => this.parseCommandFromDraft(this.draftState()).command);
  readonly lastUsedInsert = computed<AiStudioEditorInsert | null>(() => {
    const insertId = this.lastUsedInsertIdState();
    return insertId ? this.findEditorInsert(insertId) ?? null : null;
  });

  readonly showSlashMenu = computed(() => {
    const draft = this.draftState().trimStart();
    if (!draft.startsWith('/')) {
      return false;
    }

    return !draft.slice(1).includes(' ');
  });

  readonly filteredSlashCommands = computed(() => {
    const query = this.currentSlashQuery();
    if (!query) {
      return AI_STUDIO_COMMANDS;
    }

    return AI_STUDIO_COMMANDS.filter((command) => {
      const value = `${command.id} ${command.label} ${command.description}`.toLowerCase();
      return value.includes(query);
    });
  });

  initialize(): void {
    this.restore();
  }

  destroy(): void {
    this.stopLiveRun();
  }

  updateDraft(text: string): void {
    this.draftState.set(text);
  }

  selectAgent(agentId: AiStudioAgentId): void {
    this.activeAgentIdState.set(agentId);
    this.persist();
  }

  selectConversation(conversationId: string): void {
    const conversation = this.conversationsState().find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    this.activeConversationIdState.set(conversation.id);
    this.activeAgentIdState.set(conversation.agentId);
    this.bumpScrollVersion();
    this.persist();
  }

  startNewConversation(): void {
    this.activeConversationIdState.set(null);
    this.draftState.set('');
    this.liveRunState.set(null);
    this.lastUsedInsertIdState.set(null);
    this.bumpScrollVersion();
    this.persist();
  }

  toggleContext(contextId: string): void {
    this.activeContextIdsState.update((ids) =>
      ids.includes(contextId) ? ids.filter((id) => id !== contextId) : [...ids, contextId],
    );
    this.persist();
  }

  applySlashCommand(commandId: AiStudioCommandId): void {
    const command = this.findCommand(commandId);
    if (!command) {
      return;
    }

    const draft = this.draftState();
    const trimmed = draft.trimStart();
    const leadingWhitespace = draft.slice(0, draft.length - trimmed.length);
    const remainder = trimmed.startsWith('/')
      ? trimmed.split(/\s+/).slice(1).join(' ').trim()
      : trimmed;
    const nextValue = `${leadingWhitespace}${command.command}${remainder ? ` ${remainder}` : ' '}`;

    this.activeAgentIdState.set(command.suggestedAgentId);
    this.draftState.set(nextValue);
  }

  applyEditorInsert(insertId: AiStudioEditorInsertId): void {
    const insert = this.findEditorInsert(insertId);
    if (!insert) {
      return;
    }

    const currentDraft = this.draftState().trim();
    const nextDraft = currentDraft ? `${currentDraft}\n\n${insert.template}` : insert.template;

    this.activeAgentIdState.set(insert.suggestedAgentId);
    this.lastUsedInsertIdState.set(insert.id);
    this.draftState.set(nextDraft);
  }

  sendPrompt(prompt: string): boolean {
    return this.sendMessage(prompt);
  }

  sendDraft(): boolean {
    return this.sendMessage(this.draftState());
  }

  stopGeneration(): void {
    if (!this.generatingState()) {
      return;
    }

    const activeConversationId = this.activeConversationIdState();
    const liveRun = this.liveRunState();
    const agent = this.activeAgent();

    this.responseSubscription?.unsubscribe();
    this.responseSubscription = null;

    const partialResponse = liveRun?.partialResponse.trim();
    const finalText = partialResponse
      ? `${partialResponse}\n\n_Stopped before the answer finished streaming._`
      : 'Generation stopped before a response was ready.';

    this.finishMessage({
      conversationId: activeConversationId,
      agent,
      command: liveRun?.commandId ? this.findCommand(liveRun.commandId) : undefined,
      text: finalText,
      stopped: true,
    });
  }

  private sendMessage(rawInput: string): boolean {
    if (this.generatingState()) {
      return false;
    }

    const parsed = this.parseCommandFromDraft(rawInput);
    const messageText = parsed.prompt.trim();
    if (!messageText) {
      return false;
    }

    const command = parsed.command;
    const agent = command
      ? (this.findAgent(command.suggestedAgentId) ?? this.activeAgent())
      : this.activeAgent();
    const now = new Date().toISOString();
    const conversation = this.ensureConversation(messageText, agent.id, now, command);
    const contextLabels = this.contextChips()
      .filter((chip) => chip.active)
      .map((chip) => chip.label);

    const userMessage: AiStudioMessage = {
      id: this.createId(),
      role: 'user',
      content: messageText,
      createdAt: now,
      agentId: agent.id,
      agentName: agent.name,
      commandId: command?.id,
      commandLabel: command?.label,
      contexts: contextLabels,
    };

    this.updateConversation(conversation.id, (currentConversation) => ({
      ...currentConversation,
      agentId: agent.id,
      updatedAt: now,
      preview: messageText,
      messages: [...currentConversation.messages, userMessage],
    }));

    this.activeAgentIdState.set(agent.id);
    this.draftState.set('');
    this.generatingState.set(true);
    this.liveRunState.set(this.createLiveRun(agent, command));
    this.startStepTimer();
    this.bumpScrollVersion();

    const composedPrompt = this.composePrompt(messageText, agent, command, contextLabels);
    this.startStreamingResponse(conversation.id, agent, command, composedPrompt);

    return true;
  }

  private startStreamingResponse(
    conversationId: string,
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
    prompt: string,
  ): void {
    let partialResponse = '';

    const completeWithText = (text: string, error = false): void => {
      this.finishMessage({
        conversationId,
        agent,
        command,
        text: text.trim() || 'I could not generate a response this time.',
        error,
      });
    };

    this.responseSubscription = this.aiService.askStream(prompt).subscribe({
      next: (token) => {
        this.responseModeState.set('live');
        partialResponse += token;
        this.updateLiveRunPartial(partialResponse);
      },
      error: () => {
        if (partialResponse.trim()) {
          completeWithText(partialResponse, true);
          return;
        }

        this.startLegacyResponse(conversationId, agent, command, prompt);
      },
      complete: () => {
        completeWithText(partialResponse);
      },
    });
  }

  private startLegacyResponse(
    conversationId: string,
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
    prompt: string,
  ): void {
    this.responseSubscription = this.aiService.askLegacy(prompt).subscribe({
      next: (result) => {
        this.responseModeState.set('live');
        this.updateLiveRunPartial(result.text);
      },
      error: () => {
        if (!environment.production) {
          this.startLocalPreviewResponse(conversationId, agent, command, prompt);
          return;
        }

        this.finishMessage({
          conversationId,
          agent,
          command,
          text: 'Sorry, something went wrong while generating the answer. Please try again.',
          error: true,
        });
      },
      complete: () => {
        const finalText = this.liveRunState()?.partialResponse ?? '';
        this.finishMessage({
          conversationId,
          agent,
          command,
          text: finalText.trim() || 'I could not generate a response this time.',
        });
      },
    });
  }

  private finishMessage(params: {
    conversationId: string | null;
    agent: AiStudioAgent;
    command?: AiStudioSlashCommand;
    text: string;
    stopped?: boolean;
    error?: boolean;
  }): void {
    const { conversationId, agent, command, text, stopped = false, error = false } = params;
    const now = new Date().toISOString();

    if (conversationId) {
      const assistantMessage: AiStudioMessage = {
        id: this.createId(),
        role: 'assistant',
        content: text,
        createdAt: now,
        agentId: agent.id,
        agentName: agent.name,
        commandId: command?.id,
        commandLabel: command?.label,
        toolLabels: this.resolveToolLabels(agent, command),
        artifacts: this.buildArtifacts(command),
        followUps: this.buildFollowUps(command),
        stopped,
        error,
      };

      this.updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: now,
        preview: this.createPreview(text),
        messages: [...conversation.messages, assistantMessage],
      }));
    }

    this.stopLiveRun();
    this.generatingState.set(false);
    this.liveRunState.set(null);
    this.bumpScrollVersion();
  }

  private ensureConversation(
    firstMessage: string,
    agentId: AiStudioAgentId,
    now: string,
    command?: AiStudioSlashCommand,
  ): AiStudioConversation {
    const activeConversation = this.activeConversation();
    if (activeConversation) {
      return activeConversation;
    }

    const conversation: AiStudioConversation = {
      id: this.createId(),
      title: this.createTitle(firstMessage, command),
      preview: firstMessage,
      createdAt: now,
      updatedAt: now,
      agentId,
      messages: [],
    };

    this.conversationsState.update((conversations) => [conversation, ...conversations]);
    this.activeConversationIdState.set(conversation.id);
    this.persist();

    return conversation;
  }

  private updateConversation(
    conversationId: string,
    updater: (conversation: AiStudioConversation) => AiStudioConversation,
  ): void {
    this.conversationsState.update((conversations) =>
      conversations
        .map((conversation) =>
          conversation.id === conversationId ? updater(conversation) : conversation,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
    this.persist();
  }

  private createLiveRun(
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
  ): AiStudioLiveRun {
    return {
      agentId: agent.id,
      agentName: agent.name,
      commandId: command?.id,
      commandLabel: command?.label,
      tools: this.resolveToolLabels(agent, command),
      partialResponse: '',
      startedAt: new Date().toISOString(),
      steps: [
        {
          id: 'route',
          title: 'Route request',
          detail: command
            ? `Matched ${command.command} and shifted into ${agent.name.toLowerCase()} mode.`
            : `Prepared ${agent.name.toLowerCase()} mode for the request.`,
          status: 'active',
        },
        {
          id: 'context',
          title: 'Gather context',
          detail: 'Collect the right context, preferences, and output shape before writing.',
          status: 'waiting',
        },
        {
          id: 'plan',
          title: 'Plan response',
          detail: 'Sequence the answer, identify tools, and shape the deliverable.',
          status: 'waiting',
        },
        {
          id: 'draft',
          title: 'Draft answer',
          detail: 'Stream the response, refine structure, and keep the thread readable.',
          status: 'waiting',
        },
        {
          id: 'deliver',
          title: 'Deliver result',
          detail: 'Finalize the answer with follow-ups, artifacts, and polish.',
          status: 'waiting',
        },
      ],
    };
  }

  private startStepTimer(): void {
    this.stopStepTimer();

    this.stepTimer = setInterval(() => {
      this.advanceLiveRun();
    }, 1100);
  }

  private advanceLiveRun(): void {
    const liveRun = this.liveRunState();
    if (!liveRun) {
      return;
    }

    const activeIndex = liveRun.steps.findIndex((step) => step.status === 'active');
    if (activeIndex === -1 || activeIndex >= liveRun.steps.length - 2) {
      return;
    }

    this.liveRunState.set({
      ...liveRun,
      steps: liveRun.steps.map((step, index) => ({
        ...step,
        status:
          index < activeIndex + 1
            ? 'complete'
            : index === activeIndex + 1
              ? 'active'
              : 'waiting',
      })),
    });
  }

  private updateLiveRunPartial(text: string): void {
    const liveRun = this.liveRunState();
    if (!liveRun) {
      return;
    }

    this.liveRunState.set({
      ...liveRun,
      partialResponse: text,
      steps: liveRun.steps.map((step, index) => {
        if (index < 3) {
          return { ...step, status: 'complete' };
        }

        if (index === 3) {
          return { ...step, status: 'active' };
        }

        return { ...step, status: 'waiting' };
      }),
    });
  }

  private stopLiveRun(): void {
    this.responseSubscription?.unsubscribe();
    this.responseSubscription = null;
    this.stopStepTimer();
  }

  private stopStepTimer(): void {
    if (!this.stepTimer) {
      return;
    }

    clearInterval(this.stepTimer);
    this.stepTimer = null;
  }

  private currentSlashQuery(): string {
    const draft = this.draftState().trimStart();
    if (!draft.startsWith('/')) {
      return '';
    }

    return draft.slice(1).split(/\s+/)[0]?.toLowerCase() ?? '';
  }

  private parseCommandFromDraft(rawInput: string): {
    command?: AiStudioSlashCommand;
    prompt: string;
  } {
    const trimmed = rawInput.trim();
    if (!trimmed.startsWith('/')) {
      return { prompt: trimmed };
    }

    const [firstToken, ...restParts] = trimmed.split(/\s+/);
    const commandId = firstToken.slice(1) as AiStudioCommandId;
    const command = this.findCommand(commandId);

    if (!command) {
      return { prompt: trimmed };
    }

    return {
      command,
      prompt: restParts.join(' ').trim(),
    };
  }

  private composePrompt(
    messageText: string,
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
    contextLabels: string[],
  ): string {
    const contextLine = contextLabels.length
      ? `Workspace preferences: ${contextLabels.join(', ')}.`
      : '';
    const commandLine = command ? `${command.promptPrefix}` : '';

    return [agent.systemPrompt, contextLine, commandLine, `User request: ${messageText}`]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildArtifacts(command: AiStudioSlashCommand | undefined): AiStudioArtifact[] {
    switch (command?.id) {
      case 'research':
        return [
          { title: 'Findings brief', detail: 'High level synthesis and tradeoffs.', kind: 'brief' },
          { title: 'Follow-up angles', detail: 'Questions worth validating next.', kind: 'checklist' },
        ];
      case 'plan':
        return [
          { title: 'Milestones', detail: 'Suggested phases and workstreams.', kind: 'plan' },
          { title: 'Dependencies', detail: 'What needs alignment before execution.', kind: 'checklist' },
        ];
      case 'build':
        return [
          { title: 'Implementation shape', detail: 'Suggested components and flow.', kind: 'code' },
          { title: 'Acceptance checks', detail: 'Verification ideas before shipping.', kind: 'checklist' },
        ];
      case 'review':
        return [
          { title: 'Risk summary', detail: 'Likely issues and missing cases.', kind: 'brief' },
          { title: 'Fix order', detail: 'Recommended priority for hardening.', kind: 'plan' },
        ];
      case 'summarize':
        return [
          { title: 'Short brief', detail: 'Condensed version of the request.', kind: 'brief' },
          { title: 'Action items', detail: 'What to do next based on the summary.', kind: 'checklist' },
        ];
      default:
        return [
          { title: 'Key takeaway', detail: 'The central point from the answer.', kind: 'brief' },
          { title: 'Next step', detail: 'A practical follow-up move.', kind: 'plan' },
        ];
    }
  }

  private buildFollowUps(command: AiStudioSlashCommand | undefined): string[] {
    switch (command?.id) {
      case 'research':
        return [
          'Turn this into a tighter executive brief.',
          'List the strongest counterarguments.',
          'Convert the findings into a decision table.',
        ];
      case 'plan':
        return [
          'Break this plan into tickets.',
          'Add time estimates and owners.',
          'Highlight the riskiest milestone.',
        ];
      case 'build':
        return [
          'Show the component breakdown.',
          'List the edge cases to test.',
          'Write the first implementation pass.',
        ];
      case 'review':
        return [
          'Prioritize the issues by severity.',
          'Suggest mitigations for each risk.',
          'Turn this into a QA checklist.',
        ];
      case 'summarize':
        return [
          'Make the summary even shorter.',
          'Rewrite it for a stakeholder update.',
          'Extract only the action items.',
        ];
      default:
        return [
          'Give me the short version.',
          'Turn this into a checklist.',
          'Show me the next best step.',
        ];
    }
  }

  private resolveToolLabels(
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
  ): string[] {
    const commandTools = command?.tools ?? [];
    const toolSet = new Set<string>([...commandTools, ...agent.tools]);
    return Array.from(toolSet).slice(0, 4);
  }

  private createTitle(messageText: string, command: AiStudioSlashCommand | undefined): string {
    const baseTitle = messageText.replace(/\s+/g, ' ').trim();
    const prefix = command ? `${command.label}: ` : '';
    const combined = `${prefix}${baseTitle}`;

    if (combined.length <= 50) {
      return combined;
    }

    return `${combined.slice(0, 50)}...`;
  }

  private createPreview(content: string): string {
    const compact = content.replace(/\s+/g, ' ').trim();
    if (compact.length <= 90) {
      return compact;
    }

    return `${compact.slice(0, 90)}...`;
  }

  private findAgent(agentId: AiStudioAgentId): AiStudioAgent | undefined {
    return AI_STUDIO_AGENTS.find((agent) => agent.id === agentId);
  }

  private findCommand(commandId: AiStudioCommandId): AiStudioSlashCommand | undefined {
    return AI_STUDIO_COMMANDS.find((command) => command.id === commandId);
  }

  private findEditorInsert(insertId: AiStudioEditorInsertId): AiStudioEditorInsert | undefined {
    return AI_STUDIO_EDITOR_INSERTS.find((insert) => insert.id === insertId);
  }

  private startLocalPreviewResponse(
    conversationId: string,
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
    prompt: string,
  ): void {
    const previewText = this.buildLocalPreviewResponse(prompt, agent, command);
    this.responseModeState.set('local');

    this.responseSubscription = this.streamLocalPreview(previewText).subscribe({
      next: (token) => {
        const liveRun = this.liveRunState();
        const nextText = `${liveRun?.partialResponse ?? ''}${token}`;
        this.updateLiveRunPartial(nextText);
      },
      error: () => {
        this.finishMessage({
          conversationId,
          agent,
          command,
          text: previewText,
          error: false,
        });
      },
      complete: () => {
        this.finishMessage({
          conversationId,
          agent,
          command,
          text: previewText,
        });
      },
    });
  }

  private streamLocalPreview(text: string): Observable<string> {
    return new Observable<string>((observer) => {
      const tokens = text.match(/\S+\s*/g) ?? [text];
      let index = 0;

      const timer = setInterval(() => {
        if (index >= tokens.length) {
          clearInterval(timer);
          observer.complete();
          return;
        }

        const chunk = tokens.slice(index, index + 3).join('');
        index += 3;
        observer.next(chunk);
      }, 55);

      return () => clearInterval(timer);
    });
  }

  private buildLocalPreviewResponse(
    prompt: string,
    agent: AiStudioAgent,
    command: AiStudioSlashCommand | undefined,
  ): string {
    const request = this.extractUserRequest(prompt);
    const contexts = this.contextChips()
      .filter((chip) => chip.active)
      .map((chip) => chip.label);
    const activeBlocks = this.lastUsedInsert()
      ? [this.lastUsedInsert()!.label]
      : this.editorInserts.slice(0, 3).map((insert) => insert.label);

    const intro = environment.production
      ? ''
      : '> Local preview mode is active because the development AI endpoint is unavailable.\n\n';

    switch (command?.id) {
      case 'research':
        return `${intro}## Research framing

**Request**
${request}

## What to investigate
- Clarify the core use case, audience, and success signal behind the request.
- Compare the strongest implementation or product patterns already visible in the market.
- Separate reusable ideas from things that only work in a narrow context.

## Working angles
- Look for the calm editor pattern: minimal chrome, strong typography, and obvious primary actions.
- Look for agent orchestration patterns: slash modes, specialist roles, visible steps, and resumable runs.
- Look for editor scaffolds: plans, checklists, handoffs, and artifact-driven outputs.

## Output shape
- Lead with a concise recommendation.
- Follow with tradeoffs and implementation notes.
- Close with a prioritized next step list.

## Workspace notes
- Active agent: ${agent.name}
- Active contexts: ${contexts.join(', ') || 'None'}
- Suggested editor blocks: ${activeBlocks.join(', ')}
`;
      case 'plan':
        return `${intro}## Execution plan

**Goal**
${request}

## Milestones
1. Lock the experience architecture: agents, command flows, editor blocks, and response states.
2. Implement the shell: header, navigation rail, thread surface, right inspector, and composer.
3. Wire interactions: send, stop, slash commands, context chips, conversation switching, and progress steps.
4. Harden local behavior: graceful fallback when the AI backend is offline.
5. Verify responsive behavior and polish message rendering, artifacts, and follow-up actions.

## Dependencies
- A stable chat store that owns thread state, current agent, and live run progress.
- Reusable small components with narrow inputs and outputs.
- Tailwind-only styling so layout decisions stay local to the feature.

## Validation checklist
- Send works from button and Enter.
- Stop interrupts an in-flight run.
- Slash commands rewrite the draft and switch agents.
- Editor blocks scaffold structured prompts.
- Progress steps update while streaming is in progress.
`;
      case 'build':
        return `${intro}## Build direction

**Build target**
${request}

## Component breakdown
- ` + '`AiStudioShellComponent`' + `: page orchestration and scrolling.
- ` + '`AiStudioHeaderComponent`' + `: overview, state summary, and top actions.
- ` + '`AiStudioSidebarComponent`' + `: agent switcher and thread history.
- ` + '`AiStudioComposerComponent`' + `: prompt input, slash modes, editor blocks, send/stop controls.
- ` + '`AiStudioRunStatusComponent`' + `: visible step progress and live draft.

## Interaction model
- Keep the editor central and let the support UI orbit around it.
- Make every control actionable, not decorative.
- Preserve momentum by falling back to local preview mode when the development API is offline.

## Engineering notes
- Favor explicit inputs and outputs for each standalone component.
- Keep formatting and layout in Tailwind classes only.
- Store command parsing, streaming state, and preview fallback in the feature store.
`;
      case 'review':
        return `${intro}## Review notes

**Review target**
${request}

## Risks to watch
- Beautiful chrome without reliable send/stop behavior will still feel broken.
- Hidden backend dependencies can make a polished page unusable in local development.
- Too many panels can make the editor feel secondary instead of primary.

## Hardening recommendations
- Add a graceful local preview path for the AI workflow.
- Keep block templates, slash commands, and agent switching keyboard-friendly.
- Ensure the run status reflects real generation states rather than a purely decorative animation.

## Verification
- Test with and without the AI backend.
- Test long prompts and multiline input.
- Test switching agents before and after a conversation begins.
`;
      case 'summarize':
        return `${intro}## Summary

${request}

## Condensed brief
- This workspace is designed around a central editor with agent modes and structured outputs.
- Users can switch workflows with slash commands, scaffold prompts with editor blocks, and watch live progress while answers stream.
- The local preview fallback keeps the experience usable during development when the AI service is offline.

## Next actions
- Use \`/build\` for implementation-heavy requests.
- Use \`/plan\` when you want milestones and QA gates.
- Use \`/review\` to pressure-test the result before shipping.
`;
      default:
        return `${intro}## Working response

**Request**
${request}

## Best next move
- Use ${command?.command ?? '/ask'} when you want a balanced answer.
- Switch to Builder or \`/build\` for implementation-heavy work.
- Add a block like ${activeBlocks[0] ?? 'Plan'} when you want more structure in the editor.

## What this workspace can do
- Agent switching for different response styles.
- Slash commands for workflow changes.
- Send and stop controls for generation.
- Live progress steps while a run is active.
- Structured artifacts, follow-ups, and saved threads.

## Current workspace context
- Active agent: ${agent.name}
- Active contexts: ${contexts.join(', ') || 'None'}
- Available editor blocks: ${activeBlocks.join(', ')}
`;
    }
  }

  private extractUserRequest(prompt: string): string {
    const marker = 'User request:';
    const index = prompt.lastIndexOf(marker);
    if (index === -1) {
      return prompt.trim();
    }

    return prompt.slice(index + marker.length).trim();
  }

  private restore(): void {
    try {
      const rawState = localStorage.getItem(STORAGE_KEY);
      if (rawState) {
        const parsed = JSON.parse(rawState) as Partial<AiStudioPersistedState>;
        const conversations = Array.isArray(parsed.conversations)
          ? parsed.conversations
              .map((conversation) => this.normalizeConversation(conversation))
              .filter((conversation): conversation is AiStudioConversation => !!conversation)
          : [];

        this.conversationsState.set(conversations);
        this.activeConversationIdState.set(
          parsed.activeConversationId && conversations.some((item) => item.id === parsed.activeConversationId)
            ? parsed.activeConversationId
            : conversations[0]?.id ?? null,
        );
        this.activeAgentIdState.set(
          this.findAgent(parsed.activeAgentId ?? DEFAULT_AGENT_ID)?.id ?? DEFAULT_AGENT_ID,
        );
        this.activeContextIdsState.set(this.normalizeContextIds(parsed.activeContextIds));
        return;
      }

      const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!rawLegacy) {
        return;
      }

      const parsedLegacy = JSON.parse(rawLegacy) as LegacyConversation[];
      if (!Array.isArray(parsedLegacy)) {
        return;
      }

      const legacyConversations = parsedLegacy
        .map((conversation) => this.normalizeLegacyConversation(conversation))
        .filter((conversation): conversation is AiStudioConversation => !!conversation);

      this.conversationsState.set(legacyConversations);
      this.activeConversationIdState.set(legacyConversations[0]?.id ?? null);
    } catch {
      this.conversationsState.set([]);
      this.activeConversationIdState.set(null);
    }
  }

  private normalizeConversation(
    raw: Partial<AiStudioConversation>,
  ): AiStudioConversation | null {
    if (!raw.id) {
      return null;
    }

    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .map((message) => this.normalizeMessage(message))
          .filter((message): message is AiStudioMessage => !!message)
      : [];

    const preview =
      typeof raw.preview === 'string' && raw.preview.trim()
        ? raw.preview
        : this.createPreview(messages[messages.length - 1]?.content ?? '');

    return {
      id: raw.id,
      title: raw.title?.trim() || 'New conversation',
      preview,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
      agentId: this.findAgent(raw.agentId ?? DEFAULT_AGENT_ID)?.id ?? DEFAULT_AGENT_ID,
      messages,
    };
  }

  private normalizeLegacyConversation(raw: LegacyConversation): AiStudioConversation | null {
    if (!raw.id) {
      return null;
    }

    const now = new Date().toISOString();
    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .map((message) =>
            this.normalizeMessage({
              id: message.id,
              role: message.role === 'assistant' ? 'assistant' : 'user',
              content: message.content,
              createdAt: message.createdAt,
              agentId: DEFAULT_AGENT_ID,
              agentName: 'Generalist',
            }),
          )
          .filter((message): message is AiStudioMessage => !!message)
      : [];

    return {
      id: raw.id,
      title: raw.title?.trim() || 'New conversation',
      preview: this.createPreview(messages[messages.length - 1]?.content ?? ''),
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
      agentId: DEFAULT_AGENT_ID,
      messages,
    };
  }

  private normalizeMessage(raw: Partial<AiStudioMessage>): AiStudioMessage | null {
    if (typeof raw.content !== 'string' || !raw.content.trim()) {
      return null;
    }

    const agent = this.findAgent(raw.agentId ?? DEFAULT_AGENT_ID) ?? AI_STUDIO_AGENTS[0];
    const command = raw.commandId ? this.findCommand(raw.commandId) : undefined;

    return {
      id: raw.id ?? this.createId(),
      role: raw.role === 'assistant' ? 'assistant' : 'user',
      content: raw.content,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      agentId: agent.id,
      agentName: raw.agentName ?? agent.name,
      commandId: command?.id,
      commandLabel: raw.commandLabel ?? command?.label,
      toolLabels: Array.isArray(raw.toolLabels) ? raw.toolLabels.filter(Boolean) : undefined,
      artifacts: Array.isArray(raw.artifacts) ? raw.artifacts.filter(Boolean) : undefined,
      followUps: Array.isArray(raw.followUps) ? raw.followUps.filter(Boolean) : undefined,
      contexts: Array.isArray(raw.contexts) ? raw.contexts.filter(Boolean) : undefined,
      stopped: !!raw.stopped,
      error: !!raw.error,
    };
  }

  private normalizeContextIds(rawIds: string[] | undefined): string[] {
    if (!Array.isArray(rawIds) || !rawIds.length) {
      return [...DEFAULT_CONTEXT_IDS];
    }

    const validIds = rawIds.filter((id) => AI_STUDIO_CONTEXTS.some((context) => context.id === id));
    return validIds.length ? validIds : [...DEFAULT_CONTEXT_IDS];
  }

  private persist(): void {
    const payload: AiStudioPersistedState = {
      conversations: this.conversationsState(),
      activeConversationId: this.activeConversationIdState(),
      activeAgentId: this.activeAgentIdState(),
      activeContextIds: this.activeContextIdsState(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private bumpScrollVersion(): void {
    this.scrollVersionState.update((value) => value + 1);
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
