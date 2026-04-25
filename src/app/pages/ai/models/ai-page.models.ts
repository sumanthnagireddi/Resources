export type AiPageMessageRole = 'user' | 'assistant';

export interface AiPageMessage {
  id: string;
  role: AiPageMessageRole;
  content: string;
  createdAt: string;
}

export interface AiPageConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiPageMessage[];
}
