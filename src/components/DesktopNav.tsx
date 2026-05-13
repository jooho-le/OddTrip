import { NavLink } from 'react-router-dom';
import { cn } from '../shared/lib/classNames';

const links = [
  { to: '/tti/start', label: 'TTI' },
  { to: '/matches', label: '매칭' },
  { to: '/decision', label: '조율' },
  { to: '/attractions', label: '관광지' },
  { to: '/itinerary', label: '일정' },
  { to: '/my', label: '내 여행' }
];

export function DesktopNav() {
  return (
    <aside className="surface-glass sticky top-24 hidden h-fit rounded-lg border border-white/70 p-3 shadow-soft md:block">
      <nav className="flex w-44 flex-col gap-1">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50', isActive && 'bg-brand-50 text-brand-900')}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
