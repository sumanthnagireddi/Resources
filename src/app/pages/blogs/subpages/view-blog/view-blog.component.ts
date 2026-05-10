import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  resource,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AtlasEditorComponent } from '../../../../component/editor/editor.component';
import { Blog } from '../../../../model/blog.model';
import { BlogsService } from '../../../../services/blogs.service';
import { BlogCardComponent } from '../../components/blog-card/blog-card.component';

@Component({
  selector: 'app-view-blog',
  standalone: true,
  imports: [CommonModule, RouterLink, AtlasEditorComponent, BlogCardComponent],
  templateUrl: './view-blog.component.html',
  styleUrls: ['./view-blog.component.css'],
})
export class ViewBlogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly blogsService = inject(BlogsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly blogCatalog = signal<Blog[]>([]);

  readonly blogId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('blogId') ?? '')),
    {
      initialValue: this.route.snapshot.paramMap.get('blogId') ?? '',
    },
  );

  readonly blogResource = resource<Blog, any>({
    loader: async () => {
      const blog = await this.blogsService.getBlogById(this.blogId()).toPromise();
      return blog as Blog;
    },
  });

  readonly blogAtlasDocument = computed(() =>
    this.parseAtlasDocument(this.blogResource.value()?.content ?? null),
  );

  readonly blogPlainText = computed(() =>
    this.extractPlainText(this.blogResource.value()?.content ?? null),
  );

  readonly recommendedBlogs = computed(() => {
    const currentBlog = this.blogResource.value();

    if (!currentBlog) {
      return [];
    }

    const currentTopics = new Set(
      this.collectTopics(currentBlog).map((topic) => this.normalize(topic)),
    );

    return this.blogCatalog()
      .filter((blog) => blog._id !== currentBlog._id)
      .sort((left, right) => {
        const rightScore = this.getRecommendationScore(right, currentTopics);
        const leftScore = this.getRecommendationScore(left, currentTopics);

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return this.getBlogTimestamp(right) - this.getBlogTimestamp(left);
      })
      .slice(0, 3);
  });

  ngOnInit(): void {
    this.blogsService
      .getBlogsFromMongo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blogs: any) => {
          this.blogCatalog.set(Array.isArray(blogs) ? (blogs as Blog[]) : []);
        },
        error: () => {
          this.blogCatalog.set([]);
        },
      });
  }

  getDisplayDate(blog: Blog | null | undefined): string {
    const rawDate = blog?.publishedAt || blog?.createdAt || blog?.updatedAt;

    if (!rawDate) {
      return 'Recently';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(rawDate));
  }

  getStatusLabel(blog: Blog | null | undefined): string {
    return (blog?.status || 'DRAFT').toUpperCase();
  }

  getTopicPreview(blog: Blog | null | undefined): string[] {
    return this.collectTopics(blog).slice(0, 4);
  }

  private parseAtlasDocument(value: unknown): Record<string, unknown> | null {
    if (!value) {
      return null;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      (value as { type?: unknown }).type === 'doc'
    ) {
      return value as Record<string, unknown>;
    }

    if (typeof value !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      return parsed?.type === 'doc' ? parsed : null;
    } catch {
      return null;
    }
  }

  private extractPlainText(value: unknown): string {
    const atlasDocument = this.parseAtlasDocument(value);

    if (atlasDocument) {
      return this.collectText(atlasDocument).replace(/\s+/g, ' ').trim();
    }

    return typeof value === 'string' ? value.trim() : '';
  }

  private collectText(node: unknown): string {
    if (!node || typeof node !== 'object') {
      return '';
    }

    if ((node as { type?: unknown }).type === 'text') {
      return typeof (node as { text?: unknown }).text === 'string'
        ? (node as { text: string }).text
        : '';
    }

    if (Array.isArray((node as { content?: unknown[] }).content)) {
      return (node as { content: unknown[] }).content
        .map((child) => this.collectText(child))
        .filter(Boolean)
        .join(' ');
    }

    return '';
  }

  private collectTopics(blog: Blog | null | undefined): string[] {
    if (!blog) {
      return [];
    }

    return Array.from(
      new Set(
        [blog.category ?? '', ...(blog.tags ?? [])]
          .map((topic) => topic.trim())
          .filter(Boolean),
      ),
    );
  }

  private getRecommendationScore(blog: Blog, activeTopics: Set<string>): number {
    return this.collectTopics(blog).reduce((score, topic) => {
      return score + (activeTopics.has(this.normalize(topic)) ? 1 : 0);
    }, 0);
  }

  private getBlogTimestamp(blog: Blog): number {
    return new Date(blog.publishedAt ?? blog.createdAt ?? blog.updatedAt).getTime();
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}
