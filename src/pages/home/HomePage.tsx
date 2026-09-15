import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMatchRequestStore } from '../../entities/match-request/model/matchRequestStore';
import { useNotificationStore } from '../../entities/notification/model/notificationStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import {
  FEED_THUMB_FALLBACKS,
  imageUrl,
  PROFILE_FALLBACKS,
} from '../../features/prototype/designContent';
import { formatRelativeTime } from '../../shared/lib/formatDate';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { subscribeRealtime } from '../../shared/realtime/socketBus';
import type { MatchCandidate, TripSummary } from '../../types';
import { selectScheduleRequests, sortTripsByRecent, type DatedMatchRequest, type HomeFeedTab } from './homeFeed';

const coverImage = imageUrl('photo-1507525428034-b723cf961d3e', 1600, 90);

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedTab, setFeedTab] = useState<HomeFeedTab>('recommended');
  const {
    user,
    activeTripId,
    tripHistory,
    matches,
    preferences,
    status,
    error,
    loadTripHistory,
    loadMatches,
    matchesConsentRequired,
    openTrip,
  } = useTripStore();
  const notifications = useNotificationStore((state) => state.items);
  const notificationStatus = useNotificationStore((state) => state.status);
  const notificationUnread = useNotificationStore((state) => state.unreadCount);
  const loadNotifications = useNotificationStore((state) => state.load);
  const markNotificationRead = useNotificationStore((state) => state.markRead);
  const receivedRequests = useMatchRequestStore((state) => state.received);
  const sentRequests = useMatchRequestStore((state) => state.sent);
  const requestStatus = useMatchRequestStore((state) => state.status);
  const requestError = useMatchRequestStore((state) => state.error);
  const loadRequests = useMatchRequestStore((state) => state.load);
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);

  useEffect(() => {
    void loadTripHistory();
    void loadNotifications();
    void loadRequests();
    if (user?.ttiCode) void loadMatches();
    if (location.pathname === '/home') {
      showDemoOnce('home-fallback-images', '프로필이나 여행 이미지가 등록되지 않은 경우 디자인 원본의 대체 이미지를 사용합니다. 동행·여행·알림 정보는 서버 응답을 사용합니다.');
    }
  }, [loadTripHistory, loadNotifications, loadRequests, loadMatches, showDemoOnce, user?.ttiCode, location.pathname]);

  useEffect(() => subscribeRealtime((event) => {
    if (event.event === 'match_request.created' || event.event === 'match_request.updated' || event.event === 'chat.room_created') {
      void loadRequests();
    }
  }), [loadRequests]);

  const activeTrip = tripHistory.find((trip) => !['completed', 'cancelled'].includes(trip.status));

  useEffect(() => {
    if (activeTrip && activeTripId !== activeTrip.tripId) void openTrip(activeTrip.tripId);
  }, [activeTrip, activeTripId, openTrip]);

  const completedTrips = tripHistory.filter((trip) => trip.status === 'completed').length;
  const savedPlaces = tripHistory.reduce((sum, trip) => sum + trip.savedCount, 0);
  const preferenceDone = hasPreferenceInput(preferences);
  const stage = activeTrip ? tripStage(activeTrip) : '동행 찾는 중';
  const pending = Number(!user?.ttiCode) + Number(Boolean(activeTrip && !preferenceDone));
  const recentTrips = sortTripsByRecent(tripHistory);
  const scheduleRequests = selectScheduleRequests(receivedRequests, sentRequests, activeTrip);
  const feedHeading = {
    recommended: ['새로운 동행 기록', '동행 전 상대의 여행 방식을 살펴보세요.', '/matches'],
    recent: ['최근 여행 기록', '진행 중인 여행과 지난 여행을 최신 순서로 확인하세요.', '/my'],
    schedule: ['일정이 겹치는 요청', activeTrip?.startDate && activeTrip?.endDate ? '현재 여행 기간과 겹치는 동행 요청입니다.' : '다가오는 동행 요청을 여행 날짜 순서로 확인하세요.', '/matches?tab=received'],
  }[feedTab];

  const openActiveTrip = async () => {
    if (!activeTrip) {
      navigate(user?.ttiCode ? '/matches' : '/survey/tti');
      return;
    }
    await openTrip(activeTrip.tripId);
    navigate('/trip/overview');
  };

  return (
    <main className="page">
      <div className="container">
        {error && status.tripHistory === 'error' ? (
          <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div>
        ) : null}

        <section className="home-hero" aria-label={activeTrip ? `${activeTrip.region ?? '현재'} 여행` : '새 동행 찾기'}>
          <img className="home-hero-image" src={coverImage} alt="" />
          <div className="home-hero-copy">
            <span className="home-hero-status">{stage}</span>
            <h1>{activeTrip ? tripTitle(activeTrip, user?.nickname) : `${user?.nickname ?? '여행자'}님의 다음 OddTrip`}</h1>
            <p>{activeTrip ? `${dateRange(activeTrip.startDate, activeTrip.endDate)} · ${activeTrip.region ?? '지역 미정'}` : '여행 성향을 기록하고 새로운 동행을 찾아보세요.'}</p>
            <button type="button" onClick={() => void openActiveTrip()}>{activeTrip ? '현재 여행 바로 가기' : user?.ttiCode ? '동행 찾기' : '여행 성향 작성하기'} <i>→</i></button>
          </div>
        </section>

        <div className="home-grid">
          <section>
            <div className="home-feed" style={{ marginTop: 0 }}>
              <div className="section-title">
                <h2>{feedHeading[0]}</h2>
                <p>{feedHeading[1]}</p>
                <Link className="text-btn right" to={feedHeading[2]}>전체 보기 →</Link>
              </div>
              <div className="feed-tabs" role="tablist" aria-label="홈 기록 필터">
                <button type="button" role="tab" aria-selected={feedTab === 'recommended'} className={feedTab === 'recommended' ? 'on' : ''} onClick={() => setFeedTab('recommended')}>추천 기록</button>
                <button type="button" role="tab" aria-selected={feedTab === 'recent'} className={feedTab === 'recent' ? 'on' : ''} onClick={() => setFeedTab('recent')}>최근 기록</button>
                <button type="button" role="tab" aria-selected={feedTab === 'schedule'} className={feedTab === 'schedule' ? 'on' : ''} onClick={() => setFeedTab('schedule')}>일정 일치</button>
              </div>
              <div>
                {feedTab === 'recommended' && status.matches === 'loading' && !matches.length ? <LoadingFeed label="동행 기록을 불러오는 중" /> : null}
                {feedTab === 'recommended' ? matches.slice(0, 3).map((candidate, index) => <CandidateRecord candidate={candidate} index={index} key={candidate.id} />) : null}
                {feedTab === 'recommended' && matchesConsentRequired ? (
                  <div className="empty-state">
                    <strong>동행 후보를 보려면 매칭 동의가 필요합니다.</strong>
                    <p>프로필 공개 범위와 안전 이용수칙을 확인하면 후보를 불러옵니다.</p>
                    <Link className="solid-btn" to="/matches">확인하고 시작하기</Link>
                  </div>
                ) : null}
                {feedTab === 'recommended' && !matchesConsentRequired && status.matches === 'success' && !matches.length ? (
                  <div className="empty-state">
                    <strong>{user?.ttiCode ? '현재 추천할 동행 기록이 없습니다.' : '여행 성향 조사가 먼저 필요합니다.'}</strong>
                    <p>{user?.ttiCode ? '새로운 후보가 생기면 이곳에서 바로 확인할 수 있습니다.' : '조사 결과가 저장되면 실제 매칭 후보를 불러옵니다.'}</p>
                    <Link className="solid-btn" to={user?.ttiCode ? '/matches' : '/survey/tti'}>{user?.ttiCode ? '동행 찾기' : '조사서 작성'}</Link>
                  </div>
                ) : null}
                {feedTab === 'recommended' && error && status.matches === 'error' ? (
                  <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadMatches()}>다시 시도</button></div>
                ) : null}

                {feedTab === 'recent' && status.tripHistory === 'loading' && !tripHistory.length ? <LoadingFeed label="여행 기록을 불러오는 중" /> : null}
                {feedTab === 'recent' ? recentTrips.slice(0, 4).map((trip, index) => (
                  <TripHistoryRecord
                    trip={trip}
                    index={index}
                    key={trip.tripId}
                    onOpen={async () => {
                      await openTrip(trip.tripId);
                      navigate('/trip/overview');
                    }}
                  />
                )) : null}
                {feedTab === 'recent' && status.tripHistory === 'success' && !recentTrips.length ? (
                  <div className="empty-state"><strong>아직 여행 기록이 없습니다.</strong><p>동행 요청이 수락되면 만들어지는 여행 공간을 이곳에서 바로 이어갈 수 있습니다.</p><Link className="solid-btn" to="/matches">동행 찾기</Link></div>
                ) : null}
                {feedTab === 'recent' && error && status.tripHistory === 'error' ? (
                  <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div>
                ) : null}

                {feedTab === 'schedule' && requestStatus === 'loading' && !receivedRequests.length && !sentRequests.length ? <LoadingFeed label="동행 요청 일정을 불러오는 중" /> : null}
                {feedTab === 'schedule' ? scheduleRequests.slice(0, 4).map((item, index) => <ScheduleRequestRecord item={item} index={index} key={item.request.id} />) : null}
                {feedTab === 'schedule' && requestStatus === 'success' && !scheduleRequests.length ? (
                  <div className="empty-state"><strong>{activeTrip?.startDate && activeTrip?.endDate ? '현재 여행과 일정이 겹치는 요청이 없습니다.' : '다가오는 동행 요청이 없습니다.'}</strong><p>받거나 보낸 요청에 여행 날짜가 생기면 여기에서 겹치는 일정을 모아볼 수 있습니다.</p><Link className="solid-btn" to="/matches">동행 요청 확인</Link></div>
                ) : null}
                {feedTab === 'schedule' && requestStatus === 'error' ? (
                  <div className="error-strip" role="alert"><span>{requestError ?? '동행 요청을 불러오지 못했습니다.'}</span><button onClick={() => void loadRequests()}>다시 시도</button></div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="home-sidebar">
            <div className="side-box">
              <div className="my-summary">
                <div className="my-summary-row">
                  <ProfileImage src={user?.avatarUrl} name={user?.nickname ?? '여행자'} index={0} />
                  <div><b>{user?.nickname ?? '여행자'}님의 OddTrip</b><p>{user?.ttiCode ?? 'TTI 작성 전'} · {user?.homeRegion ?? '지역 미설정'}</p></div>
                </div>
                <div className="summary-stats">
                  <div><b>{activeTrip ? 1 : 0}</b><span>진행 중</span></div>
                  <div><b>{completedTrips}</b><span>완료 여행</span></div>
                  <div><b>{savedPlaces}</b><span>저장 장소</span></div>
                </div>
              </div>
            </div>

            <div className="side-box">
              <div className="side-head">최근 알림 <span>{notificationUnread ? `${notificationUnread}개 안 읽음` : '새 알림 없음'}</span></div>
              <div className="notice-list">
                {notificationStatus === 'loading' && !notifications.length ? <div className="notice-item">알림을 불러오는 중입니다.</div> : null}
                {notificationStatus === 'error' && !notifications.length ? <div className="notice-item">알림을 불러오지 못했습니다.<button type="button" className="text-btn" onClick={() => void loadNotifications()}>다시 시도</button></div> : null}
                {notificationStatus === 'success' && !notifications.length ? <div className="notice-item">새 알림이 없습니다.</div> : null}
                {notifications.slice(0, 2).map((notification) => (
                  <button
                    type="button"
                    className="notice-item home-notice-item"
                    key={notification.id}
                    onClick={() => {
                      void markNotificationRead(notification.id);
                      if (notification.link) navigate(notification.link);
                    }}
                  >
                    <b>{notification.title}</b>
                    {notification.body ? <span>{notification.body}</span> : null}
                    <time>{formatRelativeTime(notification.createdAt)}</time>
                  </button>
                ))}
              </div>
            </div>

            <div className="side-box">
              <div className="side-head">작성할 조사서 <span>{pending ? `${pending}건 작성 필요` : '지원 문서 확인 완료'}</span></div>
              <div className="survey-hub">
                <SurveyRow number="1" title="여행 성향 조사서" meta="내 프로필 · TTI" state={user?.ttiCode ? '완료 · 수정' : '작성 필요'} done={Boolean(user?.ttiCode)} onClick={() => navigate('/survey/tti?from=home')} />
                <SurveyRow number="2" title="독립 선택 조사서" meta={activeTrip ? `${activeTrip.region ?? '현재 여행'} · ${activeTrip.partner?.nickname ?? '동행'}` : '여행 생성 후'} state={preferenceDone ? '완료 · 수정' : activeTrip ? '작성 필요' : '이전 단계 대기'} done={preferenceDone} locked={!activeTrip} onClick={() => navigate('/survey/preference?from=home')} />
                <SurveyRow number="3" title="양보 범위 조사서" meta={activeTrip ? `${activeTrip.region ?? '현재 여행'} · ${activeTrip.partner?.nickname ?? '동행'}` : '여행 생성 후'} state={activeTrip ? '열어보기' : '이전 단계 대기'} locked={!activeTrip} onClick={() => navigate('/survey/concession?from=home')} />
                <SurveyRow number="4" title="Odd Rule 선택서" meta={activeTrip ? `${activeTrip.region ?? '현재 여행'} · ${activeTrip.partner?.nickname ?? '동행'}` : '여행 생성 후'} state={activeTrip ? '열어보기' : '이전 단계 대기'} locked={!activeTrip} onClick={() => navigate('/survey/rule?from=home')} />
                <SurveyRow number="5" title="일정 확인·승인서" meta={activeTrip ? `${activeTrip.region ?? '현재 여행'} · ${activeTrip.partner?.nickname ?? '동행'}` : '여행 생성 후'} state={activeTrip?.itineraryDayCount ? '확인하기' : '일정 생성 후'} locked={!activeTrip?.itineraryDayCount} onClick={() => navigate('/survey/approval?from=home')} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CandidateRecord({ candidate, index }: { candidate: MatchCandidate; index: number }) {
  const fallback = PROFILE_FALLBACKS[(index + 1) % PROFILE_FALLBACKS.length];
  const thumbs = FEED_THUMB_FALLBACKS[index % FEED_THUMB_FALLBACKS.length];
  return (
    <article className="feed-row">
      <div className="feed-person">
        <img className="avatar" src={candidate.avatarUrl ?? imageUrl(fallback, 120)} alt="" />
        <b>{candidate.nickname}</b>
        <span>{candidate.ttiCode} · {candidate.matchLevel}</span>
      </div>
      <div className="feed-copy">
        <small>{candidate.ageRange} · {candidate.region}</small>
        <h3>{candidate.nickname}의 여행 방식</h3>
        <p>{candidate.summary}</p>
        <div className="feed-tags">{candidate.complements.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <Link className="text-btn accent" to={`/matches/${candidate.id}`} style={{ marginTop: 11, display: 'inline-block' }}>후보 자세히 보기 →</Link>
      </div>
      <div className="feed-thumbs" aria-hidden="true">
        {thumbs.map((photo) => <span key={photo} style={{ backgroundImage: `url('${imageUrl(photo, 220, 72)}')` }} />)}
      </div>
    </article>
  );
}

function TripHistoryRecord({ trip, index, onOpen }: { trip: TripSummary; index: number; onOpen: () => Promise<void> }) {
  const fallback = PROFILE_FALLBACKS[(index + 1) % PROFILE_FALLBACKS.length];
  const thumbs = FEED_THUMB_FALLBACKS[index % FEED_THUMB_FALLBACKS.length];
  return (
    <article className="feed-row">
      <div className="feed-person">
        <img className="avatar" src={trip.partner?.avatarUrl ?? imageUrl(fallback, 120)} alt="" />
        <b>{trip.partner?.nickname ?? '동행'}</b>
        <span>{tripStatusLabel(trip)}</span>
      </div>
      <div className="feed-copy">
        <small>{dateRange(trip.startDate, trip.endDate)} · {trip.region ?? '지역 미정'}</small>
        <h3>{tripTitle(trip)}</h3>
        <p>{trip.attractionCount}개 장소 · {trip.savedCount}개 저장 · {trip.itineraryDayCount}일 일정</p>
        <button className="text-btn accent" type="button" style={{ marginTop: 11 }} onClick={() => void onOpen()}>{trip.status === 'completed' ? '기록 열어보기' : '여행 이어가기'} →</button>
      </div>
      <div className="feed-thumbs" aria-hidden="true">
        {thumbs.map((photo) => <span key={photo} style={{ backgroundImage: `url('${imageUrl(photo, 220, 72)}')` }} />)}
      </div>
    </article>
  );
}

function ScheduleRequestRecord({ item, index }: { item: DatedMatchRequest; index: number }) {
  const { request, direction } = item;
  const fallback = PROFILE_FALLBACKS[(index + 2) % PROFILE_FALLBACKS.length];
  const counterpart = request.counterpart ?? (direction === 'received' ? request.requester : request.receiver);
  return (
    <article className="feed-row request-feed-row">
      <div className="feed-person">
        <img className="avatar" src={counterpart.avatarUrl ?? imageUrl(fallback, 120)} alt="" />
        <b>{counterpart.nickname}</b>
        <span>{direction === 'received' ? '받은 요청' : '보낸 요청'}</span>
      </div>
      <div className="feed-copy">
        <small>{request.region} · {dateRange(request.startDate, request.endDate)}</small>
        <h3>{counterpart.nickname}님과 맞춰볼 여행</h3>
        <p>{request.greetingMessage || '인사 메시지가 없습니다.'}</p>
        <div className="trip-feed-facts"><span>{requestStatusLabel(request.status)}</span><span>{request.matchLevel} {request.recommendationScore}%</span></div>
        <Link className="text-btn accent" to={`/matches?tab=${direction}`} style={{ marginTop: 11, display: 'inline-block' }}>요청 확인하기 →</Link>
      </div>
      <div className="request-feed-date" aria-label={`${request.startDate}부터 ${request.endDate}까지`}>
        <small>{formatMonth(request.startDate)}</small>
        <strong>{formatDay(request.startDate)}</strong>
        <span>— {formatDay(request.endDate)}</span>
      </div>
    </article>
  );
}

function SurveyRow({ number, title, meta, state, done = false, locked = false, onClick }: { number: string; title: string; meta: string; state: string; done?: boolean; locked?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={['survey-row', done ? 'done' : '', locked ? 'locked' : ''].filter(Boolean).join(' ')}
      disabled={locked}
      onClick={onClick}
    >
      <span className="survey-no">{done ? '✓' : number}</span>
      <span className="survey-copy"><b>{title}</b><small>{meta}</small></span>
      <span className="survey-state">{state}</span>
    </button>
  );
}

function ProfileImage({ src, name, index }: { src?: string | null; name: string; index: number }) {
  return <img className="avatar" src={src ?? imageUrl(PROFILE_FALLBACKS[index % PROFILE_FALLBACKS.length], 120)} alt={`${name} 프로필`} />;
}

function LoadingFeed({ label }: { label: string }) {
  return <div className="skeleton-stack" role="status" aria-label={label}>{[0, 1].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function tripStatusLabel(trip: TripSummary) {
  if (trip.status === 'completed') return '여행 완료';
  if (trip.status === 'cancelled') return '취소됨';
  if (trip.itineraryDayCount > 0) return '일정 확인';
  if (trip.attractionCount > 0 || trip.savedCount > 0) return '여행지 선택';
  return '조율 중';
}

function requestStatusLabel(status: DatedMatchRequest['request']['status']) {
  return ({ pending: '응답 대기', accepted: '수락됨', rejected: '거절됨', cancelled: '취소됨', expired: '만료됨' } as const)[status];
}

function formatMonth(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '일정' : date.toLocaleDateString('ko-KR', { month: 'short' }).replace('.', '');
}

function formatDay(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : String(date.getDate()).padStart(2, '0');
}

function tripStage(trip: TripSummary) {
  if (trip.status === 'completed') return '여행 완료';
  if (trip.itineraryDayCount > 0) return '승인 대기';
  if (trip.attractionCount > 0 || trip.savedCount > 0) return '여행지 선택';
  return '조율 중';
}

function tripTitle(trip: TripSummary, nickname?: string) {
  return trip.title || `${nickname ?? '나'} × ${trip.partner?.nickname ?? '동행'}의 ${trip.region ?? 'OddTrip'} 여행`;
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}

function hasPreferenceInput(preferences: ReturnType<typeof useTripStore.getState>['preferences']) {
  return Boolean(
    preferences.places.length
    || preferences.activities.length
    || preferences.foods.length
    || preferences.indoorPreferred
    || preferences.hiddenSpots
    || preferences.pace !== 50
    || preferences.budget !== 50
  );
}
