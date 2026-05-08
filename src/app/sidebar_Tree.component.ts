import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { SidebarNode } from './app.component';
import { ContextMenuComponent, ContextMenuItem } from './context.component';
import { SidebarDataService } from './services/sidebar.service';
import { SidebarStateService } from './services/sidebar_state.service';

@Component({
  selector: 'app-sidebar-tree',
  standalone: true,
  imports: [CommonModule, ContextMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group">
      <ng-container *ngFor="let node of visibleNodes()">
        <div
          class="tree-node"
          [attr.draggable]="true"
          (dragstart)="onDragStart($event, node)"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event, node)"
        >
          <!-- Node Row -->
          <div
            class="tree-node-row"
            role="treeitem"
            tabindex="0"
            [class.active]="state.isActive(node.id)"
            [attr.aria-expanded]="hasChildren(node) ? state.isExpanded(node.id) : null"
            [attr.aria-label]="node.title"
            [style.padding-left.px]="depth * 12 + 4"
            (click)="selectNode(node)"
            (contextmenu)="onRightClick($event, node)"
            (keydown.enter)="selectNode(node)"
            (keydown.arrowRight)="expandNode(node)"
            (keydown.arrowLeft)="collapseNode(node)"
          >
            <!-- Expand chevron -->
            <span
              class="tree-expand"
              [class.leaf]="!hasChildren(node)"
              [class.open]="state.isExpanded(node.id)"
              (click)="$event.stopPropagation(); toggleExpand(node)"
              aria-hidden="true"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M3 2l4 3-4 3V2z"/>
              </svg>
            </span>

            <!-- Node icon -->
            <span class="tree-icon" aria-hidden="true">
              <ng-container *ngIf="node.type === 'space'; else pageIcon">
                <div class="space-avatar" [style.background]="spaceColor(node.id)">
                  {{ node.title[0] }}
                </div>
              </ng-container>
              <ng-template #pageIcon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </ng-template>
            </span>

            <!-- Label with search highlight -->
            <span class="tree-label" [innerHTML]="highlighted(node.title)"></span>

            <!-- Permission icon -->
            <span *ngIf="node.permissions !== 'public'" class="perm-icon" aria-hidden="true">
              <svg *ngIf="node.permissions === 'private'" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#f5a623" stroke-width="1.5">
                <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
              </svg>
              <svg *ngIf="node.permissions === 'restricted'" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#9898a0" stroke-width="1.5">
                <circle cx="8" cy="8" r="5.5"/>
                <line x1="5.5" y1="5.5" x2="10.5" y2="10.5"/>
              </svg>
            </span>

            <!-- Actions (star + dots) -->
            <div class="tree-actions">
              <button
                class="star-btn"
                [class.starred]="state.isStarred(node.id)"
                [attr.aria-label]="(state.isStarred(node.id) ? 'Unstar' : 'Star') + ' ' + node.title"
                (click)="$event.stopPropagation(); toggleStar(node)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24"
                  [attr.fill]="state.isStarred(node.id) ? 'currentColor' : 'none'"
                  stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button
                class="dots-btn"
                [attr.aria-label]="'More actions for ' + node.title"
                (click)="$event.stopPropagation(); openContextMenu($event, node)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Children (recursive) -->
          <div
            *ngIf="hasChildren(node) && state.isExpanded(node.id)"
            class="tree-children"
            role="group"
          >
            <app-sidebar-tree
              [nodes]="node.children!"
              [depth]="depth + 1"
              [searchQuery]="searchQuery"
              (nodeSelected)="nodeSelected.emit($event)"
            />
          </div>
        </div>
      </ng-container>
    </div>

    <!-- Context menu portal -->
    <app-context-menu
      *ngIf="ctxNode()"
      [x]="ctxX()"
      [y]="ctxY()"
      [items]="ctxItems()"
      (closed)="closeContextMenu()"
    />
  `,
  styles: [`
    .tree-node { position: relative; }
    .tree-node-row {
      display: flex; align-items: center; height: 30px;
      border-radius: 5px; margin: 1px 4px;
      cursor: pointer; user-select: none;
      transition: background 200ms; padding-right: 4px;
    }
    .tree-node-row:hover { background: rgba(255,255,255,0.06); }
    .tree-node-row:hover .tree-actions { opacity: 1; }
    .tree-node-row.active { background: rgba(87,157,255,0.15); }
    .tree-node-row.active .tree-label { color: #579dff; }

    .tree-expand {
      width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: #60606a; transition: transform 200ms; border-radius: 3px;
      margin-left: 6px;
    }
    .tree-expand:hover { color: #e8e8ea; background: #323236; }
    .tree-expand.open { transform: rotate(90deg); }
    .tree-expand.leaf { opacity: 0; pointer-events: none; }

    .tree-icon {
      width: 16px; height: 16px; flex-shrink: 0; color: #9898a0;
      margin: 0 5px; display: flex; align-items: center; justify-content: center;
    }
    .space-avatar {
      width: 16px; height: 16px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; color: #fff;
    }
    .tree-label {
      font-size: 13px; color: #e8e8ea; flex: 1;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tree-label ::ng-deep mark {
      background: rgba(87,157,255,0.3); color: #579dff;
      border-radius: 2px; padding: 0 1px;
    }
    .perm-icon { margin-left: 4px; flex-shrink: 0; display: flex; align-items: center; }

    .tree-actions {
      display: flex; align-items: center; gap: 2px;
      opacity: 0; transition: opacity 150ms; flex-shrink: 0;
    }
    .star-btn, .dots-btn {
      width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
      border-radius: 4px; border: none; background: transparent; cursor: pointer;
      color: #60606a; transition: color 200ms, background 200ms;
    }
    .star-btn:hover, .star-btn.starred { color: #f5a623; }
    .dots-btn:hover { background: #323236; color: #e8e8ea; }
    .tree-children { padding-left: 10px; }
  `]
})
export class SidebarTreeComponent {
  @Input() nodes: SidebarNode[] = [];
  @Input() depth = 0;
  @Input() searchQuery = '';
  @Output() nodeSelected = new EventEmitter<SidebarNode>();

  readonly state = inject(SidebarStateService);
  private readonly data = inject(SidebarDataService);

  ctxNode = signal<SidebarNode | null>(null);
  ctxX = signal(0);
  ctxY = signal(0);
  ctxItems = signal<ContextMenuItem[]>([]);

  visibleNodes() {
    if (!this.searchQuery) return this.nodes;
    return this.nodes.filter(n => this.data.matchesSearch(n, this.searchQuery));
  }

  hasChildren(node: SidebarNode): boolean {
    return !!(node.children && node.children.length > 0);
  }

  spaceColor(id: string): string {
    const colors: Record<string, string> = { eng: '#579dff', hr: '#4caf82', prod: '#f5a623' };
    return colors[id] || '#9898a0';
  }

  highlighted(text: string): string {
    if (!this.searchQuery) return text;
    const q = this.searchQuery;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      text.slice(0, idx) +
      `<mark>${text.slice(idx, idx + q.length)}</mark>` +
      text.slice(idx + q.length)
    );
  }

  selectNode(node: SidebarNode): void {
    this.state.setActive(node.id);
    this.state.addRecent(node.id);
    this.nodeSelected.emit(node);
  }

  toggleExpand(node: SidebarNode): void {
    if (this.hasChildren(node)) this.state.toggleExpanded(node.id);
  }

  expandNode(node: SidebarNode): void {
    if (this.hasChildren(node) && !this.state.isExpanded(node.id))
      this.state.toggleExpanded(node.id);
  }

  collapseNode(node: SidebarNode): void {
    if (this.state.isExpanded(node.id)) this.state.toggleExpanded(node.id);
  }

  toggleStar(node: SidebarNode): void {
    this.state.toggleStarred(node.id);
  }

  openContextMenu(event: MouseEvent, node: SidebarNode): void {
    event.preventDefault();
    this.ctxNode.set(node);
    this.ctxX.set(event.clientX);
    this.ctxY.set(event.clientY);
    this.ctxItems.set([
      { icon: '✏️', label: 'Rename', action: () => this.renameNode(node) },
      { icon: '📋', label: 'Duplicate', action: () => console.log('Duplicate', node.id) },
      { icon: '↗️', label: 'Move', action: () => console.log('Move', node.id) },
      { icon: '🔗', label: 'Copy link', action: () => navigator.clipboard?.writeText(`#${node.id}`) },
      { icon: '📄', label: 'Add child page', action: () => this.addChildPage(node) },
      { label: '', icon: '', separator: true },
      { icon: '🔒', label: 'Permissions', action: () => console.log('Permissions', node.permissions) },
      { label: '', icon: '', separator: true },
      { icon: '🗑️', label: 'Delete', danger: true, action: () => console.log('Delete', node.id) },
    ]);
  }

  onRightClick(event: MouseEvent, node: SidebarNode): void {
    event.preventDefault();
    this.openContextMenu(event, node);
  }

  closeContextMenu(): void { this.ctxNode.set(null); }

  private renameNode(node: SidebarNode): void {
    const title = prompt(`Rename "${node.title}":`, node.title);
    if (title) node.title = title;
  }

  private addChildPage(node: SidebarNode): void {
    const title = prompt('New child page name:');
    if (title) {
      node.children = node.children ?? [];
      node.children.push({ id: `p_${Date.now()}`, title, type: 'page', permissions: 'public', children: [] });
      this.state.toggleExpanded(node.id);
    }
  }

  // Drag and drop
  onDragStart(event: DragEvent, node: SidebarNode): void {
    event.dataTransfer?.setData('nodeId', node.id);
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); }
  onDragLeave(event: DragEvent): void { (event.currentTarget as HTMLElement).classList.remove('drag-over'); }
  onDrop(event: DragEvent, target: SidebarNode): void {
    event.preventDefault();
    const dragId = event.dataTransfer?.getData('nodeId');
    if (dragId && dragId !== target.id) {
      console.log(`Move ${dragId} → ${target.id}`);
    }
  }
}