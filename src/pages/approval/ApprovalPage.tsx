import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function ApprovalPage() {
  const { itinerary } = useTripStore();
  return <TripWorkspaceShell active="schedule"><div className="schedule-grid"><section><div className="section-title"><h2>일정 확인·승인서</h2><p>현재 일정은 열람할 수 있지만 승인 상태는 저장되지 않습니다.</p></div><div className="backend-wait"><h3>양쪽 승인 API 연결 대기</h3><p>승인자, 일정 버전, 승인 시각, 수정 요청 내용과 재승인 규칙이 필요합니다. 버튼을 눌러도 성공 상태로 전환하지 않습니다.</p></div><div className="activity"><div className="activity-row"><time>일정</time><div><h3>{itinerary.length ? String(itinerary.length) + '일 일정이 생성되어 있습니다.' : '생성된 일정이 없습니다.'}</h3><p>현재 일정 API의 읽기 결과입니다.</p></div></div><div className="activity-row"><time>내 승인</time><div><h3>상태를 조회할 수 없습니다.</h3><p>클라이언트에 임의 승인 값을 보관하지 않습니다.</p></div></div><div className="activity-row"><time>동행 승인</time><div><h3>상태를 조회할 수 없습니다.</h3><p>상대가 승인했다고 추측하지 않습니다.</p></div></div></div></section><aside><div className="approval-box"><div className="side-head">승인 작업 <span>미지원</span></div><div className="approval-body"><button className="line-btn unsupported-button" style={{ width: '100%' }} disabled>수정 요청 · 연결 대기</button><button className="solid-btn unsupported-button" style={{ width: '100%', marginTop: 8 }} disabled>일정 승인 · 연결 대기</button></div></div><Link className="line-btn" style={{ display: 'block', textAlign: 'center' }} to="/itinerary">일정으로 돌아가기</Link></aside></div></TripWorkspaceShell>;
}
