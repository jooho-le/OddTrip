import { GoogleMap, type MapPoint } from '../../features/map/GoogleMap';

export function MapView({ title, points, className }: { title?: string; points: MapPoint[]; className?: string }) {
  const hasPoints = points.some((point) => point.lat != null && point.lng != null);

  return (
    <div className={className}>
      {title ? <h2 className="mb-3 text-xl font-black text-ink">{title}</h2> : null}
      {hasPoints ? (
        <GoogleMap label={title ?? '지도'} points={points} />
      ) : (
        <div className="rounded-2xl border border-line bg-canvas p-6 text-center text-sm font-bold text-muted">
          표시할 위치 정보가 없습니다.
        </div>
      )}
    </div>
  );
}
