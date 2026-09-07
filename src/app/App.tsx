import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTripStore } from '../entities/trip/model/tripStore';
import { PrototypeLayout } from './PrototypeLayout';
import { IntroCurtain } from '../features/intro-transition/IntroCurtain';
import { IntroLandingPage } from '../pages/intro/IntroLandingPage';
import { HomePage } from '../pages/home/HomePage';
import { MatchesPage } from '../pages/matches';
import { MatchDetailPage } from '../pages/match-detail';
import { MyTripPage } from '../pages/my-trip';
import { TtiStartPage } from '../pages/tti-start';
import { TtiQuestionsPage } from '../pages/tti-questions';
import { TtiResultPage } from '../pages/tti-result';
import { DecisionHomePage } from '../pages/decision/DecisionHomePage';
import { Step1SelectPage } from '../pages/decision/Step1SelectPage';
import { Step2AnalysisPage } from '../pages/decision/Step2AnalysisPage';
import { Step3ConcessionPage } from '../pages/decision/Step3ConcessionPage';
import { Step4OddRulePage } from '../pages/decision/Step4OddRulePage';
import { WaitingPage } from '../pages/decision/WaitingPage';
import { ProposalListPage } from '../pages/proposal/ProposalListPage';
import { ProposalComparePage } from '../pages/proposal/ProposalComparePage';
import { ProposalDetailPage } from '../pages/proposal/ProposalDetailPage';
import { AttractionListPage } from '../pages/attractions/AttractionListPage';
import { AttractionDetailPage } from '../pages/attractions/AttractionDetailPage';
import { ItineraryPage } from '../pages/itinerary';
import { ItineraryDetailPage } from '../pages/itinerary-detail';
import { ApprovalPage } from '../pages/approval/ApprovalPage';
import { SafetyPage } from '../pages/safety';
import { ChatListPage } from '../pages/chat';
import { ChatRoomPage } from '../pages/chat-room';
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
import { UiNoticeDialog } from '../shared/ui/UiNoticeDialog';

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

        <Route path="/" element={<RootRoute />} />
        <Route path="/about" element={<IntroLandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<RequireAuth><PrototypeLayout /></RequireAuth>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
          <Route path="/my" element={<MyTripPage />} />
          <Route path="/my/*" element={<Navigate to="/my" replace />} />

          <Route path="/trip" element={<Navigate to="/trip/overview" replace />} />
          <Route path="/trip/overview" element={<DecisionHomePage />} />
          <Route path="/trip/coordination" element={<ProposalListPage />} />
          <Route path="/trip/places" element={<AttractionListPage />} />
          <Route path="/trip/schedule" element={<ItineraryPage />} />

          <Route path="/tti/start" element={<TtiStartPage />} />
          <Route path="/tti/questions" element={<TtiQuestionsPage />} />
          <Route path="/tti/result" element={<TtiResultPage />} />
          <Route path="/survey/tti" element={<Navigate to="/tti/start" replace />} />
          <Route path="/survey/preference" element={<Navigate to="/decision/select" replace />} />
          <Route path="/survey/concession" element={<Navigate to="/decision/concession" replace />} />
          <Route path="/survey/rule" element={<Navigate to="/decision/odd-rule" replace />} />
          <Route path="/survey/approval" element={<Navigate to="/approval" replace />} />

          <Route path="/decision" element={<DecisionHomePage />} />
          <Route path="/decision/select" element={<Step1SelectPage />} />
          <Route path="/decision/analysis" element={<Step2AnalysisPage />} />
          <Route path="/decision/concession" element={<Step3ConcessionPage />} />
          <Route path="/decision/odd-rule" element={<Step4OddRulePage />} />
          <Route path="/decision/waiting" element={<WaitingPage />} />
          <Route path="/proposal" element={<ProposalListPage />} />
          <Route path="/proposal/compare" element={<ProposalComparePage />} />
          <Route path="/proposal/:variantId" element={<ProposalDetailPage />} />
          <Route path="/attractions" element={<AttractionListPage />} />
          <Route path="/attractions/:id" element={<AttractionDetailPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
          <Route path="/approval" element={<ApprovalPage />} />
          <Route path="/safety" element={<SafetyPage />} />

          <Route path="/chat" element={<ChatListPage />} />
          <Route path="/chat/:roomId" element={<ChatRoomPage />} />
          <Route path="/settings" element={<AccountSettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRoute() {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));
  if (hasToken && !user && status !== 'error') return <RouteGateLoading />;
  return user && hasToken ? <Navigate to="/home" replace /> : <IntroLandingPage />;
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

  if (hasToken && !user && status !== 'error') return <RouteGateLoading />;
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
  if (!hasToken || !user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RouteGateLoading() {
  return <div className="app-loading" role="status"><div className="app-loading-card"><strong><span style={{ color: 'var(--orange)', display: 'inline' }}>odd</span>trip</strong><span>여행 공간을 불러오고 있습니다.</span><div className="loading-line" /></div></div>;
}
