import { Bell, CalendarDays, Compass, HeartHandshake, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../shared/lib/classNames';

const tabs = [
  { to: '/matches', label: '매칭', icon: HeartHandshake },
  { to: '/decision', label: '조율', icon: Compass },
  { to: '/itinerary', label: '일정', icon: CalendarDays },
  { to: '/safety', label: '안전', icon: Bell },
  { to: '/my', label: '내 여행', icon: UserRound }
];

export function BottomTabs() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-white/60 bg-[#fffaf0]/88 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => cn('flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold text-slate-500', isActive && 'text-brand-800')}>
              <Icon className="h-5 w-5" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
