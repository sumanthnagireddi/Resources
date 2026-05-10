import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Blog } from '../../../../model/blog.model';
import { BlogsService } from '../../../../services/blogs.service';
import { TechnologyService } from '../../../../services/technology.service';
import {
  BlogCardComponent,
  BlogCardVariant,
} from '../../components/blog-card/blog-card.component';

type BlogSortMode = 'Latest' | 'Most viewed' | 'Featured';

interface BlogTopicChip {
  label: string;
  count: number;
}

@Component({
  selector: 'app-blogs-home',
  imports: [CommonModule, RouterLink, BlogCardComponent],
  templateUrl: './blogs-home.component.html',
  styleUrl: './blogs-home.component.css',
})
export class BlogsHomeComponent {
  private readonly blogsService = inject(BlogsService);
  private readonly technologyService = inject(TechnologyService);
  private readonly destroyRef = inject(DestroyRef);

  readonly blogs = signal<Blog[]>([]);
  readonly isLoading = signal(true);
  readonly hasLoadError = signal(false);
  readonly searchQuery = signal('');
  readonly activeTopic = signal('All topics');
  readonly sortMode = signal<BlogSortMode>('Latest');

  readonly sortModes: BlogSortMode[] = ['Latest', 'Most viewed', 'Featured'];

  readonly topicCatalog = computed<BlogTopicChip[]>(() => {
    const discoveredTopics = new Map<string, number>();

    for (const blog of this.blogs()) {
      for (const topic of this.extractBlogTopics(blog)) {
        const nextCount = (discoveredTopics.get(topic) ?? 0) + 1;
        discoveredTopics.set(topic, nextCount);
      }
    }

    const rankedTopics = Array.from(discoveredTopics.entries())
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return left[0].localeCompare(right[0]);
      })
      .slice(0, 9)
      .map(([label, count]) => ({ label, count }));

    return [{ label: 'All topics', count: this.blogs().length }, ...rankedTopics];
  });

  readonly collectionSummary = computed(() => [
    {
      value: this.blogs().length,
      label: 'Articles in the journal',
    },
    {
      value: this.topicCatalog().length - 1,
      label: 'Active themes',
    },
    {
      value: this.blogs().filter((blog) => blog.status?.toUpperCase() === 'PUBLISHED').length,
      label: 'Published this cycle',
    },
  ]);

  readonly filteredBlogs = computed(() => {
    const normalizedSearch = this.normalize(this.searchQuery());
    const activeTopic = this.activeTopic();

    return [...this.blogs()]
      .filter((blog) => {
        if (
          activeTopic !== 'All topics' &&
          !this.extractBlogTopics(blog).includes(activeTopic)
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          blog.title,
          blog.description ?? '',
          blog.authorName ?? '',
          blog.category ?? '',
          ...(blog.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort((left, right) => this.compareBlogs(left, right));
  });

  readonly recentStories = computed(() => this.filteredBlogs().slice(0, 3));

  readonly spotlightStory = computed(() => {
    const recentIds = new Set(this.recentStories().map((blog) => blog._id));
    return this.filteredBlogs().find((blog) => !recentIds.has(blog._id)) ?? null;
  });

  readonly featureRailStories = computed(() => {
    const excludedIds = this.buildExcludedIds(this.recentStories(), this.spotlightStory());
    return this.filteredBlogs().filter((blog) => !excludedIds.has(blog._id)).slice(0, 3);
  });

  readonly archiveStories = computed(() => {
    const excludedIds = this.buildExcludedIds(
      this.recentStories(),
      this.spotlightStory(),
      this.featureRailStories(),
    );

    return this.filteredBlogs().filter((blog) => !excludedIds.has(blog._id));
  });

  readonly archiveCountLabel = computed(() => {
    const total = this.filteredBlogs().length;

    if (!total) {
      return 'No articles found';
    }

    return `${total} article${total === 1 ? '' : 's'} in focus`;
  });

  ngOnInit(): void {
    forkJoin({
      blogs: this.blogsService.getBlogsFromMongo(),
      technologies: this.technologyService.getTechnologiesFromMongo(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ blogs, technologies }: any) => {
          const normalizedBlogs = Array.isArray(blogs) ? (blogs as Blog[]) : [];
          const fallbackTopics = Array.isArray(technologies)
            ? technologies
                .map((technology) =>
                  typeof technology?.name === 'string' ? technology.name.trim() : '',
                )
                .filter(Boolean)
            : [];

          this.blogs.set(
            this.decorateBlogsWithFallbackTopics(normalizedBlogs, fallbackTopics),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.hasLoadError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  selectTopic(topic: string): void {
    this.activeTopic.set(topic);
  }

  setSortMode(mode: BlogSortMode): void {
    this.sortMode.set(mode);
  }

  trackByBlog(_: number, blog: Blog): string {
    return blog._id;
  }

  trackByTopic(_: number, topic: BlogTopicChip): string {
    return topic.label;
  }

  getArchiveCardVariant(index: number): BlogCardVariant {
    return index % 7 === 0 ? 'wide' : 'grid';
  }

  getArchiveWrapperClasses(index: number): string {
    return index % 7 === 0 ? 'sm:col-span-2 xl:col-span-2' : '';
  }

  private buildExcludedIds(...groups: Array<Blog[] | Blog | null>): Set<string> {
    const ids = new Set<string>();

    for (const group of groups) {
      if (Array.isArray(group)) {
        for (const item of group) {
          if (item?._id) {
            ids.add(item._id);
          }
        }

        continue;
      }

      if (group?._id) {
        ids.add(group._id);
      }
    }

    return ids;
  }

  private compareBlogs(left: Blog, right: Blog): number {
    switch (this.sortMode()) {
      case 'Most viewed': {
        const rightViews = right.viewCount ?? 0;
        const leftViews = left.viewCount ?? 0;

        if (rightViews !== leftViews) {
          return rightViews - leftViews;
        }

        return this.getBlogTimestamp(right) - this.getBlogTimestamp(left);
      }

      case 'Featured': {
        const pinnedDifference = Number(!!right.isPinned) - Number(!!left.isPinned);
        if (pinnedDifference !== 0) {
          return pinnedDifference;
        }

        const featuredDifference =
          Number(!!right.isFeatured) - Number(!!left.isFeatured);
        if (featuredDifference !== 0) {
          return featuredDifference;
        }

        return this.getBlogTimestamp(right) - this.getBlogTimestamp(left);
      }

      default:
        return this.getBlogTimestamp(right) - this.getBlogTimestamp(left);
    }
  }

  private getBlogTimestamp(blog: Blog): number {
    return new Date(blog.publishedAt ?? blog.createdAt ?? blog.updatedAt).getTime();
  }

  private extractBlogTopics(blog: Blog): string[] {
    return Array.from(
      new Set(
        [blog.category ?? '', ...(blog.tags ?? [])]
          .map((topic) => topic.trim())
          .filter(Boolean),
      ),
    );
  }

  private decorateBlogsWithFallbackTopics(
    blogs: Blog[],
    fallbackTopics: string[],
  ): Blog[] {
    return blogs.map((blog, index) => {
      const hasTopics =
        Boolean(blog.category?.trim()) || Boolean(blog.tags?.length);

      if (hasTopics) {
        return blog;
      }

      const fallbackTopic = fallbackTopics[index % Math.max(fallbackTopics.length, 1)];

      if (!fallbackTopic) {
        return blog;
      }

      return {
        ...blog,
        tags: [fallbackTopic],
      };
    });
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}
