import {
  Component, inject, signal, ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarNode } from './app.component';
import { SidebarDataService } from './services/sidebar.service';
import { SidebarStateService } from './services/sidebar_state.service';
import { SidebarTreeComponent } from './sidebar_Tree.component';
import { SidebarSearchComponent } from './search.component';

interface NavItem {
  id: string;
  label: string;
  badge?: number;
  badgeClass?: string;
  icon: string; // SVG path snippet key
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarTreeComponent, SidebarSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="sidebar"
      [class.collapsed]="state.collapsed()"
      role="navigation"
      aria-label="Workspace sidebar"
    >
      <!-- Header -->
      <div class="header">
        <div class="workspace-avatar" aria-hidden="true">AT</div>
        <span class="workspace-name">Atlas Workspace</span>
        <button
          class="collapse-btn"
          (click)="state.toggleCollapsed()"
          [attr.aria-label]="state.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [attr.aria-expanded]="!state.collapsed()"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 8h8M9 5l3 3-3 3"/>
          </svg>
        </button>
      </div>

      <!-- Search -->
      <app-sidebar-search (queryChanged)="onSearch($event)" />

      <!-- Scrollable nav -->
      <div class="nav-scroll" role="tree">

        <!-- Main nav -->
        <section class="section">
          <div
            class="section-header"
            role="button" tabindex="0"
            [attr.aria-expanded]="state.sections()['main']"
            (click)="state.toggleSection('main')"
            (keydown.enter)="state.toggleSection('main')"
          >
            <svg class="section-chevron" [class.open]="state.sections()['main']"
              width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 2l4 3-4 3V2z"/>
            </svg>
            <span class="section-label">Main</span>
          </div>

          <div *ngIf="state.sections()['main']">
            <div
              *ngFor="let item of mainNav"
              class="nav-item"
              [class.active]="state.activeId() === item.id"
              role="treeitem" tabindex="0"
              [attr.aria-label]="item.label"
              (click)="activateNav(item.id, item.label)"
              (keydown.enter)="activateNav(item.id, item.label)"
            >
              <span class="nav-icon" aria-hidden="true" [innerHTML]="navIcons[item.id]"></span>
              <span class="label">{{ item.label }}</span>
              <span *ngIf="item.id === 'starred'" class="badge">{{ state.starredCount() }}</span>
              <span *ngIf="item.badge && item.id !== 'starred'" class="badge" [class]="item.badgeClass || ''">{{ item.badge }}</span>
            </div>
          </div>
        </section>

        <!-- Spaces -->
        <section class="section">
          <div
            class="section-header"
            role="button" tabindex="0"
            [attr.aria-expanded]="state.sections()['spaces']"
            (click)="state.toggleSection('spaces')"
            (keydown.enter)="state.toggleSection('spaces')"
          >
            <svg class="section-chevron" [class.open]="state.sections()['spaces']"
              width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 2l4 3-4 3V2z"/>
            </svg>
            <span class="section-label">Spaces</span>
          </div>

          <div *ngIf="state.sections()['spaces']">
            <app-sidebar-tree
              [nodes]="data.nodes"
              [searchQuery]="searchQuery()"
              (nodeSelected)="onNodeSelected($event)"
            />
          </div>
        </section>

        <!-- Recent -->
        <section class="section" *ngIf="state.recent().length">
          <div
            class="section-header"
            role="button" tabindex="0"
            [attr.aria-expanded]="state.sections()['recent']"
            (click)="state.toggleSection('recent')"
            (keydown.enter)="state.toggleSection('recent')"
          >
            <svg class="section-chevron" [class.open]="state.sections()['recent']"
              width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 2l4 3-4 3V2z"/>
            </svg>
            <span class="section-label">Recent</span>
          </div>

          <div *ngIf="state.sections()['recent']">
            <div
              *ngFor="let r of state.recent().slice(0, 5)"
              class="nav-item"
              role="treeitem" tabindex="0"
              (click)="activateNav(r.id, data.findNode(r.id)?.title || '')"
              (keydown.enter)="activateNav(r.id, data.findNode(r.id)?.title || '')"
            >
              <span class="nav-icon" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              <span class="label">{{ data.findNode(r.id)?.title }}</span>
              <span style="font-size:10px;color:#60606a;flex-shrink:0">{{ r.ago }}</span>
            </div>
          </div>
        </section>

      </div><!-- /nav-scroll -->

      <!-- Quick actions -->
      <div class="quick-actions">
        <button class="quick-btn primary" (click)="createPage()" aria-label="Create page">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span class="quick-label">Create page</span>
        </button>
        <button class="quick-btn" aria-label="Invite users">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span class="quick-label">Invite users</span>
        </button>
        <button class="quick-btn" aria-label="Settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span class="quick-label">Settings</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: block; }

    .sidebar {
      --sb-expanded: 272px;
      --sb-collapsed: 56px;
      width: var(--sb-expanded);
      min-width: var(--sb-expanded);
      background: #1c1c1e;
      border-right: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; height: 100vh;
      transition: width 200ms cubic-bezier(0.4,0,0.2,1),
                  min-width 200ms cubic-bezier(0.4,0,0.2,1);
      overflow: hidden; flex-shrink: 0;
    }

    .sidebar.collapsed {
      width: var(--sb-collapsed);
      min-width: var(--sb-collapsed);
    }
    .sidebar.collapsed .label,
    .sidebar.collapsed .section-label,
    .sidebar.collapsed .workspace-name,
    .sidebar.collapsed .badge,
    .sidebar.collapsed .quick-label,
    .sidebar.collapsed app-sidebar-search { display: none; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 0 14px; }
    .sidebar.collapsed .nav-icon { margin-right: 0; }
    .sidebar.collapsed .quick-btn { justify-content: center; padding: 0 8px; }
    .sidebar.collapsed .header { padding: 12px 8px; }
    .sidebar.collapsed .workspace-avatar { margin-right: 0; }

    .header {
      padding: 14px 12px 10px; display: flex; align-items: center; gap: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
    }
    .workspace-avatar {
      width: 30px; height: 30px; border-radius: 7px;
      background: linear-gradient(135deg, #579dff, #9c5cff);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .workspace-name {
      font-size: 13.5px; font-weight: 600; color: #e8e8ea;
      flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .collapse-btn {
      width: 24px; height: 24px; border-radius: 6px; border: none;
      background: transparent; color: #9898a0; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: background 200ms, color 200ms;
    }
    .collapse-btn:hover { background: rgba(255,255,255,0.06); color: #e8e8ea; }

    .nav-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 0; }
    .nav-scroll::-webkit-scrollbar { width: 4px; }
    .nav-scroll::-webkit-scrollbar-thumb { background: #323236; border-radius: 4px; }

    .section { padding: 4px 0; }
    .section-header {
      display: flex; align-items: center; padding: 4px 10px; gap: 6px;
      cursor: pointer; user-select: none; border-radius: 5px; margin: 0 4px;
      transition: background 200ms;
    }
    .section-header:hover { background: rgba(255,255,255,0.06); }
    .section-label {
      font-size: 11px; font-weight: 600; color: #60606a;
      letter-spacing: 0.06em; text-transform: uppercase; flex: 1;
    }
    .section-chevron { color: #60606a; transition: transform 200ms; }
    .section-chevron.open { transform: rotate(90deg); }

    .nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 0 10px; height: 34px; border-radius: 5px;
      margin: 1px 4px; cursor: pointer; user-select: none;
      transition: background 200ms;
    }
    .nav-item:hover { background: rgba(255,255,255,0.06); }
    .nav-item.active { background: rgba(87,157,255,0.15); }
    .nav-item.active .label { color: #579dff; }
    .nav-item.active .nav-icon { color: #579dff; }

    .nav-icon {
      width: 16px; height: 16px; flex-shrink: 0; color: #9898a0;
      display: flex; align-items: center; justify-content: center;
    }
    .label { font-size: 13.5px; color: #e8e8ea; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge {
      font-size: 10.5px; font-weight: 600; background: #579dff;
      color: #fff; padding: 0 6px; border-radius: 10px; line-height: 16px;
    }
    .badge.warn { background: #f5a623; }

    .quick-actions {
      padding: 8px 6px; border-top: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0; display: flex; flex-direction: column; gap: 2px;
    }
    .quick-btn {
      display: flex; align-items: center; gap: 8px; height: 34px;
      padding: 0 10px; border-radius: 5px; border: none;
      background: transparent; color: #e8e8ea; font-size: 13.5px;
      cursor: pointer; width: 100%; transition: background 200ms; white-space: nowrap;
    }
    .quick-btn:hover { background: rgba(255,255,255,0.06); }
    .quick-btn.primary { background: rgba(87,157,255,0.15); color: #579dff; }
    .quick-btn.primary:hover { background: rgba(87,157,255,0.22); }
    .quick-label { flex: 1; text-align: left; }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed; left: 0; top: 0; z-index: 100;
        transform: translateX(0); transition: transform 300ms ease;
        box-shadow: 4px 0 20px rgba(0,0,0,0.4);
      }
      .sidebar.collapsed { transform: translateX(-100%); }
    }
  `]
})
export class SidebarComponent implements OnInit {
  readonly state = inject(SidebarStateService);
  readonly data = inject(SidebarDataService);

  searchQuery = signal('');

  readonly mainNav: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'recent', label: 'Recent', icon: 'recent' },
    { id: 'starred', label: 'Starred', icon: 'star' },
    { id: 'spaces', label: 'Spaces', icon: 'spaces' },
    { id: 'templates', label: 'Templates', icon: 'templates' },
    { id: 'people', label: 'People', icon: 'people' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox', badge: 3, badgeClass: 'warn' },
  ];

  readonly navIcons: Record<string, string> = {
    home: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    recent: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    star: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    spaces: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>`,
    templates: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    people: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    inbox: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  };

  ngOnInit(): void {
    this.state.setActive('home');
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    if (query) this.state.toggleSection('spaces');
  }

  onNodeSelected(node: SidebarNode): void {
    console.log('Selected node:', node);
  }

  activateNav(id: string, label: string): void {
    this.state.setActive(id);
    console.log('Navigate to:', id, label);
  }

  createPage(): void {
    const title = prompt('New page title:', 'Untitled');
    if (title) {
      this.data.nodes[0].children?.push({
        id: `p_${Date.now()}`, title, type: 'page', permissions: 'public', children: []
      });
      if (!this.state.isExpanded('eng')) this.state.toggleExpanded('eng');
    }
  }
}