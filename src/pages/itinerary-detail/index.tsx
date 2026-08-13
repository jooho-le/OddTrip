import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { GoogleMap } from '../../features/map/GoogleMap';
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
      <header>
        <p className="eyebrow">Itinerary Detail</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-black leading-snug tracking-[-0.02em] text-ink md:text-3xl">{item.title}</h1>
        <p className="mt-2 text-sm font-bold text-muted">{item.location} · {item.duration}</p>
      </header>
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2"><Badge>{item.time}</Badge>{item.moveTime ? <Badge className="bg-ink text-white">이동 {item.moveTime}</Badge> : null}</div>
        <p className="text-sm font-bold leading-6 text-ink">{item.description}</p>
        <div className="rounded-[26px] bg-canvas p-5"><p className="text-sm font-black text-ink">AI 추천 이유</p><p className="mt-2 text-sm font-bold leading-6 text-ink">{item.aiReason}</p></div>
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
      <Card><Clock className="h-6 w-6 text-accent" /><h2 className="mt-5 mb-4 text-2xl font-black text-ink">변경 옵션</h2><div className="grid gap-2 sm:grid-cols-3"><Link to="/decision"><Button variant="secondary" className="w-full">조건 수정</Button></Link><Link to="/attractions"><Button variant="secondary" className="w-full">대체 장소</Button></Link><Link to="/safety"><Button variant="secondary" className="w-full">날씨 확인</Button></Link></div></Card>
    </div>
  );
}
