import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';

const filters = ['전체', '실내', '실외', '활동형', '휴식형', '유명', '숨은 명소'];

export function AttractionsPage() {
  const [filter, setFilter] = useState('전체');
  const { attractions, loadAttractions, toggleAttraction, status, loadItinerary } = useTripStore();

  useEffect(() => {
    if (!attractions.length) void loadAttractions();
  }, [attractions.length, loadAttractions]);

  const filtered = useMemo(() => attractions.filter((item) => {
    if (filter === '전체') return !item.excluded;
    if (filter === '실내') return item.indoor && !item.excluded;
    if (filter === '실외') return !item.indoor && !item.excluded;
    if (filter === '활동형') return item.active && !item.excluded;
    if (filter === '휴식형') return !item.active && !item.excluded;
    if (filter === '유명') return item.famous && !item.excluded;
    return !item.famous && !item.excluded;
  }), [attractions, filter]);

  if (status.attractions === 'loading') return <LoadingView label="추천 관광지를 구성하는 중입니다" />;
  if (status.attractions === 'error') return <ErrorView label="관광지 추천을 불러오지 못했습니다" />;

  return (
    <div className="space-y-5">
      <SectionTitle title="관광지 추천" description="공동 선호와 날씨 리스크를 반영한 후보입니다." />
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold ${filter === item ? 'bg-brand-700 text-white' : 'bg-white text-slate-700'}`}>{item}</button>)}</div>
      {!filtered.length ? <EmptyView label="조건에 맞는 관광지가 없습니다" /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item, index) => (
          <Card key={item.id} className="reveal-card overflow-hidden p-0" style={{ animationDelay: `${index * 90}ms` }}>
            <img src={item.imageUrl} alt={item.name} className="h-44 w-full object-cover" />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-brand-700">{item.category}</p><h2 className="text-lg font-bold">{item.name}</h2></div><Badge>{item.saved ? '저장됨' : '추천'}</Badge></div>
              <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item.reason}</p>
              <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag} className="bg-slate-100 text-slate-700">{tag}</Badge>)}</div>
              <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => toggleAttraction(item.id, 'excluded')}>제외하기</Button><Button onClick={() => toggleAttraction(item.id, 'saved')}>{item.saved ? '저장 취소' : '저장하기'}</Button></div>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row"><Button variant="secondary" icon={<Map className="h-4 w-4" />}>지도 보기</Button><Link to="/itinerary" onClick={() => void loadItinerary()}><Button className="w-full sm:w-auto">일정 결과 보기</Button></Link></div>
    </div>
  );
}
