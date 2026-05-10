import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { environment } from '../../../../environments/environment';
import { NotificationListItem } from '../../../model/notification.model';
import { AuthService } from '../../../services/auth.service';
import {
  ACCENT_COLORS,
  AccentColor,
  ThemeMode,
  ThemeService,
} from '../../../services/theme.service';
import { NotificationsService } from '../../../services/notifications.service';
import { toggleSidebar } from '../../../store/actions/sidebar.actions';
import { GlobalSearchComponent } from '../../global-search/global-search.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, GlobalSearchComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  @ViewChild(GlobalSearchComponent) globalSearch!: GlobalSearchComponent;

  sidebarToggleStatus = false;
  isServerOn = false;
  showThemePopover = false;
  showNotificationsPopover = false;
  showAppsPopover = false;
  showProfilePopover = false;

  readonly visibleNotifications = computed(() =>
    this.notificationsService.notifications().slice(0, 8),
  );

  readonly personalApps = [
    {
      name: 'Portfolio',
      url: 'https://sumanthnagireddi1.web.app',
      image: 'https://sumanthnagireddi1.web.app/assets/imag3.jpg',
      description: 'My personal portfolio website',
    },
  ];

  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly elementRef = inject(ElementRef);
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  readonly notificationsService = inject(NotificationsService);

  readonly accentColors = ACCENT_COLORS;
  readonly themeModes: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: 'light_mode' },
    { label: 'Dark', value: 'dark', icon: 'dark_mode' },
    { label: 'System', value: 'system', icon: 'contrast' },
  ];

  ngOnInit(): void {
    this.notificationsService.init();

    this.http
      .get<{ status: boolean }>(`${environment.API_URL}/health`)
      .subscribe({
        next: (data) => {
          this.isServerOn = !!data;
        },
        error: () => {
          this.isServerOn = false;
        },
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showThemePopover = false;
      this.showNotificationsPopover = false;
      this.showAppsPopover = false;
      this.showProfilePopover = false;
    }
  }

  toggleAppsPopover(event: MouseEvent): void {
    event.stopPropagation();
    this.showAppsPopover = !this.showAppsPopover;
    this.showThemePopover = false;
    this.showNotificationsPopover = false;
    this.showProfilePopover = false;
  }

  toggleSidebar(): void {
    this.sidebarToggleStatus = !this.sidebarToggleStatus;
    this.store.dispatch(toggleSidebar({ show: this.sidebarToggleStatus }));
  }

  toggleThemePopover(event: MouseEvent): void {
    event.stopPropagation();
    this.showThemePopover = !this.showThemePopover;
    this.showNotificationsPopover = false;
    this.showAppsPopover = false;
    this.showProfilePopover = false;
  }

  toggleNotificationsPopover(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotificationsPopover = !this.showNotificationsPopover;
    this.showThemePopover = false;
    this.showAppsPopover = false;
    this.showProfilePopover = false;
  }

  markAsRead(notification: NotificationListItem): void {
    this.notificationsService.markAsRead(notification.id);
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  removeNotification(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsService.remove(id);
  }

  clearAllNotifications(): void {
    this.notificationsService.clearAll();
  }

  refreshNotifications(event?: MouseEvent): void {
    event?.stopPropagation();
    this.notificationsService.refresh();
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeService.setThemeMode(mode);
  }

  setAccentColor(color: AccentColor): void {
    this.themeService.setAccentColor(color);
  }

  navigatoToUpTime(): void {
    window.open('https://stats.uptimerobot.com/Nzi1DUyGFD', '_blank');
  }

  openGlobalSearch(): void {
    this.globalSearch?.openSearch();
  }

  toggleProfilePopover(event: MouseEvent): void {
    event.stopPropagation();
    this.showProfilePopover = !this.showProfilePopover;
    this.showThemePopover = false;
    this.showNotificationsPopover = false;
    this.showAppsPopover = false;
  }

  logout(): void {
    this.showProfilePopover = false;
    this.authService.logout();
  }

  getConnectionLabel(): string {
    switch (this.notificationsService.connectionState()) {
      case 'live':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'reconnecting':
        return 'Reconnecting';
      default:
        return 'Offline';
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

  getNotificationToneClasses(notification: NotificationListItem): string {
    switch (notification.status) {
      case 'success':
        return 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300';
      case 'error':
        return 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-300';
      default:
        return 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300';
    }
  }
}
