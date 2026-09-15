import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

const DECISIONS = [
  ['approve', '이 일정 승인', '현재 일정 전체에 동의합니다.'],
  ['activity', '활동량 수정 요청', '하루 방문 장소 수나 휴식 간격을 조정합니다.'],
  ['movement', '이동량 수정 요청', '장거리 이동이나 이동 순서를 조정합니다.'],
  ['place', '장소 변경 요청', '특정 장소를 제외하거나 다른 후보로 교체합니다.'],
] as const;

export function ScheduleApprovalPage() {
  const navigate = useNavigate();
  const { user, itinerary, tripHistory, activeTripId, loadItinerary, status, error } = useTripStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [decision, setDecision] = useState('');
  const [request, setRequest] = useState('');
  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));

  useEffect(() => { void loadItinerary(); }, [loadItinerary]);

  const submit = () => {
    if (!decision) {
      showInfo('처리 방법을 선택해 주세요.', '승인 또는 수정 요청 중 하나를 선택해야 합니다.');
      return;
    }
    showComingSoon(
      '일정 승인·수정 요청',
      '일정 버전과 사용자별 승인 상태를 저장하는 API가 준비되기 전까지 선택과 요청 내용은 서버에 저장되지 않습니다.',
    );
  };

  const placeCount = itinerary.reduce((total, day) => total + day.items.filter((item) => item.type === 'place').length, 0);

  return (
    <main className="page form-page">
      <div className="form-toolbar">
        <button type="button" onClick={() => navigate('/trip/schedule')}>‹ 일정으로 돌아가기</button>
        <span>최종 확인</span>
        <div className="form-progress"><i style={{ width: decision ? '100%' : '52%' }} /></div>
      </div>

      <article className="paper approval-document">
        <header className="paper-head"><h1>일정 확인·승인서</h1><p>ODDTRIP FORM 05 · FINAL APPROVAL</p></header>
        <div className="paper-body">
          <p className="paper-note">최신 공동 일정의 이동량과 장소 구성을 검토합니다. 승인 기능이 열리기 전까지 이 문서는 미리보기로 제공됩니다.</p>

          <div className="info-table">
            <span className="label">대상 여행</span><span>{trip?.title ?? trip?.region ?? '현재 여행'}</span>
            <span className="label">일정 버전</span><span>버전 확인 대기</span>
            <span className="label">작성자</span><span>{user?.nickname ?? '여행자'}</span>
            <span className="label">생성 시각</span><span>정보 미제공</span>
          </div>

          {error && status.itinerary === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadItinerary()}>다시 시도</button></div> : null}
          <div className="approval-facts">
            <div><b>{itinerary.length}</b><span>여행 일수</span></div>
            <div><b>{placeCount}</b><span>방문 장소</span></div>
            <div><b>—</b><span>예상 예산</span></div>
            <div><b>—</b><span>총 이동시간</span></div>
          </div>

          <h2 className="form-section-title">1. 참여자 확인 상태</h2>
          <div className="approval-participants">
            <div><b>{user?.nickname ?? '나'}</b><span>선택 전</span></div>
            <div><b>{trip?.partner?.nickname ?? '동행'}</b><span>상태 연결 대기</span></div>
          </div>

          <h2 className="form-section-title">2. 처리 방법</h2>
          <div className="approval-options">
            {DECISIONS.map(([value, title, copy]) => (
              <button type="button" className={decision === value ? 'selected' : ''} onClick={() => setDecision(value)} key={value}>
                <span>{decision === value ? '✓' : '□'}</span><b>{title}</b><small>{copy}</small>
              </button>
            ))}
          </div>

          <h2 className="form-section-title">3. 수정 요청 메모</h2>
          <textarea value={request} onChange={(event) => setRequest(event.target.value)} maxLength={1000} placeholder="바꾸고 싶은 날짜·장소와 이유를 구체적으로 적어주세요." />
          <div className="sign"><span>검토일 {new Date().toLocaleDateString('ko-KR')}</span><span>작성자 서명 __________</span></div>
        </div>
      </article>

      <div className="form-actions">
        <button type="button" onClick={() => navigate('/trip/schedule')}>취소</button>
        <span className="hint">제출 기능은 준비 중입니다.</span>
        <button type="button" className={decision ? 'submit ready' : 'submit'} onClick={submit}>검토 내용 제출</button>
      </div>
    </main>
  );
}
