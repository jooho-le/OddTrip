import { useNavigate } from 'react-router-dom';
import { img, STAGE_LABEL } from '../../features/prototype/protoData';
import { useProtoStore } from '../../features/prototype/protoStore';

export function MyTripsPage() {
  const navigate = useNavigate();
  const currentTask = useProtoStore((s) => s.currentTask);
  const [stage, task] = STAGE_LABEL[currentTask];

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <h1>내 여행</h1>
          <p>진행 중인 여행과 지난 여행만 모아봅니다.</p>
        </header>
        <section className="trip-list">
          <article className="trip-list-item">
            <img src={img('photo-1538485399081-7c89757c343f', 400, 80)} alt="부산" />
            <div>
              <span className="status">{stage}</span>
              <h2>은진 × 지우의 부산 여행</h2>
              <p>2026. 08. 28 — 08. 30 · 현재 해야 할 일: <span>{task}</span></p>
            </div>
            <div className="trip-list-action">
              <small>최근 업데이트 오늘 20:14</small>
              <button type="button" className="solid-btn" onClick={() => navigate('/trip/overview')}>계속하기</button>
            </div>
          </article>
          <article className="trip-list-item">
            <img src={img('photo-1535189043414-47a3c49a0bed', 400, 80)} alt="강릉" />
            <div>
              <span className="status gray">여행 완료</span>
              <h2>민서와 함께한 강릉 여행</h2>
              <p>2026. 05. 03 — 05. 04 · 저장한 장소 8곳 · 여행 기록 12개</p>
            </div>
            <div className="trip-list-action">
              <small>마지막 업데이트 2026. 05. 05</small>
              <button type="button" className="line-btn">기록 보기</button>
            </div>
          </article>
          <article className="trip-list-item">
            <img src={img('photo-1542931287-023b922fa89b', 400, 80)} alt="제주" />
            <div>
              <span className="status gray">여행 완료</span>
              <h2>서현과 함께한 제주 여행</h2>
              <p>2026. 02. 12 — 02. 15 · 저장한 장소 13곳 · 여행 기록 21개</p>
            </div>
            <div className="trip-list-action">
              <small>마지막 업데이트 2026. 02. 16</small>
              <button type="button" className="line-btn">기록 보기</button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
