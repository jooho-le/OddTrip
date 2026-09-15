import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

export function ScheduleMapPage() {
  const { itinerary, status, error, loadItinerary, tripHistory, activeTripId } = useTripStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));
  const places = itinerary.flatMap((day) => day.items.filter((item) => item.type === 'place').map((item) => ({ ...item, day: day.day })));
  const loading = status.itinerary !== 'success' && status.itinerary !== 'error';

  useEffect(() => { void loadItinerary(); }, [loadItinerary]);

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div><Link className="text-btn" to="/trip/schedule">‹ 공동 일정</Link><h1 style={{ marginTop: 9 }}>지도·이동 동선</h1></div>
          <p>{trip?.region ?? '현재 여행'} 일정의 장소 순서를 지도 연결 전에 검토합니다.</p>
        </header>

        {error && status.itinerary === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadItinerary()}>다시 시도</button></div> : null}
        {loading ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}

        {!loading ? <div className="route-map-grid">
          <section className="route-map-stage" aria-label="지도 연결 전 이동 동선 미리보기">
            <div className="route-map-label"><span className="eyebrow">ROUTE PREVIEW</span><h2>지도 연결 전</h2><p>일정 장소의 순서와 좌표 보유 여부를 표시합니다.</p></div>
            <div className="route-map-line" />
            {places.slice(0, 6).map((place, index) => (
              <span className={`route-map-pin pin-${index + 1}`} key={place.id}><b>{index + 1}</b><em>{place.title}</em></span>
            ))}
            {!places.length ? <div className="route-map-empty">표시할 일정 장소가 없습니다.</div> : null}
          </section>

          <aside className="route-ledger">
            <div className="side-head">이동 순서 <span>{places.length}곳</span></div>
            {places.map((place, index) => (
              <article key={place.id}><b>{String(index + 1).padStart(2, '0')}</b><div><h3>{place.title}</h3><p>{place.day}일차 · {place.time} · {place.location || '위치 미제공'}</p><small>{place.latitude != null && place.longitude != null ? '좌표 확인됨' : '좌표 미제공'}</small></div></article>
            ))}
            {!places.length ? <p className="route-ledger-empty">일정을 생성하면 장소 순서가 표시됩니다.</p> : null}
            <button type="button" className="solid-btn" disabled={!places.length} onClick={() => showComingSoon('실제 지도·길찾기', '지도 제공자와 구간별 이동시간 API가 확정되기 전에는 실제 경로나 예상 이동시간을 표시하지 않습니다.')}>실제 지도에서 보기</button>
          </aside>
        </div> : null}
      </div>
    </main>
  );
}
