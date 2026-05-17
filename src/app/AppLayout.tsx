import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomTabs } from '../components/BottomTabs';
import { DesktopNav } from '../components/DesktopNav';

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="content-layer mx-auto flex max-w-6xl gap-6 px-4 py-5 pb-28 md:px-8 md:pb-10">
        <DesktopNav />
        <main className="min-w-0 flex-1 reveal-card">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
