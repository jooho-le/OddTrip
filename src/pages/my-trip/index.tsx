import { Link } from 'react-router-dom';
import { Bookmark, CalendarDays, HeartHandshake, Settings, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

export function MyTripPage() {
  const { user, result, attractions, itinerary, matches } = useTripStore();
  const saved = attractions.filter((item) => item.saved);

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] gradient-panel-alt p-7 text-white shadow-[0_26px_90px_rgba(253,38,122,0.22)] md:p-10">
        <div className="absolute -right-16 -top-16 h-80 w-80 rounded-full bg-white/14 drift-a" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_320px] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/72">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              My oddtrip
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
              내 여행
              <br />
              아카이브.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-white/72">유형, 저장한 여행지, 생성된 일정, 최근 매칭 기록을 모아봅니다.</p>
          </div>
          <Card className="motion-card flex items-center gap-4 bg-white text-[#111111]">
            <img src={user?.avatarUrl ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=86'} alt="" className="h-20 w-20 rounded-[28px] object-cover" />
            <div><h2 className="text-2xl font-black">{user?.nickname ?? '여행자'}</h2><p className="text-sm font-bold text-slate-500">{user?.homeRegion ?? 'Seoul'} · {result?.code ?? user?.ttiCode ?? 'TTI 미완료'}</p></div>
          </Card>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Bookmark className="h-6 w-6" />} label="저장한 여행지" value={saved.length} />
        <StatCard icon={<CalendarDays className="h-6 w-6" />} label="생성 일정" value={itinerary.length} dark />
        <StatCard icon={<HeartHandshake className="h-6 w-6" />} label="최근 매칭" value={matches.length} pink />
      </div>
      <Card><h2 className="mb-4 text-2xl font-black">저장한 여행지</h2>{saved.length ? <div className="flex flex-wrap gap-2">{saved.map((item) => <Badge key={item.id} className="bg-[#fff0f3] text-[#fd267a]">{item.name}</Badge>)}</div> : <p className="text-sm font-bold text-slate-500">아직 저장한 여행지가 없습니다.</p>}</Card>
      <Card><Settings className="h-6 w-6 text-[#fd267a]" /><h2 className="mt-5 mb-4 text-2xl font-black">설정</h2><div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary">알림 설정</Button><Button variant="secondary">동행 선호 수정</Button></div></Card>
      <Link to="/tti/start"><Button variant="secondary">TTI 다시 진단하기</Button></Link>
    </div>
  );
}

function StatCard({ icon, label, value, dark = false, pink = false }: { icon: ReactNode; label: string; value: number; dark?: boolean; pink?: boolean }) {
  return (
    <Card className={`${dark ? 'bg-[#101114] text-white' : pink ? 'gradient-panel text-white' : 'bg-white text-[#111111]'}`}>
      {icon}
      <p className="mt-14 text-sm font-black opacity-62">{label}</p>
      <p className="mt-2 text-5xl font-black tracking-[-0.05em]">{value}</p>
    </Card>
  );
}
