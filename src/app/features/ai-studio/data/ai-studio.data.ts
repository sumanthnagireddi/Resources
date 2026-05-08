import {
  AiStudioAgent,
  AiStudioContextChip,
  AiStudioEditorInsert,
  AiStudioSlashCommand,
  AiStudioStarterPrompt,
} from '../models/ai-studio.models';

export const AI_STUDIO_AGENTS: AiStudioAgent[] = [
  {
    id: 'generalist',
    name: 'Copilot',
    badge: 'Default',
    subtitle: 'Workspace help for drafting, summarizing, and planning',
    description:
      'A calm editorial copilot for turning rough notes, prompts, and ideas into sharper deliverables across your workspace.',
    tools: ['Thread memory', 'Writing pass', 'Artifact shaping'],
    systemPrompt:
      'Respond like a thoughtful editorial assistant. Be calm, structured, practical, and polished, with crisp next steps.',
    icon: 'auto_awesome',
    accent: '#b56b44',
  },
  {
    id: 'research',
    name: 'Research',
    badge: 'Citations',
    subtitle: 'Deep dives, topic synthesis, and interview prep',
    description:
      'Best for knowledge-page analysis, interview prep, comparisons, and structured research when you need a sharper point of view.',
    tools: ['Retriever', 'Source grader', 'Insight framing'],
    systemPrompt:
      'Approach the request like a research analyst. Structure the answer with concise findings, assumptions, and follow-up questions only when necessary.',
    icon: 'travel_explore',
    accent: '#3f7c86',
  },
  {
    id: 'builder',
    name: 'Builder',
    badge: 'Execution',
    subtitle: 'Implementation-first, Angular-aware, and production-minded',
    description:
      'Use this when you want component structure, state flow, API shape, delivery sequencing, and clearer acceptance criteria.',
    tools: ['Planner', 'Code generator', 'Task splitter'],
    systemPrompt:
      'Act like a product engineer. Favor clear implementation sequences, edge cases, and production minded details.',
    icon: 'architecture',
    accent: '#4b7a5d',
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    badge: 'Risk',
    subtitle: 'Critique, QA, and edge cases before handoff',
    description:
      'Helpful for surfacing regressions, finding UX gaps, and hardening notes, UI work, or feature briefs before you hand them off or ship them.',
    tools: ['Risk scan', 'Regression checklist', 'Test pass'],
    systemPrompt:
      'Review answers critically. Call out likely risks, blind spots, and verification steps without sounding harsh.',
    icon: 'fact_check',
    accent: '#8c5a52',
  },
];

export const AI_STUDIO_COMMANDS: AiStudioSlashCommand[] = [
  {
    id: 'ask',
    command: '/ask',
    label: 'Ask',
    description: 'General free-form conversation with balanced detail and clean structure.',
    example: '/ask Explain the tradeoffs between NgRx and signal stores.',
    suggestedAgentId: 'generalist',
    tools: ['Thread memory', 'Formatting pass'],
    promptPrefix: 'Answer as a polished assistant and keep the explanation practical.',
  },
  {
    id: 'research',
    command: '/research',
    label: 'Research',
    description: 'Investigate a topic, gather angles, and synthesize a recommendation.',
    example: '/research Compare local first note apps for engineering teams.',
    suggestedAgentId: 'research',
    tools: ['Retriever', 'Source grader', 'Outline builder'],
    promptPrefix: 'Treat this as a research request. Synthesize the topic into findings, tradeoffs, and a practical recommendation.',
  },
  {
    id: 'plan',
    command: '/plan',
    label: 'Plan',
    description: 'Turn an idea into milestones, workstreams, handoffs, and deliverables.',
    example: '/plan Redesign our AI dashboard for recruiting teams.',
    suggestedAgentId: 'builder',
    tools: ['Planner', 'Sequencer', 'Dependency checker'],
    promptPrefix: 'Create an execution-ready plan with milestones, dependencies, and suggested next actions.',
  },
  {
    id: 'build',
    command: '/build',
    label: 'Build',
    description: 'Focus on implementation details, code shape, and production delivery.',
    example: '/build Create an Angular workspace with agents and slash commands.',
    suggestedAgentId: 'builder',
    tools: ['Code generator', 'Task splitter', 'Acceptance checklist'],
    promptPrefix: 'Focus on implementation details, component structure, and delivery quality.',
  },
  {
    id: 'review',
    command: '/review',
    label: 'Review',
    description: 'Critique an idea, code path, or document for risk, regressions, and gaps.',
    example: '/review Evaluate this feature brief before I share it with the team.',
    suggestedAgentId: 'reviewer',
    tools: ['Risk scan', 'Regression checklist', 'Test pass'],
    promptPrefix: 'Review the request critically. Highlight risks, missing cases, and how to harden the result.',
  },
  {
    id: 'summarize',
    command: '/summarize',
    label: 'Summarize',
    description: 'Condense something into a clean brief with action items and decisions.',
    example: '/summarize Turn this long update into a sharp status brief.',
    suggestedAgentId: 'generalist',
    tools: ['Condense', 'Action extraction', 'Formatting pass'],
    promptPrefix: 'Condense the material into a clean summary with action items and next decisions.',
  },
];

export const AI_STUDIO_CONTEXTS: Array<Omit<AiStudioContextChip, 'active'>> = [
  {
    id: 'repo',
    label: 'Repo memory',
    icon: 'deployed_code',
    detail: 'Prefer code-aware reasoning and implementation details.',
  },
  {
    id: 'knowledge',
    label: 'Knowledge pages',
    icon: 'article',
    detail: 'Favor note-aware explanations tied to your saved topics and pages.',
  },
  {
    id: 'interview',
    label: 'Interview mode',
    icon: 'school',
    detail: 'Bias answers toward prep notes, questions, and concise recall.',
  },
  {
    id: 'artifacts',
    label: 'Structured outputs',
    icon: 'inventory_2',
    detail: 'Return plans, checklists, or structured deliverables where helpful.',
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    icon: 'policy',
    detail: 'Bias toward explicit assumptions, checks, and confidence framing.',
  },
];

export const AI_STUDIO_EDITOR_INSERTS: AiStudioEditorInsert[] = [
  {
    id: 'ask',
    label: 'Prompt',
    description: 'Start with a clean natural-language request.',
    icon: 'edit_note',
    template:
      '/ask Rewrite this request into a sharper prompt with a clearer outcome, stronger constraints, and a cleaner structure for:\n',
    suggestedAgentId: 'generalist',
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Milestones, owners, risks, and delivery order.',
    icon: 'account_tree',
    template:
      '/plan Build an execution-ready plan with milestones, dependencies, and acceptance checks for:\n',
    suggestedAgentId: 'builder',
  },
  {
    id: 'code',
    label: 'Code',
    description: 'Implementation shape, states, and edge cases.',
    icon: 'code_blocks',
    template:
      '/build Implement this with small readable components, state flow, and verification steps:\n',
    suggestedAgentId: 'builder',
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Comparisons, specs, and tradeoff grids.',
    icon: 'table_chart',
    template:
      'Create a comparison table for this topic:\n\n| Option | Best for | Tradeoffs |\n| --- | --- | --- |\n',
    suggestedAgentId: 'research',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'Launch lists, QA passes, and handoff tasks.',
    icon: 'checklist',
    template:
      'Turn this into a launch checklist with concrete acceptance checks:\n\n- ',
    suggestedAgentId: 'reviewer',
  },
  {
    id: 'brief',
    label: 'Brief',
    description: 'Decision notes, summaries, and shareable writeups.',
    icon: 'description',
    template:
      '/summarize Summarize this into a concise brief with decisions, risks, and next actions:\n',
    suggestedAgentId: 'generalist',
  },
  {
    id: 'image',
    label: 'Image brief',
    description: 'Visual direction, layout notes, and UI intent.',
    icon: 'image',
    template:
      '/build Create a UI direction for this feature. Include layout, visual system, states, and responsive behavior for:\n',
    suggestedAgentId: 'builder',
  },
  {
    id: 'handoff',
    label: 'Handoff',
    description: 'Turn a rough idea into build-ready instructions.',
    icon: 'assignment',
    template:
      '/review Review this feature request for gaps, then rewrite it as a build-ready handoff:\n',
    suggestedAgentId: 'reviewer',
  },
];

export const AI_STUDIO_STARTER_PROMPTS: AiStudioStarterPrompt[] = [
  {
    title: 'Turn notes into interview prep',
    detail: 'Convert a topic page into concise Q&A, flash points, and follow-up prompts.',
    prompt:
      'Turn one of my knowledge pages into interview-ready notes with core concepts, likely questions, concise answers, and follow-up study tasks.',
  },
  {
    title: 'Plan an Angular feature',
    detail: 'Break a UI or feature idea into components, state, milestones, and QA checks.',
    prompt:
      'Create an Angular implementation plan for a new feature with components, state flow, API needs, acceptance criteria, and verification steps.',
  },
  {
    title: 'Draft a blog from a doc',
    detail: 'Turn rough notes into a clearer article structure with title and sections.',
    prompt:
      'Take a rough technical note and turn it into a blog-ready outline with a stronger title, intro, sections, and a practical conclusion.',
  },
  {
    title: 'Generate snippets and test ideas',
    detail: 'Pull reusable code and validation ideas out of a topic or feature brief.',
    prompt:
      'Extract reusable code snippets, edge cases, and test ideas from this feature or technical note.',
  },
  {
    title: 'Review a handoff before build',
    detail: 'Pressure-test scope, UX gaps, and missing behaviors before implementation.',
    prompt:
      'Review this feature handoff and call out missing states, risky assumptions, edge cases, and the best next fixes before development starts.',
  },
  {
    title: 'Shape a roadmap slice',
    detail: 'Organize an idea into milestones, outcomes, and dependencies.',
    prompt:
      'Turn this product idea into a roadmap slice with outcomes, milestones, dependencies, and what should happen first.',
  },
];
