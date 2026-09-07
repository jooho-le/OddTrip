import { Link } from 'react-router-dom';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function WaitingPage() {
  return <TripWorkspaceShell active="coordination"><div className="coord-layout"><section><div className="section-title"><h2>제출 상태</h2><p>개인별 상태 API가 준비되기 전의 안전한 표현입니다.</p></div><div className="backend-wait"><h3>상대의 제출 여부를 확인할 수 없습니다.</h3><p>현재 여행의 공동 선호는 저장할 수 있지만, 사용자별 독립 답안과 제출 시각을 조회하는 계약이 없습니다. 임의로 “상대 제출 완료” 상태를 만들지 않습니다.</p></div><div className="workflow-cta"><p><b>공동 선호는 계속 수정할 수 있습니다.</b>현재 지원 범위에서 저장한 뒤 차이 분석 API를 실행하세요.</p><div className="button-row"><Link className="line-btn" to="/decision/select">공동 선호 수정</Link><Link className="solid-btn" to="/decision/analysis">분석 보기</Link></div></div></section><aside><div className="side-box"><div className="side-head">연결 상태 <span>API</span></div><div className="notice-list"><div className="notice-item">공동 선호 저장<time>지원됨</time></div><div className="notice-item">개인별 제출 상태<time>백엔드 연결 대기</time></div></div></div></aside></div></TripWorkspaceShell>;
}
