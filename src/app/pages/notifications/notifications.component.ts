import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NotificationListItem } from '../../model/notification.model';
import { NotificationsService } from '../../services/notifications.service';

type NotificationFilter = 'all' | 'unread' | 'errors';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent {
  readonly notificationsService = inject(NotificationsService);
  readonly activeFilter = signal<NotificationFilter>('all');
  readonly skeletonItems = [1, 2, 3, 4];
  readonly errorCount = computed(
    () =>
      this.notificationsService
        .notifications()
        .filter((item) => item.status === 'error').length,
  );

  readonly filteredNotifications = computed(() => {
    const items = this.notificationsService.notifications();

    switch (this.activeFilter()) {
      case 'unread':
        return items.filter((item) => !item.read);
      case 'errors':
        return items.filter((item) => item.status === 'error');
      default:
        return items;
    }
  });

  constructor() {
    this.notificationsService.init();
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  markAsRead(item: NotificationListItem): void {
    this.notificationsService.markAsRead(item.id);
  }

  remove(item: NotificationListItem): void {
    this.notificationsService.remove(item.id);
  }

  markAsReadFromAction(
    item: NotificationListItem,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.markAsRead(item);
  }

  dismissFromAction(
    item: NotificationListItem,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.remove(item);
  }

  getConnectionLabel(): string {
    switch (this.notificationsService.connectionState()) {
      case 'live':
        return 'Live stream connected';
      case 'connecting':
        return 'Connecting to stream';
      case 'reconnecting':
        return 'Reconnecting to stream';
      default:
        return 'Stream offline';
    }
  }

  getConnectionClasses(): string {
    switch (this.notificationsService.connectionState()) {
      case 'live':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20';
      case 'connecting':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20';
      case 'reconnecting':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20';
    }
  }

  getStatusClasses(item: NotificationListItem): string {
    switch (item.status) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
      default:
        return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300';
    }
  }
}
