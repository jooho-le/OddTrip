import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { sourceLabel } from '../../shared/lib/sourceLabel';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

const filters = ['전체', '저장', '실내', '숨은 장소'] as const;

export function AttractionListPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('전체');
  const { attractions, agentRun, activeTripId, tripHistory, loadAttractions, runTravelAgent, toggleAttraction, status, error } = useTripStore();

  useEffect(() => { void loadAttractions(); }, [loadAttractions]);

  const filtered = useMemo(() => attractions.filter((item) => {
    if (filter === '저장') return item.saved;
    if (filter === '실내') return item.indoor;
    if (filter === '숨은 장소') return item.hiddenScore != null ? item.hiddenScore >= 60 : !item.famous;
    return !item.excluded;
  }), [attractions, filter]);
  const activeTrip = tripHistory.find((trip) => trip.tripId === activeTripId);
  const hasStaticFallback = attractions.some((item) => /fallback|mock|demo|static/i.test(item.source ?? ''));

  return (
    <TripWorkspaceShell active="places">
      <div className="section-title">
        <h2>추천 여행지</h2>
        <p>현재 여행의 관광지 API 결과입니다.</p>
        <button
          className="line-btn right"
          disabled={status.agent === 'loading'}
          aria-busy={status.agent === 'loading'}
          onClick={() => void runTravelAgent()}
        >
          {status.agent === 'loading' ? '에이전트 실행 중…' : '추천 다시 정리'}
        </button>
      </div>

      {agentRun ? <div className="detail-note"><h3>{agentRun.summary}</h3><p>실행 방식 · {agentRun.mode} / 도구 단계 {agentRun.steps.length}개</p></div> : null}
      {hasStaticFallback ? <div className="backend-wait"><h3>DEMO DATA · 서버 fallback</h3><p>외부 관광 데이터가 없어 제공된 정적 후보입니다. {activeTrip?.region ? `${activeTrip.region} 여행과 지역이 일치하지 않을 수 있으며, ` : ''}실제 추천 결과로 확정하지 않습니다.</p></div> : null}
      {error && (status.attractions === 'error' || status.agent === 'error') ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadAttractions()}>다시 시도</button></div> : null}

      <div className="place-tabs">
        {filters.map((item) => <button className={filter === item ? 'on' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>

      {status.attractions === 'loading' && !attractions.length ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
      {status.attractions === 'success' && !filtered.length ? (
        <div className="empty-state">
          <strong>{filter === '전체' ? '추천 관광지가 없습니다.' : filter + ' 조건의 장소가 없습니다.'}</strong>
          <p>정적 장소로 채우지 않습니다. 여행 조건을 확인하거나 추천을 다시 실행해주세요.</p>
          {filter !== '전체' ? <button className="solid-btn" onClick={() => setFilter('전체')}>전체 보기</button> : null}
        </div>
      ) : null}

      <section className="place-grid">
        {filtered.map((item) => (
          <article className="place-card" key={item.id}>
            {item.imageUrl ? <Link to={'/attractions/' + item.id}><img className="place-card-image" src={item.imageUrl} alt={item.name} /></Link> : <div className="place-card-image place-card-placeholder">이미지 미제공</div>}
            <div className="place-card-body">
              <small>{item.category}</small>
              <h3><Link to={'/attractions/' + item.id}>{item.name}</Link></h3>
              <p>{item.description ?? item.reason ?? item.addr1 ?? '장소 설명이 제공되지 않았습니다.'}</p>
              <span className="source-label">{sourceLabel(item.source)}</span>
              <div className="score-row">
                <div><b>{item.congestionScore ?? '—'}</b><span>혼잡 정보</span></div>
                <div><b>{item.hiddenScore ?? '—'}</b><span>숨은 장소</span></div>
                <div><b>{item.relatedRank ?? '—'}</b><span>연관 순위</span></div>
              </div>
              <div className="card-actions">
                <button className="line-btn" onClick={() => void toggleAttraction(item.id, 'excluded')}>{item.excluded ? '제외 취소' : '제외'}</button>
                <button className="line-btn accent" onClick={() => void toggleAttraction(item.id, 'saved')}>{item.saved ? '저장됨 · 취소' : '여행에 저장'}</button>
              </div>
              <button className="line-btn unsupported-button" style={{ width: '100%', marginTop: 7 }} disabled>개인 투표 · 연결 대기</button>
            </div>
          </article>
        ))}
      </section>

      <div className="workflow-cta"><p><b>저장·제외는 서버에 반영됩니다.</b>개인별 투표는 API가 없어 성공 상태를 만들지 않습니다.</p><Link className="solid-btn" to="/itinerary">저장한 장소로 일정 보기</Link></div>
    </TripWorkspaceShell>
  );
}
