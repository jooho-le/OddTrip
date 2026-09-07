import { Link, useNavigate, useParams } from 'react-router-dom';
import { img, mates } from '../../features/prototype/protoData';
import { useProtoStore } from '../../features/prototype/protoStore';

export function MatesPage() {
  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <h1>동행 찾기</h1>
          <p>작성하신 내용으로 추천드립니다.</p>
        </header>
        <div className="filter-row">
          <button type="button" className="on">반대도 높은 순</button>
          <button type="button">부산 일정 일치</button>
          <button type="button">새로운 후보</button>
        </div>
        <section className="mate-grid">
          {mates.map((mate, index) => (
            <article className="mate-card" key={mate.name}>
              <img src={img(mate.photo, 280, 80)} alt={mate.name} />
              <div className="mate-card-body">
                <small>{mate.type} · 반대도 {mate.score}%</small>
                <h2>{mate.name}의 여행 기록</h2>
                <p>{mate.desc}</p>
                <Link className="line-btn accent" to={`/matches/${index}`} style={{ display: 'inline-block', marginTop: 14 }}>상세 비교</Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export function MateDetailPage() {
  const { index } = useParams();
  const navigate = useNavigate();
  const position = Number(index ?? 0);
  const mate = mates[position] ?? mates[0];
  const sent = useProtoStore((s) => s.sentRequests.includes(position));
  const toggleRequest = useProtoStore((s) => s.toggleRequest);
  const toast = useProtoStore((s) => s.toast);

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div>
            <button type="button" className="text-btn" onClick={() => navigate('/matches')}>‹ 동행 찾기로</button>
            <h1 style={{ marginTop: 9 }}>{mate.name}의 여행 기록</h1>
          </div>
          <p>후보의 여행 방식과 차이를 비교합니다.</p>
        </header>
        <section className="match-detail">
          <article className="match-profile">
            <img src={img(mate.photo, 700, 82)} alt={mate.name} />
            <div className="match-profile-body">
              <span className="status pink">반대도 {mate.score}%</span>
              <h2>{mate.name} · {mate.type}</h2>
              <p>{mate.desc}</p>
              <button
                type="button"
                className="solid-btn"
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => {
                  toggleRequest(position);
                  toast(sent ? '동행 요청을 취소했습니다.' : '동행 요청을 보냈습니다.');
                }}
              >
                {sent ? '요청 보냄 · 취소하기' : '동행 요청 보내기'}
              </button>
            </div>
          </article>
          <div>
            <div className="section-title">
              <h2>여행 성향 비교</h2>
              <p>서로 다른 정도와 예상 차이를 확인합니다.</p>
            </div>
            <div className="axis-list">
              {mate.axes.map(([label, value]) => (
                <div className="axis-row" key={label}>
                  <b>{label}</b>
                  <div className="axis-bar"><span style={{ width: `${value}%` }}></span></div>
                  <em>{value}%</em>
                </div>
              ))}
            </div>
            <div className="detail-note">
              <h3>함께 여행하면</h3>
              <p>{mate.compat}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
