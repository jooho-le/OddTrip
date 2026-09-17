import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { GoogleMap } from '../../features/map/GoogleMap';
import { displayText } from '../../shared/lib/displayText';
import { collectScheduleMapStops } from './scheduleMapStops';

export function ScheduleMapPage() {
  const { itinerary, status, error, loadItinerary, tripHistory, activeTripId } = useTripStore();
  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));
  const places = collectScheduleMapStops(itinerary);
  const region = displayText(trip?.region, '현재 여행');
  const mapPoints = places.map((place) => ({
    id: place.id,
    name: displayText(place.title, '장소명 미제공'),
    lat: place.latitude,
    lng: place.longitude,
    address: displayText(place.address || place.location, '주소 미제공'),
  }));
  const locatedCount = mapPoints.filter((point) => point.lat != null && point.lng != null).length;
  const mapKeyword = region !== '현재 여행' ? region : displayText(places[0]?.location, '서울');
  const loading = status.itinerary !== 'success' && status.itinerary !== 'error';

  useEffect(() => { void loadItinerary(); }, [loadItinerary]);

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div><Link className="text-btn" to="/trip/schedule">‹ 공동 일정</Link><h1 style={{ marginTop: 9 }}>지도·이동 동선</h1></div>
          <p>{region} 일정의 장소 위치와 방문 순서를 실제 지도에서 확인합니다.</p>
        </header>

        {error && status.itinerary === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadItinerary()}>다시 시도</button></div> : null}
        {loading ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}

        {!loading ? <div className="route-map-grid">
          <section className="route-map-live" aria-label={`${region} 일정 지도`}>
            <GoogleMap
              className="route-google-map"
              label={`${region} 일정 장소 지도`}
              points={mapPoints}
              keyword={mapKeyword}
              showSequence
            />
            <div className="route-map-label">
              <span className="eyebrow">GOOGLE MAPS</span>
              <h2>일정 지도</h2>
              <p>{locatedCount ? `${locatedCount}개 장소를 실제 좌표에 표시했습니다.` : '장소 좌표가 없어 여행 지역의 중심을 표시합니다.'} 번호와 연결선은 방문 순서이며 실제 도로 경로는 아닙니다.</p>
            </div>
          </section>

          <aside className="route-ledger">
            <div className="side-head">이동 순서 <span>{places.length}곳</span></div>
            {places.map((place, index) => (
              <article key={place.id}><b>{String(index + 1).padStart(2, '0')}</b><div><h3>{displayText(place.title, '장소명 미제공')}</h3><p>{place.day}일차 · {displayText(place.time, '시간 미정')} · {displayText(place.location, '위치 미제공')}</p><small>{place.latitude != null && place.longitude != null ? '지도에 표시됨' : '좌표 미제공 · 목록에만 표시'}</small></div></article>
            ))}
            {!places.length ? <p className="route-ledger-empty">일정을 생성하면 장소 순서가 표시됩니다.</p> : null}
            <div className="route-ledger-meta"><b>지도 표시</b><span>좌표 확인 {locatedCount}곳 · 미제공 {Math.max(0, places.length - locatedCount)}곳</span></div>
          </aside>
        </div> : null}
      </div>
    </main>
  );
}
