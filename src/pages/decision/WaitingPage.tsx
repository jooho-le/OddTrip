import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function WaitingPage() {
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => {
    showComingSoon('개인별 제출 상태', '각 여행자의 독립 답안과 제출 상태를 확인하는 기능은 현재 준비 중입니다. 공동 선호는 계속 작성하고 저장할 수 있습니다.');
  }, [showComingSoon]);

  return (
    <TripWorkspaceShell active="coordination">
      <div className="coord-layout">
        <section>
          <div className="section-title"><h2>제출 상태</h2><p>둘의 문서를 모아보는 공간입니다.</p></div>
          <div className="empty-state"><strong>현재 준비 중인 기능입니다.</strong><p>개인별 문서가 준비되면 이 화면에서 제출 여부와 다음 단계를 확인할 수 있습니다.</p></div>
          <div className="workflow-cta"><p><b>공동 선호는 지금 작성할 수 있습니다.</b>함께 원하는 장소와 활동을 정리한 뒤 차이 분석을 진행해 보세요.</p><div className="button-row"><Link className="line-btn" to="/decision/select">공동 선호 작성</Link><Link className="solid-btn" to="/decision/analysis">차이 분석</Link></div></div>
        </section>
        <aside><Link className="line-btn" style={{ display: 'block', textAlign: 'center' }} to="/trip/coordination">조율로 돌아가기</Link></aside>
      </div>
    </TripWorkspaceShell>
  );
}
