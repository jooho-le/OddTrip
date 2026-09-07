import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal } from './proposalVariants';

export function ProposalListPage() {
  const { attractions, loadAttractions, status, error } = useTripStore();
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => {
    if (!attractions.length) void loadAttractions();
    showDemoOnce(
      'coordination-demo',
      '공동 선호와 차이 분석은 현재 여행에 연결됩니다. 개인 양보 범위, Odd Rule, 세 가지 조율안은 화면 체험용이며 여기서 고른 값은 저장되지 않습니다.',
    );
  }, [attractions.length, loadAttractions, showDemoOnce]);

  return (
    <TripWorkspaceShell active="coordination">
      <div className="coord-layout">
        <section>
          <div className="section-title"><h2>조율 진행</h2><p>둘의 취향을 한 단계씩 정리합니다.</p></div>
          <div className="coord-list">
            <Stage no="1" title="공동 선호" copy="함께 원하는 장소와 활동을 정리합니다." state="작성하기" to="/decision/select" />
            <Stage no="2" title="차이 분석" copy="조율이 필요한 항목을 골라 제안을 확인합니다." state="분석하기" to="/decision/analysis" />
            <Stage no="3" title="개인 양보 범위" copy="각자 지키고 싶은 것과 맡길 것을 작성해봅니다." state="둘러보기" to="/decision/concession" />
            <Stage no="4" title="Odd Rule" copy="의견이 다를 때 적용할 둘만의 규칙을 비교합니다." state="둘러보기" to="/decision/odd-rule" />
          </div>
        </section>
        <aside>
          <div className="side-box">
            <div className="side-head">한눈에 비교</div>
            <div className="notice-list"><div className="notice-item">균형형 · 도전형 · 안정형<time>세 가지 구성</time></div></div>
          </div>
          <Link className="line-btn" style={{ display: 'block', marginTop: 13, textAlign: 'center' }} to="/proposal/compare">세 안 한눈에 비교</Link>
        </aside>
      </div>

      <section className="proposal-area">
        <div className="section-title"><h2>여행 조율안</h2><p>현재 장소를 서로 다른 기준으로 살펴봅니다.</p></div>
        {status.attractions === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
        {error && status.attractions === 'error' ? <div className="error-strip">{error}</div> : null}
        <div className="proposal-grid">
          {PROPOSAL_VARIANTS.map((variant) => {
            const summary = summarizeProposal(buildProposalItems(attractions, variant.id));
            return (
              <article className="proposal" key={variant.id}>
                <strong>{variant.title}</strong>
                <p>{variant.description}</p>
                <dl><dt>장소 수</dt><dd>{summary.count || '—'}</dd><dt>실내 비중</dt><dd>{summary.count ? String(summary.indoorRatio) + '%' : '—'}</dd><dt>혼잡 정보</dt><dd>{summary.avgCongestion ?? '출처 미제공'}</dd></dl>
                <Link className="line-btn" style={{ display: 'block', marginTop: 14, textAlign: 'center' }} to={'/proposal/' + variant.id}>열람하기</Link>
              </article>
            );
          })}
        </div>
        <div className="workflow-cta">
          <p><b>세 안을 충분히 비교해 보세요.</b>최종안 선택은 두 사람이 함께 확정할 수 있도록 준비하고 있습니다.</p>
          <button className="line-btn" type="button" onClick={() => showComingSoon('조율안 확정', '조율안 투표와 최종 확정은 현재 준비 중인 기능입니다. 지금은 각 안을 열람하고 비교할 수 있습니다.')}>조율안 선택</button>
        </div>
      </section>
    </TripWorkspaceShell>
  );
}

function Stage({ no, title, copy, state, to }: { no: string; title: string; copy: string; state: string; to: string }) {
  return <article className="coord-item"><span className="coord-no">{no}</span><div className="coord-copy"><h3>{title}</h3><p>{copy}</p></div><div className="coord-action"><small>{state}</small><Link className="line-btn" to={to}>열기</Link></div></article>;
}
