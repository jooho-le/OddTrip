import { useEffect } from 'react';
import { AlertTriangle, CalendarDays, Info, ShieldCheck, Siren, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
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

  if (status.alerts === 'loading') return <LoadingView label="날씨와 일정 주의사항을 확인하는 중입니다" />;
  if (status.alerts === 'error') return <ErrorView label="날씨와 일정 주의사항을 불러오지 못했습니다" />;

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-[#101114] p-7 text-white shadow-[0_26px_90px_rgba(16,17,20,0.18)] md:p-10">
        <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=86" alt="" className="absolute inset-0 h-full w-full object-cover opacity-28" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(245,208,76,0.48),transparent_28%),linear-gradient(90deg,rgba(16,17,20,0.96),rgba(16,17,20,0.48))]" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/72">
            <Sparkles className="h-4 w-4 text-[#f5d04c]" />
            날씨와 일정 주의
          </p>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
            동행의 여행을
            <br />
            안전하게.
          </h1>
          <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-white/72">비, 강풍, 재난 알림처럼 일정에 영향을 줄 수 있는 상황을 한 화면에서 확인합니다.</p>
        </div>
      </section>
      {!alerts.length ? <EmptyView label="현재 알림이 없습니다" /> : null}
      <Card className="border-[#087466]/15 bg-[#eefaf6]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">일정 조정이 필요할 때</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">비나 강풍 예보가 있으면 야외 장소를 줄이고 실내 대체 장소를 확인하세요.</p>
          </div>
          <Link to="/itinerary"><Button icon={<CalendarDays className="h-4 w-4" />}>일정으로 돌아가기</Button></Link>
        </div>
      </Card>
      <div className="grid gap-4">
        {alerts.map((alert) => {
          const style = styles[alert.level];
          const Icon = style.icon;
          return <Card key={alert.id} className={`${style.className} border-0`}><div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80"><Icon className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{alert.title}</h2><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black opacity-80">{alert.time}</span></div><p className="mt-2 text-sm font-bold leading-6">{alert.message}</p><p className="mt-4 rounded-[22px] bg-white/76 p-4 text-sm font-black">{alert.action}</p></div></div></Card>;
        })}
      </div>
      <Link to="/itinerary"><Button icon={<ShieldCheck className="h-4 w-4" />} variant="secondary">일정 조정 확인</Button></Link>
    </div>
  );
}
