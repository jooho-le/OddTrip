import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { sourceLabel } from '../../shared/lib/sourceLabel';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';
import { PROPOSAL_VARIANTS, buildProposalItems, type ProposalVariantId } from './proposalVariants';

export function ProposalDetailPage() {
  const { variantId = 'balanced' } = useParams();
  const variant = PROPOSAL_VARIANTS.find((item) => item.id === variantId) ?? PROPOSAL_VARIANTS[0];
  const { attractions, loadAttractions } = useTripStore();

  useEffect(() => { if (!attractions.length) void loadAttractions(); }, [attractions.length, loadAttractions]);

  const items = buildProposalItems(attractions, variant.id as ProposalVariantId);
  return (
    <TripWorkspaceShell active="coordination">
      <header className="page-heading">
        <div><Link className="text-btn" to="/proposal">‹ 조율안 목록</Link><h1 style={{ marginTop: 9 }}>{variant.title} · 상세</h1></div>
        <p>관광지 API 결과를 로컬 기준으로 정렬한 읽기 전용 안입니다.</p>
      </header>
      <div className="detail-note"><h3>{variant.description}</h3><p>실제 AI 조율안 ID, 투표, 확정 상태는 존재하지 않습니다.</p><span className="demo-label" style={{ marginTop: 10 }}>DEMO LOGIC</span></div>
      <div className="day-list">
        {items.length ? items.map((item, index) => (
          <div className="schedule-row" key={item.id}>
            <time>{String(index + 1).padStart(2, '0')}</time>
            <span className="route-dot" />
            <div className="schedule-copy"><h3>{item.name}</h3><p>{item.description ?? item.reason ?? item.addr1 ?? '장소 설명 미제공'}</p><small>{item.category} · {sourceLabel(item.source)}</small></div>
          </div>
        )) : (
          <div className="empty-state"><strong>비교할 관광지가 없습니다.</strong><p>여행지 화면에서 실제 추천 데이터를 먼저 불러오세요.</p><Link className="solid-btn" to="/attractions">여행지 열기</Link></div>
        )}
      </div>
      <div className="workflow-cta"><p><b>이 안으로 확정할 수 없습니다.</b>저장 성공처럼 표시하지 않고 백엔드 계약을 기다립니다.</p><button className="line-btn unsupported-button" disabled>이 안으로 선택 · 연결 대기</button></div>
    </TripWorkspaceShell>
  );
}
