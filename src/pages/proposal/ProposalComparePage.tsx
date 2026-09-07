import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal } from './proposalVariants';

export function ProposalComparePage() {
  const { attractions, loadAttractions } = useTripStore();
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  useEffect(() => {
    if (!attractions.length) void loadAttractions();
    showDemoOnce('coordination-demo', '공동 선호와 차이 분석은 현재 여행에 연결됩니다. 개인 양보 범위, Odd Rule, 세 가지 조율안은 화면 체험용이며 여기서 고른 값은 저장되지 않습니다.');
  }, [attractions.length, loadAttractions, showDemoOnce]);
  return <TripWorkspaceShell active="coordination"><header className="page-heading"><div><Link className="text-btn" to="/trip/coordination">‹ 조율로 돌아가기</Link><h1 style={{ marginTop: 9 }}>조율안 비교</h1></div><p>같은 장소를 세 가지 여행 방식으로 비교합니다.</p></header><div className="proposal-grid">{PROPOSAL_VARIANTS.map((variant) => { const items = buildProposalItems(attractions, variant.id); const summary = summarizeProposal(items); return <article className="proposal" key={variant.id}><strong>{variant.title}</strong><p>{variant.description}</p><dl><dt>후보 장소</dt><dd>{summary.count}</dd><dt>실내 비중</dt><dd>{summary.count ? String(summary.indoorRatio) + '%' : '—'}</dd><dt>숨은 장소 정보</dt><dd>{summary.avgHidden ?? '미제공'}</dd></dl><div className="feed-tags">{items.slice(0, 4).map((item) => <span className="tag" key={item.id}>{item.name}</span>)}</div><Link className="line-btn" style={{ display: 'block', marginTop: 14, textAlign: 'center' }} to={'/proposal/' + variant.id}>상세 열람</Link></article>; })}</div><div className="workflow-cta"><p><b>마음에 드는 구성을 비교해 보세요.</b>두 사람이 함께 선택하는 기능은 다음 단계에서 제공됩니다.</p><button className="line-btn" type="button" onClick={() => showComingSoon('조율안 확정', '조율안 투표와 최종 확정은 현재 준비 중인 기능입니다. 지금은 각 안을 열람하고 비교할 수 있습니다.')}>선택하기</button></div></TripWorkspaceShell>;
}
