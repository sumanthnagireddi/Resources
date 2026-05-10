export type NotificationStatus = 'success' | 'info' | 'error';

export type NotificationConnectionState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline';

export interface NotificationItem {
  id: string;
  createdAt: string;
  service: string;
  event: string;
  message: string;
  status: NotificationStatus;
  entityId?: string;
  data?: Record<string, unknown>;
}

export interface NotificationListItem extends NotificationItem {
  read: boolean;
  icon: string;
  eventLabel: string;
  serviceLabel: string;
}
