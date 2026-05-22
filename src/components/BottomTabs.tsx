import { CalendarDays, Grid3X3, HeartHandshake, Home, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../shared/lib/classNames';

const tabs = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/matches', label: '매칭', icon: HeartHandshake },
  { to: '/attractions', label: '추천', icon: Grid3X3 },
  { to: '/itinerary', label: '일정', icon: CalendarDays },
  { to: '/my', label: 'MY', icon: UserRound }
];

export function BottomTabs() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/94 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 px-2 pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-black text-slate-400', isActive && 'text-ink')}>
              <Icon className="h-6 w-6" strokeWidth={2.4} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
