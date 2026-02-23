import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Idea, IdeaStatus, IdeaPriority } from '../../model/features.model';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ideas.component.html',
  styleUrl: './ideas.component.css',
})
export class IdeasComponent {
  searchQuery = signal('');
  viewMode = signal<'board' | 'grid'>('board');
  showForm = signal(false);
  editingIdea = signal<Idea | null>(null);

  formData = signal<Partial<Idea>>({
    title: '', description: '', status: 'new', priority: 'medium', category: '', tags: [],
  });
  tagInput = signal('');

  updateField(field: string, value: any) { this.formData.set({ ...this.formData(), [field]: value }); }

  ideas = signal<Idea[]>(MOCK_IDEAS);

  columns: { key: IdeaStatus; label: string; icon: string; color: string }[] = [
    { key: 'new', label: '💡 New', icon: 'lightbulb', color: 'blue' },
    { key: 'exploring', label: '🔍 Exploring', icon: 'search', color: 'violet' },
    { key: 'in-progress', label: '🚧 Building', icon: 'construction', color: 'amber' },
    { key: 'done', label: '✅ Done', icon: 'check_circle', color: 'emerald' },
    { key: 'parked', label: '⏸️ Parked', icon: 'pause', color: 'slate' },
  ];

  priorities: { key: IdeaPriority; label: string; color: string }[] = [
    { key: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    { key: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    { key: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { key: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
  ];

  filteredIdeas = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.ideas();
    return this.ideas().filter(i =>
      i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) ||
      i.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  getColumnIdeas(status: IdeaStatus): Idea[] {
    return this.filteredIdeas().filter(i => i.status === status);
  }

  totalIdeas = computed(() => this.ideas().length);
  activeIdeas = computed(() => this.ideas().filter(i => ['new', 'exploring', 'in-progress'].includes(i.status)).length);
  completedIdeas = computed(() => this.ideas().filter(i => i.status === 'done').length);

  getPriorityClass(priority: IdeaPriority): string {
    return this.priorities.find(p => p.key === priority)?.color || this.priorities[2].color;
  }

  getColumnBgColor(color: string): string {
    const map: Record<string, string> = {
      blue: 'bg-blue-50/50 dark:bg-blue-900/5 border-blue-100 dark:border-blue-900/20',
      violet: 'bg-violet-50/50 dark:bg-violet-900/5 border-violet-100 dark:border-violet-900/20',
      amber: 'bg-amber-50/50 dark:bg-amber-900/5 border-amber-100 dark:border-amber-900/20',
      emerald: 'bg-emerald-50/50 dark:bg-emerald-900/5 border-emerald-100 dark:border-emerald-900/20',
      slate: 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700',
    };
    return map[color] || map['slate'];
  }

  getColumnDotColor(color: string): string {
    const map: Record<string, string> = {
      blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', slate: 'bg-slate-400',
    };
    return map[color] || 'bg-slate-400';
  }

  upvote(idea: Idea) {
    const updated = this.ideas().map(i => i.id === idea.id ? { ...i, votes: (i.votes || 0) + 1 } : i);
    this.ideas.set(updated);
  }

  // Drag and drop
  draggedIdea = signal<Idea | null>(null);

  onDragStart(event: DragEvent, idea: Idea) {
    this.draggedIdea.set(idea);
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', idea.id); }
  }
  onDragOver(event: DragEvent) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; }
  onDrop(event: DragEvent, status: IdeaStatus) {
    event.preventDefault();
    const idea = this.draggedIdea();
    if (idea) {
      const updated = this.ideas().map(i => i.id === idea.id ? { ...i, status } : i);
      this.ideas.set(updated);
      this.draggedIdea.set(null);
    }
  }

  openForm(idea?: Idea) {
    if (idea) {
      this.editingIdea.set(idea);
      this.formData.set({ ...idea, tags: [...(idea.tags || [])] });
    } else {
      this.editingIdea.set(null);
      this.formData.set({ title: '', description: '', status: 'new', priority: 'medium', category: '', tags: [] });
    }
    this.tagInput.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingIdea.set(null); }

  addTag() {
    const t = this.tagInput().trim();
    if (t && !(this.formData().tags || []).includes(t)) {
      this.formData.set({ ...this.formData(), tags: [...(this.formData().tags || []), t] });
      this.tagInput.set('');
    }
  }
  removeTag(tag: string) { this.formData.set({ ...this.formData(), tags: (this.formData().tags || []).filter(t => t !== tag) }); }

  saveIdea() {
    const d = this.formData();
    if (!d.title) return;
    if (this.editingIdea()) {
      const updated = this.ideas().map(i => i.id === this.editingIdea()!.id ? { ...i, ...d } as Idea : i);
      this.ideas.set(updated);
    } else {
      const ni: Idea = {
        id: 'idea-' + Date.now(), title: d.title!, description: d.description || '',
        status: (d.status as IdeaStatus) || 'new', priority: (d.priority as IdeaPriority) || 'medium',
        category: d.category, tags: d.tags || [], votes: 0, createdAt: new Date().toISOString().split('T')[0],
      };
      this.ideas.set([...this.ideas(), ni]);
    }
    this.closeForm();
  }

  deleteIdea(idea: Idea) { this.ideas.set(this.ideas().filter(i => i.id !== idea.id)); }
}

const MOCK_IDEAS: Idea[] = [
  { id: 'i1', title: 'AI-Powered Code Review Tool', description: 'Build a tool that uses LLMs to automatically review PRs and suggest improvements.', status: 'exploring', priority: 'high', category: 'Product', tags: ['ai', 'devtools', 'saas'], votes: 12, createdAt: '2026-02-01' },
  { id: 'i2', title: 'Personal Finance Dashboard', description: 'A comprehensive dashboard for tracking expenses, investments, and budgets with data visualization.', status: 'in-progress', priority: 'medium', category: 'Product', tags: ['finance', 'dashboard', 'charts'], votes: 8, createdAt: '2026-01-20' },
  { id: 'i3', title: 'Interactive CSS Playground', description: 'Web-based tool for experimenting with CSS properties in real-time with live preview.', status: 'new', priority: 'medium', category: 'Tool', tags: ['css', 'playground', 'education'], votes: 15, createdAt: '2026-02-10' },
  { id: 'i4', title: 'Developer Portfolio Templates', description: 'Collection of free, modern developer portfolio templates built with different frameworks.', status: 'new', priority: 'low', category: 'Open Source', tags: ['portfolio', 'templates', 'oss'], votes: 6, createdAt: '2026-02-15' },
  { id: 'i5', title: 'CLI Tool for Boilerplate Generation', description: 'A CLI that scaffolds projects with best practices for various tech stacks.', status: 'done', priority: 'high', category: 'Tool', tags: ['cli', 'scaffolding', 'dx'], votes: 20, createdAt: '2025-12-01' },
  { id: 'i6', title: 'Tech Blog with AI Summaries', description: 'Auto-generate TL;DR summaries for blog posts using AI.', status: 'parked', priority: 'low', category: 'Content', tags: ['blog', 'ai', 'content'], votes: 3, createdAt: '2026-01-05' },
  { id: 'i7', title: 'Micro SaaS: Screenshot API', description: 'API service that takes screenshots of any URL with customizable viewport and format options.', status: 'new', priority: 'urgent', category: 'Product', tags: ['saas', 'api', 'puppeteer'], votes: 9, createdAt: '2026-02-18' },
  { id: 'i8', title: 'Open Source Component Library', description: 'Build an accessible, themeable Angular component library with Tailwind CSS.', status: 'exploring', priority: 'high', category: 'Open Source', tags: ['angular', 'components', 'a11y'], votes: 11, createdAt: '2026-02-08' },
];
