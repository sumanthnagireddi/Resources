import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AtlassianPageWidthMode = 'centered' | 'full-width';

@Component({
  selector: 'app-atlassian-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atlassian-page-header.component.html',
  styleUrl: './atlassian-page-header.component.css',
})
export class AtlassianPageHeaderComponent {
  @Input() title = 'Untitled page';
  @Input() page: any = null;
  @Input() collapsed = false;
  @Input() readTimeMinutes = 3;
  @Input() authorName = 'Sumanth';
  @Input() contentWidthMode: AtlassianPageWidthMode = 'centered';

  @Output() contentWidthModeChange =
    new EventEmitter<AtlassianPageWidthMode>();

  get publishedLabel(): string {
    const sourceDate =
      this.page?.createdAt ??
      this.page?.version?.createdAt ??
      this.page?.updatedAt ??
      null;

    if (!sourceDate) {
      return 'Published';
    }

    return `Published ${new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(sourceDate))}`;
  }

  get authorInitial(): string {
    return (this.authorName.trim().charAt(0) || 'S').toUpperCase();
  }

  get pageUrl(): string | null {
    const base = this.page?._links?.base;
    const webUi = this.page?._links?.webui;

    return base && webUi ? `${base}${webUi}` : null;
  }

  get editUrl(): string | null {
    const base = this.page?._links?.base;
    const editUi = this.page?._links?.edituiv2 ?? this.page?._links?.editui;

    return base && editUi ? `${base}${editUi}` : null;
  }

  async sharePage(): Promise<void> {
    const url = this.pageUrl;

    if (!url) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: this.title,
          url,
        });
        return;
      } catch {
        // Fall back to copying the link when native share is dismissed.
      }
    }

    await this.copyLink();
  }

  async copyLink(): Promise<void> {
    const url = this.pageUrl;

    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy page link', url);
    }
  }

  openEdit(): void {
    this.openExternal(this.editUrl);
  }

  toggleContentWidth(): void {
    this.contentWidthModeChange.emit(
      this.contentWidthMode === 'centered' ? 'full-width' : 'centered',
    );
  }

  openMore(): void {
    this.openExternal(this.pageUrl);
  }

  private openExternal(url: string | null): void {
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
