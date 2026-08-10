import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppNotification = { id: string; title: string; message: string; createdAt: string; read: boolean; href?: string; category: 'match' | 'trip' | 'system' };
type NotificationState = { notifications: AppNotification[]; markRead: (id: string) => void; markAllRead: () => void };

const seed: AppNotification[] = [
  { id: 'welcome', title: 'OddTrip에 오신 것을 환영해요', message: 'TTI 진단을 시작하고 새로운 여행 취향을 만나보세요.', createdAt: new Date().toISOString(), read: false, href: '/tti/start', category: 'system' },
  { id: 'match-ready', title: '반대 취향 매칭 준비 완료', message: '나의 여행을 넓혀 줄 여행자를 확인해보세요.', createdAt: new Date(Date.now() - 3600000).toISOString(), read: false, href: '/matches', category: 'match' }
];

export const useNotificationStore = create<NotificationState>()(persist((set) => ({
  notifications: seed,
  markRead: (id) => set((state) => ({ notifications: state.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
  markAllRead: () => set((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })) }))
}), { name: 'oddtrip.notifications' }));
