export type AiAgentId = 'general' | 'research' | 'builder' | 'reviewer';

export type AiMessageRole = 'user' | 'assistant';

export type AiMessageStatus = 'complete' | 'streaming' | 'error' | 'stopped';

export type AiReaction = 'up' | 'down' | null;

export interface AiAgent {
  id: AiAgentId;
  label: string;
  subtitle: string;
  description: string;
  badge: string;
  accent: string;
  systemPrompt: string;
  welcomePrompts: string[];
}

export interface AiComposerOptions {
  webSearch: boolean;
  deepThink: boolean;
}

export interface AiAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: 'text' | 'image' | 'file';
  status: 'ready' | 'limited';
  extractedText?: string;
  previewUrl?: string;
}

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
  status: AiMessageStatus;
  agentId: AiAgentId;
  reaction: AiReaction;
  attachments: AiAttachment[];
  options?: AiComposerOptions;
  errorMessage?: string;
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  agentId: AiAgentId;
  pinned: boolean;
  messages: AiChatMessage[];
}
