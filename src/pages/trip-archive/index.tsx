import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import type { TripSummary } from '../../types';

export function TripArchivePage({ mode }: { mode: 'itinerary' | 'match' }) {
  const navigate = useNavigate();
  const { tripHistory, loadTripHistory, openTrip, status } = useTripStore();
  useEffect(() => { void loadTripHistory(); }, [loadTripHistory]);
  const items = mode === 'itinerary' ? tripHistory.filter((trip) => trip.itineraryDayCount > 0) : tripHistory;
  const open = async (trip: TripSummary) => { await openTrip(trip.tripId); navigate(mode === 'itinerary' ? '/itinerary' : '/decision'); };
  return <main className="page"><div className="container"><header className="page-heading"><div><Link className="text-btn" to="/my">‹ 내 여행</Link><h1 style={{ marginTop: 9 }}>{mode === 'itinerary' ? '일정 있는 여행' : '매칭 여행 기록'}</h1></div><p>현재 여행 API 조회 결과</p></header>{status.tripHistory === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}<section className="trip-list">{items.map((trip) => <article className="trip-list-item" key={trip.tripId}><div className="trip-thumb-placeholder">{trip.region ?? 'ODDTRIP'}</div><div><span className="status gray">{trip.status}</span><h2>{trip.title || (trip.partner?.nickname ?? '동행') + '님과의 여행'}</h2><p>{trip.region ?? '지역 미정'} · 장소 {trip.attractionCount}곳 · 일정 {trip.itineraryDayCount}일</p></div><div className="trip-list-action"><small>여행 ID {trip.tripId.slice(0, 8)}</small><button className="line-btn" onClick={() => void open(trip)}>열기</button></div></article>)}</section>{status.tripHistory === 'success' && !items.length ? <div className="empty-state"><strong>조건에 맞는 여행이 없습니다.</strong><p>정적 기록을 표시하지 않습니다.</p><Link className="solid-btn" to="/my">내 여행으로</Link></div> : null}</div></main>;
}
