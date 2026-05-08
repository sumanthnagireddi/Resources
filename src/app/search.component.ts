import {
  Component, Output, EventEmitter, signal, HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-bar">
      <div class="search-box" [class.focused]="focused()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          #searchInput
          type="text"
          [(ngModel)]="query"
          placeholder="Search pages, spaces…"
          aria-label="Search sidebar"
          autocomplete="off"
          (input)="onInput()"
          (focus)="focused.set(true)"
          (blur)="focused.set(false)"
          (keydown.escape)="clear()"
        />
        <span class="kbd" aria-hidden="true">⌘K</span>
      </div>
    </div>
  `,
  styles: [`
    .search-bar { padding: 8px 10px; }
    .search-box {
      display: flex; align-items: center; gap: 7px;
      background: #28282c; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 5px; padding: 6px 10px; cursor: text;
      transition: border-color 200ms; color: #60606a;
    }
    .search-box:hover { border-color: rgba(255,255,255,0.16); }
    .search-box.focused { border-color: #579dff; }
    input {
      background: transparent; border: none; outline: none; flex: 1;
      font-size: 12.5px; color: #e8e8ea; min-width: 0;
    }
    input::placeholder { color: #60606a; }
    .kbd {
      font-size: 10px; color: #60606a; background: #323236;
      padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08);
    }
  `]
})
export class SidebarSearchComponent {
  @Output() queryChanged = new EventEmitter<string>();

  query = '';
  focused = signal(false);

  @HostListener('window:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      (document.querySelector('app-sidebar-search input') as HTMLInputElement)?.focus();
    }
  }

  onInput(): void {
    this.queryChanged.emit(this.query.trim());
  }

  clear(): void {
    this.query = '';
    this.queryChanged.emit('');
  }
}