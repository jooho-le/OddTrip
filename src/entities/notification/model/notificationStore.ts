import { create } from 'zustand';
import {
  notificationService,
  type AppNotification,
} from '../api/notificationService';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface NotificationState {
  items: AppNotification[];
  status: Status;
  nextBefore?: string | null;
  unreadCount: number;
  error?: string;

  load: (options?: { more?: boolean }) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  receive: (notification: AppNotification) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  status: 'idle',
  unreadCount: 0,

  async load(options = {}) {
    const { more = false } = options;
    const before = more ? get().nextBefore ?? undefined : undefined;
    set({ status: 'loading', error: undefined });
    try {
      const response = await notificationService.list({ before, limit: 20 });
      set((state) => ({
        items: more ? [...state.items, ...response.data.items] : response.data.items,
        nextBefore: response.data.nextBefore,
        status: 'success',
      }));
    } catch (error) {
      set({ status: 'error', error: (error as Error).message });
    }
  },

  async loadUnreadCount() {
    try {
      const response = await notificationService.unreadCount();
      set({ unreadCount: response.data.count });
    } catch {
      // Best-effort: a stale badge is not worth an error toast.
    }
  },

  async markAllRead() {
    const now = new Date().toISOString();
    // Optimistic: the tray is already open, so the badge should clear at once.
    set((state) => ({
      items: state.items.map((item) => (item.read ? item : { ...item, read: true, readAt: now })),
      unreadCount: 0,
    }));
    try {
      const response = await notificationService.markRead();
      set({ unreadCount: response.data.unreadCount });
    } catch {
      void get().loadUnreadCount();
    }
  },

  async markRead(id) {
    const target = get().items.find((item) => item.id === id);
    if (!target || target.read) return;
    const now = new Date().toISOString();
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, read: true, readAt: now } : item)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    try {
      const response = await notificationService.markRead([id]);
      set({ unreadCount: response.data.unreadCount });
    } catch {
      void get().loadUnreadCount();
    }
  },

  receive(notification) {
    set((state) => {
      if (state.items.some((item) => item.id === notification.id)) return state;
      return {
        items: [notification, ...state.items],
        unreadCount: state.unreadCount + (notification.read ? 0 : 1),
      };
    });
  },

  reset() {
    set({ items: [], status: 'idle', nextBefore: undefined, unreadCount: 0, error: undefined });
  },
}));
