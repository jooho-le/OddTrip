import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function ApprovalPage() {
  const { itinerary, approval, status, loadApproval, respondApproval } = useTripStore();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [comment, setComment] = useState('');

  useEffect(() => {
    void loadApproval();
  }, [loadApproval]);

  const submit = async (action: 'approve' | 'change_request') => {
    const success = await respondApproval(action, comment || undefined);
    if (success) showInfo(action === 'approve' ? '일정을 승인했습니다.' : '수정 요청을 보냈습니다.', action === 'approve' ? '동행의 승인 상태와 함께 저장됐습니다.' : '동행이 요청 내용을 확인할 수 있습니다.');
  };

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
              <p>{approval?.mine.nickname ?? '나'} · {approvalStatusText(approval?.mine.status)}</p>
              <p>{approval?.counterpart.nickname ?? '동행'} · {approvalStatusText(approval?.counterpart.status)}</p>
              <textarea maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="수정 요청 사유" />
              <button className="line-btn" style={{ width: '100%' }} type="button" disabled={!comment.trim() || status.approval === 'loading'} onClick={() => void submit('change_request')}>수정 요청</button>
              <button className="solid-btn" style={{ width: '100%', marginTop: 8 }} type="button" disabled={!itinerary.length || status.approval === 'loading'} onClick={() => void submit('approve')}>일정 승인</button>
            </div>
          </div>
          <Link className="line-btn" style={{ display: 'block', textAlign: 'center' }} to="/trip/schedule">일정으로 돌아가기</Link>
        </aside>
      </div>
    </TripWorkspaceShell>
  );
}

function approvalStatusText(status?: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'change_requested') return '수정 요청';
  return '검토 전';
}
