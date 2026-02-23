import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Bookmark } from '../../model/features.model';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookmarks.component.html',
  styleUrl: './bookmarks.component.css',
})
export class BookmarksComponent {
  searchQuery = signal('');
  activeCategory = signal('all');
  viewMode = signal<'grid' | 'list'>('grid');
  showForm = signal(false);
  editingBookmark = signal<Bookmark | null>(null);

  formData = signal<Partial<Bookmark>>({
    title: '', url: '', description: '', category: 'Development', tags: [], isPinned: false,
  });
  tagInput = signal('');

  updateField(field: string, value: any) { this.formData.set({ ...this.formData(), [field]: value }); }

  bookmarks = signal<Bookmark[]>(MOCK_BOOKMARKS);

  categories = computed(() => {
    const cats = new Set(this.bookmarks().map(b => b.category));
    return ['all', ...Array.from(cats).sort()];
  });

  filteredBookmarks = computed(() => {
    let items = this.bookmarks();
    const q = this.searchQuery().toLowerCase();
    const cat = this.activeCategory();
    if (q) items = items.filter(b =>
      b.title.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) || b.tags?.some(t => t.toLowerCase().includes(q))
    );
    if (cat !== 'all') items = items.filter(b => b.category === cat);
    // Pinned first
    return [...items.filter(b => b.isPinned), ...items.filter(b => !b.isPinned)];
  });

  totalCount = computed(() => this.bookmarks().length);
  pinnedCount = computed(() => this.bookmarks().filter(b => b.isPinned).length);

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      'Development': 'code', 'Design': 'palette', 'Learning': 'school', 'Tools': 'build',
      'Articles': 'article', 'Videos': 'play_circle', 'Documentation': 'menu_book', 'Career': 'trending_up',
    };
    return map[cat] || 'bookmark';
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      'Development': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'Design': 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
      'Learning': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Tools': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      'Articles': 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
      'Videos': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      'Documentation': 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
      'Career': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
    return map[cat] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  }

  getDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  }

  togglePin(bookmark: Bookmark) {
    const updated = this.bookmarks().map(b => b.id === bookmark.id ? { ...b, isPinned: !b.isPinned } : b);
    this.bookmarks.set(updated);
  }

  openForm(bookmark?: Bookmark) {
    if (bookmark) {
      this.editingBookmark.set(bookmark);
      this.formData.set({ ...bookmark, tags: [...(bookmark.tags || [])] });
    } else {
      this.editingBookmark.set(null);
      this.formData.set({ title: '', url: '', description: '', category: 'Development', tags: [], isPinned: false });
    }
    this.tagInput.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingBookmark.set(null); }

  addTag() {
    const t = this.tagInput().trim();
    if (t && !(this.formData().tags || []).includes(t)) {
      this.formData.set({ ...this.formData(), tags: [...(this.formData().tags || []), t] });
      this.tagInput.set('');
    }
  }

  removeTag(tag: string) {
    this.formData.set({ ...this.formData(), tags: (this.formData().tags || []).filter(t => t !== tag) });
  }

  saveBookmark() {
    const d = this.formData();
    if (!d.title || !d.url) return;
    if (this.editingBookmark()) {
      const updated = this.bookmarks().map(b => b.id === this.editingBookmark()!.id ? { ...b, ...d } as Bookmark : b);
      this.bookmarks.set(updated);
    } else {
      const nb: Bookmark = {
        id: 'bm-' + Date.now(), title: d.title!, url: d.url!, description: d.description,
        category: d.category || 'Development', tags: d.tags || [], isPinned: d.isPinned || false,
        createdAt: new Date().toISOString().split('T')[0],
      };
      this.bookmarks.set([...this.bookmarks(), nb]);
    }
    this.closeForm();
  }

  deleteBookmark(b: Bookmark) { this.bookmarks.set(this.bookmarks().filter(x => x.id !== b.id)); }
}

const MOCK_BOOKMARKS: Bookmark[] = [
  { id: 'b1', title: 'Angular Documentation', url: 'https://angular.dev', description: 'Official Angular documentation and guides', category: 'Documentation', tags: ['angular', 'official'], isPinned: true, createdAt: '2026-01-15' },
  { id: 'b2', title: 'Tailwind CSS', url: 'https://tailwindcss.com', description: 'Utility-first CSS framework', category: 'Documentation', tags: ['css', 'tailwind'], isPinned: true, createdAt: '2026-01-10' },
  { id: 'b3', title: 'JavaScript.info', url: 'https://javascript.info', description: 'The Modern JavaScript Tutorial', category: 'Learning', tags: ['javascript', 'tutorial'], isPinned: false, createdAt: '2026-01-20' },
  { id: 'b4', title: 'Figma', url: 'https://figma.com', description: 'Collaborative design tool', category: 'Design', tags: ['design', 'ui'], isPinned: false, createdAt: '2026-02-01' },
  { id: 'b5', title: 'GitHub', url: 'https://github.com', description: 'World\'s leading software development platform', category: 'Tools', tags: ['git', 'version-control'], isPinned: true, createdAt: '2025-12-15' },
  { id: 'b6', title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', description: 'Learn how to design large-scale systems', category: 'Learning', tags: ['system-design', 'architecture'], isPinned: false, createdAt: '2026-02-10' },
  { id: 'b7', title: 'CSS Tricks', url: 'https://css-tricks.com', description: 'Tips, tricks, and techniques on using CSS', category: 'Articles', tags: ['css', 'frontend'], isPinned: false, createdAt: '2026-01-25' },
  { id: 'b8', title: 'Fireship YouTube', url: 'https://youtube.com/@fireship', description: 'High-intensity code tutorials', category: 'Videos', tags: ['youtube', 'tutorials'], isPinned: false, createdAt: '2026-02-05' },
  { id: 'b9', title: 'NestJS Docs', url: 'https://docs.nestjs.com', description: 'Progressive Node.js framework documentation', category: 'Documentation', tags: ['nestjs', 'backend'], isPinned: false, createdAt: '2026-02-12' },
  { id: 'b10', title: 'Roadmap.sh', url: 'https://roadmap.sh', description: 'Developer roadmaps, guides, and resources', category: 'Career', tags: ['career', 'roadmap'], isPinned: false, createdAt: '2026-02-15' },
];
