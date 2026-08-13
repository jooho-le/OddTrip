import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Bookmark, Clock, MapPin, Phone, ShieldAlert, Users } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { MapView } from '../../widgets/MapView';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { LoadingView } from '../../shared/ui/StateView';
import { displayPlaceIntro } from './AttractionListPage';

export function AttractionDetailPage() {
  const { id } = useParams();
  const { attractions, status, activeTripId, loadAttractions, toggleAttraction } = useTripStore();

  useEffect(() => {
    if (!attractions.length && activeTripId) void loadAttractions();
  }, [attractions.length, activeTripId, loadAttractions]);

  if (!attractions.length && status.attractions === 'loading') {
    return <LoadingView label="관광지 정보를 불러오는 중입니다" />;
  }

  const item = attractions.find((entry) => entry.id === id);
  if (!item) {
    if (!activeTripId) return <Navigate to="/attractions" replace />;
    return <Card>관광지 정보를 찾을 수 없습니다.</Card>;
  }

  const hasCoordinates = item.mapY != null && item.mapX != null;
  const openingEntries = item.openingHours ? Object.entries(item.openingHours) : [];

  return (
    <div className="page-canvas space-y-5">
      <header className="grid gap-4 md:grid-cols-[1fr_260px] md:items-start">
        <div>
          <p className="eyebrow">{item.category}</p>
          <h1 className="mt-2 text-2xl font-black leading-snug tracking-[-0.02em] text-ink md:text-3xl">{item.name}</h1>
          {item.addr1 ? <p className="mt-3 flex items-center gap-2 text-sm font-bold text-muted"><MapPin className="h-4 w-4" />{item.addr1} {item.addr2 ?? ''}</p> : null}
        </div>
        <img
          src={item.imageUrl ?? 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=700&q=86'}
          alt=""
          className="h-40 w-full rounded-2xl object-cover md:h-32"
        />
      </header>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {item.saved ? <Badge className="bg-accent text-white">저장됨</Badge> : null}
          {item.indoor ? <Badge>실내</Badge> : <Badge>실외</Badge>}
          {item.famous ? <Badge>유명</Badge> : <Badge>숨은 명소</Badge>}
        </div>
        <p className="text-sm font-semibold leading-6 text-ink">{displayPlaceIntro(item)}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-ink"><Clock className="h-5 w-5 text-accent" />운영 정보</h2>
          {openingEntries.length ? (
            <ul className="space-y-1 text-sm font-semibold text-ink">
              {openingEntries.map(([day, hours]) => (
                <li key={day} className="flex justify-between border-b border-line py-1 last:border-0"><span className="text-muted">{day}</span><span>{String(hours)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-semibold text-muted">운영시간 정보가 없습니다.</p>
          )}
          <p className="text-sm font-semibold text-ink"><span className="text-muted">휴무일 · </span>{item.closedDays?.length ? item.closedDays.join(', ') : '정보 없음'}</p>
          {item.tel ? <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Phone className="h-4 w-4 text-muted" />{item.tel}</p> : null}
          {item.homepage ? <a href={item.homepage} target="_blank" rel="noreferrer" className="block text-sm font-bold text-accent underline">홈페이지 방문</a> : null}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-black text-ink">추천 근거 · 지표</h2>
          <p className="text-sm font-semibold leading-6 text-ink">{item.reason ?? '두 사람의 여행 성향 균형점을 기준으로 추천된 장소입니다.'}</p>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="혼잡" value={item.congestionScore} suffix="점" />
            <MiniStat label="숨은명소" value={item.hiddenScore} suffix="점" />
            <MiniStat label="연관순위" value={item.relatedRank} suffix="위" />
          </div>
          <div className="flex items-start gap-2 rounded-2xl border border-dashed border-line bg-canvas p-3 text-xs font-bold text-muted">
            <Users className="mt-0.5 h-4 w-4 shrink-0" />
            두 사람 각각의 반영 점수는 백엔드에 사용자별 스코어가 추가되면 여기 표시됩니다.
          </div>
        </Card>
      </div>

      {hasCoordinates ? (
        <MapView title="위치" points={[{ id: item.id, name: item.name, lat: item.mapY, lng: item.mapX, address: item.addr1 }]} />
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-xl font-black text-ink">이 장소로 할 수 있는 일</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant={item.saved ? 'secondary' : 'primary'} icon={<Bookmark className="h-4 w-4" />} onClick={() => toggleAttraction(item.id, 'saved')}>
            {item.saved ? '저장 취소' : '저장하기'}
          </Button>
          <Button variant="secondary" onClick={() => toggleAttraction(item.id, 'excluded')}>제외하기</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="ghost" disabled className="cursor-not-allowed opacity-50" title="채팅 연동 준비 중">채팅으로 공유 (준비 중)</Button>
          <Button variant="ghost" disabled className="cursor-not-allowed opacity-50" title="투표 기능 준비 중">일정 포함 투표 (준비 중)</Button>
        </div>
        <div className="flex items-start gap-2 rounded-2xl bg-accent-soft p-3 text-xs font-bold text-accent">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          채팅 공유·투표는 백엔드에 관련 API가 추가되면 연결됩니다. 지금은 저장/제외만 실제로 동작해요.
        </div>
      </Card>

      <Link to="/attractions"><Button variant="secondary">목록으로 돌아가기</Button></Link>
    </div>
  );
}

function MiniStat({ label, value, suffix }: { label: string; value?: number | null; suffix: string }) {
  return (
    <div className="rounded-2xl bg-canvas p-3 text-center">
      <p className="text-[11px] font-black text-muted">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value == null ? '-' : `${value}${suffix}`}</p>
    </div>
  );
}
