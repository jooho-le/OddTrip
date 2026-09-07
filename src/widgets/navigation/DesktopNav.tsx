import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../shared/lib/classNames';
import { useChatStore } from '../../entities/chat/model/chatStore';
import { useTripStore } from '../../entities/trip/model/tripStore';

const links = [
  { to: '/tti/start', label: 'TTI' },
  { to: '/matches', label: '매칭' },
  { to: '/chat', label: '채팅' },
  { to: '/decision', label: '조율' },
  { to: '/attractions', label: '관광지' },
  { to: '/itinerary', label: '일정' },
  { to: '/my', label: '내 여행' }
];

export function DesktopNav() {
  const user = useTripStore((state) => state.user);
  const unreadTotal = useChatStore((state) => state.unreadTotal);
  const loadUnreadCount = useChatStore((state) => state.loadUnreadCount);

  useEffect(() => {
    if (!user) return;
    void loadUnreadCount();
    const timer = window.setInterval(() => void loadUnreadCount(), 30_000);
    return () => window.clearInterval(timer);
  }, [user, loadUnreadCount]);

  return (
    <aside className="sticky top-28 hidden h-fit md:block">
      <nav className="flex w-48 flex-col gap-2 border-l-4 border-black/10 pl-4">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => cn('flex items-center justify-between rounded-lg px-4 py-3 text-base font-black text-slate-500 hover:bg-white/70', isActive && 'bg-white text-ink shadow-soft')}>
            {link.label}
            {link.to === '/chat' && unreadTotal > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-black text-white">{unreadTotal}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
