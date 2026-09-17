import { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  type Location,
} from 'react-router-dom';
import { useTripStore } from '../entities/trip/model/tripStore';
import { PrototypeChatDrawer, PrototypeLayout } from './PrototypeLayout';
import { IntroCurtain } from '../features/intro-transition/IntroCurtain';
import { IntroLandingPage } from '../pages/intro/IntroLandingPage';
import { HomePage } from '../pages/home/HomePage';
import { CommunityLayout } from '../pages/community/CommunityContext';
import { CommunityListPage, CommunityDetailPage, CommunityWritePage, CommunityDraftsPage } from '../pages/community/CommunityPages';
import { MatesPage, MateDetailPage } from '../pages/matches/MatesPage';
import { MyTripsPage } from '../pages/my-trip/MyTripsPage';
import { TripWorkspacePage } from '../pages/trip/TripWorkspacePage';
import { SurveyFormPage } from '../pages/survey/SurveyFormPage';
import { AuthPage } from '../pages/auth';
import { LegalPage, MatchingProfileConsentGate } from '../pages/legal';
import { AccountSettingsPage, PrivacySettingsPage } from '../pages/account-settings';
import { ChatListPage } from '../pages/chat';
import { AdminLayout } from '../admin/AdminLayout';
import { DashboardPage } from '../admin/pages/DashboardPage';
import { UsersPage } from '../admin/pages/UsersPage';
import { TripsPage } from '../admin/pages/TripsPage';
import { TripDetailPage } from '../admin/pages/TripDetailPage';
import { AttractionsPage as AdminAttractionsPage } from '../admin/pages/AttractionsPage';
import { TtiPage } from '../admin/pages/TtiPage';
import { OperationsPage } from '../admin/pages/OperationsPage';
import { ReportsPage } from '../admin/pages/ReportsPage';
import { NewTripPage, TripSettingsPage } from '../pages/trip-management';
import { VerificationPage } from '../pages/verification';
import { NotificationSettingsPage } from '../pages/notification-settings';
import { HelpPage } from '../pages/help';
import { ScheduleMapPage } from '../pages/schedule-map';
import { ToastViewport } from '../shared/ui/Toast';
import { UiNoticeDialog } from '../shared/ui/UiNoticeDialog';
import { landingPathForRole } from './roleRoutes';
import { ActiveTripRedirect, TripRouteBoundary } from './TripRouteBoundary';

type RouteState = { backgroundLocation?: Location };

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
      <UiNoticeDialog />
      <IntroCurtain />
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const location = useLocation();
  const user = useTripStore((state) => state.user);
  const state = location.state as RouteState | null;
  const backgroundLocation = state?.backgroundLocation;
  const chatMatch = location.pathname.match(/^\/chat\/([^/]+)$/);
  const chatRoomId = chatMatch ? decodeURIComponent(chatMatch[1]) : undefined;
  const closeChatTo = backgroundLocation
    ? `${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`
    : '/home';

  return (
    <>
      <ScrollToTop />
      <Routes location={backgroundLocation ?? location}>
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="attractions" element={<AdminAttractionsPage />} />
          <Route path="tti" element={<TtiPage />} />
          <Route path="operations" element={<OperationsPage />} />
        </Route>

        <Route path="/" element={<RootRoute />} />
        <Route path="/about" element={<IntroLandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/legal/:document" element={<LegalPage />} />

        <Route element={<RequireAuth><PrototypeLayout /></RequireAuth>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/community" element={<CommunityLayout />}>
            <Route index element={<CommunityListPage />} />
            <Route path="write" element={<CommunityWritePage />} />
            <Route path="drafts" element={<CommunityDraftsPage />} />
            <Route path=":postId" element={<CommunityDetailPage />} />
            <Route path=":postId/edit" element={<CommunityWritePage />} />
          </Route>
          <Route path="/matches" element={<MatchingProfileConsentGate><MatesPage /></MatchingProfileConsentGate>} />
          <Route path="/matches/:id" element={<MatchingProfileConsentGate><MateDetailPage /></MatchingProfileConsentGate>} />
          <Route path="/my" element={<MyTripsPage />} />
          <Route path="/my/*" element={<Navigate to="/my" replace />} />
          <Route path="/trips/new" element={<NewTripPage />} />
          <Route path="/trips/:tripId/settings" element={<TripRouteBoundary><TripSettingsPage /></TripRouteBoundary>} />
          <Route path="/trips/:tripId/schedule/map" element={<TripRouteBoundary><ScheduleMapPage /></TripRouteBoundary>} />
          <Route path="/trips/:tripId/survey/:key" element={<TripRouteBoundary><SurveyFormPage /></TripRouteBoundary>} />
          <Route path="/trips/:tripId/:tab" element={<TripRouteBoundary><TripWorkspacePage /></TripRouteBoundary>} />

          <Route path="/trip" element={<ActiveTripRedirect target="overview" />} />
          <Route path="/trip/settings" element={<ActiveTripRedirect target="settings" />} />
          <Route path="/trip/schedule/map" element={<ActiveTripRedirect target="schedule-map" />} />
          <Route path="/trip/overview" element={<ActiveTripRedirect target="overview" />} />
          <Route path="/trip/coordination" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/trip/schedule" element={<ActiveTripRedirect target="schedule" />} />
          <Route path="/trip/places" element={<ActiveTripRedirect target="schedule" />} />
          <Route path="/survey/tti" element={<SurveyFormPage />} />
          <Route path="/survey/preference" element={<ActiveTripRedirect target="preference" />} />
          <Route path="/survey/concession" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/survey/rule" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/survey/approval" element={<ActiveTripRedirect target="schedule" />} />
          <Route path="/settings" element={<AccountSettingsPage />} />
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/help" element={<HelpPage />} />

          <Route path="/chat" element={<ChatListPage />} />
          <Route path="/chat/:roomId" element={<HomePage />} />

          <Route path="/decision/select" element={<ActiveTripRedirect target="preference" />} />
          <Route path="/decision/concession" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/decision/odd-rule" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/decision/*" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/proposal/*" element={<ActiveTripRedirect target="coordination" />} />
          <Route path="/attractions/*" element={<ActiveTripRedirect target="schedule" />} />
          <Route path="/itinerary/*" element={<ActiveTripRedirect target="schedule" />} />
          <Route path="/approval" element={<ActiveTripRedirect target="schedule" />} />
          <Route path="/safety" element={<ActiveTripRedirect target="schedule" />} />
        </Route>

        {/* 기존 URL은 0562bbe의 문서형 화면으로 모읍니다. */}
        <Route path="/tti/start" element={<Navigate to="/survey/tti" replace />} />
        <Route path="/tti/questions" element={<Navigate to="/survey/tti" replace />} />
        <Route path="/tti/result" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {chatRoomId && user?.role !== 'admin' && localStorage.getItem('oddtrip.authToken')
        ? <PrototypeChatDrawer roomId={chatRoomId} closeTo={closeChatTo} />
        : null}
    </>
  );
}

function RootRoute() {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));
  if (hasToken && !user && status !== 'error') return <RouteGateLoading />;
  return user && hasToken ? <Navigate to={landingPathForRole(user.role)} replace /> : <IntroLandingPage />;
}

function ScrollToTop() {
  const location = useLocation();
  const state = location.state as RouteState | null;
  useEffect(() => {
    if (!state?.backgroundLocation) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, state?.backgroundLocation]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));

  if (hasToken && !user && status !== 'error') return <RouteGateLoading />;
  if (!hasToken) {
    const expired = sessionStorage.getItem('oddtrip.sessionExpired') === '1';
    return <Navigate to={expired ? '/auth?expired=1' : '/auth'} replace />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));
  if (hasToken && !user && status !== 'error') return <RouteGateLoading />;
  if (!hasToken || !user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RouteGateLoading() {
  return <div className="app-loading" role="status"><div className="app-loading-card"><strong><span style={{ color: 'var(--orange)', display: 'inline' }}>odd</span>trip</strong><span>세션을 확인하고 있습니다.</span><div className="loading-line" /></div></div>;
}
