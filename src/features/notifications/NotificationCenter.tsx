import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../shared/ui/Modal';
import { cn } from '../../shared/lib/classNames';
import { useNotificationStore } from './notificationStore';

export function NotificationBell({ inverted = false }: { inverted?: boolean }) {
  const notifications = useNotificationStore((state) => state.notifications);
  const unread = notifications.filter((item) => !item.read).length;
  return <span className="relative"><Bell className="h-5 w-5" />{unread ? <span className={cn('absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-black text-white ring-2', inverted ? 'ring-ink' : 'ring-white')}>{unread}</span> : null}</span>;
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead } = useNotificationStore();
  const unread = notifications.filter((item) => !item.read).length;
  return <Modal open={open} onClose={onClose} title="알림">
    <div className="mb-4 flex items-center justify-between"><p className="text-sm text-muted">읽지 않은 알림 {unread}개</p><button onClick={markAllRead} disabled={!unread} className="inline-flex items-center gap-1 text-xs font-extrabold text-accent disabled:opacity-40"><CheckCheck className="h-4 w-4"/>모두 읽음</button></div>
    <div className="-mx-2 space-y-1">{notifications.map((item) => <button key={item.id} onClick={() => { markRead(item.id); onClose(); if (item.href) navigate(item.href); }} className={cn('flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-canvas', !item.read && 'bg-accent-soft')}>
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.read ? 'bg-line' : 'bg-accent')}/><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-ink">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted">{item.message}</span><span className="mt-1 block text-[11px] text-muted">{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</span></span>{item.href ? <ChevronRight className="mt-2 h-4 w-4 text-muted"/> : null}
    </button>)}</div>
  </Modal>;
}
