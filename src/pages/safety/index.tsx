import { useEffect } from 'react';
import { AlertTriangle, Info, Siren } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';

const styles = {
  info: { icon: Info, className: 'border-sky-200 bg-sky-50 text-sky-800' },
  warning: { icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 text-amber-900' },
  danger: { icon: Siren, className: 'border-red-200 bg-red-50 text-red-800' }
};

export function SafetyPage() {
  const { alerts, loadAlerts, status } = useTripStore();
  useEffect(() => {
    if (!alerts.length) void loadAlerts();
  }, [alerts.length, loadAlerts]);

  if (status.alerts === 'loading') return <LoadingView label="날씨와 안전 알림을 확인하는 중입니다" />;
  if (status.alerts === 'error') return <ErrorView label="안전 알림을 불러오지 못했습니다" />;

  return (
    <div className="space-y-5">
      <SectionTitle title="알림 / 안전" description="날씨 변화, 재난 알림, 일정 조정 필요 여부를 한 화면에서 확인합니다." />
      {!alerts.length ? <EmptyView label="현재 알림이 없습니다" /> : null}
      <div className="grid gap-4">
        {alerts.map((alert) => {
          const style = styles[alert.level];
          const Icon = style.icon;
          return <Card key={alert.id} className={style.className}><div className="flex gap-3"><Icon className="h-6 w-6 shrink-0" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{alert.title}</h2><span className="text-xs opacity-70">{alert.time}</span></div><p className="mt-1 text-sm leading-6">{alert.message}</p><p className="mt-3 rounded-lg bg-white/70 p-3 text-sm font-semibold">{alert.action}</p></div></div></Card>;
        })}
      </div>
      <Button variant="secondary">일정 자동 조정 검토</Button>
    </div>
  );
}
