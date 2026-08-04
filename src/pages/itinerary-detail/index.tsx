import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { GoogleMap } from '../../components/GoogleMap';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

export function ItineraryDetailPage() {
  const { id } = useParams();
  const { itinerary, loadItinerary } = useTripStore();

  useEffect(() => {
    if (!itinerary.length) void loadItinerary();
  }, [itinerary.length, loadItinerary]);

  const item = itinerary.flatMap((day) => day.items).find((entry) => entry.id === id);
  if (!item) return <Card>일정 상세 정보를 찾을 수 없습니다.</Card>;

  // The slot carries its own coordinates, so there is nothing to look up and
  // no window where the map renders before the data it needs has arrived.
  const hasCoordinates = item.latitude != null && item.longitude != null;

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
      {hasCoordinates ? (
        <GoogleMap
          label={`${item.title} 지도 영역`}
          points={[{
            id: item.id,
            name: item.title,
            lat: item.latitude,
            lng: item.longitude,
            address: item.address,
          }]}
        />
      ) : null}
      <Card><Clock className="h-6 w-6 text-[#fd267a]" /><h2 className="mt-5 mb-4 text-2xl font-black">변경 옵션</h2><div className="grid gap-2 sm:grid-cols-3"><Link to="/decision"><Button variant="secondary" className="w-full">조건 수정</Button></Link><Link to="/attractions"><Button variant="secondary" className="w-full">대체 장소</Button></Link><Link to="/safety"><Button variant="secondary" className="w-full">날씨 확인</Button></Link></div></Card>
    </div>
  );
}
