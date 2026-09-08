import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function SafetyPage() {
  const { alerts, loadAlerts, status, error } = useTripStore();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  useEffect(() => {
    void loadAlerts();
    showInfo('안전 정보 확인', '현재 제공되는 안전 정보에는 원문 출처와 정확한 갱신 시각이 포함되지 않습니다. 실시간 재난 특보로 해석하지 말고, 중요한 결정 전에는 공식 안내를 함께 확인해 주세요.');
  }, [loadAlerts, showInfo]);
  return <TripWorkspaceShell active="schedule"><header className="page-heading"><div><Link className="text-btn" to="/trip/schedule">‹ 공동 일정</Link><h1 style={{ marginTop: 9 }}>안전 정보</h1></div><p>현재 여행과 관련된 주의사항을 확인합니다.</p></header>{error && status.alerts === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadAlerts()}>다시 시도</button></div> : null}{status.alerts === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}<section className="safety-panel">{alerts.map((alert) => <article className="safety-alert" key={alert.id}><div><span className={'status ' + (alert.level === 'danger' ? 'pink' : alert.level === 'warning' ? '' : 'gray')}>{alert.level.toUpperCase()}</span><small style={{ display: 'block', marginTop: 7, color: '#999' }}>{alert.time}</small></div><div><h3>{alert.title}</h3><p>{alert.message}</p><p style={{ marginTop: 8 }}><b>권장 행동 · </b>{alert.action}</p><span className="source-label" style={{ marginTop: 10 }}>출처 미제공</span></div></article>)}</section>{status.alerts === 'success' && !alerts.length ? <div className="empty-state"><strong>표시할 안전 정보가 없습니다.</strong><p>“특보 없음”으로 해석하지 않습니다. 새 정보가 제공되면 이곳에 표시됩니다.</p></div> : null}<div className="workflow-cta"><p><b>중요한 결정 전 공식 안내를 함께 확인해 주세요.</b>현재 항목에는 원문 출처와 정확한 갱신 시각이 제공되지 않았습니다.</p><button className="line-btn" type="button" onClick={() => showInfo('현재 준비 중인 기능입니다.', '실시간 재난 알림과 자동 갱신은 현재 준비 중인 기능입니다.')}>실시간 알림 안내</button></div></TripWorkspaceShell>;
}
