import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { sourceLabel } from '../../shared/lib/sourceLabel';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';
import { PROPOSAL_VARIANTS, buildProposalItems, type ProposalVariantId } from './proposalVariants';

export function ProposalDetailPage() {
  const { variantId = 'balanced' } = useParams();
  const variant = PROPOSAL_VARIANTS.find((item) => item.id === variantId) ?? PROPOSAL_VARIANTS[0];
  const { attractions, loadAttractions } = useTripStore();
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => {
    if (!attractions.length) void loadAttractions();
    showDemoOnce('coordination-demo', '공동 선호와 차이 분석은 현재 여행에 연결됩니다. 개인 양보 범위, Odd Rule, 세 가지 조율안은 화면 체험용이며 여기서 고른 값은 저장되지 않습니다.');
  }, [attractions.length, loadAttractions, showDemoOnce]);

  const items = buildProposalItems(attractions, variant.id as ProposalVariantId);
  return (
    <TripWorkspaceShell active="coordination">
      <header className="page-heading">
        <div><Link className="text-btn" to="/proposal">‹ 조율안 목록</Link><h1 style={{ marginTop: 9 }}>{variant.title} · 상세</h1></div>
        <p>선택한 여행 방식에 맞춰 장소 구성을 살펴봅니다.</p>
      </header>
      <div className="detail-note"><h3>{variant.description}</h3><p>현재 추천된 장소를 이 기준에 맞춰 순서대로 보여드립니다.</p></div>
      <div className="day-list">
        {items.length ? items.map((item, index) => (
          <div className="schedule-row" key={item.id}>
            <time>{String(index + 1).padStart(2, '0')}</time>
            <span className="route-dot" />
            <div className="schedule-copy"><h3>{item.name}</h3><p>{item.description ?? item.reason ?? item.addr1 ?? '장소 설명 미제공'}</p><small>{item.category} · {displaySource(item.source)}</small></div>
          </div>
        )) : (
          <div className="empty-state"><strong>비교할 관광지가 없습니다.</strong><p>여행지 화면에서 실제 추천 데이터를 먼저 불러오세요.</p><Link className="solid-btn" to="/attractions">여행지 열기</Link></div>
        )}
      </div>
      <div className="workflow-cta"><p><b>이 구성이 마음에 드나요?</b>두 사람이 함께 선택하고 확정하는 기능을 준비하고 있습니다.</p><button className="line-btn" type="button" onClick={() => showComingSoon('조율안 확정', '조율안 투표와 최종 확정은 현재 준비 중인 기능입니다. 지금은 각 안을 열람하고 비교할 수 있습니다.')}>이 안으로 선택</button></div>
    </TripWorkspaceShell>
  );
}

function displaySource(source?: string | null) {
  return /fallback|mock|demo|static/i.test(source ?? '') ? '출처 미제공' : sourceLabel(source);
}
