import { useEffect, useState } from 'react';
import { MapPin, PenLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useTripListRealtime } from '../../entities/trip/model/useCoordinationRealtime';
import { tripWorkspacePath } from '../../shared/lib/tripRoutes';
import { imageUrl, TRIP_IMAGE_FALLBACKS } from '../../features/prototype/designContent';
import type { TripSummary } from '../../types';

export function MyTripsPage() {
  const navigate = useNavigate();
  const { user, tripHistory, status, error, loadTripHistory, openTrip } = useTripStore();

  useEffect(() => { void loadTripHistory(); }, [loadTripHistory]);
  useTripListRealtime(loadTripHistory);

  const open = async (trip: TripSummary) => {
    if (await openTrip(trip.tripId)) navigate(tripWorkspacePath(trip.tripId));
  };

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div><span className="eyebrow">TRIP ARCHIVE</span><h1>내 여행</h1></div>
          <p>진행 중인 여행과 지난 여행만 모아봅니다.</p>
          <button type="button" className="solid-btn page-heading-action" onClick={() => navigate('/trips/new')}>새 여행 설계</button>
        </header>
        <section className="my-account-strip" aria-labelledby="my-account-title">
          <div><span className="eyebrow">MY ACCOUNT</span><h2 id="my-account-title">{user?.nickname ?? '여행자'}님의 계정</h2><p>{user?.email ?? '이메일 미제공'} · TTI {user?.ttiCode ?? '미완료'}</p></div>
          <div className="button-row"><Link className="line-btn" to="/settings">프로필 수정</Link><Link className="solid-btn" to="/settings/privacy">개인정보 관리</Link></div>
        </section>
        {error && status.tripHistory === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div> : null}
        <section className="trip-list">
          {status.tripHistory === 'loading' && !tripHistory.length ? <LoadingTrips /> : null}
          {tripHistory.map((trip, index) => (
            <article className="trip-list-item" key={trip.tripId}>
              <TripListImage src={imageUrl(TRIP_IMAGE_FALLBACKS[index % TRIP_IMAGE_FALLBACKS.length], 400)} region={trip.region} />
              <div>
                <span className={trip.status === 'completed' ? 'status gray' : 'status'}>{tripStatus(trip)}</span>
                <h2>{tripTitle(trip)}</h2>
                <p>{dateRange(trip.startDate, trip.endDate)} · {tripSummary(trip)}</p>
              </div>
              <div className="trip-list-action">
                <small>{trip.createdAt ? `생성 ${formatDate(trip.createdAt)}` : '업데이트 정보 없음'}</small>
                <div className="trip-list-buttons">
                  <button type="button" className={trip.status === 'completed' ? 'line-btn' : 'solid-btn'} onClick={() => void open(trip)}>{trip.status === 'completed' ? '기록 보기' : '계속하기'}</button>
                  {trip.status !== 'cancelled' ? <Link className="line-btn trip-story-btn" to={`/community/write?draft=${encodeURIComponent(`trip:${trip.tripId}`)}`} state={{ communityReturn: '/my', tripSeed: toTripWritingSeed(trip) }}><PenLine size={14} />이 여행으로 글쓰기</Link> : null}
                </div>
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
  if (trip.itineraryDayCount > 0) return '일정표 완성';
  if (trip.attractionCount > 0 || trip.savedCount > 0) return 'AI 일정 생성 중';
  return '선호 제출';
}

function tripTitle(trip: TripSummary) {
  return trip.title || `${trip.partner?.nickname ?? '동행'}과 함께하는 ${trip.region ?? 'OddTrip'} 여행`;
}

function tripSummary(trip: TripSummary) {
  if (trip.status === 'cancelled') return `저장한 장소 ${trip.savedCount}곳 · 취소된 여행`;
  if (trip.status === 'completed') return `저장한 장소 ${trip.savedCount}곳 · 일정 ${trip.itineraryDayCount}일`;
  if (trip.itineraryDayCount > 0) return 'AI가 만든 공동 일정표 확인';
  if (trip.attractionCount > 0) return 'AI가 장소와 이동 순서를 정리하는 중';
  return '현재 해야 할 일: 공동 선호 제출';
}

function TripListImage({ src, region }: { src: string; region?: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed
    ? <div className="trip-list-image-fallback" role="img" aria-label={`${region || 'OddTrip'} 여행 이미지`}><MapPin size={18} /><span>{region || 'ODDTRIP'}</span></div>
    : <img src={src} alt="" onError={() => setFailed(true)} />;
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
}

function toTripWritingSeed(trip: TripSummary) {
  return {
    tripId: trip.tripId,
    title: tripTitle(trip),
    region: trip.region ?? '',
    startDate: trip.startDate ?? '',
    endDate: trip.endDate ?? '',
    partner: trip.partner?.nickname ?? '',
  };
}
