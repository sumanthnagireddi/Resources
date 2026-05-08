import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type SectionId = 'platform' | 'patterns' | 'observability' | 'deploy';
type PatternId = 'support' | 'research' | 'operations';

interface Capability {
  icon: string;
  title: string;
  description: string;
  metric: string;
}

interface AgentPattern {
  id: PatternId;
  name: string;
  label: string;
  summary: string;
  accent: string;
  nodes: string[];
  tools: string[];
  outcomes: string[];
}

interface TimelineStep {
  title: string;
  detail: string;
  status: 'complete' | 'active' | 'waiting';
}

interface Integration {
  name: string;
  detail: string;
}

@Component({
  selector: 'app-agent-platform',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-workspace.component.html',
  styleUrl: './ai-workspace.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiWorkspaceComponent implements OnDestroy {
  readonly activeSection = signal<SectionId>('platform');
  readonly activePattern = signal<PatternId>('support');
  readonly activeTimelineStep = signal(1);
  readonly demoPrompt = signal('Resolve a priority customer issue, check account history, draft a reply, and wait for approval before sending.');
  readonly isDemoRunning = signal(false);

  private demoTimer: ReturnType<typeof setInterval> | null = null;

  readonly navItems: Array<{ id: SectionId; label: string }> = [
    { id: 'platform', label: 'Platform' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'observability', label: 'Observability' },
    { id: 'deploy', label: 'Deploy' },
  ];

  readonly metrics = [
    { value: '99.9%', label: 'stream uptime' },
    { value: '42ms', label: 'trace ingest p50' },
    { value: '18k', label: 'tool calls / min' },
    { value: 'SOC2', label: 'ready controls' },
  ];

  readonly capabilities: Capability[] = [
    {
      icon: 'account_tree',
      title: 'Graph-native control',
      description: 'Model agent workflows as typed state machines with routers, retries, memory, and approval gates.',
      metric: 'Durable by default',
    },
    {
      icon: 'visibility',
      title: 'Full run observability',
      description: 'Inspect every prompt, tool call, token stream, latency spike, and state transition from one trace.',
      metric: 'Span-level detail',
    },
    {
      icon: 'rule',
      title: 'Evaluation loops',
      description: 'Ship with regression tests, grader agents, golden datasets, and release scorecards for every change.',
      metric: 'CI-ready evals',
    },
    {
      icon: 'security',
      title: 'Tool governance',
      description: 'Scope tools by environment, user, workspace, and policy so agents can act without overreaching.',
      metric: 'RBAC + audit log',
    },
  ];

  readonly patterns: AgentPattern[] = [
    {
      id: 'support',
      name: 'Customer Support Agent',
      label: 'Human-in-the-loop',
      summary: 'Triages account context, drafts a response, and pauses for approval before high-impact actions.',
      accent: 'emerald',
      nodes: ['Intent router', 'Account memory', 'Policy checker', 'Draft writer', 'Approval gate'],
      tools: ['CRM lookup', 'Refund API', 'Knowledge base', 'Email composer'],
      outcomes: ['89% auto-triage', '4.2s first token', 'Zero blind sends'],
    },
    {
      id: 'research',
      name: 'Research Analyst Agent',
      label: 'Multi-agent workflow',
      summary: 'Coordinates retrievers, source graders, analysts, and a final synthesis node with citations.',
      accent: 'sky',
      nodes: ['Planner', 'Retriever pool', 'Citation grader', 'Synthesis', 'Fact check'],
      tools: ['Vector search', 'Web fetcher', 'SQL warehouse', 'Report export'],
      outcomes: ['12 sources/run', '93% citation pass', 'Async branches'],
    },
    {
      id: 'operations',
      name: 'Operations Copilot',
      label: 'Durable execution',
      summary: 'Runs long-lived jobs with checkpoints, rollback, escalation rules, and production deployment controls.',
      accent: 'amber',
      nodes: ['Queue intake', 'Risk scorer', 'Executor', 'Rollback', 'Notifier'],
      tools: ['Task queue', 'Feature flags', 'Incident API', 'Slack actions'],
      outcomes: ['24h workflows', 'Replayable state', 'Burst scaling'],
    },
  ];

  readonly timeline: TimelineStep[] = [
    {
      title: 'Route',
      detail: 'Classify intent, risk, user permissions, and required context.',
      status: 'complete',
    },
    {
      title: 'Plan',
      detail: 'Build a controlled graph with model, retrieval, tool, and approval nodes.',
      status: 'active',
    },
    {
      title: 'Act',
      detail: 'Stream tokens and tool calls while persisting checkpoints between steps.',
      status: 'waiting',
    },
    {
      title: 'Evaluate',
      detail: 'Score the run against policies, task success, latency, and cost budgets.',
      status: 'waiting',
    },
    {
      title: 'Deploy',
      detail: 'Promote the assistant with versioning, canaries, rollback, and audit logs.',
      status: 'waiting',
    },
  ];

  readonly integrations: Integration[] = [
    { name: 'OpenAI', detail: 'models and structured outputs' },
    { name: 'Anthropic', detail: 'reasoning and tool use' },
    { name: 'Postgres', detail: 'state, memory, and audit trails' },
    { name: 'Pinecone', detail: 'retrieval for agent context' },
    { name: 'Slack', detail: 'human approvals and alerts' },
    { name: 'LangSmith', detail: 'traces, evals, and datasets' },
  ];

  readonly activePatternData = computed(() => {
    return this.patterns.find((pattern) => pattern.id === this.activePattern()) ?? this.patterns[0];
  });

  readonly visibleTimeline = computed(() => {
    const activeIndex = this.activeTimelineStep();
    return this.timeline.map((step, index) => ({
      ...step,
      status: index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'waiting',
    }));
  });

  ngOnDestroy(): void {
    this.stopDemo();
  }

  setSection(section: SectionId): void {
    this.activeSection.set(section);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  selectPattern(pattern: PatternId): void {
    this.activePattern.set(pattern);
  }

  runDemo(): void {
    this.stopDemo();
    this.isDemoRunning.set(true);
    this.activeTimelineStep.set(0);

    this.demoTimer = setInterval(() => {
      const nextStep = this.activeTimelineStep() + 1;
      if (nextStep >= this.timeline.length) {
        this.activeTimelineStep.set(this.timeline.length - 1);
        this.isDemoRunning.set(false);
        this.stopDemo();
        return;
      }
      this.activeTimelineStep.set(nextStep);
    }, 850);
  }

  private stopDemo(): void {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
  }
}
