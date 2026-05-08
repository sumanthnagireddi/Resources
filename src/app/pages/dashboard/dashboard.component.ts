import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, map, of } from 'rxjs';
import { Technology } from '../../model/content.model';
import { CodeSnippet, LanguageConfig } from '../../model/snippet.model';
import { getTechnologies } from '../../store/actions/technology.actions';
import { loadRecentVisited, loadTopContents } from '../../store/actions/content.actions';
import { selectRecentContents, selectTopContents } from '../../store/selectors/content.selector';
import { selectStarredCount } from '../../store/selectors/starred.selector';
import { selectTechnologies } from '../../store/selectors/technology.selector';
import { BlogsService } from '../../services/blogs.service';
import { DashboardService, ActivityItem } from '../../services/dashboard.service';
import { MonthSummary } from '../../model/finance.model';

type WorkspaceAction = {
  id: string;
  label: string;
  route: string;
  icon: string;
  primary?: boolean;
};

type WorkspaceModule = {
  id: string;
  label: string;
  route: string;
  icon: string;
  description: string;
  metric: string;
  tone: string;
  iconTone: string;
};

type CollectionLink = {
  id: string;
  label: string;
  route: string;
  icon: string;
  description: string;
};

const EMPTY_FINANCE_SUMMARY: MonthSummary = {
  month: '',
  totalSpent: 0,
  budget: 0,
  remaining: 0,
  percentUsed: 0,
  categoryBreakdown: [],
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly blogsService = inject(BlogsService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  technologies = signal<Technology[]>([]);
  topContents = signal<any[]>([]);
  recentContents = signal<any[]>([]);
  starredCount = signal(0);
  blogsCount = signal(0);
  snippetStats = signal({ total: 0, favorites: 0, languages: 0, tags: 0 });
  financeSummary = signal<MonthSummary>(EMPTY_FINANCE_SUMMARY);
  snippetsByLanguage = signal<
    { language: string; count: number; config: LanguageConfig }[]
  >([]);
  recentSnippets = signal<CodeSnippet[]>([]);
  activityLog = signal<ActivityItem[]>([]);
  totalTopics = signal(0);
  isLoading = signal(true);

  readonly greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  readonly todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  readonly topicMetaById = computed(() => {
    const topicMap = new Map<
      string,
      { technologyName: string; topicName: string }
    >();

    for (const tech of this.technologies()) {
      for (const topic of tech.topics ?? []) {
        topicMap.set(topic._id, {
          technologyName: tech.name,
          topicName: topic.name,
        });
      }
    }

    return topicMap;
  });

  readonly recentWorkspaceDocs = computed(() => {
    const recent = this.recentContents();
    const top = this.topContents();
    return (recent.length ? recent : top).slice(0, 5);
  });

  readonly spotlightDocs = computed(() => this.topContents().slice(0, 4));

  readonly technologyHighlights = computed(() =>
    this.technologies().slice(0, 6),
  );

  readonly activityPreview = computed(() => this.activityLog().slice(0, 7));

  readonly workspaceActions = computed<WorkspaceAction[]>(() => [
    {
      id: 'ask-ai',
      label: 'Ask AI',
      route: '/ai',
      icon: 'auto_awesome',
      primary: true,
    },
    {
      id: 'agents',
      label: 'Open agents',
      route: '/agents',
      icon: 'deployed_code',
    },
    {
      id: 'recent',
      label: 'Recent docs',
      route: '/recent',
      icon: 'schedule',
    },
    {
      id: 'snippets',
      label: 'Browse snippets',
      route: '/snippets',
      icon: 'data_object',
    },
    {
      id: 'ideas',
      label: 'Capture ideas',
      route: '/ideas',
      icon: 'lightbulb',
    },
  ]);

  readonly workspaceModules = computed<WorkspaceModule[]>(() => [
    {
      id: 'ai',
      label: 'AI Copilot',
      route: '/ai',
      icon: 'auto_awesome',
      description: 'Draft, refine, and expand notes with your in-app copilot.',
      metric: 'Prompt workspace',
      tone:
        'from-violet-500/14 via-violet-500/6 to-sky-500/10 dark:from-violet-500/16 dark:via-violet-500/5 dark:to-sky-500/10',
      iconTone:
        'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    },
    {
      id: 'agents',
      label: 'Agents',
      route: '/agents',
      icon: 'deployed_code',
      description: 'Run multi-step flows and keep AI work organized.',
      metric: 'Execution lane',
      tone:
        'from-sky-500/14 via-sky-500/6 to-cyan-500/10 dark:from-sky-500/16 dark:via-sky-500/5 dark:to-cyan-500/10',
      iconTone:
        'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    },
    {
      id: 'snippets',
      label: 'Snippets',
      route: '/snippets',
      icon: 'data_object',
      description: 'Keep reusable code close to the docs where you need it.',
      metric: `${this.snippetStats().total} saved`,
      tone:
        'from-indigo-500/14 via-indigo-500/6 to-blue-500/10 dark:from-indigo-500/16 dark:via-indigo-500/5 dark:to-blue-500/10',
      iconTone:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
    },
    {
      id: 'blogs',
      label: 'Blogs',
      route: '/blogs',
      icon: 'post_add',
      description: 'Turn notes into publishable write-ups and longer explainers.',
      metric: `${this.blogsCount()} published`,
      tone:
        'from-emerald-500/14 via-emerald-500/6 to-teal-500/10 dark:from-emerald-500/16 dark:via-emerald-500/5 dark:to-teal-500/10',
      iconTone:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    },
    {
      id: 'roadmap',
      label: 'Roadmap',
      route: '/roadmap',
      icon: 'map',
      description: 'Track what to learn next and keep the long-term path visible.',
      metric: 'Learning plan',
      tone:
        'from-amber-500/14 via-amber-500/6 to-orange-500/10 dark:from-amber-500/16 dark:via-amber-500/5 dark:to-orange-500/10',
      iconTone:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    },
    {
      id: 'interview-bank',
      label: 'Interview Bank',
      route: '/interview-bank',
      icon: 'school',
      description: 'Keep interview prep, prompts, and high-signal references together.',
      metric: 'Prep center',
      tone:
        'from-rose-500/14 via-rose-500/6 to-pink-500/10 dark:from-rose-500/16 dark:via-rose-500/5 dark:to-pink-500/10',
      iconTone:
        'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
    },
  ]);

  readonly collectionLinks = computed<CollectionLink[]>(() => [
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      route: '/bookmarks',
      icon: 'bookmarks',
      description: 'Curated external references and saved links.',
    },
    {
      id: 'starred',
      label: 'Starred docs',
      route: '/starred',
      icon: 'star',
      description: `${this.starredCount()} saved items ready to revisit.`,
    },
    {
      id: 'ideas',
      label: 'Idea board',
      route: '/ideas',
      icon: 'lightbulb',
      description: 'Loose concepts, experiments, and future builds.',
    },
    {
      id: 'finance',
      label: 'Finance',
      route: '/finance',
      icon: 'account_balance_wallet',
      description: 'Budget snapshot and monthly spending context.',
    },
  ]);

  ngOnInit(): void {
    this.store.dispatch(getTechnologies());
    this.store.dispatch(loadTopContents());
    this.store.dispatch(loadRecentVisited());

    this.store.select(selectTechnologies).subscribe((techs) => {
      this.technologies.set(techs);
      const topicCount = techs.reduce(
        (sum: number, tech: Technology) => sum + (tech.topics?.length || 0),
        0,
      );
      this.totalTopics.set(topicCount);
      this.isLoading.set(false);
    });

    this.store.select(selectTopContents).subscribe((contents) => {
      this.topContents.set(contents);
    });

    this.store.select(selectRecentContents).subscribe((contents) => {
      this.recentContents.set(contents);
    });

    this.store.select(selectStarredCount).subscribe((count) => {
      this.starredCount.set(count);
    });

    this.snippetStats.set(this.dashboardService.getSnippetStats());
    this.snippetsByLanguage.set(this.dashboardService.getSnippetsByLanguage());
    this.recentSnippets.set(this.dashboardService.getRecentSnippets(4));
    this.activityLog.set(this.dashboardService.getActivityLog());

    this.dashboardService
      .getCurrentMonthSummary()
      .pipe(catchError(() => of(EMPTY_FINANCE_SUMMARY)))
      .subscribe((summary) => {
        this.financeSummary.set(summary);
      });

    this.blogsService
      .getBlogsFromMongo()
      .pipe(
        map((blogs: any) => blogs?.length || 0),
        catchError(() => of(0)),
      )
      .subscribe((count) => this.blogsCount.set(count));
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  navigateToContent(item: any): void {
    const topicId = item?.topicId || item?.id || item?._id;
    if (!topicId) {
      return;
    }

    this.router.navigate([`/pages/${topicId}`]);
  }

  openTechnology(tech: Technology): void {
    const firstTopicId = tech.topics?.[0]?._id;
    if (firstTopicId) {
      this.router.navigate([`/pages/${firstTopicId}`]);
      return;
    }

    this.router.navigate(['/recent']);
  }

  getTimeAgo(timestamp: unknown): string {
    const date = this.toDate(timestamp);
    if (!date) {
      return 'Not updated';
    }

    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;

    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  getProgressColor(pct: number): string {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-accent';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getContentTitle(item: any): string {
    return (
      item?.title ||
      this.topicMetaById().get(item?.topicId)?.topicName ||
      'Untitled note'
    );
  }

  getContentContext(item: any): string {
    const meta = this.topicMetaById().get(item?.topicId);
    if (meta) {
      return `${meta.technologyName} / ${meta.topicName}`;
    }

    if (item?.topicId) {
      return `Topic ${item.topicId}`;
    }

    return 'Knowledge base';
  }

  getContentTime(timestamp: unknown): string {
    return this.getTimeAgo(timestamp);
  }

  getContentExcerpt(item: any): string {
    const body = item?.body;
    if (!body) {
      return 'Open this note to continue working on it.';
    }

    if (typeof body !== 'string') {
      return 'Structured Atlas document ready in the editor.';
    }

    const plainText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plainText) {
      return 'Open this note to continue working on it.';
    }

    return plainText.length > 110
      ? `${plainText.slice(0, 110).trim()}...`
      : plainText;
  }

  getTechnologyTopicShare(topicCount: number): number {
    if (this.totalTopics() === 0) {
      return 0;
    }

    return (topicCount / this.totalTopics()) * 100;
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const candidate = value as {
      toDate?: () => Date;
      seconds?: number;
    };

    if (typeof candidate.toDate === 'function') {
      const parsed = candidate.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof candidate.seconds === 'number') {
      const parsed = new Date(candidate.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }
}
