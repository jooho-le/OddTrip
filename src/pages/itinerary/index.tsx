import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloudSun, Route, Share2, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';
import type { ItineraryItemType } from '../../types';

const typeLabel: Record<ItineraryItemType, string> = { place: '장소', move: '이동', meal: '식사', rest: '휴식' };

export function ItineraryPage() {
  const { itinerary, loadItinerary, status } = useTripStore();

  useEffect(() => {
    if (!itinerary.length) void loadItinerary();
  }, [itinerary.length, loadItinerary]);

  if (status.itinerary === 'loading') return <LoadingView label="AI가 일정을 생성하는 중입니다" />;
  if (status.itinerary === 'error') return <ErrorView label="일정 생성 결과를 불러오지 못했습니다" />;

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-[#101114] p-7 text-white shadow-[0_26px_90px_rgba(16,17,20,0.18)] md:p-10">
        <img src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=86" alt="" className="absolute inset-0 h-full w-full object-cover opacity-34" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(253,38,122,0.52),transparent_28%),linear-gradient(90deg,rgba(16,17,20,0.96),rgba(16,17,20,0.50))]" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_300px] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/74">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              AI Itinerary
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
              3일 여행을
              <br />
              바로 실행 가능하게.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-white/72">장소, 이동, 식사, 휴식을 시간대별로 분리해서 보여줍니다.</p>
          </div>
          <div className="motion-card rounded-[34px] bg-white p-6 text-[#111111]">
            <Route className="h-7 w-7 text-[#fd267a]" />
            <p className="mt-12 text-5xl font-black tracking-[-0.05em]">{itinerary.length || 3} days</p>
            <p className="mt-2 text-sm font-bold text-slate-500">weather + route + safety</p>
          </div>
        </div>
      </section>
      {!itinerary.length ? <EmptyView label="생성된 일정이 없습니다" /> : null}
      <Card className="border-0 bg-[#f5d04c] text-[#111111]"><div className="flex gap-3"><CloudSun className="h-6 w-6 shrink-0" /><p className="text-sm font-black leading-6">오후 비 가능성으로 1일차 후반부에 실내 대체 코스를 포함했습니다.</p></div></Card>
      <div className="space-y-5">
        {itinerary.map((day) => (
          <section key={day.day} className="rounded-[38px] bg-white p-5 shadow-[0_20px_60px_rgba(16,17,20,0.08)] md:p-7">
            <div className="mb-5"><h2 className="text-3xl font-black tracking-[-0.035em]">{day.day}일차 · {day.title}</h2><p className="mt-2 text-sm font-bold text-slate-600">{day.weather} · {day.caution}</p></div>
            <div className="space-y-3 border-l-4 border-[#fd267a]/18 pl-5">
              {day.items.map((item, index) => (
                <Link to={`/itinerary/${item.id}`} key={item.id} className="block">
                  <Card className="reveal-card relative hover:border-[#fd267a]/40" style={{ animationDelay: `${index * 70}ms` }}>
                    <span className="absolute -left-[31px] top-6 h-5 w-5 rounded-full border-4 border-white bg-[#fd267a]" />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-black text-[#fd267a]">{item.time}</p><h3 className="text-xl font-black">{item.title}</h3><p className="text-sm font-bold text-slate-500">{item.location} · {item.duration}</p></div>
                      <Badge className="bg-[#101114] text-white">{typeLabel[item.type]}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{item.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary">다시 조정하기</Button><Button icon={<Share2 className="h-4 w-4" />}>공유하기</Button></div>
    </div>
  );
}
