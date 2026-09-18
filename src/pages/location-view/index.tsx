import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { locationShareService, type LocationView } from '../../entities/location-share/api/locationShareService';
import { GoogleMap } from '../../features/map/GoogleMap';
import { parseServerDate } from '../../shared/lib/formatDate';

/** 링크를 받은 사람은 이 화면을 계속 열어 둔다. 10초면 걷는 속도를 따라간다. */
const REFRESH = 10_000;

export function LocationViewPage() {
  const { token } = useParams();
  const [view, setView] = useState<LocationView>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const read = async () => {
      try {
        const next = await locationShareService.view(token);
        if (alive) { setView(next); setError(''); }
      } catch (readError) {
        if (alive) setError(readError instanceof Error ? readError.message : '위치를 불러오지 못했어요.');
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), REFRESH);
    return () => { alive = false; window.clearInterval(timer); };
  }, [token]);

  if (error) return <Shell title="위치를 볼 수 없어요"><p className="location-view-note">{error}</p></Shell>;
  if (!view) return <Shell title="위치를 불러오는 중"><p className="location-view-note" role="status">잠시만 기다려 주세요.</p></Shell>;

  if (view.status === 'ended') {
    return <Shell title={`${view.displayName}님의 위치 공유가 끝났어요`}>
      <p className="location-view-note">더 이상 위치를 볼 수 없습니다. 필요하다면 {view.displayName}님에게 새 링크를 요청해 주세요.</p>
    </Shell>;
  }

  const hasPoint = view.latitude != null && view.longitude != null;
  const stalled = view.status === 'stale';
  return (
    <Shell title={stalled ? `${view.displayName}님의 마지막 위치` : `${view.displayName}님의 현재 위치`}>
      {/* 멈춘 위치를 현재 위치인 척 보여 주지 않되, 겁을 주지도 않는다. 대개는
          상대가 다른 앱을 보고 있을 뿐이다. */}
      {stalled ? <p className="location-view-hint">화면이 꺼져 있거나 연결이 끊겼을 수 있어요. 연락이 닿지 않으면 직접 확인해 주세요.</p> : null}

      {hasPoint ? (
        <div className={stalled ? 'location-view-frame is-stalled' : 'location-view-frame'}>
          <GoogleMap
            className="location-view-map"
            label={stalled ? `${view.displayName}님의 마지막 위치` : `${view.displayName}님의 현재 위치`}
            points={[{ id: 'current', name: `${view.displayName}님`, lat: view.latitude, lng: view.longitude }]}
          />
        </div>
      ) : (
        <div className="location-view-empty" role="img" aria-label="표시할 위치가 없습니다">
          <strong>{view.status === 'waiting' ? '위치를 기다리고 있어요' : '위치가 끊겼어요'}</strong>
          <span>{view.status === 'waiting'
            ? `${view.displayName}님이 위치 공유를 막 시작했어요. 잠시만 기다려 주세요.`
            : '오랫동안 갱신되지 않아 마지막 위치도 표시하지 않아요. 연락이 닿지 않으면 직접 확인해 주세요.'}</span>
        </div>
      )}

      <p className="location-view-status" aria-live="polite">
        {hasPoint ? (stalled ? `${freshness(view.updatedAt)} 위치` : `${freshness(view.updatedAt)} 업데이트`) : '위치 없음'}
        {view.expiresAt ? ` · ${remaining(view.expiresAt)}` : ''}
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="location-view">
      <div className="location-view-inner">
        <h1>{title}</h1>
        {children}
        {/* 이 화면에는 위치 말고 아무것도 담지 않는다. 링크는 전달될 수 있고
            받는 사람은 회원이 아니다. */}
        <footer className="location-view-foot">OddTrip 안전 위치 공유</footer>
      </div>
    </main>
  );
}

function freshness(at: string | null) {
  if (!at) return '위치 없음';
  const seconds = Math.max(0, Math.floor((Date.now() - parseServerDate(at).getTime()) / 1000));
  if (seconds < 30) return '방금 전';
  const minutes = Math.floor(seconds / 60);
  return minutes < 1 ? '1분 이내' : `${minutes}분 전`;
}

function remaining(expiresAt: string) {
  const left = parseServerDate(expiresAt).getTime() - Date.now();
  if (Number.isNaN(left) || left <= 0) return '곧 종료';
  const minutes = Math.floor(left / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}시간 뒤 공유 종료` : `${minutes}분 뒤 공유 종료`;
}
