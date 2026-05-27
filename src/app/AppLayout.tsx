import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomTabs } from '../components/BottomTabs';
import { JourneyGuide } from '../components/JourneyGuide';
import { cn } from '../shared/lib/classNames';

export function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-shell">
      <AppHeader />
      <div className={cn('content-layer mx-auto flex gap-6 px-0 pb-28 md:pb-12', isHome ? 'max-w-none md:py-0' : 'max-w-7xl md:px-8 md:py-6')}>
        <main className={cn('min-w-0 flex-1', isHome ? 'px-0 py-0' : 'px-4 py-4 md:px-0 md:py-0')}>
          {!isHome ? <JourneyGuide /> : null}
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
