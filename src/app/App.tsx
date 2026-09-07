import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTripStore } from '../entities/trip/model/tripStore';
import { PrototypeLayout } from './PrototypeLayout';
import { IntroCurtain } from '../features/intro-transition/IntroCurtain';
import { IntroLandingPage } from '../pages/intro/IntroLandingPage';
import { HomePage } from '../pages/home/HomePage';
import { MatesPage, MateDetailPage } from '../pages/matches/MatesPage';
import { MyTripsPage } from '../pages/my-trip/MyTripsPage';
import { TripWorkspacePage } from '../pages/trip/TripWorkspacePage';
import { SurveyFormPage } from '../pages/survey/SurveyFormPage';
import { AuthPage } from '../pages/auth';
import { AccountSettingsPage } from '../pages/account-settings';
import { AdminLayout } from '../admin/AdminLayout';
import { DashboardPage } from '../admin/pages/DashboardPage';
import { UsersPage } from '../admin/pages/UsersPage';
import { TripsPage } from '../admin/pages/TripsPage';
import { TripDetailPage } from '../admin/pages/TripDetailPage';
import { AttractionsPage as AdminAttractionsPage } from '../admin/pages/AttractionsPage';
import { TtiPage } from '../admin/pages/TtiPage';
import { OperationsPage } from '../admin/pages/OperationsPage';
import { ToastViewport } from '../shared/ui/Toast';

export function App() {
  const bootstrap = useTripStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const expire = () => useTripStore.getState().logout();
    window.addEventListener('oddtrip:session-expired', expire);
    return () => window.removeEventListener('oddtrip:session-expired', expire);
  }, []);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ToastViewport />
      <IntroCurtain />
      <ScrollToTop />
      <Routes>
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="attractions" element={<AdminAttractionsPage />} />
          <Route path="tti" element={<TtiPage />} />
          <Route path="operations" element={<OperationsPage />} />
        </Route>

        {/* 인트로 랜딩 — 자체 nav/footer, 셸 없음 */}
        <Route path="/" element={<IntroLandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* 프로토타입 앱 셸 */}
        <Route element={<PrototypeLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/matches" element={<MatesPage />} />
          <Route path="/matches/:index" element={<MateDetailPage />} />
          <Route path="/my" element={<MyTripsPage />} />
          <Route path="/trip" element={<Navigate to="/trip/overview" replace />} />
          <Route path="/trip/:tab" element={<TripWorkspacePage />} />
          <Route path="/survey/:key" element={<SurveyFormPage />} />
          <Route path="/settings" element={<RequireAuth><AccountSettingsPage /></RequireAuth>} />
        </Route>

        {/* 이전 라우트 호환 */}
        <Route path="/tti/start" element={<Navigate to="/survey/tti" replace />} />
        <Route path="/tti/questions" element={<Navigate to="/survey/tti" replace />} />
        <Route path="/tti/result" element={<Navigate to="/home" replace />} />
        <Route path="/decision/*" element={<Navigate to="/trip/coordination" replace />} />
        <Route path="/proposal/*" element={<Navigate to="/trip/coordination" replace />} />
        <Route path="/attractions/*" element={<Navigate to="/trip/places" replace />} />
        <Route path="/itinerary/*" element={<Navigate to="/trip/schedule" replace />} />
        <Route path="/approval" element={<Navigate to="/survey/approval" replace />} />
        <Route path="/safety" element={<Navigate to="/trip/schedule" replace />} />
        <Route path="/chat/*" element={<Navigate to="/home" replace />} />
        <Route path="/my/*" element={<Navigate to="/my" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));

  if (hasToken && !user && status !== 'error') {
    return <RouteGateLoading />;
  }
  if (!hasToken) {
    const expired = sessionStorage.getItem('oddtrip.sessionExpired') === '1';
    return <Navigate to={expired ? '/auth?expired=1' : '/auth'} replace />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));
  if (hasToken && !user && status !== 'error') return <RouteGateLoading />;
  if (!hasToken) return <Navigate to="/auth" replace />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RouteGateLoading() {
  return <div className="app-loading" role="status"><div className="app-loading-card"><strong><span style={{ color: 'var(--orange)', display: 'inline' }}>odd</span>trip</strong><span>세션을 확인하고 있습니다.</span><div className="loading-line" /></div></div>;
}
