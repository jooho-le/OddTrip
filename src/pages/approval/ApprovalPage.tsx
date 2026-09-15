import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function ApprovalPage() {
  const { itinerary } = useTripStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => {
    showComingSoon('일정 승인', '양쪽 일정 승인과 수정 요청은 현재 준비 중인 기능입니다. 지금은 생성된 일정을 확인할 수 있습니다.');
  }, [showComingSoon]);

  const explain = () => showComingSoon('일정 승인', '양쪽 일정 승인과 수정 요청은 현재 준비 중인 기능입니다. 지금은 생성된 일정을 확인할 수 있습니다.');

  return (
    <TripWorkspaceShell active="schedule">
      <div className="schedule-grid">
        <section>
          <div className="section-title"><h2>일정 확인·승인서</h2><p>두 사람이 최종 일정을 함께 검토하는 화면입니다.</p></div>
          <div className="activity">
            <div className="activity-row"><time>일정</time><div><h3>{itinerary.length ? String(itinerary.length) + '일 일정이 준비되어 있습니다.' : '먼저 공동 일정을 만들어 주세요.'}</h3><p>일정 탭에서 날짜별 장소와 이동 순서를 확인할 수 있습니다.</p></div></div>
            <div className="activity-row"><time>검토</time><div><h3>활동량과 이동량을 확인합니다.</h3><p>서로 바꾸고 싶은 장소가 있는지 대화해 보세요.</p></div></div>
            <div className="activity-row"><time>완료</time><div><h3>두 사람의 확인이 모두 필요합니다.</h3><p>한쪽의 선택만으로 여행을 확정하지 않습니다.</p></div></div>
          </div>
        </section>
        <aside>
          <div className="approval-box">
            <div className="side-head">승인 작업 <span>함께 확인</span></div>
            <div className="approval-body">
              <button className="line-btn" style={{ width: '100%' }} type="button" onClick={explain}>수정 요청</button>
              <button className="solid-btn" style={{ width: '100%', marginTop: 8 }} type="button" onClick={explain}>일정 승인</button>
            </div>
          </div>
          <Link className="line-btn" style={{ display: 'block', textAlign: 'center' }} to="/trip/schedule">일정으로 돌아가기</Link>
        </aside>
      </div>
    </TripWorkspaceShell>
  );
}
