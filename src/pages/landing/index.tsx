import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useChatStore } from '../../entities/chat/model/chatStore';

const demoPhotos = {
  hero: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=90',
  recordA: 'https://images.unsplash.com/photo-1538485399081-7c89757c343f?auto=format&fit=crop&w=800&q=80',
  recordB: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  recordC: 'https://images.unsplash.com/photo-1535189043414-47a3c49a0bed?auto=format&fit=crop&w=800&q=80',
};

export function LandingPage() {
  const user = useTripStore((state) => state.user);
  const userStatus = useTripStore((state) => state.status.user);
  const hasToken = Boolean(localStorage.getItem('oddtrip.authToken'));

  if (hasToken && userStatus === 'loading') return <AppBootState />;
  return user && hasToken ? <AuthenticatedHome /> : <IntroLanding />;
}

function AppBootState() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-card">
        <strong><span style={{ color: 'var(--orange)', display: 'inline' }}>odd</span>trip</strong>
        <span>여행 공간을 불러오고 있습니다.</span>
        <div className="loading-line" />
      </div>
    </div>
  );
}

function IntroLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    const reveal = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.style.opacity = '1';
        element.style.transform = 'none';
        element.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => {
          const fill = bar.querySelector<HTMLElement>('i');
          if (fill) fill.style.width = `${bar.dataset.w ?? 0}%`;
        });
        observer.unobserve(element);
      });
    }, { threshold: 0.18 });
    reveal.forEach((element) => observer.observe(element));

    const update = () => {
      const nav = document.getElementById('introNav');
      const progress = document.getElementById('introProgress');
      nav?.classList.toggle('show', window.scrollY > window.innerHeight * 0.66);
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = `${available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, []);

  const start = () => navigate('/auth');

  return (
    <section id="introLanding">
      <div className="intro-fixed-nav" id="introNav">
        <div className="intro-nav-inner">
          <a href="#introTop" className="intro-brand"><i>odd</i>trip</a>
          <span className="intro-tagline">DIFFERENT TASTES, ONE TRIP</span>
          <button className="intro-nav-start" onClick={start}>OddTrip 시작하기</button>
        </div>
        <div className="intro-progress-track"><i id="introProgress" /></div>
      </div>

      <section className="intro-hero" id="introTop">
        <div className="intro-hero-photo" />
        <span className="intro-hero-black" />
        <span className="intro-hero-grad-a" />
        <span className="intro-hero-grad-b" />
        <div className="intro-hero-meta"><span className="left">ODDTRIP</span><span className="right">2026</span></div>
        <div className="intro-hero-copy">
          <div className="intro-kicker"><i /><span>TRAVEL WITH SOMEONE DIFFERENT</span></div>
          <div className="intro-logo"><i>odd</i>trip</div>
          <p>새로운 장소에서, 새로운 사람과</p>
          <div className="intro-hero-actions">
            <button className="intro-start" onClick={start}><span>OddTrip 시작하기</span><span style={{ marginLeft: 16 }}>→</span></button>
            <small>계정을 만들고 1분 성향 조사로 시작합니다</small>
          </div>
        </div>
        <div className="intro-cue"><div className="intro-cue-inner"><span>SCROLL</span><span /></div></div>
      </section>

      <section className="intro-why">
        <div className="intro-inner">
          <p className="intro-eyebrow" data-reveal>WHY ODDTRIP</p>
          <h2 data-reveal>함께하고 싶은 사람을<br />찾지 못하셨나요?</h2>
          <div className="intro-problem-grid">
            <div className="intro-problem" data-reveal><span className="no">01</span><h3>일정 조율이 어려웠습니다</h3><p>누가 먼저 양보할지 정하지 못한 채 일정이 미뤄집니다.</p></div>
            <div className="intro-problem" data-reveal><span className="no">02</span><h3>대화가 길어질수록 흐려집니다</h3><p>채팅에 흩어진 결정은 나중에 아무도 기억하지 못합니다.</p></div>
            <div className="intro-problem" data-reveal><span className="no">03</span><h3>한 사람의 여행이 됩니다</h3><p>계획을 세운 쪽의 취향만 남고 다른 취향은 사라집니다.</p></div>
          </div>
        </div>
      </section>

      <section className="intro-steps">
        <div className="intro-steps-grid">
          <div>
            <div className="intro-steps-side">
              <p className="eyebrow">HOW IT WORKS</p>
              <h2>OddTrip이<br />정해드립니다</h2>
              <p>OddTrip은 대화 대신 세 개의 문서로 여행을 결정합니다. 각 단계는 상대의 답을 보기 전에 작성되고, 서버가 지원하는 범위만 실제 저장됩니다.</p>
              <div className="intro-step-nav">
                <div className="row active"><span className="dot">1</span><b>성향 조사서</b></div>
                <div className="row"><span className="dot">2</span><b>독립 선택 · 양보 범위</b></div>
                <div className="row"><span className="dot">3</span><b>공동 일정 확인</b></div>
              </div>
            </div>
          </div>
          <div className="intro-card-stack">
            <article className="intro-card" data-reveal>
              <div className="intro-card-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80')" }} />
              <div className="intro-card-body">
                <span className="step">STEP 01 · TTI</span><h3>내 여행 방식을 4글자로</h3>
                <p>계획 방식, 장소 분위기, 활동 강도, 대표·로컬 네 축으로 성향을 기록합니다. 이 결과가 동행 후보와의 차이를 계산하는 기준이 됩니다.</p>
                <div className="intro-bars">
                  {[['계획 방식', 88], ['장소 분위기', 92], ['활동 강도', 74]].map(([label, value]) => (
                    <div className="intro-bar-row" key={String(label)}><b>{label}</b><span data-bar data-w={value}><i style={{ width: `${value}%` }} /></span><em>{value}%</em></div>
                  ))}
                </div>
              </div>
            </article>
            <article className="intro-card" data-reveal>
              <div className="intro-card-body">
                <span className="step">STEP 02 · PRIVATE FORM</span><h3>상대의 답을 보기 전에 각자 씁니다</h3>
                <p style={{ marginBottom: 24 }}>원하는 것과 양보할 수 있는 범위를 따로 작성합니다. 공동 선호는 저장되며, 개인별 제출과 합의 기능은 다음 백엔드 계약에서 연결됩니다.</p>
                <div className="intro-docs">
                  <div className="intro-doc-row done"><span className="mark">✓</span><b>공동 선호 조사서</b><em>API 연결</em></div>
                  <div className="intro-doc-row"><span className="mark">3</span><b>개인 양보 범위</b><em>연결 대기</em></div>
                  <div className="intro-doc-row locked"><span className="mark">4</span><b>Odd Rule 합의</b><em>연결 대기</em></div>
                </div>
              </div>
            </article>
            <article className="intro-card" data-reveal>
              <div className="intro-card-body" style={{ paddingBottom: 26 }}>
                <span className="step">STEP 03 · SHARED PLAN</span><h3>두 취향이 남은 하나의 일정</h3>
                <p>저장한 장소와 공동 선호를 이용해 일정을 생성합니다. 양쪽 승인과 수정 요청은 지원 API가 준비되기 전까지 완료로 표시하지 않습니다.</p>
              </div>
              <div className="intro-photo-grid"><span style={{ backgroundImage: `url('${demoPhotos.recordB}')` }} /><span style={{ backgroundImage: `url('${demoPhotos.recordA}')` }} /><span style={{ backgroundImage: `url('${demoPhotos.hero}')` }} /></div>
              <div className="intro-score-grid"><div><b>82</b><span>은진 반영</span></div><div><b>91</b><span>지우 반영</span></div><div><b>86</b><span>공통</span></div></div>
            </article>
          </div>
        </div>
      </section>

      <section className="intro-records-section">
        <div className="intro-inner">
          <div className="intro-records-head"><div><p className="eyebrow" data-reveal>RECORDS</p><h2 data-reveal>여행이 끝나면 기록이 남습니다</h2></div><p data-reveal>아래 카드는 디자인 이해를 위한 예시입니다. 실제 기록 API가 연결되면 사용자 데이터로 교체됩니다.</p></div>
          <div className="intro-record-grid">
            {[['지우 · WCAS', '영도 골목에서 세 시간', '계획 없이 걷다가 찾은 작은 책방과 이름 없는 카페.', demoPhotos.recordA], ['민 · WCAF', '기장시장에서 하루 종일', '시장 음식과 해안 액티비티를 하루에 묶은 기록.', demoPhotos.recordB], ['민서 · PNFH', '강릉에서 각자의 아침', '오전은 따로, 오후는 함께 정한 이틀의 기록.', demoPhotos.recordC]].map(([person, title, copy, photo]) => (
              <article className="intro-record" data-reveal key={person}><div className="photo" style={{ backgroundImage: `url('${photo}')` }} /><div className="copy"><small>{person} · DEMO</small><h3>{title}</h3><p>{copy}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className="intro-final">
        <div className="intro-final-photo" /><span className="intro-final-overlay" />
        <div className="intro-final-inner"><p className="eyebrow" data-reveal>START</p><h2 data-reveal>다른 취향 그대로,<br />하나의 여행을 시작하세요.</h2><div className="actions" data-reveal><button className="intro-start" onClick={start}>OddTrip 시작하기 <span style={{ marginLeft: 16 }}>→</span></button></div><p className="note" data-reveal>계정에 성향과 여행 진행 상태가 안전하게 저장됩니다</p></div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-inner"><div><div className="footer-brand"><i>odd</i>trip</div><div className="footer-copy">Different tastes, one trip.<br />서로 다른 여행 취향을 한 번의 여행으로 조율합니다.</div></div><nav className="footer-links" aria-label="사이트 정보"><a href="#introTop">서비스 소개</a><span>이용약관 · 준비 중</span><span>개인정보처리방침 · 준비 중</span><a href="mailto:hello@oddtrip.example">문의</a></nav></div>
        <div className="footer-bottom">© 2026 OddTrip. All rights reserved.</div>
      </footer>
    </section>
  );
}

function AuthenticatedHome() {
  const navigate = useNavigate();
  const { user, tripHistory, matches, error, loadTripHistory, loadMatches, openTrip } = useTripStore();
  const { unreadTotal, loadUnreadCount } = useChatStore();

  useEffect(() => {
    void loadTripHistory();
    void loadUnreadCount();
    if (user?.ttiCode) void loadMatches();
  }, [loadTripHistory, loadUnreadCount, loadMatches, user?.ttiCode]);

  const activeTrip = tripHistory.find((trip) => !['completed', 'cancelled'].includes(trip.status));
  const completed = tripHistory.filter((trip) => trip.status === 'completed').length;
  const savedCount = tripHistory.reduce((total, trip) => total + trip.savedCount, 0);
  const openActiveTrip = async (path = '/decision') => {
    if (activeTrip) await openTrip(activeTrip.tripId);
    navigate(activeTrip ? path : '/matches');
  };

  return (
    <main className="page">
      <div className="container">
        {error ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div> : null}
        {activeTrip ? (
          <section className="home-hero" aria-label="현재 여행">
            <img className="home-hero-image" src={demoPhotos.hero} alt="현재 여행의 디자인 예시 배경" />
            <div className="home-hero-copy"><span className="home-hero-status">{statusLabel(activeTrip.status)}</span><span className="demo-label" style={{ marginLeft: 7 }}>IMAGE · DEMO</span><h1>{tripTitle(activeTrip, user?.nickname)}</h1><p>{dateRange(activeTrip.startDate, activeTrip.endDate)} · {activeTrip.region ?? '지역 미정'}</p><button onClick={() => void openActiveTrip()}>현재 여행 바로 가기 <i>→</i></button></div>
          </section>
        ) : (
          <section className="home-hero-empty"><div><span className="eyebrow">FIRST ODDTRIP</span><h1>아직 진행 중인 여행이 없습니다.</h1><p>TTI 결과를 바탕으로 동행 후보를 살펴보고 요청을 보내보세요.</p><Link className="solid-btn" to={user?.ttiCode ? '/matches' : '/tti/start'}>{user?.ttiCode ? '동행 찾기' : 'TTI 시작하기'}</Link></div></section>
        )}

        <div className="home-grid">
          <section>
            <div className="section-title"><h2>새로운 동행 후보</h2><p>현재 API 추천 결과입니다.</p><Link className="text-btn right" to="/matches">전체 보기 →</Link></div>
            <div className="feed-tabs"><button className="on">추천 후보</button><button disabled>최근 기록 · API 대기</button><button disabled>일정 일치 · API 대기</button></div>
            {matches.length ? matches.slice(0, 3).map((candidate) => (
              <article className="feed-data-row" key={candidate.id}>
                {candidate.avatarUrl ? <img className="avatar" src={candidate.avatarUrl} alt="" /> : <InitialAvatar name={candidate.nickname} />}
                <div><small>{candidate.ttiCode} · {candidate.matchLevel}</small><h3>{candidate.nickname}의 여행 방식</h3><p>{candidate.summary}</p></div>
                <Link className="line-btn accent" to={`/matches/${candidate.id}`}>상세 비교</Link>
              </article>
            )) : <div className="empty-state"><strong>{user?.ttiCode ? '추천 후보가 없습니다.' : 'TTI 진단이 먼저 필요합니다.'}</strong><p>{user?.ttiCode ? '조건에 맞는 새 후보가 생기면 이곳에 표시됩니다.' : '진단 결과가 있어야 서로 다른 여행자를 추천할 수 있습니다.'}</p><Link className="solid-btn" to="/tti/start">{user?.ttiCode ? 'TTI 다시 확인' : 'TTI 시작'}</Link></div>}
          </section>

          <aside className="home-sidebar">
            <div className="side-box"><div className="my-summary"><div className="my-summary-row">{user?.avatarUrl ? <img className="avatar" src={user.avatarUrl} alt="" /> : <InitialAvatar name={user?.nickname ?? '여행자'} />}<div><b>{user?.nickname ?? '여행자'}님의 OddTrip</b><p>{user?.ttiCode ?? 'TTI 미완료'} · {user?.homeRegion ?? '지역 미설정'}</p></div></div><div className="summary-stats"><div><b>{activeTrip ? 1 : 0}</b><span>진행 중</span></div><div><b>{completed}</b><span>완료 여행</span></div><div><b>{savedCount}</b><span>저장 장소</span></div></div></div></div>
            <div className="side-box"><div className="side-head">최근 알림 <span>{unreadTotal ? `채팅 ${unreadTotal}` : '새 알림 없음'}</span></div><div className="notice-list">{unreadTotal ? <div className="notice-item">읽지 않은 채팅이 {unreadTotal}개 있습니다.<time>실시간 API</time></div> : <div className="notice-item">새 채팅이 없습니다.<time>실시간 API</time></div>}<div className="notice-item">여행 단계 알림은 아직 제공되지 않습니다.<time>서버 알림 API 연결 대기</time></div></div></div>
            <div className="side-box"><div className="side-head">작성할 조사서 <span>{activeTrip ? '1건 저장 가능' : '여행 생성 후'}</span></div><div className="survey-hub"><Link className={`survey-row ${user?.ttiCode ? 'done' : ''}`} to="/tti/start"><span className="survey-no">{user?.ttiCode ? '✓' : '1'}</span><span className="survey-copy"><b>여행 성향 조사서</b><small>내 프로필 · TTI</small></span><span className="survey-state">{user?.ttiCode ? '완료 · 수정' : '작성 필요'}</span></Link><button className="survey-row" disabled={!activeTrip} onClick={() => void openActiveTrip('/decision/select')}><span className="survey-no">2</span><span className="survey-copy"><b>공동 선호 조사서</b><small>{activeTrip?.region ?? '여행 미정'}</small></span><span className="survey-state">{activeTrip ? 'API 저장' : '이전 단계 대기'}</span></button><button className="survey-row locked" disabled><span className="survey-no">3</span><span className="survey-copy"><b>개인 양보 범위</b><small>개인별 제출 계약 필요</small></span><span className="survey-state">연결 대기</span></button></div></div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InitialAvatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true" style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff', fontSize: 13, fontWeight: 800 }}>{name.slice(0, 1)}</span>;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { planning: '조율 중', confirmed: '여행 준비', completed: '여행 완료', cancelled: '취소됨' };
  return labels[status] ?? status;
}

function tripTitle(trip: { title?: string | null; partner?: { nickname: string } | null; region?: string | null }, nickname?: string) {
  return trip.title || `${nickname ?? '나'} × ${trip.partner?.nickname ?? '동행'}의 ${trip.region ?? 'OddTrip'} 여행`;
}

function dateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return '날짜 미정';
  return [start, end].filter(Boolean).join(' — ');
}
