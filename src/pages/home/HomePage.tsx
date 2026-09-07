import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../entities/chat/model/chatStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import {
  FEED_THUMB_FALLBACKS,
  imageUrl,
  PROFILE_FALLBACKS,
} from '../../features/prototype/designContent';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { MatchCandidate, TripSummary } from '../../types';

const coverImage = imageUrl('photo-1507525428034-b723cf961d3e', 1600, 90);

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
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
    openTrip,
  } = useTripStore();
  const { unreadTotal, loadUnreadCount } = useChatStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);

  useEffect(() => {
    void loadTripHistory();
    void loadUnreadCount();
    if (user?.ttiCode) void loadMatches();
    if (location.pathname === '/home') {
      showDemoOnce('home-recent-notices', '홈의 최근 알림 두 건은 HTML 디자인을 보존하기 위한 예시입니다. 실제 서버 알림 기능과 연결된 값이 아닙니다.');
    }
  }, [loadTripHistory, loadUnreadCount, loadMatches, showDemoOnce, user?.ttiCode, location.pathname]);

  const activeTrip = tripHistory.find((trip) => !['completed', 'cancelled'].includes(trip.status));

  useEffect(() => {
    if (activeTrip && activeTripId !== activeTrip.tripId) void openTrip(activeTrip.tripId);
  }, [activeTrip, activeTripId, openTrip]);

  const completedTrips = tripHistory.filter((trip) => trip.status === 'completed').length;
  const savedPlaces = tripHistory.reduce((sum, trip) => sum + trip.savedCount, 0);
  const preferenceDone = hasPreferenceInput(preferences);
  const stage = activeTrip ? tripStage(activeTrip) : '동행 찾는 중';
  const pending = Number(!user?.ttiCode) + Number(Boolean(activeTrip && !preferenceDone));

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
                <h2>새로운 동행 기록</h2>
                <p>동행 전 상대의 여행 방식을 살펴보세요.</p>
                <Link className="text-btn right" to="/matches">전체 보기 →</Link>
              </div>
              <div className="feed-tabs">
                <button type="button" className="on">추천 기록</button>
                <button type="button" onClick={() => showComingSoon('최근 기록 필터')}>최근 기록</button>
                <button type="button" onClick={() => showComingSoon('일정 일치 필터')}>일정 일치</button>
              </div>
              <div>
                {status.matches === 'loading' && !matches.length ? <LoadingFeed /> : null}
                {matches.slice(0, 3).map((candidate, index) => <CandidateRecord candidate={candidate} index={index} key={candidate.id} />)}
                {status.matches === 'success' && !matches.length ? (
                  <div className="empty-state">
                    <strong>{user?.ttiCode ? '현재 추천할 동행 기록이 없습니다.' : '여행 성향 조사가 먼저 필요합니다.'}</strong>
                    <p>{user?.ttiCode ? '새로운 후보가 생기면 이곳에서 바로 확인할 수 있습니다.' : '조사 결과가 저장되면 실제 매칭 후보를 불러옵니다.'}</p>
                    <Link className="solid-btn" to={user?.ttiCode ? '/matches' : '/survey/tti'}>{user?.ttiCode ? '동행 찾기' : '조사서 작성'}</Link>
                  </div>
                ) : null}
                {error && status.matches === 'error' ? (
                  <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadMatches()}>다시 시도</button></div>
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
              <div className="side-head">최근 알림 <span>{unreadTotal ? `${unreadTotal}개 채팅 안 읽음` : '예시 2건'}</span></div>
              <div className="notice-list">
                <div className="notice-item">동행이 독립 선택을 제출했습니다.<time>오늘 20:14</time></div>
                <div className="notice-item">여행 일정에 비 소식이 있어요.<time>오늘 18:32</time></div>
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
        <Link className="text-btn accent" to={`/matches/${candidate.id}`} style={{ marginTop: 11, display: 'inline-block' }}>여행 기록 더 보기 →</Link>
      </div>
      <div className="feed-thumbs" aria-hidden="true">
        {thumbs.map((photo) => <span key={photo} style={{ backgroundImage: `url('${imageUrl(photo, 220, 72)}')` }} />)}
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

function LoadingFeed() {
  return <div className="skeleton-stack" role="status" aria-label="동행 기록을 불러오는 중">{[0, 1].map((item) => <div className="skeleton-row" key={item} />)}</div>;
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
