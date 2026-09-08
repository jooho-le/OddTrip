import { Outlet, useLocation } from 'react-router-dom';
import { useTripStore } from '../entities/trip/model/tripStore';
import { AppHeader } from '../widgets/navigation/AppHeader';

export function AppLayout() {
  const location = useLocation();
  const user = useTripStore((state) => state.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));
  const isPublicIntro = location.pathname === '/' && (!user || !hasToken);

  if (isPublicIntro) return <Outlet />;

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-main"><Outlet /></div>
    </div>
  );
}
