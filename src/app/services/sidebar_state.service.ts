import { Injectable, signal, computed, effect } from '@angular/core';
import { SidebarState } from '../app.component';

const STORAGE_KEY = 'confluence_sidebar_state';

const defaultState: SidebarState = {
  collapsed: false,
  expanded: ['eng', 'fe', 'hr'],
  starred: ['eng', 'fe', 'db', 'onb', 'prod'],
  recent: [],
  activeId: '',
  sections: { main: true, spaces: true, recent: true },
};

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private _state = signal<SidebarState>(this.loadFromStorage());

  readonly collapsed = computed(() => this._state().collapsed);
  readonly expanded = computed(() => new Set(this._state().expanded));
  readonly starred = computed(() => new Set(this._state().starred));
  readonly recent = computed(() => this._state().recent);
  readonly activeId = computed(() => this._state().activeId);
  readonly sections = computed(() => this._state().sections);
  readonly starredCount = computed(() => this._state().starred.length);

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state()));
    });
  }

  toggleCollapsed(): void {
    this._state.update(s => ({ ...s, collapsed: !s.collapsed }));
  }

  toggleExpanded(id: string): void {
    this._state.update(s => {
      const set = new Set(s.expanded);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...s, expanded: [...set] };
    });
  }

  toggleStarred(id: string): void {
    this._state.update(s => {
      const set = new Set(s.starred);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...s, starred: [...set] };
    });
  }

  setActive(id: string): void {
    this._state.update(s => ({ ...s, activeId: id }));
  }

  addRecent(id: string): void {
    const agoOptions = ['just now', '2m ago', '5m ago', '12m ago', '1h ago'];
    const ago = agoOptions[Math.floor(Math.random() * agoOptions.length)];
    this._state.update(s => ({
      ...s,
      recent: [
        { id, ago, visitedAt: Date.now() },
        ...s.recent.filter(r => r.id !== id),
      ].slice(0, 8),
    }));
  }

  toggleSection(key: string): void {
    this._state.update(s => ({
      ...s,
      sections: { ...s.sections, [key]: !s.sections[key] },
    }));
  }

  isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  isStarred(id: string): boolean {
    return this.starred().has(id);
  }

  isActive(id: string): boolean {
    return this.activeId() === id;
  }

  private loadFromStorage(): SidebarState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultState, ...JSON.parse(raw) };
    } catch { }
    return defaultState;
  }
}