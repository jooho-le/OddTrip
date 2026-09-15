import { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIntroTransitionStore } from '../../features/intro-transition/introTransitionStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import './intro.css';

/** Where `OddTrip 시작하기` lands after the curtain. */
const START_ROUTE = '/auth';

const PROBLEMS = [
  { no: '01', title: '일정 조율이 어려웠습니다', text: '누가 먼저 양보할지 정하지 못한 채 일정이 미뤄집니다.' },
  { no: '02', title: '대화가 길어질수록 흐려집니다', text: '채팅에 흩어진 결정은 나중에 아무도 기억하지 못합니다.' },
  { no: '03', title: '한 사람의 여행이 됩니다', text: '계획을 세운 쪽의 취향만 남고 다른 취향은 사라집니다.' }
];

const STEP_ROWS = [
  { dot: '1', label: '성향 조사서' },
  { dot: '2', label: '독립 선택 · 양보 범위' },
  { dot: '3', label: '공동 일정 승인' }
];

const RECORDS = [
  { who: '지우 · WCAS', title: '영도 골목에서 세 시간', text: '계획 없이 걷다가 찾은 작은 책방과 이름 없는 카페.', photo: 'photo-1538485399081-7c89757c343f' },
  { who: '민 · WCAF', title: '기장시장에서 하루 종일', text: '시장 음식과 해안 액티비티를 하루에 묶은 기록.', photo: 'photo-1504674900247-0877df9cc836' },
  { who: '민서 · PNFH', title: '강릉에서 각자의 아침', text: '오전은 따로, 오후는 함께 정한 이틀의 기록.', photo: 'photo-1535189043414-47a3c49a0bed' }
];

const photo = (id: string, w: number, q: number) => `url('https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}')`;

export function IntroLandingPage() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const run = useIntroTransitionStore((state) => state.run);
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);

  const start = useCallback(() => {
    run(() => navigate(START_ROUTE));
  }, [navigate, run]);

  useEffect(() => {
    showDemoOnce('intro-flow-demo', '소개 화면의 여행 기록과 조율 과정은 서비스 흐름을 보여주는 예시입니다. 로그인 후에는 계정에 연결된 여행과 동행 정보만 표시됩니다.');
  }, [showDemoOnce]);

  // dark page background + smooth in-page anchors while the intro is mounted
  useEffect(() => {
    const { body, documentElement } = document;
    const prevBackground = body.style.background;
    const prevScroll = documentElement.style.scrollBehavior;
    body.style.background = '#0d0b0b';
    documentElement.style.scrollBehavior = 'smooth';
    return () => {
      body.style.background = prevBackground;
      documentElement.style.scrollBehavior = prevScroll;
    };
  }, []);

  // scroll reveals + bar fills
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.opacity = '1';
          el.style.transform = 'none';
          if (el.hasAttribute('data-bar')) {
            const bar = el.querySelector('i') as HTMLElement | null;
            if (bar) bar.style.width = `${el.getAttribute('data-w') || 0}%`;
          }
          observer.unobserve(el);
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    root.querySelectorAll('[data-reveal],[data-bar]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // sticky nav reveal, progress bar, active step highlight
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const markSteps = () => {
      const cards = root.querySelectorAll<HTMLElement>('[data-stepcard]');
      if (!cards.length) return;
      let active = 0;
      const mid = window.innerHeight * 0.45;
      cards.forEach((card, index) => {
        if (card.getBoundingClientRect().top <= mid) active = index;
      });
      root.querySelectorAll<HTMLElement>('[data-step]').forEach((row, index) => {
        const on = index === active;
        const dot = row.querySelector<HTMLElement>('.dot');
        const label = row.querySelector<HTMLElement>('b');
        row.style.borderTopColor = on ? '#ff5a36' : '#e7e1da';
        if (dot) {
          dot.style.background = on ? '#ff5a36' : '#fff';
          dot.style.color = on ? '#fff' : '#999';
          dot.style.borderColor = on ? '#ff5a36' : '#ddd';
        }
        if (label) label.style.color = on ? '#202124' : '#a8a29c';
      });
    };

    const onScroll = () => {
      const y = window.scrollY || 0;
      const vh = window.innerHeight || 900;
      navRef.current?.classList.toggle('show', y / vh > 0.72);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.width = `${h > 0 ? Math.min(100, (y / h) * 100) : 0}%`;
      markSteps();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="intro-landing" ref={rootRef}>
      <div className="intro-fixed-nav" ref={navRef}>
        <div className="intro-nav-inner">
          <a href="#introTop" className="intro-brand"><i>odd</i>trip</a>
          <span className="intro-tagline">DIFFERENT TASTES, ONE TRIP</span>
          <button type="button" className="intro-nav-start" onClick={start}>OddTrip 시작하기</button>
        </div>
        <div className="intro-progress-track"><i ref={progressRef}></i></div>
      </div>

      <section className="intro-hero" id="introTop">
        <div className="intro-hero-photo"></div>
        <span className="intro-hero-black"></span>
        <span className="intro-hero-grad-a"></span>
        <span className="intro-hero-grad-b"></span>

        <div className="intro-hero-meta">
          <span className="left">ODDTRIP</span>
          <span className="right">2026</span>
        </div>

        <div className="intro-hero-copy">
          <div className="intro-kicker"><i></i><span>TRAVEL WITH SOMEONE DIFFERENT</span></div>
          <div className="intro-logo"><i>odd</i>trip</div>
          <p>새로운 장소에서, 새로운 사람과</p>
          <div className="intro-hero-actions">
            <button type="button" className="intro-start" onClick={start}><span>OddTrip 시작하기</span><span style={{ marginLeft: 16 }}>→</span></button>
            <small>1분 성향 조사로 시작합니다</small>
          </div>
        </div>

        <div className="intro-cue"><div className="intro-cue-inner"><span>SCROLL</span><span></span></div></div>
      </section>

      <section className="intro-why">
        <div className="intro-inner">
          <p className="intro-eyebrow" data-reveal>WHY ODDTRIP</p>
          <h2 data-reveal>함께하고 싶은 사람을<br />찾지 못하셨나요?</h2>
          <div className="intro-problem-grid">
            {PROBLEMS.map((item) => (
              <div className="intro-problem" data-reveal key={item.no}>
                <span className="no">{item.no}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="intro-steps">
        <div className="intro-steps-grid">
          <div>
            <div className="intro-steps-side">
              <p className="eyebrow">HOW IT WORKS</p>
              <h2>OddTrip이<br />정해드립니다</h2>
              <p>OddTrip은 대화 대신 세 개의 문서로 여행을 결정합니다. 각 단계는 상대의 답을 보기 전에 작성되고, 겹치는 범위만 공개됩니다.</p>
              <div className="intro-step-nav">
                {STEP_ROWS.map((row, index) => (
                  <div className={index === 0 ? 'row active' : 'row'} data-step={index} key={row.dot}>
                    <span className="dot">{row.dot}</span>
                    <b>{row.label}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="intro-card-stack">
            <article className="intro-card" data-reveal data-stepcard="0">
              <div className="intro-card-photo" style={{ backgroundImage: photo('photo-1519501025264-65ba15a82390', 1200, 80) }}></div>
              <div className="intro-card-body">
                <span className="step">STEP 01 · TTI</span>
                <h3>내 여행 방식을 4글자로</h3>
                <p>계획 방식, 장소 분위기, 활동 강도, 대표·로컬 네 축으로 성향을 기록합니다. 이 결과가 동행 후보와의 차이를 계산하는 기준이 됩니다.</p>
                <div className="intro-bars">
                  {[['계획 방식', 88], ['장소 분위기', 92], ['활동 강도', 74]].map(([label, value]) => (
                    <div className="intro-bar-row" key={label as string}>
                      <b>{label}</b>
                      <span data-bar data-w={value}><i></i></span>
                      <em>{value}%</em>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="intro-card" data-reveal data-stepcard="1">
              <div className="intro-card-body">
                <span className="step">STEP 02 · PRIVATE FORM</span>
                <h3>상대의 답을 보기 전에 각자 씁니다</h3>
                <p style={{ marginBottom: 24 }}>원하는 것과 양보할 수 있는 범위를 따로 작성합니다. 두 사람이 모두 제출한 뒤에야 겹치는 부분과 충돌하는 부분이 공개됩니다.</p>
                <div className="intro-docs">
                  <div className="intro-doc-row done"><span className="mark">✓</span><b>독립 선택 조사서</b><em>양쪽 제출 완료</em></div>
                  <div className="intro-doc-row"><span className="mark">3</span><b>양보 범위 조사서</b><em>작성 필요</em></div>
                  <div className="intro-doc-row locked"><span className="mark">4</span><b>Odd Rule 선택서</b><em>이전 단계 대기</em></div>
                </div>
              </div>
            </article>

            <article className="intro-card" data-reveal data-stepcard="2">
              <div className="intro-card-body" style={{ paddingBottom: 26 }}>
                <span className="step">STEP 03 · SHARED PLAN</span>
                <h3>두 취향이 남은 하나의 일정</h3>
                <p>조율 결과로 만들어진 일정에는 각자의 반영 점수가 함께 표시됩니다. 승인 전까지 이동량과 장소를 수정 요청할 수 있습니다.</p>
              </div>
              <div className="intro-photo-grid">
                {['photo-1504674900247-0877df9cc836', 'photo-1534274867514-d5b47ef89ed7', 'photo-1528127269322-539801943592'].map((id) => (
                  <span key={id} style={{ backgroundImage: photo(id, 600, 78) }}></span>
                ))}
              </div>
              <div className="intro-score-grid">
                <div><b>82</b><span>은진 반영</span></div>
                <div><b>91</b><span>지우 반영</span></div>
                <div><b>86</b><span>공통</span></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="intro-records-section">
        <div className="intro-inner">
          <div className="intro-records-head">
            <div>
              <p className="eyebrow" data-reveal>RECORDS</p>
              <h2 data-reveal>여행이 끝나면 기록이 남습니다</h2>
            </div>
            <p data-reveal>동행 후보의 기록을 먼저 읽고, 프로필 대신 여행 방식으로 사람을 고릅니다.</p>
          </div>
          <div className="intro-record-grid">
            {RECORDS.map((record) => (
              <article className="intro-record" data-reveal key={record.title}>
                <div className="photo" style={{ backgroundImage: photo(record.photo, 800, 80) }}></div>
                <div className="copy">
                  <small>{record.who}</small>
                  <h3>{record.title}</h3>
                  <p>{record.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="intro-final">
        <div className="intro-final-photo"></div><span className="intro-final-overlay"></span>
        <div className="intro-final-inner">
          <p className="eyebrow" data-reveal>START</p>
          <h2 data-reveal>다른 취향 그대로,<br />하나의 여행을 시작하세요.</h2>
          <div className="actions" data-reveal>
            <button type="button" className="intro-start" onClick={start}>OddTrip 시작하기 <span style={{ marginLeft: 16 }}>→</span></button>
          </div>
          <p className="note" data-reveal>계정을 만들고 여행 성향 조사부터 시작합니다</p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <div className="footer-brand"><i>odd</i>trip</div>
            <div className="footer-copy">Different tastes, one trip.<br />서로 다른 여행 취향을 한 번의 여행으로 조율합니다.</div>
          </div>
          <nav className="footer-links" aria-label="사이트 정보">
            <a href="#introTop">서비스 소개</a>
            <Link to="/legal/terms">이용약관</Link>
            <Link to="/legal/community">커뮤니티 운영정책</Link>
            <Link to="/legal/privacy">개인정보 처리 안내</Link>
            <a href="mailto:hello@oddtrip.example">문의</a>
          </nav>
        </div>
        <div className="footer-bottom">© 2026 OddTrip. All rights reserved.</div>
      </footer>
    </div>
  );
}
