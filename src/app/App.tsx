import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useTripStore } from '../entities/tripStore';
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

export function App() {
  const bootstrap = useTripStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
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
