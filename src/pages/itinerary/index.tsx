import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function ItineraryPage() {
  const { itinerary, loadItinerary, regenerateItinerary, status, error, activeTripId, tripHistory } = useTripStore();
  const [day, setDay] = useState(1);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => { void loadItinerary(); }, [loadItinerary]);
  useEffect(() => {
    if (itinerary.length && !itinerary.some((item) => item.day === day)) setDay(itinerary[0].day);
  }, [itinerary, day]);

  const selected = itinerary.find((item) => item.day === day);
  const activeTrip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));
  const foreignRegions = findForeignRegions(
    activeTrip?.region,
    itinerary.flatMap((itineraryDay) => itineraryDay.items.flatMap((item) => [item.title, item.location, item.address ?? ''])),
  );
  const hasRegionMismatch = foreignRegions.length > 0;

  return (
    <TripWorkspaceShell active="schedule">
      <div className="schedule-grid">
        <section>
          <div className="section-title">
            <h2>공동 일정</h2>
            <p>저장한 장소와 공동 선호로 구성한 일정입니다.</p>
            <button className="line-btn right" disabled={status.itinerary === 'loading'} onClick={() => void regenerateItinerary()}>{status.itinerary === 'loading' ? '일정 처리 중…' : '일정 다시 생성'}</button>
          </div>
          {error && status.itinerary === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadItinerary()}>다시 시도</button></div> : null}
          {hasRegionMismatch ? <div className="backend-wait itinerary-region-warning" role="alert"><h3>지역이 다른 항목을 확인해 주세요.</h3><p>{activeTrip?.region ?? '현재 여행'} 일정에 {foreignRegions.join('·')} 지역으로 표시된 항목이 포함되어 있어 승인과 공유를 잠시 중지했습니다.</p></div> : null}
          {status.itinerary === 'loading' && !itinerary.length ? <div className="skeleton-stack" role="status" aria-label="일정을 불러오는 중"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
          {itinerary.length ? (
            <>
              <div className="day-tabs">
                {itinerary.map((item) => <button className={day === item.day ? 'on' : ''} key={item.day} onClick={() => setDay(item.day)}>{item.day}일차</button>)}
                <button type="button" onClick={() => showComingSoon('지도와 이동 동선')}>지도·동선</button>
              </div>
              <div className="day-list">
                {selected?.items.map((item) => (
                  <div className="schedule-row" key={item.id}>
                    <time>{item.time}</time>
                    <span className="route-dot" />
                    <div className="schedule-copy">
                      <h3><Link to={'/itinerary/' + item.id}>{item.title}</Link></h3>
                      <p>{item.description || item.location || '설명 미제공'}</p>
                      <small>{item.duration}{item.moveTime ? ' · 이동 ' + item.moveTime : ''} · {item.location || '위치 미제공'}</small>
                      <span className="source-label">{findForeignRegions(activeTrip?.region, [item.title, item.location, item.address ?? '']).length ? '지역 불일치 · 출처 미제공' : '출처 미제공'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : status.itinerary !== 'loading' ? (
            <div className="empty-state itinerary-empty">
              <strong>생성된 일정이 없습니다.</strong>
              <p>저장한 관광지와 공동 선호를 바탕으로 새 일정을 만들 수 있습니다.</p>
              <button className="solid-btn" onClick={() => void regenerateItinerary()}>일정 생성</button>
            </div>
          ) : null}
        </section>
        <aside>
          <div className="approval-box">
            <div className="side-head">일정 확인 <span>{hasRegionMismatch ? '확인 필요' : '함께 검토'}</span></div>
            <div className="approval-body">
              <div className="approval-person"><span className="avatar" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff' }}>나</span><b>내 확인</b><span style={{ color: '#999' }}>검토 전</span></div>
              <div className="approval-person"><span className="avatar" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#eee' }}>?</span><b>동행 확인</b><span style={{ color: '#999' }}>검토 전</span></div>
              <Link className="line-btn" style={{ display: 'block', width: '100%', marginTop: 13, textAlign: 'center' }} to="/approval">승인 안내 보기</Link>
            </div>
          </div>
          <div className="weather-card"><h3>안전 정보</h3><p>여행 지역과 일정에 관련된 주의사항을 별도 화면에서 확인합니다.</p><Link className="text-link" style={{ display: 'inline-block', marginTop: 10 }} to="/safety">안전 정보 열기 →</Link></div>
        </aside>
      </div>
      <div className="workflow-cta">
        <p><b>일정을 다시 만들기 전에 저장 장소를 확인해 주세요.</b>현재 일정 항목에는 원천 출처가 제공되지 않았습니다.</p>
        <div className="button-row"><button className="line-btn" type="button" onClick={() => showComingSoon('일정 공유')}>일정 공유</button><Link className="solid-btn" to="/approval">일정 승인</Link></div>
      </div>
    </TripWorkspaceShell>
  );
}

const REGION_MARKERS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

function findForeignRegions(tripRegion: string | null | undefined, values: string[]) {
  const expectedRegion = REGION_MARKERS.find((marker) => tripRegion?.includes(marker));
  if (!expectedRegion) return [];
  return REGION_MARKERS.filter((marker) => marker !== expectedRegion && values.some((value) => value.includes(marker)));
}
