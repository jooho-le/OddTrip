import { Link, useNavigate } from 'react-router-dom';
import { feed, img, STAGE_LABEL } from '../../features/prototype/protoData';
import { surveyRows, useProtoStore } from '../../features/prototype/protoStore';

export function HomePage() {
  const navigate = useNavigate();
  const currentTask = useProtoStore((s) => s.currentTask);
  const completed = useProtoStore((s) => s.completed);
  const approved = useProtoStore((s) => s.approved);
  const toast = useProtoStore((s) => s.toast);

  const [stage] = STAGE_LABEL[currentTask];
  const rows = surveyRows({ completed, currentTask, approved });
  const pending = rows.filter((row) => row.label === '작성 필요').length;

  const openForm = (key: string, locked: boolean) => {
    if (locked) { toast('이전 단계를 먼저 마쳐 주세요.'); return; }
    navigate(`/survey/${key}?from=home`);
  };

  return (
    <main className="page">
      <div className="container">
        <section className="home-hero" aria-label="부산 해안 여행">
          <img className="home-hero-image" src={img('photo-1507525428034-b723cf961d3e', 1600, 90)} alt="부산 여행 샘플 이미지" />
          <div className="home-hero-copy">
            <span className="home-hero-status">{stage}</span>
            <h1>은진 × 지우의 부산 여행</h1>
            <p>2026. 08. 28 — 08. 30 · 부산 2박 3일</p>
            <button type="button" onClick={() => navigate('/trip/overview')}>현재 여행 바로 가기 <i>→</i></button>
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
                <button type="button">최근 기록</button>
                <button type="button">부산 일정</button>
              </div>
              <div>
                {feed.map((post, index) => (
                  <article className="feed-row" key={post.name}>
                    <div className="feed-person">
                      <img className="avatar" src={img(post.photo, 120, 80)} alt={post.name} />
                      <b>{post.name}</b>
                      <span>{post.type}</span>
                    </div>
                    <div className="feed-copy">
                      <small>{post.meta}</small>
                      <h3>{post.title}</h3>
                      <p>{post.text}</p>
                      <div className="feed-tags">{post.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
                      <Link className="text-btn accent" to={`/matches/${index}`} style={{ marginTop: 11, display: 'inline-block' }}>여행 기록 더 보기 →</Link>
                    </div>
                    <div className="feed-thumbs">
                      {post.pics.map((pic) => <span key={pic} style={{ backgroundImage: `url('${img(pic, 220, 72)}')` }}></span>)}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="home-sidebar">
            <div className="side-box">
              <div className="my-summary">
                <div className="my-summary-row">
                  <img className="avatar" src={img('photo-1494790108377-be9c29b29330', 120, 80)} alt="은진" />
                  <div><b>은진님의 OddTrip</b><p>PNFH · 계획하는 자연 미식가</p></div>
                </div>
                <div className="summary-stats">
                  <div><b>1</b><span>진행 중</span></div>
                  <div><b>2</b><span>완료 여행</span></div>
                  <div><b>14</b><span>저장 장소</span></div>
                </div>
              </div>
            </div>

            <div className="side-box">
              <div className="side-head">최근 알림 <span>2</span></div>
              <div className="notice-list">
                <div className="notice-item">지우님이 독립 선택을 제출했습니다.<time>오늘 20:14</time></div>
                <div className="notice-item">부산 일정에 비 소식이 있어요.<time>오늘 18:32</time></div>
              </div>
            </div>

            <div className="side-box">
              <div className="side-head">작성할 조사서 <span>{pending ? `${pending}건 작성 필요` : '모두 확인 완료'}</span></div>
              <div className="survey-hub">
                {rows.map((row) => (
                  <button
                    type="button"
                    key={row.key}
                    className={['survey-row', row.done ? 'done' : '', row.locked ? 'locked' : ''].filter(Boolean).join(' ')}
                    disabled={row.locked}
                    onClick={() => openForm(row.key, row.locked)}
                  >
                    <span className="survey-no">{row.done ? '✓' : row.no}</span>
                    <span className="survey-copy"><b>{row.title}</b><small>{row.meta}</small></span>
                    <span className="survey-state">{row.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
