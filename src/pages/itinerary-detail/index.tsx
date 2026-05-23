import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { GoogleMap } from '../../components/GoogleMap';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

export function ItineraryDetailPage() {
  const { id } = useParams();
  const { itinerary, attractions, loadAttractions, loadItinerary } = useTripStore();

  useEffect(() => {
    if (!itinerary.length) void loadItinerary();
  }, [itinerary.length, loadItinerary]);

  useEffect(() => {
    if (!attractions.length) void loadAttractions();
  }, [attractions.length, loadAttractions]);

  const item = itinerary.flatMap((day) => day.items).find((entry) => entry.id === id);
  if (!item) return <Card>일정 상세 정보를 찾을 수 없습니다.</Card>;

  const matchedAttraction = attractions.find((attraction) => (
    attraction.name === item.location ||
    attraction.name === item.title ||
    item.title.includes(attraction.name) ||
    item.location.includes(attraction.name)
  ));

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] gradient-panel-alt p-7 text-white shadow-[0_26px_90px_rgba(253,38,122,0.22)] md:p-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/72">
          <Sparkles className="h-4 w-4 text-[#f5d04c]" />
          Itinerary Detail
        </p>
        <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">{item.title}</h1>
        <p className="mt-5 text-sm font-bold text-white/72">{item.location} · {item.duration}</p>
      </section>
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2"><Badge className="gradient-panel text-white">{item.time}</Badge>{item.moveTime ? <Badge className="bg-[#101114] text-white">이동 {item.moveTime}</Badge> : null}</div>
        <p className="text-sm font-bold leading-6 text-slate-700">{item.description}</p>
        <div className="rounded-[26px] bg-[#fbf5ee] p-5"><p className="text-sm font-black text-[#111111]">AI 추천 이유</p><p className="mt-2 text-sm font-bold leading-6 text-slate-700">{item.aiReason}</p></div>
      </Card>
      <GoogleMap
        label={`${item.location} 지도 영역`}
        keyword={item.location || item.title}
        points={matchedAttraction ? [{
          id: matchedAttraction.id,
          name: matchedAttraction.name,
          lat: matchedAttraction.mapY,
          lng: matchedAttraction.mapX,
          address: matchedAttraction.addr1,
        }] : []}
      />
      <Card><Clock className="h-6 w-6 text-[#fd267a]" /><h2 className="mt-5 mb-4 text-2xl font-black">변경 옵션</h2><div className="grid gap-2 sm:grid-cols-3"><Button variant="secondary">시간 변경</Button><Button variant="secondary">대체 장소</Button><Button variant="secondary">휴식 추가</Button></div></Card>
    </div>
  );
}
