export type AiStudioAgentId = 'generalist' | 'research' | 'builder' | 'reviewer';

export type AiStudioCommandId =
  | 'ask'
  | 'research'
  | 'plan'
  | 'build'
  | 'review'
  | 'summarize';

export type AiStudioMessageRole = 'user' | 'assistant';

export type AiStudioArtifactKind = 'brief' | 'plan' | 'code' | 'checklist';

export type AiStudioRunStepStatus = 'complete' | 'active' | 'waiting' | 'cancelled';

export type AiStudioEditorInsertId =
  | 'ask'
  | 'plan'
  | 'code'
  | 'table'
  | 'checklist'
  | 'brief'
  | 'image'
  | 'handoff';

export interface AiStudioAgent {
  id: AiStudioAgentId;
  name: string;
  badge: string;
  subtitle: string;
  description: string;
  tools: string[];
  systemPrompt: string;
  icon: string;
  accent: string;
}

export interface AiStudioSlashCommand {
  id: AiStudioCommandId;
  command: `/${string}`;
  label: string;
  description: string;
  example: string;
  suggestedAgentId: AiStudioAgentId;
  tools: string[];
  promptPrefix: string;
}

export interface AiStudioContextChip {
  id: string;
  label: string;
  icon: string;
  detail: string;
  active: boolean;
}

export interface AiStudioStarterPrompt {
  title: string;
  detail: string;
  prompt: string;
}

export interface AiStudioEditorInsert {
  id: AiStudioEditorInsertId;
  label: string;
  description: string;
  icon: string;
  template: string;
  suggestedAgentId: AiStudioAgentId;
}

export interface AiStudioArtifact {
  title: string;
  detail: string;
  kind: AiStudioArtifactKind;
}

export interface AiStudioMessage {
  id: string;
  role: AiStudioMessageRole;
  content: string;
  createdAt: string;
  agentId: AiStudioAgentId;
  agentName: string;
  commandId?: AiStudioCommandId;
  commandLabel?: string;
  toolLabels?: string[];
  artifacts?: AiStudioArtifact[];
  followUps?: string[];
  contexts?: string[];
  stopped?: boolean;
  error?: boolean;
}

export interface AiStudioConversation {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  agentId: AiStudioAgentId;
  messages: AiStudioMessage[];
}

export interface AiStudioRunStep {
  id: string;
  title: string;
  detail: string;
  status: AiStudioRunStepStatus;
}

export interface AiStudioLiveRun {
  agentId: AiStudioAgentId;
  agentName: string;
  commandId?: AiStudioCommandId;
  commandLabel?: string;
  tools: string[];
  steps: AiStudioRunStep[];
  partialResponse: string;
  startedAt: string;
}

export interface AiStudioPersistedState {
  conversations: AiStudioConversation[];
  activeConversationId: string | null;
  activeAgentId: AiStudioAgentId;
  activeContextIds: string[];
}
