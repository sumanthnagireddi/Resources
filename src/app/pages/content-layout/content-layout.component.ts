import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { SkeletonComponent } from '../../component/skeleton/skeleton.component';
import { Observable } from 'rxjs';
import { selectIsStarred } from '../../store/selectors/starred.selector';
import { AtlasEditorComponent } from '../../component/editor/editor.component';
import {
  AtlassianPageHeaderComponent,
  AtlassianPageWidthMode,
} from '../../component/atlassian-page-header/atlassian-page-header.component';
import { loadPage, loadTopContents } from '../../store/actions/content.actions';
import {
  selectAllContent,
  selectCurrentPage,
  selectCurrentPageLoading,
} from '../../store/selectors/content.selector';

type RelatedContentCard = {
  id: string;
  routeId: string;
  title: string;
  authorName: string;
  updatedLabel: string;
};

@Component({
  selector: 'app-content-layout',
  imports: [
    CommonModule,
    RouterLink,
    SkeletonComponent,
    AtlasEditorComponent,
    AtlassianPageHeaderComponent,
  ],
  templateUrl: './content-layout.component.html',
  styleUrl: './content-layout.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ContentLayoutComponent implements OnInit {
  @ViewChild('contentContainer') contentContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('tocContainer') tocContainer!: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly pageWidthStorageKey = 'atlassian-page-width-mode';

  activeHeading: string | null = null;
  isBookmarked$!: Observable<boolean>;
  isHeaderCollapsed = false;
  showMobileToc = false;
  pageWidthMode: AtlassianPageWidthMode = this.getStoredPageWidthMode();

  contentAvailable = true;
  currentId = '';
  content: Record<string, unknown> | null = null;
  currentPage: any = null;
  currentTechnology = '';
  contentLoader = true;
  headings: string[] = [];
  estimatedReadMinutes = 1;
  relatedContent: RelatedContentCard[] = [];

  private allContentItems: any[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.store
      .select(selectCurrentPageLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => {
        this.contentLoader = loading;
      });

    this.store
      .select(selectCurrentPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        const atlasDocument = this.parseAtlasDocument(
          page?.body?.atlas_doc_format?.value ?? null,
        );

        this.currentPage = page;
        this.content = atlasDocument;
        this.headings = atlasDocument
          ? this.extractHeadingsFromAtlasDocument(atlasDocument)
          : [];
        this.contentAvailable = !!atlasDocument;
        this.currentTechnology = page?.title ?? '';
        this.estimatedReadMinutes = atlasDocument
          ? this.calculateReadTime(atlasDocument)
          : 1;
        this.updateRelatedContent();

        if (atlasDocument) {
          setTimeout(() => {
            this.onScroll();
          }, 200);
        }
      });

    this.store.dispatch(loadTopContents());

    this.store
      .select(selectAllContent)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.allContentItems = Array.isArray(items) ? items : [];
        this.updateRelatedContent();
      });

    this.activatedRoute.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.currentId = params['pageId'];
        this.content = null;
        this.currentPage = null;
        this.headings = [];
        this.activeHeading = null;
        this.isHeaderCollapsed = false;
        this.contentAvailable = false;
        this.contentLoader = true;
        this.estimatedReadMinutes = 1;
        this.relatedContent = [];
        this.store.dispatch(loadPage({ pageId: this.currentId }));
        this.isBookmarked$ = this.store.select(selectIsStarred(this.currentId));
      });
  }

  scrollToHeading(text: string): void {
    for (const heading of this.getRenderedHeadings()) {
      const clean = heading.textContent?.trim().replace(/^\d+\.\s*/, '');

      if (clean === text) {
        heading.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        this.activeHeading = text;
        break;
      }
    }
  }

  onScroll(): void {
    if (!this.contentContainer) {
      return;
    }

    const container = this.contentContainer.nativeElement;
    this.isHeaderCollapsed = container.scrollTop > 72;

    const ACTIVATION_OFFSET = 140;
    let currentActive: string | null = null;
    const domHeadings = this.getRenderedHeadings();

    for (const heading of domHeadings) {
      const headingTop = heading.getBoundingClientRect().top;
      const cleanText =
        heading.textContent?.trim().replace(/^\d+\.\s*/, '') ?? '';

      if (headingTop <= ACTIVATION_OFFSET) {
        currentActive = cleanText;
      } else {
        break;
      }
    }

    if (!currentActive && domHeadings.length) {
      currentActive =
        domHeadings[0].textContent?.trim().replace(/^\d+\.\s*/, '') ?? null;
    }

    if (this.activeHeading !== currentActive) {
      this.activeHeading = currentActive;
      this.scrollActiveTocItem();
    }
  }

  scrollActiveTocItem(): void {
    if (!this.tocContainer || !this.activeHeading) {
      return;
    }

    const container = this.tocContainer.nativeElement;

    const activeItem = Array.from(container.querySelectorAll('a')).find(
      (element) => element.textContent?.trim() === this.activeHeading,
    );

    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }

  toggleMobileToc(): void {
    this.showMobileToc = !this.showMobileToc;
    document.body.style.overflow = this.showMobileToc ? 'hidden' : '';
  }

  setPageWidthMode(mode: AtlassianPageWidthMode): void {
    this.pageWidthMode = mode;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.pageWidthStorageKey, mode);
    }
  }

  trackRelatedContent(_: number, item: RelatedContentCard): string {
    return item.id;
  }

  private updateRelatedContent(): void {
    if (!this.currentId) {
      this.relatedContent = [];
      return;
    }

    const normalizedTitle = this.normalizeValue(this.currentTechnology);
    const cards = this.allContentItems
      .map((item) => this.toRelatedContentCard(item))
      .filter((item): item is RelatedContentCard => !!item)
      .filter((item) => item.routeId !== this.currentId)
      .filter((item) =>
        normalizedTitle
          ? this.normalizeValue(item.title) !== normalizedTitle
          : true,
      )
      .filter(
        (item, index, list) =>
          index === list.findIndex((candidate) => candidate.routeId === item.routeId),
      )
      .slice(0, 6);

    this.relatedContent = cards;
  }

  private toRelatedContentCard(item: any): RelatedContentCard | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const routeId = this.resolveRouteId(item);
    const title = this.resolveContentTitle(item);

    if (!routeId || !title) {
      return null;
    }

    return {
      id: String(item.id ?? item._id ?? routeId),
      routeId,
      title,
      authorName: this.resolveAuthorName(item),
      updatedLabel: this.resolveUpdatedLabel(item),
    };
  }

  private resolveRouteId(item: any): string {
    const candidates = [
      item?.topicId,
      item?.pageId,
      item?.id,
      item?._id,
    ];

    const match = candidates.find(
      (candidate) => typeof candidate === 'string' && candidate.trim().length > 0,
    );

    return typeof match === 'string' ? match.trim() : '';
  }

  private resolveContentTitle(item: any): string {
    const candidates = [
      item?.title,
      item?.name,
      item?.label,
    ];

    const match = candidates.find(
      (candidate) => typeof candidate === 'string' && candidate.trim().length > 0,
    );

    return typeof match === 'string' ? match.trim() : '';
  }

  private resolveAuthorName(item: any): string {
    const candidates = [
      item?.authorName,
      item?.ownerName,
      item?.owner?.displayName,
      item?.author?.displayName,
      item?.authorId,
    ];

    const match = candidates.find(
      (candidate) => typeof candidate === 'string' && candidate.trim().length > 0,
    );

    return typeof match === 'string' ? match.trim() : 'Sumanth';
  }

  private resolveUpdatedLabel(item: any): string {
    const rawValue =
      item?.updatedAt ??
      item?.updatedOn ??
      item?.publishedAt ??
      item?.createdAt ??
      null;

    const date = this.toDate(rawValue);

    if (!date) {
      return 'Open page';
    }

    return `Updated ${new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)}`;
  }

  private toDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value?.toDate === 'function') {
      const converted = value.toDate();
      return converted instanceof Date && !Number.isNaN(converted.getTime())
        ? converted
        : null;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      const converted = new Date(value);
      return !Number.isNaN(converted.getTime()) ? converted : null;
    }

    return null;
  }

  private normalizeValue(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
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

  private extractHeadingsFromAtlasDocument(document: any): string[] {
    const headings: string[] = [];

    const visit = (node: any): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (node.type === 'heading') {
        const headingText = this.collectText(node.content).trim();

        if (headingText) {
          headings.push(headingText.replace(/^\d+\.\s*/, ''));
        }
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(visit);
      }
    };

    visit(document);

    return headings;
  }

  private collectText(nodes: any[] | undefined): string {
    if (!Array.isArray(nodes)) {
      return '';
    }

    return nodes
      .map((node) => {
        if (!node || typeof node !== 'object') {
          return '';
        }

        if (node.type === 'text') {
          return typeof node.text === 'string' ? node.text : '';
        }

        return this.collectText(node.content);
      })
      .join('');
  }

  private calculateReadTime(document: any): number {
    const totalWords = this.collectText(document?.content)
      .split(/\s+/)
      .filter(Boolean).length;

    return Math.max(1, Math.ceil(totalWords / 220));
  }

  private getRenderedHeadings(): HTMLElement[] {
    const widget = this.contentContainer?.nativeElement.querySelector(
      'atlas-editor-angular',
    ) as HTMLElement | null;

    const shadowRoot = widget?.shadowRoot;

    if (!shadowRoot) {
      return [];
    }

    return Array.from(
      shadowRoot.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'),
    );
  }

  private getStoredPageWidthMode(): AtlassianPageWidthMode {
    if (typeof localStorage === 'undefined') {
      return 'centered';
    }

    const storedMode = localStorage.getItem(this.pageWidthStorageKey);

    return storedMode === 'full-width' ? 'full-width' : 'centered';
  }
}
