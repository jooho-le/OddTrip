import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/tripStore';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';

export function ItineraryDetailPage() {
  const { id } = useParams();
  const { itinerary, loadItinerary } = useTripStore();

  useEffect(() => {
    if (!itinerary.length) void loadItinerary();
  }, [itinerary.length, loadItinerary]);

  const item = itinerary.flatMap((day) => day.items).find((entry) => entry.id === id);
  if (!item) return <Card>일정 상세 정보를 찾을 수 없습니다.</Card>;

  return (
    <div className="space-y-5">
      <SectionTitle title={item.title} description={`${item.location} · ${item.duration}`} />
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2"><Badge>{item.time}</Badge>{item.moveTime ? <Badge className="bg-slate-100 text-slate-700">이동 {item.moveTime}</Badge> : null}</div>
        <p className="text-sm leading-6 text-slate-700">{item.description}</p>
        <div className="rounded-lg bg-brand-50 p-3"><p className="text-sm font-bold text-brand-950">AI 추천 이유</p><p className="mt-1 text-sm leading-6 text-brand-900">{item.aiReason}</p></div>
      </Card>
      <MapPlaceholder label={`${item.location} 지도 영역`} />
      <Card><h2 className="mb-3 font-bold">변경 옵션</h2><div className="grid gap-2 sm:grid-cols-3"><Button variant="secondary">시간 변경</Button><Button variant="secondary">대체 장소</Button><Button variant="secondary">휴식 추가</Button></div></Card>
    </div>
  );
}
