import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ContextMenuItem {
  label: string;
  icon: string;
  danger?: boolean;
  separator?: boolean;
  action?: () => void;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ctx-menu"
      role="menu"
      aria-label="Page actions"
      [style.left.px]="x"
      [style.top.px]="y"
    >
      <ng-container *ngFor="let item of items">
        <div *ngIf="item.separator" class="ctx-sep"></div>
        <div
          *ngIf="!item.separator"
          class="ctx-item"
          [class.danger]="item.danger"
          role="menuitem"
          tabindex="0"
          (click)="handleAction(item)"
          (keydown.enter)="handleAction(item)"
        >
          <span class="ctx-icon">{{ item.icon }}</span>
          {{ item.label }}
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host { position: fixed; z-index: 9999; }
    .ctx-menu {
      position: fixed;
      background: var(--menu-bg, #28282c);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 9px;
      padding: 4px;
      min-width: 180px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: ctxIn 100ms ease;
    }
    @keyframes ctxIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .ctx-item {
      display: flex; align-items: center; gap: 9px;
      padding: 7px 10px; border-radius: 6px;
      cursor: pointer; font-size: 13px;
      color: var(--text-primary, #e8e8ea);
      transition: background 100ms;
    }
    .ctx-item:hover { background: rgba(255,255,255,0.06); }
    .ctx-item.danger { color: #f06260; }
    .ctx-sep { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0; }
    .ctx-icon { font-size: 14px; }
  `]
})
export class ContextMenuComponent implements OnInit, OnDestroy {
  @Input() x = 0;
  @Input() y = 0;
  @Input() items: ContextMenuItem[] = [];
  @Output() closed = new EventEmitter<void>();

  ngOnInit(): void {
    setTimeout(() => document.addEventListener('click', this.close), 0);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.close);
  }

  handleAction(item: ContextMenuItem): void {
    item.action?.();
    this.closed.emit();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void { this.closed.emit(); }

  private close = () => this.closed.emit();
}