import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../entities/chat/model/chatStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { TripSummary } from '../../types';

const coverImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=90';

export function HomePage() {
  const navigate = useNavigate();
  const { user, tripHistory, matches, status, error, loadTripHistory, loadMatches, openTrip } = useTripStore();
  const { unreadTotal, loadUnreadCount } = useChatStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => {
    void loadTripHistory();
    void loadUnreadCount();
    if (user?.ttiCode) void loadMatches();
  }, [loadTripHistory, loadUnreadCount, loadMatches, user?.ttiCode]);

  const activeTrip = tripHistory.find((trip) => !['completed', 'cancelled'].includes(trip.status));
  const completedTrips = tripHistory.filter((trip) => trip.status === 'completed').length;
  const savedPlaces = tripHistory.reduce((sum, trip) => sum + trip.savedCount, 0);

  const openActiveTrip = async () => {
    if (!activeTrip) {
      navigate('/matches');
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

        {activeTrip ? (
          <section className="home-hero" aria-label="현재 여행">
            <img className="home-hero-image" src={coverImage} alt="" />
            <div className="home-hero-copy">
              <span className="home-hero-status">{tripStatus(activeTrip.status)}</span>
              <h1>{tripTitle(activeTrip, user?.nickname)}</h1>
              <p>{dateRange(activeTrip.startDate, activeTrip.endDate)} · {activeTrip.region ?? '지역 미정'}</p>
              <button type="button" onClick={() => void openActiveTrip()}>현재 여행 바로 가기 <i>→</i></button>
            </div>
          </section>
        ) : (
          <section className="home-hero-empty">
            <div>
              <span className="eyebrow">FIRST ODDTRIP</span>
              <h1>첫 동행을 찾아볼까요?</h1>
              <p>{user?.ttiCode ? '내 여행 방식과 다른 후보에게 동행 요청을 보낼 수 있습니다.' : '먼저 여행 성향 조사서를 작성해 주세요.'}</p>
              <Link className="solid-btn" to={user?.ttiCode ? '/matches' : '/tti/start'}>{user?.ttiCode ? '동행 찾기' : '성향 조사 시작'}</Link>
            </div>
          </section>
        )}

        <div className="home-grid">
          <section>
            <div className="home-feed" style={{ marginTop: 0 }}>
              <div className="section-title">
                <h2>새로운 동행 후보</h2>
                <p>내 여행 성향을 넓혀줄 사람을 살펴보세요.</p>
                <Link className="text-btn right" to="/matches">전체 보기 →</Link>
              </div>
              <div className="feed-tabs">
                <button type="button" className="on">추천 순</button>
                <button type="button" onClick={() => showComingSoon('최근 가입 순 필터')}>최근 가입</button>
                <button type="button" onClick={() => showComingSoon('일정 일치 필터')}>일정 일치</button>
              </div>
              {error && status.matches === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadMatches()}>다시 시도</button></div> : null}
              {status.matches === 'loading' && !matches.length ? <LoadingRows /> : null}
              {matches.slice(0, 3).map((candidate) => (
                <article className="feed-data-row" key={candidate.id}>
                  {candidate.avatarUrl ? <img className="avatar" src={candidate.avatarUrl} alt="" /> : <InitialAvatar name={candidate.nickname} />}
                  <div>
                    <small>{candidate.ttiCode} · {candidate.matchLevel}</small>
                    <h3>{candidate.nickname}의 여행 방식</h3>
                    <p>{candidate.summary}</p>
                  </div>
                  <Link className="line-btn accent" to={'/matches/' + candidate.id}>상세 비교</Link>
                </article>
              ))}
              {status.matches === 'success' && !matches.length ? (
                <div className="empty-state">
                  <strong>{user?.ttiCode ? '아직 추천할 후보가 없습니다.' : '여행 성향 조사가 필요합니다.'}</strong>
                  <p>{user?.ttiCode ? '새 후보가 생기면 이곳에서 바로 확인할 수 있습니다.' : '조사 결과가 있어야 서로 다른 여행자를 추천할 수 있습니다.'}</p>
                  <Link className="solid-btn" to="/tti/start">{user?.ttiCode ? '성향 다시 확인' : '성향 조사 시작'}</Link>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="home-sidebar">
            <div className="side-box">
              <div className="my-summary">
                <div className="my-summary-row">
                  {user?.avatarUrl ? <img className="avatar" src={user.avatarUrl} alt="" /> : <InitialAvatar name={user?.nickname ?? '여행자'} />}
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
              <div className="side-head">채팅 <span>{unreadTotal ? unreadTotal + '개 안 읽음' : '모두 읽음'}</span></div>
              <div className="notice-list">
                <Link className="notice-item" to="/chat">
                  {unreadTotal ? '읽지 않은 대화가 ' + unreadTotal + '개 있습니다.' : '새로 도착한 대화가 없습니다.'}
                  <time>채팅 열기 →</time>
                </Link>
              </div>
            </div>

            <div className="side-box">
              <div className="side-head">여행 문서 <span>{activeTrip ? '현재 여행' : '동행 연결 전'}</span></div>
              <div className="survey-hub">
                <DocumentRow number="1" title="여행 성향 조사서" meta="내 프로필 · TTI" state={user?.ttiCode ? '결과 보기' : '작성 필요'} done={Boolean(user?.ttiCode)} to="/tti/start" />
                <DocumentRow number="2" title="공동 선호 조사서" meta={activeTrip?.region ?? '여행 생성 후'} state={activeTrip ? '작성하기' : '대기'} locked={!activeTrip} to="/decision/select" />
                <DocumentRow number="3" title="개인 양보 범위" meta={activeTrip ? '화면 체험' : '여행 생성 후'} state={activeTrip ? '둘러보기' : '대기'} locked={!activeTrip} to="/decision/concession" />
                <DocumentRow number="4" title="Odd Rule 선택서" meta={activeTrip ? '화면 체험' : '여행 생성 후'} state={activeTrip ? '둘러보기' : '대기'} locked={!activeTrip} to="/decision/odd-rule" />
                <button
                  type="button"
                  className={'survey-row ' + (!activeTrip ? 'locked' : '')}
                  disabled={!activeTrip}
                  onClick={() => showComingSoon('일정 확인·승인', '양쪽 일정 승인과 수정 요청은 현재 준비 중인 기능입니다. 생성된 일정은 일정 탭에서 확인할 수 있습니다.')}
                >
                  <span className="survey-no">5</span>
                  <span className="survey-copy"><b>일정 확인·승인서</b><small>{activeTrip ? '일정 생성 후' : '여행 생성 후'}</small></span>
                  <span className="survey-state">{activeTrip ? '안내 보기' : '대기'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DocumentRow({ number, title, meta, state, done = false, locked = false, to }: { number: string; title: string; meta: string; state: string; done?: boolean; locked?: boolean; to: string }) {
  const content = <><span className="survey-no">{done ? '✓' : number}</span><span className="survey-copy"><b>{title}</b><small>{meta}</small></span><span className="survey-state">{state}</span></>;
  if (locked) return <button type="button" className="survey-row locked" disabled>{content}</button>;
  return <Link className={'survey-row ' + (done ? 'done' : '')} to={to}>{content}</Link>;
}

function InitialAvatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true" style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff', fontSize: 13, fontWeight: 800 }}>{name.slice(0, 1)}</span>;
}

function LoadingRows() {
  return <div className="skeleton-stack" role="status" aria-label="동행 후보를 불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function tripStatus(status: string) {
  return ({ planning: '조율 중', confirmed: '여행 준비', completed: '여행 완료', cancelled: '취소됨' } as Record<string, string>)[status] ?? status;
}

function tripTitle(trip: TripSummary, nickname?: string) {
  return trip.title || (nickname ?? '나') + ' × ' + (trip.partner?.nickname ?? '동행') + '의 ' + (trip.region ?? 'OddTrip') + ' 여행';
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}
