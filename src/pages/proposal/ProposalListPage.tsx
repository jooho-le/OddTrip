import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal } from './proposalVariants';

export function ProposalListPage() {
  const { attractions, loadAttractions, status, error } = useTripStore();
  useEffect(() => { if (!attractions.length) void loadAttractions(); }, [attractions.length, loadAttractions]);

  return <TripWorkspaceShell active="coordination"><div className="coord-layout"><section><div className="section-title"><h2>조율 진행</h2><p>실제 저장과 연결 여부를 단계별로 구분합니다.</p></div><div className="coord-list"><Stage no="1" title="공동 선호" copy="여행 단위 선호 JSON을 저장합니다." state="API 연결" to="/decision/select" /><Stage no="2" title="차이 분석" copy="선택한 충돌 항목으로 조정 제안을 생성합니다." state="API 연결" to="/decision/analysis" /><Stage no="3" title="개인 양보 범위" copy="개인별 비공개 제출 계약이 필요합니다." state="연결 대기" to="/decision/concession" waiting /><Stage no="4" title="Odd Rule 합의" copy="양쪽 합의와 버전 저장 계약이 필요합니다." state="연결 대기" to="/decision/odd-rule" waiting /></div></section><aside><div className="backend-wait"><h3>조율 완료 상태 없음</h3><p>아래 세 안은 현재 관광지를 브라우저에서 다시 정렬한 비교용 화면입니다. 선택 버튼을 제공하지 않으며 실제 여행 상태도 바꾸지 않습니다.</p></div><Link className="line-btn" style={{ display: 'block', marginTop: 13, textAlign: 'center' }} to="/proposal/compare">세 안 한눈에 비교</Link></aside></div>
    <section className="proposal-area"><div className="section-title"><h2>AI 조율안</h2><p>현재 관광지 데이터 기반 로컬 비교 · 확정 불가</p><span className="demo-label" style={{ marginLeft: 'auto' }}>DEMO LOGIC</span></div>{status.attractions === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}{error && status.attractions === 'error' ? <div className="error-strip">{error}</div> : null}<div className="proposal-grid">{PROPOSAL_VARIANTS.map((variant) => { const summary = summarizeProposal(buildProposalItems(attractions, variant.id)); return <article className="proposal" key={variant.id}><strong>{variant.title}</strong><p>{variant.description}</p><dl><dt>장소 수</dt><dd>{summary.count || '—'}</dd><dt>실내 비중</dt><dd>{summary.count ? String(summary.indoorRatio) + '%' : '—'}</dd><dt>혼잡 정보</dt><dd>{summary.avgCongestion ?? '출처 미제공'}</dd></dl><Link className="line-btn" style={{ display: 'block', marginTop: 14, textAlign: 'center' }} to={'/proposal/' + variant.id}>열람하기</Link></article>; })}</div><div className="workflow-cta"><p><b>조율안은 열람·비교만 가능합니다.</b>선택 확정 API가 생기기 전에는 여행지·일정의 완료 단계로 진행시키지 않습니다.</p><button className="line-btn unsupported-button" disabled>조율안 확정 · 백엔드 대기</button></div></section>
  </TripWorkspaceShell>;
}

function Stage({ no, title, copy, state, to, waiting = false }: { no: string; title: string; copy: string; state: string; to: string; waiting?: boolean }) {
  return <article className="coord-item"><span className="coord-no">{no}</span><div className="coord-copy"><h3>{title}</h3><p>{copy}</p></div><div className="coord-action"><small>{state}</small><Link className={waiting ? 'line-btn' : 'solid-btn'} to={to}>{waiting ? '화면 보기' : '열기'}</Link></div></article>;
}
