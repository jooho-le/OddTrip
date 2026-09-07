import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import type { TripSummary } from '../../types';

type TripTab = 'overview' | 'coordination' | 'places' | 'schedule';

const tabs: Array<{ key: TripTab; label: string; to: string }> = [
  { key: 'overview', label: '개요', to: '/trip/overview' },
  { key: 'coordination', label: '조율', to: '/trip/coordination' },
  { key: 'places', label: '여행지', to: '/trip/places' },
  { key: 'schedule', label: '일정', to: '/trip/schedule' },
];

export function TripWorkspaceShell({ active, children }: { active: TripTab; children: ReactNode }) {
  const { user, activeTripId, tripHistory, status, error, ensureTrip } = useTripStore();

  useEffect(() => { if (!activeTripId) void ensureTrip(); }, [activeTripId, ensureTrip]);
  const trip = tripHistory.find((item) => item.tripId === activeTripId) ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));

  return (
    <main className="page"><div className="container">
      {trip ? <TripCover trip={trip} nickname={user?.nickname} /> : <section className="trip-cover empty-trip"><div>{status.trip === 'loading' ? <><span className="eyebrow" style={{ color: '#ffb39f' }}>LOADING TRIP</span><h1>여행 공간을 불러오고 있습니다.</h1><div className="loading-line" /></> : <><span className="eyebrow" style={{ color: '#ffb39f' }}>NO CURRENT TRIP</span><h1>진행 중인 여행이 없습니다.</h1><p>동행 요청이 수락되면 여행 공간이 생성됩니다.</p><Link className="solid-btn" to="/matches">동행 찾기</Link></>}</div></section>}
      <nav className="local-nav" aria-label="개별 여행 메뉴">{tabs.map((tab) => <Link className={active === tab.key ? 'active' : ''} key={tab.key} to={tab.to}>{tab.label}</Link>)}</nav>
      <div className="trip-context-note"><span>{trip ? `${trip.region ?? '지역 미정'} · ${dateRange(trip.startDate, trip.endDate)} · ${statusLabel(trip.status)}` : '여행을 만든 뒤 상세 내용이 표시됩니다.'}</span></div>
      {error && status.trip === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><Link className="text-link" to="/matches">동행 찾기</Link></div> : null}
      <div className="workspace">{children}</div>
    </div></main>
  );
}

function TripCover({ trip, nickname }: { trip: TripSummary; nickname?: string }) {
  const owner = nickname ?? '나';
  return <section className="trip-cover"><div className="trip-cover-copy"><span className="eyebrow" style={{ color: '#ffb39f' }}>CURRENT TRIP · {(trip.region ?? 'ODDTRIP').toUpperCase()}</span><h1>{trip.title || `${owner}${andParticle(owner)} ${trip.partner?.nickname ?? '동행'}의 ${trip.region ?? '여행'}`}</h1><p>{dateRange(trip.startDate, trip.endDate)} · {trip.itineraryDayCount ? `${trip.itineraryDayCount}일 일정` : '일정 생성 전'}</p></div><div className="trip-members">{trip.partner?.avatarUrl ? <img className="avatar" src={trip.partner.avatarUrl} alt="" /> : <span className="avatar" style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', background: '#fff', color: '#222', fontWeight: 800 }}>{trip.partner?.nickname?.slice(0, 1) ?? '?'}</span>}<span>{owner} × {trip.partner?.nickname ?? '동행'}</span></div></section>;
}

function andParticle(value: string) {
  const code = value.charCodeAt(value.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '과' : '와';
}

function dateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return '날짜 미정';
  return [start, end].filter(Boolean).join(' — ');
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { planning: '조율 중', confirmed: '여행 준비', completed: '완료', cancelled: '취소' };
  return labels[status] ?? status;
}
