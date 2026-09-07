import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useChatStore } from '../../entities/chat/model/chatStore';
import type { TripSummary } from '../../types';

export function MyTripPage() {
  const navigate = useNavigate();
  const { user, tripHistory, loadTripHistory, openTrip, status, error } = useTripStore();
  const { unreadTotal, loadUnreadCount } = useChatStore();
  useEffect(() => { void loadTripHistory(); void loadUnreadCount(); }, [loadTripHistory, loadUnreadCount]);
  const active = tripHistory.filter((trip) => !['completed', 'cancelled'].includes(trip.status));
  const completed = tripHistory.filter((trip) => trip.status === 'completed');
  const open = async (trip: TripSummary) => { await openTrip(trip.tripId); navigate('/trip/overview'); };

  return <main className="page"><div className="container"><header className="page-heading"><div><h1>내 여행</h1><p>진행 중인 여행과 지난 여행을 한곳에서 확인합니다.</p></div><Link className="line-btn" to="/settings">계정 설정</Link></header>
    <section style={{ marginTop: 20 }}><div className="my-summary" style={{ border: '1px solid #e1e1e1' }}><div className="my-summary-row">{user?.avatarUrl ? <img className="avatar" src={user.avatarUrl} alt="" /> : <span className="avatar" style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff', fontWeight: 800 }}>{user?.nickname?.slice(0, 1) ?? '?'}</span>}<div><b>{user?.nickname ?? '여행자'}님의 OddTrip</b><p>{user?.ttiCode ?? 'TTI 미완료'} · {user?.homeRegion ?? '지역 미설정'}</p></div></div><div className="summary-stats"><div><b>{active.length}</b><span>진행 중</span></div><div><b>{completed.length}</b><span>완료 여행</span></div><div><b>{unreadTotal}</b><span>안읽은 채팅</span></div></div></div></section>
    {error && status.tripHistory === 'error' ? <div className="error-strip"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div> : null}
    {status.tripHistory === 'loading' && !tripHistory.length ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
    <section className="trip-list">{tripHistory.map((trip) => <article className="trip-list-item" key={trip.tripId}><TripImage region={trip.region} /><div><span className={'status ' + (trip.status === 'completed' ? 'gray' : '')}>{statusLabel(trip.status)}</span><h2>{trip.title || (trip.partner?.nickname ? trip.partner.nickname + '님과의 ' : '') + (trip.region ?? 'OddTrip') + ' 여행'}</h2><p>{dateRange(trip.startDate, trip.endDate)} · 저장 장소 {trip.savedCount}곳 · 일정 {trip.itineraryDayCount}일</p></div><div className="trip-list-action"><small>{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString('ko-KR') + ' 생성' : '생성일 미제공'}</small><button className={trip.status === 'completed' ? 'line-btn' : 'solid-btn'} onClick={() => void open(trip)}>{trip.status === 'completed' ? '기록 열기' : '계속하기'}</button></div></article>)}</section>
    {status.tripHistory === 'success' && !tripHistory.length ? <div className="empty-state"><strong>아직 여행 기록이 없습니다.</strong><p>동행 요청이 수락되면 첫 여행 공간이 여기에 표시됩니다.</p><Link className="solid-btn" to="/matches">동행 찾기</Link></div> : null}
    <div className="workflow-cta"><p><b>다음 여행을 준비해 보세요.</b>성향을 다시 확인하거나 동행과 대화를 이어갈 수 있습니다.</p><div className="button-row"><Link className="line-btn" to="/tti/start">여행 성향</Link><Link className="line-btn" to="/chat">채팅</Link><Link className="solid-btn" to="/matches">동행 찾기</Link></div></div>
  </div></main>;
}

function TripImage({ region }: { region?: string | null }) {
  return <div className="trip-thumb-placeholder"><span>{region ?? 'ODDTRIP'}<small>IMAGE 미제공</small></span></div>;
}
function statusLabel(status: string) { return ({ planning: '조율 중', confirmed: '여행 준비', completed: '여행 완료', cancelled: '취소됨' } as Record<string, string>)[status] ?? status; }
function dateRange(start?: string | null, end?: string | null) { return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정'; }
