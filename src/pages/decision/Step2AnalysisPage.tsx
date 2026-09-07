import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

const conflictOptions = ['일정 속도', '유명 관광지와 로컬 장소 비중', '실내와 야외 활동 비중', '식사 예산'];

export function Step2AnalysisPage() {
  const { decisionSuggestion, resolveDecisionConflict, status, error } = useTripStore();
  const [conflicts, setConflicts] = useState<string[]>(['일정 속도']);
  const toggle = (value: string) => setConflicts((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return <TripWorkspaceShell active="coordination"><div className="coord-layout"><section><div className="section-title"><h2>차이 분석</h2><p>공동 선호와 선택한 충돌 항목으로 현재 API를 실행합니다.</p></div><div className="coord-list">{conflictOptions.map((item, index) => <article className="coord-item" key={item}><span className="coord-no">{index + 1}</span><div className="coord-copy"><h3>{item}</h3><p>실제 충돌로 분석할 항목을 선택합니다.</p></div><div className="coord-action"><button className={conflicts.includes(item) ? 'solid-btn' : 'line-btn'} onClick={() => toggle(item)}>{conflicts.includes(item) ? '선택됨' : '선택'}</button></div></article>)}</div>{error ? <div className="error-strip" role="alert">{error}</div> : null}<div className="workflow-cta"><p><b>AI 조정 제안 생성</b>이 결과는 참고용 텍스트이며 합의나 확정 상태로 저장되지 않습니다.</p><button className="solid-btn" disabled={!conflicts.length || status.conflict === 'loading'} aria-busy={status.conflict === 'loading'} onClick={() => void resolveDecisionConflict(conflicts)}>{status.conflict === 'loading' ? '분석 중…' : '분석 실행'}</button></div>{decisionSuggestion ? <div className="detail-note"><h3>API 조정 제안</h3><p>{decisionSuggestion}</p><div style={{ marginTop: 12 }}><span className="waiting-label">열람 전용 · 확정 API 없음</span></div></div> : null}</section><aside><div className="backend-wait"><h3>개인 답안 비교 아님</h3><p>현재 응답은 한 여행의 공동 JSON입니다. 두 사람의 원본 답안을 비교한 것처럼 표시하지 않습니다.</p></div><Link className="line-btn" style={{ display: 'block', marginTop: 13, textAlign: 'center' }} to="/decision/concession">양보 범위 화면 보기</Link></aside></div></TripWorkspaceShell>;
}
