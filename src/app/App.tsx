import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useTripStore } from '../entities/trip/model/tripStore';
import { LandingPage } from '../pages/landing';
import { AuthPage } from '../pages/auth';
import { TtiStartPage } from '../pages/tti-start';
import { TtiQuestionsPage } from '../pages/tti-questions';
import { TtiResultPage } from '../pages/tti-result';
import { MatchesPage } from '../pages/matches';
import { MatchDetailPage } from '../pages/match-detail';
import { DecisionPage } from '../pages/decision';
import { AttractionsPage } from '../pages/attractions';
import { ItineraryPage } from '../pages/itinerary';
import { ItineraryDetailPage } from '../pages/itinerary-detail';
import { SafetyPage } from '../pages/safety';
import { MyTripPage } from '../pages/my-trip';
import { TripArchivePage } from '../pages/trip-archive';
import { AdminLayout } from '../admin/AdminLayout';
import { DashboardPage } from '../admin/pages/DashboardPage';
import { UsersPage } from '../admin/pages/UsersPage';
import { TripsPage } from '../admin/pages/TripsPage';
import { TripDetailPage } from '../admin/pages/TripDetailPage';
import { AttractionsPage as AdminAttractionsPage } from '../admin/pages/AttractionsPage';
import { TtiPage } from '../admin/pages/TtiPage';
import { OperationsPage } from '../admin/pages/OperationsPage';
import { AccountSettingsPage } from '../pages/account-settings';
import { ToastViewport } from '../shared/ui/Toast';

export function App() {
  const bootstrap = useTripStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ToastViewport />
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="attractions" element={<AdminAttractionsPage />} />
          <Route path="tti" element={<TtiPage />} />
          <Route path="operations" element={<OperationsPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/tti/start" element={<RequireAuth><TtiStartPage /></RequireAuth>} />
          <Route path="/tti/questions" element={<RequireAuth><TtiQuestionsPage /></RequireAuth>} />
          <Route path="/tti/result" element={<RequireAuth><TtiResultPage /></RequireAuth>} />
          <Route path="/matches" element={<RequireAuth><MatchesPage /></RequireAuth>} />
          <Route path="/matches/:id" element={<RequireAuth><MatchDetailPage /></RequireAuth>} />
          <Route path="/decision" element={<RequireAuth><DecisionPage /></RequireAuth>} />
          <Route path="/attractions" element={<RequireAuth><AttractionsPage /></RequireAuth>} />
          <Route path="/itinerary" element={<RequireAuth><ItineraryPage /></RequireAuth>} />
          <Route path="/itinerary/:id" element={<RequireAuth><ItineraryDetailPage /></RequireAuth>} />
          <Route path="/safety" element={<RequireAuth><SafetyPage /></RequireAuth>} />
          <Route path="/my" element={<RequireAuth><MyTripPage /></RequireAuth>} />
          <Route path="/my/trips" element={<RequireAuth><TripArchivePage mode="itinerary" /></RequireAuth>} />
          <Route path="/my/matches" element={<RequireAuth><TripArchivePage mode="match" /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><AccountSettingsPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useTripStore((state) => state.user);
  const status = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));

  if (status === 'loading' && hasToken) {
    return null;
  }
  if (!user && !hasToken) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}
