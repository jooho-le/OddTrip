import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloudSun, Share2 } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
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
    <div className="space-y-5">
      <SectionTitle title="3일 일정 생성 결과" description="장소, 이동, 식사, 휴식이 시간대별로 구분된 시연용 일정입니다." />
      {!itinerary.length ? <EmptyView label="생성된 일정이 없습니다" /> : null}
      <Card className="border-amber-200 bg-amber-50"><div className="flex gap-3"><CloudSun className="h-5 w-5 shrink-0 text-amber-700" /><p className="text-sm font-semibold text-amber-900">오후 비 가능성으로 1일차 후반부에 실내 대체 코스를 포함했습니다.</p></div></Card>
      <div className="space-y-5">
        {itinerary.map((day) => (
          <section key={day.day} className="space-y-3">
            <div><h2 className="text-xl font-black">{day.day}일차 · {day.title}</h2><p className="mt-1 text-sm text-slate-600">{day.weather} · {day.caution}</p></div>
            <div className="space-y-3 border-l-2 border-brand-100 pl-4">
              {day.items.map((item, index) => (
                <Link to={`/itinerary/${item.id}`} key={item.id} className="block">
                  <Card className="reveal-card relative hover:border-brand-400" style={{ animationDelay: `${index * 70}ms` }}>
                    <span className="absolute -left-[25px] top-5 h-4 w-4 rounded-full border-4 border-white bg-brand-700" />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-black text-brand-800">{item.time}</p><h3 className="text-lg font-bold">{item.title}</h3><p className="text-sm text-slate-500">{item.location} · {item.duration}</p></div>
                      <Badge>{typeLabel[item.type]}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
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
