import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

const conflictOptions = ['일정 속도', '유명 관광지와 로컬 장소 비중', '실내와 야외 활동 비중', '식사 예산'];

export function Step2AnalysisPage() {
  const { decisionSuggestion, resolveDecisionConflict, status, error } = useTripStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const [conflicts, setConflicts] = useState<string[]>(['일정 속도']);
  const toggle = (value: string) => setConflicts((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return <TripWorkspaceShell active="coordination"><div className="coord-layout"><section><div className="section-title"><h2>차이 분석</h2><p>공동 선호에서 더 이야기해볼 항목을 고릅니다.</p></div><div className="coord-list">{conflictOptions.map((item, index) => <article className="coord-item" key={item}><span className="coord-no">{index + 1}</span><div className="coord-copy"><h3>{item}</h3><p>조율 제안에 포함할 항목을 선택합니다.</p></div><div className="coord-action"><button className={conflicts.includes(item) ? 'solid-btn' : 'line-btn'} onClick={() => toggle(item)}>{conflicts.includes(item) ? '선택됨' : '선택'}</button></div></article>)}</div>{error ? <div className="error-strip" role="alert">{error}</div> : null}<div className="workflow-cta"><p><b>조정 제안 만들기</b>현재 공동 선호와 선택한 항목을 바탕으로 한 가지 제안을 만듭니다.</p><button className="solid-btn" disabled={!conflicts.length || status.conflict === 'loading'} aria-busy={status.conflict === 'loading'} onClick={() => void resolveDecisionConflict(conflicts)}>{status.conflict === 'loading' ? '분석 중…' : '분석 실행'}</button></div>{decisionSuggestion ? <div className="detail-note"><h3>조정 제안</h3><p>{decisionSuggestion}</p><button className="line-btn" style={{ marginTop: 12 }} type="button" onClick={() => showComingSoon('조정 제안 확정', '제안을 두 사람의 합의안으로 확정하는 기능은 현재 준비 중입니다.')}>이 제안 반영</button></div> : null}</section><aside><div className="side-box"><div className="side-head">내 기준 정리</div><div className="notice-list"><div className="notice-item">먼저 내 양보 범위를 작성해보세요.<time>작성하기 →</time></div></div></div><Link className="line-btn" style={{ display: 'block', marginTop: 13, textAlign: 'center' }} to="/decision/concession">양보 범위 작성</Link></aside></div></TripWorkspaceShell>;
}
