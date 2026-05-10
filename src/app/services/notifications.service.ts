import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  NotificationConnectionState,
  NotificationItem,
  NotificationListItem,
  NotificationStatus,
} from '../model/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);

  private readonly apiBase =
    environment.API_URL;
  private source: EventSource | null = null;
  private initialized = false;

  readonly notifications = signal<NotificationListItem[]>([]);
  readonly isLoading = signal(false);
  readonly connectionState =
    signal<NotificationConnectionState>('offline');
  readonly unreadCount = computed(
    () => this.notifications().filter((item) => !item.read).length,
  );

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.refresh();
    this.connect();
  }

  refresh(): void {
    this.isLoading.set(true);

    this.http
      .get<NotificationItem[]>(`${this.apiBase}/notifications?limit=20`)
      .pipe(
        catchError(() => {
          this.isLoading.set(false);
          if (!this.notifications().length) {
            this.connectionState.set('offline');
          }
          return of([]);
        }),
      )
      .subscribe((items) => {
        this.ngZone.run(() => {
          const existingItems = this.notifications();
          const existingReads = new Map(
            existingItems.map((item) => [item.id, item.read]),
          );

          const normalizedItems = items.map((item) =>
            this.normalizeNotification(item, existingReads.get(item.id)),
          );

          this.notifications.set(
            this.sortNotifications(this.mergeCollections(normalizedItems, existingItems)),
          );
          this.isLoading.set(false);
        });
      });
  }

  markAsRead(id: string): void {
    this.notifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  markAllAsRead(): void {
    this.notifications.update((items) =>
      items.map((item) => ({ ...item, read: true })),
    );
  }

  remove(id: string): void {
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  }

  clearAll(): void {
    this.notifications.set([]);
  }

  formatRelativeTime(createdAt: string): string {
    const timestamp = new Date(createdAt).getTime();
    if (Number.isNaN(timestamp)) {
      return 'Just now';
    }

    const diffMs = timestamp - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);

    if (Math.abs(diffMinutes) < 1) {
      return 'Just now';
    }

    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 60) {
      return formatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return formatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) {
      return formatter.format(diffDays, 'day');
    }

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(createdAt));
  }

  formatExactTime(createdAt: string): string {
    const timestamp = new Date(createdAt);
    if (Number.isNaN(timestamp.getTime())) {
      return 'Unknown time';
    }

    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }

  connect(): void {
    if (this.source || typeof EventSource === 'undefined') {
      return;
    }

    this.connectionState.set('connecting');
    this.source = new EventSource(`${this.apiBase}/notifications/stream`);

    this.source.onopen = () => {
      this.ngZone.run(() => this.connectionState.set('live'));
    };

    const eventNames = [
      'atlassian.folders.fetch.success',
      'atlassian.pages.fetch.success',
      'atlassian.content.upsert.success',
      'atlassian.content.bulk-upsert.success',
      'atlassian.page.sync.success',
      'atlassian.sync.completed.success',
    ];

    eventNames.forEach((eventName) => {
      this.source?.addEventListener(eventName, (event) => {
        const messageEvent = event as MessageEvent<string>;

        this.ngZone.run(() => {
          try {
            const notification = JSON.parse(messageEvent.data) as NotificationItem;
            this.upsert(notification);
            this.connectionState.set('live');
          } catch (error) {
            console.error('Failed to parse notification event', error);
          }
        });
      });
    });

    this.source.addEventListener('notifications.heartbeat', () => {
      this.ngZone.run(() => this.connectionState.set('live'));
    });

    this.source.onerror = () => {
      this.ngZone.run(() => {
        this.connectionState.set(this.isBrowserOnline() ? 'reconnecting' : 'offline');
      });
    };
  }

  private upsert(notification: NotificationItem): void {
    this.notifications.update((items) => {
      const existing = items.find((item) => item.id === notification.id);
      const nextItem = this.normalizeNotification(notification, existing?.read);
      const remainingItems = items.filter((item) => item.id !== notification.id);

      return this.sortNotifications([nextItem, ...remainingItems]).slice(0, 50);
    });
  }

  private normalizeNotification(
    item: NotificationItem,
    read = false,
  ): NotificationListItem {
    return {
      ...item,
      message: item.message?.trim() || this.humanizeEvent(item.event),
      read,
      icon: this.resolveIcon(item.event, item.status),
      eventLabel: this.humanizeEvent(item.event),
      serviceLabel: this.humanizeService(item.service),
    };
  }

  private mergeCollections(
    incomingItems: NotificationListItem[],
    existingItems: NotificationListItem[],
  ): NotificationListItem[] {
    const merged = new Map<string, NotificationListItem>();

    [...incomingItems, ...existingItems].forEach((item) => {
      const current = merged.get(item.id);
      merged.set(item.id, {
        ...item,
        read: current?.read ?? item.read,
      });
    });

    return Array.from(merged.values()).slice(0, 50);
  }

  private sortNotifications(
    items: NotificationListItem[],
  ): NotificationListItem[] {
    return [...items].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
        return 0;
      }

      if (Number.isNaN(leftTime)) {
        return 1;
      }

      if (Number.isNaN(rightTime)) {
        return -1;
      }

      return rightTime - leftTime;
    });
  }

  private humanizeEvent(eventName: string): string {
    return eventName
      .replace(/^atlassian\./, '')
      .replace(/\.(success|error|info)$/i, '')
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private humanizeService(serviceName: string): string {
    return serviceName
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveIcon(eventName: string, status: NotificationStatus): string {
    const loweredEvent = eventName.toLowerCase();

    if (loweredEvent.includes('folder')) {
      return 'folder';
    }

    if (loweredEvent.includes('bulk-upsert') || loweredEvent.includes('sync')) {
      return 'sync';
    }

    if (loweredEvent.includes('content') || loweredEvent.includes('page')) {
      return 'description';
    }

    switch (status) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'notifications';
    }
  }

  private isBrowserOnline(): boolean {
    return typeof navigator === 'undefined' ? false : navigator.onLine;
  }
}
