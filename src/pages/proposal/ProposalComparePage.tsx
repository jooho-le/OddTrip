import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal } from './proposalVariants';

export function ProposalComparePage() {
  const { attractions, loadAttractions } = useTripStore();
  useEffect(() => { if (!attractions.length) void loadAttractions(); }, [attractions.length, loadAttractions]);
  return <TripWorkspaceShell active="coordination"><header className="page-heading"><div><Link className="text-btn" to="/proposal">‹ 조율로 돌아가기</Link><h1 style={{ marginTop: 9 }}>조율안 비교</h1></div><p>동일한 관광지 목록을 세 가지 기준으로 재정렬합니다.</p></header><div className="document-lock"><b>DEMO LOGIC · 열람 전용</b><br />독립 생성된 AI 계획 세 개가 아닙니다. 현재 추천 장소를 프론트에서 다른 순서로 보여주는 비교입니다.</div><div className="proposal-grid">{PROPOSAL_VARIANTS.map((variant) => { const items = buildProposalItems(attractions, variant.id); const summary = summarizeProposal(items); return <article className="proposal" key={variant.id}><strong>{variant.title}</strong><p>{variant.description}</p><dl><dt>후보 장소</dt><dd>{summary.count}</dd><dt>실내 비중</dt><dd>{summary.count ? String(summary.indoorRatio) + '%' : '—'}</dd><dt>숨은 장소 정보</dt><dd>{summary.avgHidden ?? '미제공'}</dd></dl><div className="feed-tags">{items.slice(0, 4).map((item) => <span className="tag" key={item.id}>{item.name}</span>)}</div><Link className="line-btn" style={{ display: 'block', marginTop: 14, textAlign: 'center' }} to={'/proposal/' + variant.id}>상세 열람</Link></article>; })}</div><div className="workflow-cta"><p><b>실제 선택 완료로 넘어가지 않습니다.</b>조율안 투표·확정 계약이 필요합니다.</p><button className="line-btn unsupported-button" disabled>선택 확정 · 연결 대기</button></div></TripWorkspaceShell>;
}
