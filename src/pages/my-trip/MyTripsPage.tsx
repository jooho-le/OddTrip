import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { imageUrl, TRIP_IMAGE_FALLBACKS } from '../../features/prototype/designContent';
import type { TripSummary } from '../../types';

export function MyTripsPage() {
  const navigate = useNavigate();
  const { tripHistory, status, error, loadTripHistory, openTrip } = useTripStore();

  useEffect(() => { void loadTripHistory(); }, [loadTripHistory]);

  const open = async (trip: TripSummary) => {
    await openTrip(trip.tripId);
    navigate('/trip/overview');
  };

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <h1>내 여행</h1>
          <p>진행 중인 여행과 지난 여행만 모아봅니다.</p>
        </header>
        {error && status.tripHistory === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div> : null}
        <section className="trip-list">
          {status.tripHistory === 'loading' && !tripHistory.length ? <LoadingTrips /> : null}
          {tripHistory.map((trip, index) => (
            <article className="trip-list-item" key={trip.tripId}>
              <img src={imageUrl(TRIP_IMAGE_FALLBACKS[index % TRIP_IMAGE_FALLBACKS.length], 400)} alt="" />
              <div>
                <span className={trip.status === 'completed' ? 'status gray' : 'status'}>{tripStatus(trip)}</span>
                <h2>{tripTitle(trip)}</h2>
                <p>{dateRange(trip.startDate, trip.endDate)} · {tripSummary(trip)}</p>
              </div>
              <div className="trip-list-action">
                <small>{trip.createdAt ? `생성 ${formatDate(trip.createdAt)}` : '업데이트 정보 없음'}</small>
                <button type="button" className={trip.status === 'completed' ? 'line-btn' : 'solid-btn'} onClick={() => void open(trip)}>{trip.status === 'completed' ? '기록 보기' : '계속하기'}</button>
              </div>
            </article>
          ))}
          {status.tripHistory === 'success' && !tripHistory.length ? (
            <div className="empty-state"><strong>아직 여행 기록이 없습니다.</strong><p>동행 요청이 수락되면 첫 여행 공간이 여기에 생성됩니다.</p><button className="solid-btn" onClick={() => navigate('/matches')}>동행 찾기</button></div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function LoadingTrips() {
  return <div className="skeleton-stack" role="status" aria-label="여행 기록을 불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function tripStatus(trip: TripSummary) {
  if (trip.status === 'completed') return '여행 완료';
  if (trip.status === 'cancelled') return '취소됨';
  if (trip.itineraryDayCount > 0) return '일정 확인';
  if (trip.attractionCount > 0 || trip.savedCount > 0) return '여행지 선택';
  return '조율 중';
}

function tripTitle(trip: TripSummary) {
  return trip.title || `${trip.partner?.nickname ?? '동행'}과 함께하는 ${trip.region ?? 'OddTrip'} 여행`;
}

function tripSummary(trip: TripSummary) {
  if (trip.status === 'completed') return `저장한 장소 ${trip.savedCount}곳 · 일정 ${trip.itineraryDayCount}일`;
  if (trip.itineraryDayCount > 0) return `현재 해야 할 일: 공동 일정 확인`;
  if (trip.attractionCount > 0) return `현재 해야 할 일: 여행지 선택`;
  return '현재 해야 할 일: 함께 정하기';
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
}
