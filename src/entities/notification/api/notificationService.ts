import { apiRequest } from '../../../shared/api/client';

export type NotificationType =
  | 'match_request.received'
  | 'match_request.accepted'
  | 'match_request.rejected'
  | 'match.ended';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  payload?: Record<string, unknown> | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  nextBefore: string | null;
}

export const notificationService = {
  list(params: { unreadOnly?: boolean; before?: string; limit?: number } = {}) {
    return apiRequest<NotificationPage>({ url: '/api/notifications', method: 'GET', params });
  },

  unreadCount() {
    return apiRequest<{ count: number }>({ url: '/api/notifications/unread-count', method: 'GET' });
  },

  // Omitting notificationIds marks every unread notification as read.
  markRead(notificationIds?: string[]) {
    return apiRequest<{ updated: number; unreadCount: number }>({
      url: '/api/notifications/read',
      method: 'PUT',
      data: notificationIds ? { notificationIds } : {},
    });
  },
};
