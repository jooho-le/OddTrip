import { NavLink } from 'react-router-dom';
import { cn } from '../../shared/lib/classNames';

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
    <aside className="sticky top-28 hidden h-fit md:block">
      <nav className="flex w-48 flex-col gap-2 border-l-4 border-black/10 pl-4">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => cn('rounded-lg px-4 py-3 text-base font-black text-slate-500 hover:bg-white/70', isActive && 'bg-white text-ink shadow-soft')}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
