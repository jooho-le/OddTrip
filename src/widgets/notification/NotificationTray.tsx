import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../entities/notification/model/notificationStore';
import type { AppNotification } from '../../entities/notification/api/notificationService';
import { formatRelativeTime } from '../../shared/lib/formatDate';

const ICONS: Record<AppNotification['type'], string> = {
  'match_request.received': '🤝',
  'match_request.accepted': '🎉',
  'match_request.rejected': '💬',
  'match.ended': '🚪',
};

export function NotificationTray() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const items = useNotificationStore((state) => state.items);
  const status = useNotificationStore((state) => state.status);
  const nextBefore = useNotificationStore((state) => state.nextBefore);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const load = useNotificationStore((state) => state.load);
  const loadUnreadCount = useNotificationStore((state) => state.loadUnreadCount);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markRead = useNotificationStore((state) => state.markRead);

  // The socket keeps the tray live while connected; this covers the gap after a
  // reload or a dropped connection.
  useEffect(() => {
    void loadUnreadCount();
    const timer = window.setInterval(() => void loadUnreadCount(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!open) return;
    void load();
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, load]);

  const openNotification = (notification: AppNotification) => {
    void markRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="round-btn"
        aria-label={unreadCount ? `알림, 읽지 않음 ${unreadCount}개` : '알림'}
        aria-expanded={open}
        onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}
      >
        🔔︎{unreadCount > 0 ? <span className="tool-dot" /> : null}
      </button>

      {open ? (
        <div className="notice-popover" role="dialog" aria-label="알림">
          <div className="notice-head">
            <b>알림</b>
            {unreadCount > 0 ? (
              <button type="button" className="text-btn" onClick={() => void markAllRead()}>모두 읽음</button>
            ) : null}
          </div>

          {status === 'loading' && !items.length ? (
            <div className="notice-empty"><b>불러오는 중…</b></div>
          ) : null}

          {status !== 'loading' && !items.length ? (
            <div className="notice-empty">
              <b>새 알림이 없습니다.</b>
              동행 요청을 받거나 상대가 응답하면 여기에 표시됩니다.
            </div>
          ) : null}

          {items.length ? (
            <ul className="notice-list">
              {items.map((item) => (
                <li key={item.id} className={item.read ? '' : 'unread'}>
                  <button type="button" onClick={() => openNotification(item)}>
                    <span className="notice-icon" aria-hidden="true">{ICONS[item.type] ?? '🔔'}</span>
                    <span className="notice-body">
                      <strong>{item.title}</strong>
                      {item.body ? <span>{item.body}</span> : null}
                      <time>{formatRelativeTime(item.createdAt)}</time>
                    </span>
                    {item.read ? null : <span className="notice-dot" aria-label="읽지 않음" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {nextBefore ? (
            <button type="button" className="notice-more" onClick={() => void load({ more: true })}>
              이전 알림 더 보기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
