import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloudSun, Grid3X3, Route, Share2, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';
import type { ItineraryItemType } from '../../types';

const typeLabel: Record<ItineraryItemType, string> = { place: '장소', move: '이동', meal: '식사', rest: '휴식' };

export function ItineraryPage() {
  const { itinerary, loadItinerary, regenerateItinerary, status } = useTripStore();

  useEffect(() => {
    if (!itinerary.length) void loadItinerary();
  }, [itinerary.length, loadItinerary]);

  if (status.itinerary === 'loading') return <LoadingView label="AI가 일정을 생성하는 중입니다" />;
  if (status.itinerary === 'error') return <ErrorView label="일정 생성 결과를 불러오지 못했습니다" />;

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <div className="relative grid gap-8 md:grid-cols-[1fr_300px] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
              <Sparkles className="h-4 w-4 text-accent" />
              AI Itinerary
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
              3일간의 낯선 동행 여행을
              <br />
              OddTrip의 추천으로.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-white/68">장소, 이동, 식사, 휴식을 시간대별로 분리해서 보여줍니다.</p>
          </div>
          <div className="motion-card rounded-[34px] bg-white p-6 text-ink">
            <Route className="h-7 w-7 text-accent" />
            <p className="mt-12 text-5xl font-black tracking-[-0.05em]">{itinerary.length || 3} days</p>
            <p className="mt-2 text-sm font-bold text-muted">weather + route + safety</p>
          </div>
        </div>
      </section>
      {!itinerary.length ? (
        <Card className="border-accent/15 bg-accent-soft">
          <EmptyView label="생성된 일정이 없습니다" />
          <Link to="/attractions"><Button icon={<Grid3X3 className="h-4 w-4" />} className="mt-4">관광지 저장하러 가기</Button></Link>
        </Card>
      ) : null}
      <Card className="flex gap-3 border-0 bg-accent-soft text-ink"><CloudSun className="h-6 w-6 shrink-0 text-accent" /><p className="text-sm font-black leading-6">각 카드를 누르면 상세 지도와 변경 옵션을 확인할 수 있습니다.</p></Card>
      <div className="space-y-5">
        {itinerary.map((day) => (
          <section key={day.day} className="rounded-[38px] border border-line bg-white p-5 shadow-card md:p-7">
            <div className="mb-5"><h2 className="text-3xl font-black tracking-[-0.035em] text-ink">{day.day}일차 · {day.title}</h2><p className="mt-2 text-sm font-bold text-muted">{day.weather} · {day.caution}</p></div>
            <div className="space-y-3 border-l-4 border-accent/20 pl-5">
              {day.items.map((item, index) => (
                <Link to={`/itinerary/${item.id}`} key={item.id} className="block">
                  <Card className="reveal-card relative p-4 hover:border-accent/50" style={{ animationDelay: `${index * 70}ms` }}>
                    <span className="absolute -left-[31px] top-6 h-5 w-5 rounded-full border-4 border-white bg-accent" />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-black text-accent">{item.time}</p><h3 className="text-xl font-black text-ink">{item.title}</h3><p className="text-sm font-bold text-muted">{item.location} · {item.duration}</p></div>
                      <Badge>{typeLabel[item.type]}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-muted">{item.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => void regenerateItinerary()}>다시 조정하기</Button><Button icon={<Share2 className="h-4 w-4" />}>공유하기</Button></div>
    </div>
  );
}
