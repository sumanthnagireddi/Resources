import { SPINNER_VERBS } from '../../../model/spinnerVerbs';
import { AiAgent, AiAgentId } from '../models/ai-chat.models';

export const AI_CHAT_STORAGE_KEY = 'aria_chats_v2';

export const AI_CHAT_AGENTS: AiAgent[] = [
  {
    id: 'general',
    label: 'Copilot',
    subtitle: 'Balanced everyday help',
    description: 'Fast, polished answers for learning, writing, planning, and product thinking.',
    badge: 'Everyday',
    accent: '#c97b4b',
    systemPrompt:
      'You are a polished AI copilot. Be concise, warm, practical, and clear. Structure answers when helpful and keep momentum high.',
    welcomePrompts: [
      'Explain angular forms in simple terms',
      'Summarize a topic into interview-ready notes',
      'Help me plan a feature from idea to rollout',
      'Turn rough thoughts into a clear action list',
    ],
  },
  {
    id: 'research',
    label: 'Researcher',
    subtitle: 'Deeper synthesis and tradeoffs',
    description: 'Great for comparisons, technical investigation, structured notes, and decision support.',
    badge: 'Deep dive',
    accent: '#6f61ff',
    systemPrompt:
      'You are a research agent. Break problems into themes, compare tradeoffs, surface assumptions, and call out unknowns clearly.',
    welcomePrompts: [
      'Compare Angular signals and RxJS for state flows',
      'Research patterns for agentic AI interfaces',
      'Create a concise market scan for this idea',
      'List tradeoffs between monolith and modular architecture',
    ],
  },
  {
    id: 'builder',
    label: 'Builder',
    subtitle: 'Implementation-first execution',
    description: 'Best when you want code, architecture steps, refactors, UI breakdowns, or delivery plans.',
    badge: 'Ship it',
    accent: '#0f9d7a',
    systemPrompt:
      'You are a senior implementation agent. Prefer concrete steps, code-oriented reasoning, crisp architecture, and practical delivery guidance.',
    welcomePrompts: [
      'Refactor this feature into standalone Angular components',
      'Design a scalable chat state model for multi-agent support',
      'Generate a rollout checklist for productionizing this module',
      'Help me architect a reusable chatbot feature area',
    ],
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    subtitle: 'Quality, bugs, and edge cases',
    description: 'Use this for code reviews, testing gaps, regressions, risk analysis, and hardening plans.',
    badge: 'Quality',
    accent: '#e07b4b',
    systemPrompt:
      'You are a sharp reviewer. Focus on bugs, regressions, edge cases, validation, maintainability, and testing gaps. Be direct and specific.',
    welcomePrompts: [
      'Review this design for UX and edge cases',
      'List likely bugs in a streaming chat experience',
      'Suggest tests for a standalone AI module',
      'Find weak spots in this implementation plan',
    ],
  },
];

export const AI_AGENT_MAP = AI_CHAT_AGENTS.reduce(
  (acc, agent) => {
    acc[agent.id] = agent;
    return acc;
  },
  {} as Record<AiAgentId, AiAgent>,
);

export const AI_THINKING_STATES = [
  'Mapping context',
  'Reading your intent',
  'Drafting the first pass',
  'Refining the answer',
  'Checking clarity',
  'Tightening the output',
  'Assembling the final response',
];

export const AI_SPINNER_STATES = [...AI_THINKING_STATES, ...SPINNER_VERBS];
