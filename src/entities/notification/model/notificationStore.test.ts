import { beforeEach, describe, expect, it } from 'vitest';
import type { AppNotification } from '../api/notificationService';
import { useNotificationStore } from './notificationStore';

const notification: AppNotification = {
  id: 'notification-1',
  type: 'match_request.received',
  title: '새 동행 요청이 도착했습니다.',
  body: '요청 내용을 확인해 주세요.',
  link: '/matches?tab=received',
  read: false,
  createdAt: '2026-09-15T00:00:00Z',
};

describe('notificationStore', () => {
  beforeEach(() => useNotificationStore.getState().reset());

  it('deduplicates repeated websocket notifications by server id', () => {
    useNotificationStore.getState().receive(notification);
    useNotificationStore.getState().receive(notification);

    expect(useNotificationStore.getState().items).toEqual([notification]);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('does not increase the badge for an already-read realtime item', () => {
    useNotificationStore.getState().receive({ ...notification, id: 'notification-2', read: true });

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
