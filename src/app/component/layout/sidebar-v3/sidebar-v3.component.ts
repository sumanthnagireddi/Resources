import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { toggleSidebar } from '../../../store/actions/sidebar.actions';
import { SIDEBAR_DATA } from './const';
import { environment } from '../../../../environments/environment';

type FolderCreateMode = 'folder' | 'subfolder';
type SidebarViewMode = 'tree' | 'my-visits' | 'last-updated' | 'title-asc';
type SidebarQuickSectionId =
  | 'home'
  | 'recent'
  | 'starred'
  | 'spaces'
  | 'apps'
  | 'finance'
  | 'ai';
type SidebarQuickPanelSortMode = 'recent' | 'title';
type SidebarWorkspaceAction = 'content' | 'route' | 'feedback';
type FolderAction =
  | 'rename'
  | 'star'
  | 'copy-link'
  | 'share'
  | 'make-copy'
  | 'move'
  | 'archive'
  | 'delete';

interface SidebarFolderNode {
  id: string;
  label: string;
  type: 'folder' | 'file' | 'page';
  icon?: string;
  description?: string;
  ownerName?: string;
  updatedLabel?: string;
  open: boolean;
  children?: SidebarFolderNode[];
  archived?: boolean;
  isLoading?: boolean;
  sortIndex: number;
  visitedAt?: number;
  updatedAt?: number;
}

interface SidebarPagePreview {
  pageId: string;
  title: string;
  ownerName: string;
  excerpt: string;
  updatedLabel: string;
}

interface FolderTarget {
  id: string;
  label: string;
  node: SidebarFolderNode;
}

interface SidebarQuickSection {
  id: SidebarQuickSectionId;
  label: string;
  icon: string;
  showChevron?: boolean;
}

interface SidebarSlideItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon: string;
  pageId?: string;
  folderId?: string;
  route?: string;
  timestamp?: number;
  description?: string;
}

interface SidebarSlideGroup {
  label: string;
  items: SidebarSlideItem[];
}

interface SidebarNodeEntry {
  node: SidebarFolderNode;
  order: number;
  trail: string[];
}

interface SidebarWorkspaceLink {
  action: SidebarWorkspaceAction;
  icon: string;
  id: string;
  label: string;
  message?: string;
  route?: string;
}

@Component({
  selector: 'app-sidebar-v3',
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-v3.component.html',
  styleUrl: './sidebar-v3.component.css',
})
export class SidebarV3Component implements OnInit, OnDestroy {
  private readonly sidebarWidthStorageKey = 'sidebar-width-vw';
  readonly minSidebarWidthVw = 18;
  readonly maxSidebarWidthVw = 35;
  readonly defaultSidebarWidthVw = 25;
  private readonly sidebarResizeStepVw = 2;
  private readonly desktopBreakpointPx = 768;
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pagePreviewHideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly foldersEndpoint = `${environment.API_URL}/atlassian/folders`;
  private readonly pagesEndpoint = `${environment.API_URL}/atlassian/pages`;
  private readonly pagePreviewWidthPx = 500;
  private readonly pagePreviewHeightPx = 220;
  private readonly pagePreviewOffsetPx = 16;
  private readonly pagePreviewViewportPaddingPx = 16;
  private readonly pagePreviewTopInsetPx = 72;
  private readonly popoverViewportPaddingPx = 12;
  private readonly popoverOffsetPx = 8;
  private readonly popoverMinimumHeightPx = 180;
  private readonly popoverMobileWidthPx = 320;

  readonly sidebarWidthVw = signal(this.defaultSidebarWidthVw);
  readonly isResizingSidebar = signal(false);
  readonly viewportWidth = signal(
    typeof window !== 'undefined' ? window.innerWidth : this.desktopBreakpointPx,
  );
  readonly activeActionMenuId = signal<string | null>(null);
  readonly activeAddMenuId = signal<string | null>(null);
  readonly isHeaderMenuOpen = signal(false);
  readonly headerMenuStyles = signal<Record<string, string> | null>(null);
  readonly addMenuStyles = signal<Record<string, string> | null>(null);
  readonly actionMenuStyles = signal<Record<string, string> | null>(null);
  readonly starredFolderIds = signal<string[]>([]);
  readonly feedbackMessage = signal<string | null>(null);
  readonly selectedFolderId = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  readonly currentViewMode = signal<SidebarViewMode>('tree');
  readonly expandingFolderIds = signal<Set<string>>(new Set());
  readonly activeQuickPanelId = signal<SidebarQuickSectionId | null>(null);
  readonly quickPanelSearchQuery = signal('');
  readonly quickPanelSortMode = signal<SidebarQuickPanelSortMode>('recent');
  readonly isContentSectionExpanded = signal(true);
  readonly activePagePreviewNode = signal<SidebarFolderNode | null>(null);
  readonly activePagePreviewStyles = signal<Record<string, string> | null>(null);
  readonly pagePreviewCache = signal<Record<string, SidebarPagePreview>>({});
  readonly loadingPagePreviewIds = signal<Set<string>>(new Set());
  readonly sidebarTitle = 'Content';
  readonly spaceName = 'Sumanth';
  readonly shortcutsMessage = 'No shortcuts in this space';
  readonly blogsMessage = 'No blogs in this space';
  readonly hasBlogsInSpace = false;
  readonly quickSections: SidebarQuickSection[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'recent', label: 'Recent', icon: 'schedule', showChevron: true },
    { id: 'starred', label: 'Starred', icon: 'star', showChevron: true },
    { id: 'apps', label: 'Apps', icon: 'apps' },
    { id: 'finance', label: 'Finance', icon: 'account_balance' },
    { id:'ai',label:'AI', icon:'auto_awesome'}
  ];
  readonly footerLinks: SidebarWorkspaceLink[] = [
    {
      id: 'company-hub',
      label: 'Company hub',
      icon: 'apartment',
      action: 'feedback',
      message: 'Company hub is not wired yet',
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: 'groups',
      action: 'feedback',
      message: 'Teams is not wired yet',
    },
  ];
  atlassianFolders: SidebarFolderNode[] = this.cloneFolderTree(SIDEBAR_DATA);

  ngOnInit(): void {
    this.restoreSidebarWidthPreference();
    this.fetchAtlassianFolders();
  }

  ngOnDestroy(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    if (this.pagePreviewHideTimer) {
      clearTimeout(this.pagePreviewHideTimer);
    }

    this.finishSidebarResize();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closePopovers();
    this.closePagePreview(true);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.finishSidebarResize();
    this.closePopovers();
    this.closeQuickPanel();
    this.closePagePreview(true);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.viewportWidth.set(window.innerWidth);
    this.sidebarWidthVw.set(this.clampSidebarWidth(this.sidebarWidthVw()));
    this.closePopovers();

    if (!this.isDesktopViewport()) {
      this.finishSidebarResize();
      this.closePagePreview(true);
    }
  }

  @HostListener('document:pointermove', ['$event'])
  onSidebarResizeMove(event: PointerEvent): void {
    if (!this.isResizingSidebar() || typeof window === 'undefined') {
      return;
    }

    event.preventDefault();
    this.sidebarWidthVw.set(
      this.clampSidebarWidth((event.clientX / window.innerWidth) * 100),
    );
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onSidebarResizeEnd(): void {
    this.finishSidebarResize();
  }

  closeSidebar(): void {
    this.store.dispatch(toggleSidebar({ show: false }));
  }

  startSidebarResize(event: PointerEvent): void {
    if (!this.isDesktopViewport()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.closePopovers();
    this.isResizingSidebar.set(true);
    this.setResizeCursor(true);
  }

  nudgeSidebarWidth(direction: 'increase' | 'decrease', event?: Event): void {
    event?.stopPropagation();
    const delta =
      direction === 'increase'
        ? this.sidebarResizeStepVw
        : -this.sidebarResizeStepVw;

    this.sidebarWidthVw.set(
      this.clampSidebarWidth(this.sidebarWidthVw() + delta),
    );
    this.persistSidebarWidthPreference();
  }

  resetSidebarWidth(event?: Event): void {
    event?.stopPropagation();
    this.sidebarWidthVw.set(this.defaultSidebarWidthVw);
    this.persistSidebarWidthPreference();
  }

  getDesktopSidebarStyles(): Record<string, string> | null {
    if (!this.isDesktopViewport()) {
      return null;
    }

    const width = `${this.sidebarWidthVw()}vw`;

    return {
      width,
      minWidth: width,
      maxWidth: width,
    };
  }

  getQuickPanelStyles(): Record<string, string> | null {
    if (!this.isDesktopViewport()) {
      return null;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const sidebarWidthPx = (this.sidebarWidthVw() / 100) * window.innerWidth;
    const left = Math.max(
      this.popoverViewportPaddingPx,
      sidebarWidthPx + this.popoverViewportPaddingPx,
    );
    const width = Math.min(
      512,
      window.innerWidth - left - this.popoverViewportPaddingPx,
    );

    return {
      top: '60px',
      bottom: '12px',
      left: `${left}px`,
      width: `${Math.max(280, width)}px`,
    };
  }

  openPagePreview(folder: SidebarFolderNode, event: MouseEvent): void {
    if (!this.isDesktopViewport() || folder.type !== 'page') {
      return;
    }

    this.clearPagePreviewHideTimer();
    this.activePagePreviewNode.set(folder);
    this.activePagePreviewStyles.set(
      this.buildPagePreviewStyles(event.currentTarget as HTMLElement | null),
    );

    if (this.pagePreviewCache()[folder.id] || this.isPagePreviewLoading(folder.id)) {
      return;
    }

    this.fetchPagePreview(folder);
  }

  schedulePagePreviewClose(): void {
    if (!this.activePagePreviewNode()) {
      return;
    }

    this.clearPagePreviewHideTimer();
    this.pagePreviewHideTimer = setTimeout(() => {
      this.closePagePreview();
    }, 120);
  }

  keepPagePreviewOpen(): void {
    this.clearPagePreviewHideTimer();
  }

  closePagePreview(force = false): void {
    if (!force && !this.activePagePreviewNode()) {
      return;
    }

    this.clearPagePreviewHideTimer();
    this.activePagePreviewNode.set(null);
    this.activePagePreviewStyles.set(null);
  }

  getActivePagePreview(): SidebarPagePreview | null {
    const node = this.activePagePreviewNode();

    if (!node) {
      return null;
    }

    return this.pagePreviewCache()[node.id] ?? this.createFallbackPagePreview(node);
  }

  isActivePagePreviewLoading(): boolean {
    const node = this.activePagePreviewNode();
    return node ? this.isPagePreviewLoading(node.id) : false;
  }

  isDesktopViewport(): boolean {
    return this.viewportWidth() >= this.desktopBreakpointPx;
  }

  openQuickPanel(sectionId: SidebarQuickSectionId, event: Event): void {
    event.stopPropagation();
    this.closePopovers();
    this.closePagePreview(true);

    if (sectionId === 'home') {
      this.closeQuickPanel();
      this.router.navigate(['/home']);
      return;
    }

    if (sectionId === 'finance') {
      this.closeQuickPanel();
      this.router.navigate(['/finance']);
      return;
    }

    if (sectionId === 'ai') {
      this.closeQuickPanel();
      this.router.navigate(['/ai']);
      return;
    }

    this.quickPanelSearchQuery.set('');
    this.quickPanelSortMode.set(
      sectionId === 'spaces' || sectionId === 'apps' ? 'title' : 'recent',
    );
    this.activeQuickPanelId.set(
      this.activeQuickPanelId() === sectionId ? null : sectionId,
    );
  }

  closeQuickPanel(event?: Event): void {
    event?.stopPropagation();
    this.activeQuickPanelId.set(null);
    this.quickPanelSearchQuery.set('');
  }

  isQuickSectionActive(sectionId: SidebarQuickSectionId): boolean {
    if (sectionId === 'home') {
      return this.router.url === '/home' || this.router.url === '/';
    }

    if (sectionId === 'finance') {
      return this.router.url.startsWith('/finance');
    }

    if (sectionId === 'ai') {
      return this.router.url.startsWith('/ai');
    }

    return this.activeQuickPanelId() === sectionId;
  }

  toggleQuickPanelSort(event: Event): void {
    event.stopPropagation();
    const nextSortMode =
      this.quickPanelSortMode() === 'recent' ? 'title' : 'recent';

    this.quickPanelSortMode.set(nextSortMode);
    this.showFeedback(
      `Layover sorted by ${nextSortMode === 'recent' ? 'recency' : 'title'}`,
    );
  }

  getQuickPanelTitle(): string {
    switch (this.activeQuickPanelId()) {
      case 'home':
        return 'Home';
      case 'recent':
        return 'Recent';
      case 'starred':
        return 'Starred';
      case 'apps':
        return 'Apps';
      case 'finance':
        return 'Finance';
      case 'ai':
        return 'AI';
      default:
        return 'Recent';
    }
  }

  getQuickPanelSearchPlaceholder(): string {
    switch (this.activeQuickPanelId()) {
      case 'starred':
        return 'Filter starred items';
      case 'apps':
        return 'Filter apps';
      case 'finance':
        return 'Filter finance items';
      case 'ai':
        return 'Filter AI items';
      case 'home':
        return 'Filter suggested items';
      default:
        return 'Filter recent items';
    }
  }

  getQuickPanelEmptyState(): string {
    switch (this.activeQuickPanelId()) {
      case 'starred':
        return 'Star some pages or folders to see them here.';
      case 'apps':
        return 'No apps are available yet.';
      case 'finance':
        return 'No finance shortcuts are available yet.';
      case 'ai':
        return 'AI features are coming soon.';
      case 'home':
        return 'Your suggested items will appear here.';
      default:
        return 'Your recent activity will appear here.';
    }
  }

  getQuickPanelGroups(): SidebarSlideGroup[] {
    const sectionId = this.activeQuickPanelId();

    if (!sectionId) {
      return [];
    }

    const query = this.quickPanelSearchQuery().trim().toLowerCase();
    let items = this.getQuickPanelItems(sectionId);

    if (query) {
      items = items.filter((item) =>
        this.getQuickPanelSearchText(item).includes(query),
      );
    }

    items = this.sortQuickPanelItems(items);

    if (sectionId === 'apps') {
      return items.length ? [{ label: 'Apps', items }] : [];
    }

    if (sectionId === 'finance') {
      return items.length ? [{ label: 'Finance', items }] : [];
    }

    return this.groupItemsByTime(items);
  }

  openQuickPanelItem(item: SidebarSlideItem, event: Event): void {
    event.stopPropagation();

    if (item.pageId) {
      this.closeQuickPanel();
      this.router.navigate(['/pages', item.pageId]);
      return;
    }

    if (item.folderId) {
      this.isContentSectionExpanded.set(true);
      this.openPathToNode(item.folderId);
      this.selectedFolderId.set(item.folderId);
      this.closeQuickPanel();
      return;
    }

    if (item.route) {
      this.closeQuickPanel();
      this.router.navigate([item.route]);
      return;
    }

    this.showFeedback(`Opened "${item.title}"`);
    this.closeQuickPanel();
  }

  handleWorkspaceLink(link: SidebarWorkspaceLink, event: Event): void {
    event.stopPropagation();

    if (link.action === 'route' && link.route) {
      this.router.navigate([link.route]);
      return;
    }

    if (link.action === 'content') {
      this.isContentSectionExpanded.set(true);
      return;
    }

    this.showFeedback(link.message ?? `${link.label} is not wired yet`);
  }

  handlePlaceholderAction(
    event: Event,
    message: string,
    route?: string,
  ): void {
    event.stopPropagation();

    if (route) {
      this.router.navigate([route]);
      return;
    }

    this.showFeedback(message);
  }

  toggleContentSection(event: Event): void {
    event.stopPropagation();
    this.isContentSectionExpanded.set(!this.isContentSectionExpanded());
    this.closePopovers();
    this.closePagePreview(true);
  }

  getContentPageCount(): number {
    return this.getAllNodeEntries().filter((entry) => entry.node.type === 'page')
      .length;
  }

  expandTechnology(folder: SidebarFolderNode, event?: Event): void {
    event?.stopPropagation();

    if (folder.type === 'page' || !this.hasVisibleChildren(folder)) {
      return;
    }

    if (folder.open) {
      folder.open = false;
      this.closePopovers();
      return;
    }

    const expandingIds = new Set(this.expandingFolderIds());
    expandingIds.add(folder.id);
    this.expandingFolderIds.set(expandingIds);

    setTimeout(() => {
      folder.open = true;
      const ids = new Set(this.expandingFolderIds());
      ids.delete(folder.id);
      this.expandingFolderIds.set(ids);
      this.closePopovers();
    }, 1000);
  }

  selectFolder(folder: SidebarFolderNode, event?: Event): void {
    event?.stopPropagation();
    this.closePagePreview(true);
    this.selectedFolderId.set(folder.id);
    folder.visitedAt = Date.now();

    if (folder.type === 'page') {
      this.activeQuickPanelId.set(null);
      this.router.navigate(['/pages', folder.id]);
    }
  }

  createRootFolder(event: Event): void {
    event.stopPropagation();
    this.isContentSectionExpanded.set(true);

    const label = window.prompt('Folder name')?.trim();

    if (!label) {
      return;
    }

    this.atlassianFolders.unshift(this.createFolderNode(label));
    this.syncSiblingOrder(this.atlassianFolders);
    this.showFeedback(`Folder "${label}" created`);
    this.closePopovers();
  }

  toggleHeaderMenu(event: Event): void {
    event.stopPropagation();
    this.closePagePreview(true);
    const isOpening = !this.isHeaderMenuOpen();

    this.activeAddMenuId.set(null);
    this.activeActionMenuId.set(null);
    this.addMenuStyles.set(null);
    this.actionMenuStyles.set(null);
    this.isHeaderMenuOpen.set(isOpening);
    this.headerMenuStyles.set(
      isOpening
        ? this.buildPopoverStyles(event.currentTarget as HTMLElement | null, 260)
        : null,
    );
  }

  setViewMode(event: Event, mode: SidebarViewMode): void {
    event.stopPropagation();
    this.currentViewMode.set(mode);
    this.showFeedback(`View changed to ${this.getViewModeLabel(mode)}`);
    this.closePopovers();
  }

  getViewModeLabel(mode: SidebarViewMode): string {
    switch (mode) {
      case 'my-visits':
        return 'My visits';
      case 'last-updated':
        return 'Last updated';
      case 'title-asc':
        return 'Title - A to Z';
      default:
        return 'Tree';
    }
  }

  toggleAddMenu(event: Event, folder: SidebarFolderNode): void {
    event.stopPropagation();
    this.closePagePreview(true);
    const isOpening = this.activeAddMenuId() !== folder.id;

    this.isHeaderMenuOpen.set(false);
    this.activeActionMenuId.set(null);
    this.headerMenuStyles.set(null);
    this.actionMenuStyles.set(null);
    this.activeAddMenuId.set(
      isOpening ? folder.id : null,
    );
    this.addMenuStyles.set(
      isOpening
        ? this.buildPopoverStyles(event.currentTarget as HTMLElement | null, 180)
        : null,
    );
  }

  toggleActionMenu(event: Event, folder: SidebarFolderNode): void {
    event.stopPropagation();
    this.closePagePreview(true);
    const isOpening = this.activeActionMenuId() !== folder.id;

    this.isHeaderMenuOpen.set(false);
    this.activeAddMenuId.set(null);
    this.headerMenuStyles.set(null);
    this.addMenuStyles.set(null);
    this.activeActionMenuId.set(
      isOpening ? folder.id : null,
    );
    this.actionMenuStyles.set(
      isOpening
        ? this.buildPopoverStyles(event.currentTarget as HTMLElement | null, 200)
        : null,
    );
  }

  createFolder(
    event: Event,
    folder: SidebarFolderNode,
    parent: SidebarFolderNode | null,
    mode: FolderCreateMode,
  ): void {
    event.stopPropagation();

    const label = window.prompt(
      mode === 'folder' ? 'Folder name' : 'Subfolder name',
    )?.trim();

    if (!label) {
      return;
    }

    const newFolder = this.createFolderNode(label);

    if (mode === 'folder') {
      const siblings = parent?.children ?? this.atlassianFolders;
      const index = siblings.findIndex((item) => item.id === folder.id);
      siblings.splice(index >= 0 ? index + 1 : siblings.length, 0, newFolder);
      this.syncSiblingOrder(siblings);
      this.markFolderUpdated(newFolder);
      this.showFeedback(`Folder "${label}" created`);
    } else {
      folder.children ??= [];
      folder.children.unshift(newFolder);
      this.syncSiblingOrder(folder.children);
      folder.open = true;
      this.markFolderUpdated(folder);
      this.showFeedback(`Subfolder "${label}" created`);
    }

    this.closePopovers();
  }

  handleFolderAction(
    event: Event,
    action: FolderAction,
    folder: SidebarFolderNode,
    parent: SidebarFolderNode | null,
  ): void {
    event.stopPropagation();

    switch (action) {
      case 'rename':
        this.renameFolder(folder);
        break;
      case 'star':
        this.toggleFolderStar(folder);
        break;
      case 'copy-link':
        void this.copyFolderLink(folder);
        break;
      case 'share':
        void this.shareFolder(folder);
        break;
      case 'make-copy':
        this.makeFolderCopy(folder, parent);
        break;
      case 'move':
        this.moveFolder(folder, parent);
        break;
      case 'archive':
        this.archiveFolder(folder);
        break;
      case 'delete':
        this.deleteFolder(folder, parent);
        break;
    }
  }

  getDisplayFolders(folders: SidebarFolderNode[] | undefined): SidebarFolderNode[] {
    const query = this.searchQuery().toLowerCase().trim();
    const baseFolders = (folders ?? []).filter((folder) => !folder.archived);
    const viewFilteredFolders = baseFolders.filter((folder) =>
      this.matchesViewMode(folder),
    );
    const queryFilteredFolders = query
      ? viewFilteredFolders.filter((folder) =>
          this.hasMatchingContent(folder, query),
        )
      : viewFilteredFolders;

    return this.sortFoldersForViewMode(queryFilteredFolders);
  }

  getVisibleChildren(folder: SidebarFolderNode): SidebarFolderNode[] {
    return this.getDisplayFolders(folder.children);
  }

  hasVisibleChildren(folder: SidebarFolderNode): boolean {
    return this.getVisibleChildren(folder).length > 0;
  }

  isFolderStarred(folder: SidebarFolderNode): boolean {
    return this.starredFolderIds().includes(folder.id);
  }

  trackByFolderId(_: number, folder: SidebarFolderNode): string {
    return folder.id;
  }

  getFilteredChildren(folder: SidebarFolderNode): SidebarFolderNode[] {
    return this.getVisibleChildren(folder);
  }

  hasFilteredChildren(folder: SidebarFolderNode): boolean {
    return this.getFilteredChildren(folder).length > 0;
  }

  onSearchChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      this.atlassianFolders.forEach((folder) => this.collapseAllFolders(folder));
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.atlassianFolders.forEach((folder) => {
        this.expandParentChainIfHasMatch(folder, query);
      });
    }, 2000);
  }

  private fetchAtlassianFolders(): void {
    this.http.get<unknown>(this.foldersEndpoint).subscribe({
      next: (response) => {
        const apiFolders = this.normalizeApiFolders(response);

        if (!apiFolders.length) {
          return;
        }

        this.atlassianFolders = this.mergeFolderCollections(
          this.atlassianFolders,
          apiFolders,
        );
      },
      error: () => {
        // Keep the constant seed tree as the fallback when the API is unavailable.
      },
    });
  }

  private fetchPagePreview(folder: SidebarFolderNode): void {
    this.setPagePreviewLoading(folder.id, true);

    this.http.get<unknown>(`${this.pagesEndpoint}/${folder.id}`).subscribe({
      next: (response) => {
        const preview = this.buildPagePreview(folder, response);
        this.pagePreviewCache.set({
          ...this.pagePreviewCache(),
          [folder.id]: preview,
        });
        folder.description = preview.excerpt;
        folder.ownerName = preview.ownerName;
        folder.updatedLabel = preview.updatedLabel;
        this.setPagePreviewLoading(folder.id, false);
      },
      error: () => {
        const fallbackPreview = this.createFallbackPagePreview(folder);
        this.pagePreviewCache.set({
          ...this.pagePreviewCache(),
          [folder.id]: fallbackPreview,
        });
        this.setPagePreviewLoading(folder.id, false);
      },
    });
  }

  private getQuickPanelItems(
    sectionId: SidebarQuickSectionId,
  ): SidebarSlideItem[] {
    switch (sectionId) {
      case 'home':
        return this.buildForYouItems();
      case 'starred':
        return this.buildStarredItems();
      case 'apps':
        return this.buildAppItems();
      case 'finance':
        return this.buildFinanceItems();
      default:
        return this.buildRecentItems();
    }
  }

  private buildForYouItems(): SidebarSlideItem[] {
    const recentItems = this.buildRecentItems();
    const starredItems = this.buildStarredItems();
    const deduped = [...recentItems];

    starredItems.forEach((item) => {
      if (!deduped.some((existing) => existing.pageId === item.pageId)) {
        deduped.push(item);
      }
    });

    return deduped.slice(0, 12);
  }

  private buildRecentItems(): SidebarSlideItem[] {
    return this.getAllNodeEntries()
      .filter((entry) => entry.node.type === 'page')
      .map((entry) => {
        const timestamp = this.getNodeActivityTimestamp(entry);

        return {
          id: `recent-${entry.node.id}`,
          title: entry.node.label,
          subtitle: this.spaceName,
          meta: this.formatRelativeTime(timestamp),
          icon: 'article',
          pageId: entry.node.id,
          timestamp,
          description: this.getTrailLabel(entry.trail),
        };
      });
  }

  private buildStarredItems(): SidebarSlideItem[] {
    const starredIds = new Set(this.starredFolderIds());

    return this.getAllNodeEntries()
      .filter((entry) => starredIds.has(entry.node.id))
      .map((entry) => {
        const timestamp = this.getNodeActivityTimestamp(entry);

        return {
          id: `starred-${entry.node.id}`,
          title: entry.node.label,
          subtitle: this.spaceName,
          meta: this.formatRelativeTime(timestamp),
          icon: entry.node.type === 'page' ? 'article' : 'folder',
          pageId: entry.node.type === 'page' ? entry.node.id : undefined,
          folderId: entry.node.type === 'page' ? undefined : entry.node.id,
          timestamp,
          description: this.getTrailLabel(entry.trail),
        };
      });
  }

  private buildSpaceItems(): SidebarSlideItem[] {
    return this.atlassianFolders
      .filter((folder) => folder.type === 'folder' && !folder.archived)
      .map((folder, index) => ({
        id: `space-${folder.id}`,
        title: folder.label,
        subtitle: 'Space',
        meta: `${this.countPages(folder)} pages`,
        icon: 'folder',
        folderId: folder.id,
        timestamp: Date.now() - index * 1000,
      }));
  }

  private buildFinanceItems(): SidebarSlideItem[] {
    const financeSections = [
      {
        id: 'finance-overview',
        title: 'Overview',
        subtitle: 'Budget and spending snapshot',
      },
      {
        id: 'finance-transactions',
        title: 'Transactions',
        subtitle: 'Recent transactions',
      },
      {
        id: 'finance-categories',
        title: 'Categories',
        subtitle: 'Spending by category',
      },
      {
        id: 'finance-cards',
        title: 'Cards',
        subtitle: 'Cards and balances',
      },
      {
        id: 'finance-debts',
        title: 'Debts',
        subtitle: 'Loans and repayments',
      },
    ];

    return financeSections.map((section, index) => ({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      meta: 'Open finance',
      icon: 'account_balance',
      route: '/finance',
      timestamp: Date.now() - index * 1000,
    }));
  }

  private buildAppItems(): SidebarSlideItem[] {
    return [
      {
        id: 'app-content',
        title: 'Content',
        subtitle: 'Browse pages and folders',
        meta: `${this.getContentPageCount()} pages`,
        icon: 'description',
        folderId: this.atlassianFolders[0]?.id,
        timestamp: Date.now(),
      },
      {
        id: 'app-blogs',
        title: 'Blogs',
        subtitle: 'Read or manage posts',
        meta: 'Open blogs',
        icon: 'article',
        route: '/blogs',
        timestamp: Date.now() - 1000,
      },
      {
        id: 'app-calendars',
        title: 'Calendars',
        subtitle: 'Shared planning',
        meta: 'Coming soon',
        icon: 'calendar_month',
        timestamp: Date.now() - 2000,
      },
      {
        id: 'app-company-hub',
        title: 'Company hub',
        subtitle: 'Company knowledge base',
        meta: 'Coming soon',
        icon: 'apartment',
        timestamp: Date.now() - 3000,
      },
      {
        id: 'app-teams',
        title: 'Teams',
        subtitle: 'People and collaboration',
        meta: 'Coming soon',
        icon: 'groups',
        timestamp: Date.now() - 4000,
      },
    ];
  }

  private sortQuickPanelItems(items: SidebarSlideItem[]): SidebarSlideItem[] {
    const sorted = [...items];

    if (this.quickPanelSortMode() === 'title') {
      sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );
      return sorted;
    }

    sorted.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return sorted;
  }

  private groupItemsByTime(items: SidebarSlideItem[]): SidebarSlideGroup[] {
    const groups = new Map<string, SidebarSlideItem[]>();

    items.forEach((item) => {
      const label = this.getTimeGroupLabel(item.timestamp);
      const currentItems = groups.get(label) ?? [];
      currentItems.push(item);
      groups.set(label, currentItems);
    });

    return Array.from(groups.entries()).map(([label, groupItems]) => ({
      label,
      items: groupItems,
    }));
  }

  private getTimeGroupLabel(timestamp?: number): string {
    if (!timestamp) {
      return 'Earlier';
    }

    const now = new Date();
    const itemDate = new Date(timestamp);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    if (timestamp >= startOfToday) {
      return 'Today';
    }

    if (timestamp >= startOfWeek) {
      return 'In the last week';
    }

    if (itemDate.getFullYear() === now.getFullYear()) {
      return 'Earlier this year';
    }

    return 'Archived';
  }

  private getQuickPanelSearchText(item: SidebarSlideItem): string {
    return [
      item.title,
      item.subtitle ?? '',
      item.meta ?? '',
      item.description ?? '',
    ]
      .join(' ')
      .toLowerCase();
  }

  private formatRelativeTime(timestamp?: number): string {
    if (!timestamp) {
      return 'Recently';
    }

    const diffMs = Date.now() - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.round(diffMs / minute));
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.round(diffMs / hour));
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    if (diffMs < 7 * day) {
      const days = Math.max(1, Math.round(diffMs / day));
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return this.formatAbsoluteDate(timestamp);
  }

  private formatAbsoluteDate(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(timestamp);
  }

  private getTrailLabel(trail: string[]): string | undefined {
    return trail.length ? trail[trail.length - 1] : undefined;
  }

  private getNodeActivityTimestamp(entry: SidebarNodeEntry): number {
    return (
      entry.node.visitedAt ??
      entry.node.updatedAt ??
      this.getSyntheticActivityTimestamp(entry.order)
    );
  }

  private getSyntheticActivityTimestamp(order: number): number {
    return Date.now() - order * 1000 * 60 * 60 * 3;
  }

  private getAllNodeEntries(): SidebarNodeEntry[] {
    const entries: SidebarNodeEntry[] = [];
    let order = 0;

    const visit = (nodes: SidebarFolderNode[], trail: string[]) => {
      nodes.forEach((node) => {
        entries.push({
          node,
          order,
          trail,
        });
        order += 1;

        if (node.children?.length) {
          visit(
            node.children,
            node.type === 'folder' ? [...trail, node.label] : trail,
          );
        }
      });
    };

    visit(this.atlassianFolders, []);
    return entries;
  }

  private countPages(folder: SidebarFolderNode): number {
    if (folder.type === 'page') {
      return 1;
    }

    return (folder.children ?? []).reduce(
      (count, child) => count + this.countPages(child),
      0,
    );
  }

  private openPathToNode(
    targetId: string,
    nodes: SidebarFolderNode[] = this.atlassianFolders,
  ): boolean {
    for (const node of nodes) {
      if (node.id === targetId) {
        if (node.type === 'folder') {
          node.open = true;
        }

        return true;
      }

      if (node.children?.length && this.openPathToNode(targetId, node.children)) {
        node.open = true;
        return true;
      }
    }

    return false;
  }

  private hasMatchingContent(folder: SidebarFolderNode, query: string): boolean {
    const queryLower = query.toLowerCase();

    if (folder.label.toLowerCase().includes(queryLower)) {
      return true;
    }

    if (folder.children) {
      for (const child of folder.children) {
        if (this.hasMatchingContent(child, query)) {
          return true;
        }
      }
    }

    return false;
  }

  private expandParentChainIfHasMatch(
    folder: SidebarFolderNode,
    query: string,
  ): boolean {
    const queryLower = query.toLowerCase();
    const currentMatches = folder.label.toLowerCase().includes(queryLower);

    let hasChildMatch = false;
    if (folder.children) {
      for (const child of folder.children) {
        if (this.expandParentChainIfHasMatch(child, query)) {
          hasChildMatch = true;
        }
      }
    }

    if (currentMatches || hasChildMatch) {
      folder.open = true;
      return true;
    }

    return false;
  }

  private collapseAllFolders(folder: SidebarFolderNode): void {
    folder.open = false;
    if (folder.children) {
      folder.children.forEach((child) => this.collapseAllFolders(child));
    }
  }

  private closePopovers(): void {
    this.activeAddMenuId.set(null);
    this.activeActionMenuId.set(null);
    this.isHeaderMenuOpen.set(false);
    this.headerMenuStyles.set(null);
    this.addMenuStyles.set(null);
    this.actionMenuStyles.set(null);
  }

  private renameFolder(folder: SidebarFolderNode): void {
    const label = window.prompt('Rename folder', folder.label)?.trim();

    if (!label || label === folder.label) {
      this.closePopovers();
      return;
    }

    folder.label = label;
    this.markFolderUpdated(folder);
    this.showFeedback(`Renamed to "${label}"`);
    this.closePopovers();
  }

  private toggleFolderStar(folder: SidebarFolderNode): void {
    const starredIds = this.starredFolderIds();
    const isStarred = starredIds.includes(folder.id);

    this.starredFolderIds.set(
      isStarred
        ? starredIds.filter((id) => id !== folder.id)
        : [...starredIds, folder.id],
    );

    this.showFeedback(
      isStarred
        ? `Removed star from "${folder.label}"`
        : `Starred "${folder.label}"`,
    );
    this.closePopovers();
  }

  private async copyFolderLink(folder: SidebarFolderNode): Promise<void> {
    const url = this.buildFolderLink(folder);
    const didCopy = await this.copyTextToClipboard(url);

    this.showFeedback(
      didCopy ? 'Folder link copied' : 'Unable to copy folder link',
    );
    this.closePopovers();
  }

  private async shareFolder(folder: SidebarFolderNode): Promise<void> {
    const url = this.buildFolderLink(folder);

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: folder.label,
          text: `Open ${folder.label}`,
          url,
        });
        this.showFeedback(`Sharing "${folder.label}"`);
      } else {
        const didCopy = await this.copyTextToClipboard(url);
        this.showFeedback(
          didCopy ? 'Folder link copied for sharing' : 'Unable to share folder',
        );
      }
    } catch {
      this.showFeedback('Share cancelled');
    }

    this.closePopovers();
  }

  private makeFolderCopy(
    folder: SidebarFolderNode,
    parent: SidebarFolderNode | null,
  ): void {
    const siblings = parent?.children ?? this.atlassianFolders;
    const index = siblings.findIndex((item) => item.id === folder.id);
    const copy = this.cloneSingleFolder(folder, `${folder.label} Copy`);

    siblings.splice(index >= 0 ? index + 1 : siblings.length, 0, copy);
    this.syncSiblingOrder(siblings);
    this.markFolderUpdated(copy);
    this.showFeedback(`Created a copy of "${folder.label}"`);
    this.closePopovers();
  }

  private moveFolder(
    folder: SidebarFolderNode,
    parent: SidebarFolderNode | null,
  ): void {
    const invalidIds = new Set<string>([
      folder.id,
      ...this.collectDescendantIds(folder),
    ]);
    const targets = this.collectMoveTargets(this.atlassianFolders).filter(
      (target) => !invalidIds.has(target.id),
    );

    const promptText = [
      `Move "${folder.label}" to which folder?`,
      'Type "root" for the top level.',
      '',
      ...targets.map((target) => `${target.label} [${target.id}]`),
    ].join('\n');

    const selection = window.prompt(promptText, 'root')?.trim();

    if (!selection) {
      this.closePopovers();
      return;
    }

    const siblings = parent?.children ?? this.atlassianFolders;
    const currentIndex = siblings.findIndex((item) => item.id === folder.id);

    if (currentIndex === -1) {
      this.closePopovers();
      return;
    }

    siblings.splice(currentIndex, 1);
    this.syncSiblingOrder(siblings);

    if (selection.toLowerCase() === 'root') {
      this.atlassianFolders.unshift(folder);
      this.syncSiblingOrder(this.atlassianFolders);
      this.showFeedback(`Moved "${folder.label}" to the top level`);
      this.closePopovers();
      return;
    }

    const target = targets.find(
      (item) =>
        item.id === selection ||
        item.label.toLowerCase() === selection.toLowerCase(),
    );

    if (!target) {
      siblings.splice(currentIndex, 0, folder);
      this.syncSiblingOrder(siblings);
      this.showFeedback('Destination folder not found');
      this.closePopovers();
      return;
    }

    target.node.children ??= [];
    target.node.children.unshift(folder);
    this.syncSiblingOrder(target.node.children);
    target.node.open = true;
    this.markFolderUpdated(folder);
    this.markFolderUpdated(target.node);

    this.showFeedback(`Moved "${folder.label}" to "${target.label}"`);
    this.closePopovers();
  }

  private archiveFolder(folder: SidebarFolderNode): void {
    folder.archived = true;
    this.markFolderUpdated(folder);
    this.showFeedback(`Archived "${folder.label}"`);
    this.closePopovers();
  }

  private deleteFolder(
    folder: SidebarFolderNode,
    parent: SidebarFolderNode | null,
  ): void {
    const confirmed = window.confirm(
      `Delete "${folder.label}" and its contents?`,
    );

    if (!confirmed) {
      this.closePopovers();
      return;
    }

    const siblings = parent?.children ?? this.atlassianFolders;
    const nextSiblings = siblings.filter((item) => item.id !== folder.id);

    if (parent) {
      parent.children = nextSiblings;
      this.syncSiblingOrder(parent.children);
    } else {
      this.atlassianFolders = nextSiblings;
      this.syncSiblingOrder(this.atlassianFolders);
    }

    this.starredFolderIds.set(
      this.starredFolderIds().filter((id) => id !== folder.id),
    );

    this.showFeedback(`Deleted "${folder.label}"`);
    this.closePopovers();
  }

  private buildFolderLink(folder: SidebarFolderNode): string {
    if (typeof window === 'undefined') {
      return `#folder-${folder.id}`;
    }

    const url = new URL(window.location.href);
    url.hash = `folder-${folder.id}`;
    return url.toString();
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  private showFeedback(message: string): void {
    this.feedbackMessage.set(message);

    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }

    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage.set(null);
    }, 2200);
  }

  private restoreSidebarWidthPreference(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const savedPreference = Number(
      window.localStorage.getItem(this.sidebarWidthStorageKey),
    );

    if (Number.isFinite(savedPreference)) {
      this.sidebarWidthVw.set(this.clampSidebarWidth(savedPreference));
    }
  }

  private persistSidebarWidthPreference(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      this.sidebarWidthStorageKey,
      String(this.sidebarWidthVw()),
    );
  }

  private clampSidebarWidth(widthVw: number): number {
    return Math.min(
      this.maxSidebarWidthVw,
      Math.max(this.minSidebarWidthVw, Number(widthVw.toFixed(2))),
    );
  }

  private finishSidebarResize(): void {
    if (!this.isResizingSidebar()) {
      return;
    }

    this.isResizingSidebar.set(false);
    this.setResizeCursor(false);
    this.persistSidebarWidthPreference();
  }

  private setResizeCursor(isActive: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.cursor = isActive ? 'ew-resize' : '';
    document.body.style.userSelect = isActive ? 'none' : '';
  }

  private collectMoveTargets(
    folders: SidebarFolderNode[],
    targets: FolderTarget[] = [],
  ): FolderTarget[] {
    folders.forEach((folder) => {
      if (!folder.archived) {
        targets.push({
          id: folder.id,
          label: folder.label,
          node: folder,
        });
      }

      if (folder.children?.length) {
        this.collectMoveTargets(folder.children, targets);
      }
    });

    return targets;
  }

  private collectDescendantIds(folder: SidebarFolderNode): string[] {
    const ids: string[] = [];

    folder.children?.forEach((child) => {
      ids.push(child.id, ...this.collectDescendantIds(child));
    });

    return ids;
  }

  private createFolderNode(label: string): SidebarFolderNode {
    const timestamp = Date.now();

    return {
      id: this.generateId(),
      label,
      type: 'folder',
      open: false,
      icon: 'folder',
      children: [],
      sortIndex: 0,
      updatedAt: timestamp,
    };
  }

  private normalizeApiFolders(response: unknown): SidebarFolderNode[] {
    const rawFolders = this.extractFolderArray(response);
    return this.cloneFolderTree(rawFolders);
  }

  private buildPagePreview(
    folder: SidebarFolderNode,
    response: unknown,
  ): SidebarPagePreview {
    const payload =
      response && typeof response === 'object'
        ? (response as Record<string, any>)
        : {};

    return {
      pageId: folder.id,
      title: String(payload['title'] ?? folder.label),
      ownerName: this.resolvePageOwnerName(payload, folder),
      excerpt: this.resolvePageExcerpt(payload, folder),
      updatedLabel: this.resolvePageUpdatedLabel(payload, folder),
    };
  }

  private createFallbackPagePreview(folder: SidebarFolderNode): SidebarPagePreview {
    return {
      pageId: folder.id,
      title: folder.label,
      ownerName: folder.ownerName ?? this.spaceName,
      excerpt:
        folder.description ??
        `Open ${folder.label} to view the full page content and details.`,
      updatedLabel: folder.updatedLabel ?? this.resolvePageUpdatedLabel({}, folder),
    };
  }

  private extractFolderArray(payload: unknown): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    const candidates = [
      record['folders'],
      record['data'],
      record['items'],
      record['results'],
      record['children'],
    ];

    for (const candidate of candidates) {
      const extracted = this.extractFolderArray(candidate);
      if (extracted.length) {
        return extracted;
      }
    }

    if (
      record['id'] !== undefined &&
      (record['label'] !== undefined ||
        record['name'] !== undefined ||
        record['title'] !== undefined)
    ) {
      return [record];
    }

    return [];
  }

  private resolvePageOwnerName(
    payload: Record<string, any>,
    folder: SidebarFolderNode,
  ): string {
    const candidates = [
      payload['ownerName'],
      payload['owner']?.['displayName'],
      payload['lastOwner']?.['displayName'],
      payload['author']?.['displayName'],
      payload['version']?.['author']?.['displayName'],
      folder.ownerName,
      this.spaceName,
    ];

    const ownerName = candidates.find(
      (candidate) => typeof candidate === 'string' && candidate.trim(),
    );

    return typeof ownerName === 'string' ? ownerName.trim() : this.spaceName;
  }

  private resolvePageUpdatedLabel(
    payload: Record<string, any>,
    folder: SidebarFolderNode,
  ): string {
    const rawDate =
      payload['version']?.['createdAt'] ??
      payload['updatedAt'] ??
      payload['lastModified'] ??
      payload['createdAt'] ??
      folder.updatedAt;

    if (!rawDate) {
      return 'Updated recently';
    }

    const date =
      typeof rawDate === 'number'
        ? new Date(rawDate)
        : new Date(String(rawDate));

    if (Number.isNaN(date.getTime())) {
      return 'Updated recently';
    }

    return `Updated on ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  private resolvePageExcerpt(
    payload: Record<string, any>,
    folder: SidebarFolderNode,
  ): string {
    const directTextCandidates = [
      payload['excerpt'],
      payload['summary'],
      payload['description'],
      folder.description,
    ];

    for (const candidate of directTextCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return this.truncatePreviewText(this.stripHtml(candidate));
      }
    }

    const adfValue = payload['body']?.['atlas_doc_format']?.['value'];

    if (typeof adfValue === 'string') {
      try {
        const parsed = JSON.parse(adfValue);
        const plainText = this.collectPreviewText(parsed);

        if (plainText) {
          return this.truncatePreviewText(plainText);
        }
      } catch {
        // Ignore malformed preview content and fall back below.
      }
    }

    return `Open ${payload['title'] ?? folder.label} to view the full page content and details.`;
  }

  private collectPreviewText(node: any, bucket: string[] = []): string {
    if (!node || bucket.join(' ').length >= 220) {
      return bucket.join(' ');
    }

    if (typeof node.text === 'string' && node.text.trim()) {
      bucket.push(node.text.trim());
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        this.collectPreviewText(child, bucket);

        if (bucket.join(' ').length >= 220) {
          break;
        }
      }
    }

    return bucket.join(' ');
  }

  private truncatePreviewText(text: string, maxLength = 150): string {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength).trimEnd()}...`;
  }

  private stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ');
  }

  private cloneFolderTree(nodes: any[], startIndex = 0): SidebarFolderNode[] {
    return nodes.map((node, index) => ({
      id: String(
        node.id ??
          node._id ??
          node.pageId ??
          node.folderId ??
          `${Date.now()}-${startIndex + index}`,
      ),
      label: String(node.label ?? node.name ?? node.title ?? 'Untitled'),
      type: this.resolveFolderType(node),
      icon:
        node.icon ??
        (this.resolveFolderType(node) === 'folder' ? 'article' : undefined),
      description: this.extractNodeDescription(node),
      ownerName: this.extractNodeOwnerName(node),
      updatedLabel: this.extractNodeUpdatedLabel(node),
      open: Boolean(node.isOpen ?? node.open),
      archived: false,
      sortIndex: startIndex + index,
      updatedAt: Date.now() - (startIndex + index) * 1000,
      children: Array.isArray(this.getNodeChildren(node))
        ? this.cloneFolderTree(
            this.getNodeChildren(node),
            (startIndex + index + 1) * 100,
          )
        : [],
    }));
  }

  private extractNodeDescription(node: any): string | undefined {
    const candidate = node.description ?? node.summary ?? node.excerpt;
    return typeof candidate === 'string' && candidate.trim()
      ? this.truncatePreviewText(this.stripHtml(candidate))
      : undefined;
  }

  private extractNodeOwnerName(node: any): string | undefined {
    const candidate =
      node.ownerName ??
      node.owner?.displayName ??
      node.author?.displayName ??
      node.lastOwner?.displayName;

    return typeof candidate === 'string' && candidate.trim()
      ? candidate.trim()
      : undefined;
  }

  private extractNodeUpdatedLabel(node: any): string | undefined {
    const rawDate =
      node.updatedAt ??
      node.lastModified ??
      node.modifiedAt ??
      node.createdAt ??
      node.version?.createdAt;

    if (!rawDate) {
      return undefined;
    }

    return this.resolvePageUpdatedLabel({ updatedAt: rawDate }, {} as SidebarFolderNode);
  }

  private resolveFolderType(node: any): 'folder' | 'file' | 'page' {
    if (node.type === 'page' || node.kind === 'page') {
      return 'page';
    }

    if (node.type === 'file' || node.kind === 'file') {
      return 'file';
    }

    if (Array.isArray(this.getNodeChildren(node)) && this.getNodeChildren(node).length) {
      return 'folder';
    }

    return node.type === 'folder' || node.kind === 'folder' ? 'folder' : 'page';
  }

  private getNodeChildren(node: any): any[] {
    if (Array.isArray(node.children)) {
      return node.children;
    }

    if (Array.isArray(node.items)) {
      return node.items;
    }

    if (Array.isArray(node.nodes)) {
      return node.nodes;
    }

    return [];
  }

  private cloneSingleFolder(
    folder: SidebarFolderNode,
    labelOverride?: string,
  ): SidebarFolderNode {
    return {
      ...folder,
      id: this.generateId(),
      label: labelOverride ?? folder.label,
      archived: false,
      visitedAt: folder.visitedAt,
      updatedAt: Date.now(),
      children:
        folder.children?.map((child) => this.cloneSingleFolder(child)) ?? [],
    };
  }

  private markFolderUpdated(folder: SidebarFolderNode): void {
    folder.updatedAt = Date.now();
  }

  private syncSiblingOrder(folders: SidebarFolderNode[]): void {
    folders.forEach((folder, index) => {
      folder.sortIndex = index;
    });
  }

  private buildPagePreviewStyles(
    anchorElement: HTMLElement | null,
  ): Record<string, string> | null {
    if (!anchorElement || typeof window === 'undefined') {
      return null;
    }

    const rect = anchorElement.getBoundingClientRect();
    const maxLeft =
      window.innerWidth -
      this.pagePreviewWidthPx -
      this.pagePreviewViewportPaddingPx;
    const left = Math.max(
      this.pagePreviewViewportPaddingPx,
      Math.min(rect.right + this.pagePreviewOffsetPx, maxLeft),
    );
    const top = Math.max(
      this.pagePreviewTopInsetPx,
      Math.min(
        rect.top - 4,
        window.innerHeight -
          this.pagePreviewHeightPx -
          this.pagePreviewViewportPaddingPx,
      ),
    );
    const width = Math.min(
      this.pagePreviewWidthPx,
      window.innerWidth - left - this.pagePreviewViewportPaddingPx,
    );

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
    };
  }

  private buildPopoverStyles(
    anchorElement: HTMLElement | null,
    preferredWidthPx: number,
  ): Record<string, string> | null {
    if (!anchorElement || typeof window === 'undefined') {
      return null;
    }

    const rect = anchorElement.getBoundingClientRect();
    const viewportPadding = this.popoverViewportPaddingPx;
    const offset = this.popoverOffsetPx;
    const width = this.isDesktopViewport()
      ? Math.min(
          preferredWidthPx,
          window.innerWidth - viewportPadding * 2,
        )
      : Math.min(
          this.popoverMobileWidthPx,
          window.innerWidth - viewportPadding * 2,
        );
    const left = this.isDesktopViewport()
      ? Math.max(
          viewportPadding,
          Math.min(rect.right - width, window.innerWidth - width - viewportPadding),
        )
      : viewportPadding;
    const belowTop = rect.bottom + offset;
    const maxHeightBelow =
      window.innerHeight - belowTop - viewportPadding;

    if (maxHeightBelow >= this.popoverMinimumHeightPx || rect.top < window.innerHeight / 2) {
      return {
        top: `${belowTop}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(160, maxHeightBelow)}px`,
      };
    }

    const bottom = window.innerHeight - rect.top + offset;
    const maxHeightAbove = rect.top - offset - viewportPadding;

    return {
      bottom: `${bottom}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${Math.max(160, maxHeightAbove)}px`,
    };
  }

  private clearPagePreviewHideTimer(): void {
    if (this.pagePreviewHideTimer) {
      clearTimeout(this.pagePreviewHideTimer);
      this.pagePreviewHideTimer = null;
    }
  }

  private setPagePreviewLoading(pageId: string, isLoading: boolean): void {
    const next = new Set(this.loadingPagePreviewIds());

    if (isLoading) {
      next.add(pageId);
    } else {
      next.delete(pageId);
    }

    this.loadingPagePreviewIds.set(next);
  }

  private isPagePreviewLoading(pageId: string): boolean {
    return this.loadingPagePreviewIds().has(pageId);
  }

  private mergeFolderCollections(
    currentFolders: SidebarFolderNode[],
    incomingFolders: SidebarFolderNode[],
  ): SidebarFolderNode[] {
    const merged = [...currentFolders];

    incomingFolders.forEach((incomingFolder) => {
      const existingIndex = merged.findIndex(
        (folder) => folder.id === incomingFolder.id,
      );

      if (existingIndex === -1) {
        merged.push(incomingFolder);
        return;
      }

      merged[existingIndex] = this.mergeFolderNode(
        merged[existingIndex],
        incomingFolder,
      );
    });

    this.syncSiblingOrder(merged);
    return merged;
  }

  private mergeFolderNode(
    currentFolder: SidebarFolderNode,
    incomingFolder: SidebarFolderNode,
  ): SidebarFolderNode {
    return {
      ...currentFolder,
      ...incomingFolder,
      open: currentFolder.open || incomingFolder.open,
      visitedAt: currentFolder.visitedAt ?? incomingFolder.visitedAt,
      updatedAt: Math.max(
        currentFolder.updatedAt ?? 0,
        incomingFolder.updatedAt ?? 0,
      ),
      children: this.mergeFolderCollections(
        currentFolder.children ?? [],
        incomingFolder.children ?? [],
      ),
    };
  }

  private matchesViewMode(folder: SidebarFolderNode): boolean {
    if (this.currentViewMode() !== 'my-visits') {
      return true;
    }

    if (folder.visitedAt) {
      return true;
    }

    return (
      folder.children?.some((child) => this.matchesViewMode(child)) ?? false
    );
  }

  private sortFoldersForViewMode(
    folders: SidebarFolderNode[],
  ): SidebarFolderNode[] {
    const sorted = [...folders];

    switch (this.currentViewMode()) {
      case 'title-asc':
        sorted.sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
        );
        break;
      case 'last-updated':
        sorted.sort(
          (a, b) =>
            (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
            a.sortIndex - b.sortIndex,
        );
        break;
      case 'my-visits':
        sorted.sort(
          (a, b) =>
            (b.visitedAt ?? 0) - (a.visitedAt ?? 0) ||
            a.sortIndex - b.sortIndex,
        );
        break;
      default:
        sorted.sort((a, b) => a.sortIndex - b.sortIndex);
        break;
    }

    return sorted;
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `folder-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
}
