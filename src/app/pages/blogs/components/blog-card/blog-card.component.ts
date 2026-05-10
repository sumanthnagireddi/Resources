import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Blog } from '../../../../model/blog.model';

export type BlogCardVariant = 'cover' | 'feature' | 'compact' | 'grid' | 'wide';

const FALLBACK_BACKGROUNDS = [
  'linear-gradient(135deg, #5b4df7 0%, #c66dff 54%, #ff8ec8 100%)',
  'linear-gradient(135deg, #ff8f6b 0%, #ff5a5f 46%, #ffbf66 100%)',
  'linear-gradient(135deg, #0f8cff 0%, #74d0ff 42%, #c6efff 100%)',
  'linear-gradient(135deg, #111827 0%, #312e81 45%, #a855f7 100%)',
  'linear-gradient(135deg, #111827 0%, #1d4ed8 48%, #38bdf8 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #fb7185 45%, #d946ef 100%)',
];

@Component({
  selector: 'app-blog-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-card.component.html',
  styleUrl: './blog-card.component.css',
})
export class BlogCardComponent {
  @Input() blog!: Blog;
  @Input() variant: BlogCardVariant = 'grid';

  get articleLink(): string[] {
    return ['/blogs/post', this.blog._id];
  }

  get hasImage(): boolean {
    return Boolean(this.blog?.coverImageUrl);
  }

  get authorLabel(): string {
    return this.blog?.authorName?.trim() || 'Sumanth Nagireddi';
  }

  get readingTime(): number {
    return this.blog?.readingTimeMinutes || 5;
  }

  get viewCount(): number {
    return this.blog?.viewCount || 0;
  }

  get coverLabel(): string {
    return this.blog?.category?.trim() || this.tagPreview[0] || 'Product notes';
  }

  get tagPreview(): string[] {
    return (this.blog?.tags || []).slice(0, this.variant === 'compact' ? 2 : 4);
  }

  get fallbackBackground(): string {
    const seed = `${this.blog?.title || ''}${this.blog?.category || ''}${this.blog?._id || ''}`;
    return FALLBACK_BACKGROUNDS[this.hashString(seed) % FALLBACK_BACKGROUNDS.length];
  }

  get statusLabel(): string {
    return (this.blog?.status || 'DRAFT').toUpperCase();
  }

  get showStateBadge(): boolean {
    return this.statusLabel !== 'PUBLISHED';
  }

  get stateBadgeClasses(): string {
    switch (this.statusLabel) {
      case 'SCHEDULED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200';
      case 'REVIEW':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200';
      default:
        return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    }
  }

  getDisplayDate(): string {
    const rawDate = this.blog?.publishedAt || this.blog?.createdAt || this.blog?.updatedAt;

    if (!rawDate) {
      return 'Recently';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(rawDate));
  }

  getExcerpt(maxLength = 140): string {
    const source =
      this.blog?.description?.trim() ||
      'Sharp notes on product thinking, user feedback loops, and how teams turn insight into shipped work.';

    return source.length > maxLength ? `${source.slice(0, maxLength - 3)}...` : source;
  }

  private hashString(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash);
  }
}
