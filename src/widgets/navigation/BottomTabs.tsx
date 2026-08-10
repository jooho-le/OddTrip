import { CalendarRange, CircleUserRound, Heart, House, MapPinned } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../shared/lib/classNames';

const tabs = [
  { to: '/', label: 'HOME', icon: House },
  { to: '/matches', label: '매칭', icon: Heart },
  { to: '/attractions', label: '추천', icon: MapPinned },
  { to: '/itinerary', label: '일정', icon: CalendarRange },
  { to: '/my', label: 'MY', icon: CircleUserRound }
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
