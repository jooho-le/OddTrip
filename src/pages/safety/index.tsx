import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function SafetyPage() {
  const { alerts, loadAlerts, status, error } = useTripStore();
  useEffect(() => { void loadAlerts(); }, [loadAlerts]);
  return <TripWorkspaceShell active="schedule"><header className="page-heading"><div><Link className="text-btn" to="/itinerary">‹ 공동 일정</Link><h1 style={{ marginTop: 9 }}>안전 정보</h1></div><p>현재 여행의 안전 API 응답입니다.</p></header>{error && status.alerts === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadAlerts()}>다시 시도</button></div> : null}{status.alerts === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}<section className="safety-panel">{alerts.map((alert) => <article className="safety-alert" key={alert.id}><div><span className={'status ' + (alert.level === 'danger' ? 'pink' : alert.level === 'warning' ? '' : 'gray')}>{alert.level.toUpperCase()}</span><small style={{ display: 'block', marginTop: 7, color: '#999' }}>{alert.time}</small></div><div><h3>{alert.title}</h3><p>{alert.message}</p><p style={{ marginTop: 8 }}><b>권장 행동 · </b>{alert.action}</p><span className="source-label" style={{ marginTop: 10 }}>출처 미제공</span></div></article>)}</section>{status.alerts === 'success' && !alerts.length ? <div className="empty-state"><strong>표시할 안전 정보가 없습니다.</strong><p>“특보 없음”으로 해석하지 않습니다. 서버 응답에 항목이 없는 상태입니다.</p></div> : null}<div className="workflow-cta"><p><b>출처와 갱신 시각이 없는 응답은 그대로 표시합니다.</b>실시간 재난 알림·자동 갱신은 후속 서버 계약이 필요합니다.</p><span className="waiting-label">서버 알림 연결 대기</span></div></TripWorkspaceShell>;
}
