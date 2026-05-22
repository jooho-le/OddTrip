import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomTabs } from '../components/BottomTabs';
import { DesktopNav } from '../components/DesktopNav';

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="content-layer mx-auto flex max-w-7xl gap-6 px-0 pb-28 md:px-8 md:py-6 md:pb-12">
        <DesktopNav />
        <main className="min-w-0 flex-1 px-4 py-4 md:px-0 md:py-0">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
