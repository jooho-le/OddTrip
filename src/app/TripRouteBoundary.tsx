import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTripStore } from '../entities/trip/model/tripStore';
import {
  tripPreferencePath,
  tripScheduleMapPath,
  tripSettingsPath,
  tripWorkspacePath,
  type TripWorkspaceTab,
} from '../shared/lib/tripRoutes';

export function TripRouteBoundary({ children }: { children: ReactNode }) {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const activeTripId = useTripStore((state) => state.activeTripId);
  const hydratedTripId = useTripStore((state) => state.hydratedTripId);
  const status = useTripStore((state) => state.status.trip);
  const error = useTripStore((state) => state.error);
  const openTrip = useTripStore((state) => state.openTrip);

  useEffect(() => {
    if (tripId && hydratedTripId !== tripId) void openTrip(tripId);
  }, [tripId, hydratedTripId, openTrip]);

  if (!tripId) return <Navigate to="/my" replace />;
  if (activeTripId !== tripId || hydratedTripId !== tripId) {
    if (activeTripId === tripId && status === 'error') {
      return (
        <TripRouteState
          title="여행을 열지 못했습니다."
          message={error ?? '여행 목록에서 다시 선택해 주세요.'}
          actionLabel="내 여행으로 이동"
          action={() => navigate('/my', { replace: true })}
        />
      );
    }
    return <TripRouteState title="여행을 불러오고 있습니다." loading />;
  }
  return <>{children}</>;
}

type LegacyTripTarget = TripWorkspaceTab | 'settings' | 'schedule-map' | 'preference';

export function ActiveTripRedirect({ target }: { target: LegacyTripTarget }) {
  const activeTripId = useTripStore((state) => state.activeTripId);
  const status = useTripStore((state) => state.status.trip);
  const ensureTrip = useTripStore((state) => state.ensureTrip);
  const location = useLocation();

  useEffect(() => {
    if (!activeTripId && status !== 'loading' && status !== 'error') void ensureTrip();
  }, [activeTripId, status, ensureTrip]);

  if (!activeTripId) {
    if (status === 'error') return <Navigate to="/my" replace />;
    return <TripRouteState title="여행을 불러오고 있습니다." loading />;
  }

  let destination = tripWorkspacePath(activeTripId, target === 'settings' || target === 'schedule-map' || target === 'preference' ? 'overview' : target);
  if (target === 'settings') destination = tripSettingsPath(activeTripId);
  if (target === 'schedule-map') destination = tripScheduleMapPath(activeTripId);
  if (target === 'preference') destination = `${tripPreferencePath(activeTripId)}${location.search}`;
  return <Navigate to={destination} replace />;
}

function TripRouteState({
  title,
  message,
  actionLabel,
  action,
  loading = false,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  action?: () => void;
  loading?: boolean;
}) {
  return (
    <main className="page">
      <div className="container">
        <div className="empty-state" role={loading ? 'status' : 'alert'}>
          <strong>{title}</strong>
          {message ? <p>{message}</p> : null}
          {loading ? <div className="skeleton-stack" aria-hidden="true"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
          {action && actionLabel ? <button type="button" className="solid-btn" onClick={action}>{actionLabel}</button> : null}
        </div>
      </div>
    </main>
  );
}
