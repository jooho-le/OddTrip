import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useTripStore } from '../entities/tripStore';
import { LandingPage } from '../pages/landing';
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
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/tti/start" element={<TtiStartPage />} />
          <Route path="/tti/questions" element={<TtiQuestionsPage />} />
          <Route path="/tti/result" element={<TtiResultPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
          <Route path="/decision" element={<DecisionPage />} />
          <Route path="/attractions" element={<AttractionsPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/my" element={<MyTripPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
