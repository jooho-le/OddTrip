import { CalendarRange, CircleUserRound, Heart, House, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../shared/lib/classNames';

const tabs = [
  { to: '/home', label: '홈', icon: House, match: ['/home'] },
  { to: '/matches', label: '동행', icon: Heart, match: ['/matches'] },
  { to: '/my', label: '여행', icon: CalendarRange, match: ['/my', '/trip', '/survey', '/trips'] },
  { to: '/chat', label: '채팅', icon: MessageCircle, match: ['/chat'] },
  { to: '/settings', label: '설정', icon: CircleUserRound, match: ['/settings', '/verification', '/help'] },
];

export function BottomTabs() {
  const location = useLocation();
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/94 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 px-2 pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match.some((prefix) => location.pathname.startsWith(prefix));
          return (
            <Link key={tab.to} to={tab.to} aria-current={active ? 'page' : undefined} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-black text-slate-400', active && 'text-accent')}>
              <Icon className="h-6 w-6" strokeWidth={2.4} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
