import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Compass, Map, RefreshCw, Save } from 'lucide-react';
import { CardNewsRail } from '../../shared/ui/CardNewsRail';
import { GoogleMap } from '../../features/map/GoogleMap';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView, LoadingView } from '../../shared/ui/StateView';

const filters = ['전체', '실내', '실외', '활동형', '휴식형', '유명', '숨은 명소'];

export function AttractionListPage() {
  const [filter, setFilter] = useState('전체');
  const [showMap, setShowMap] = useState(false);
  const {
    activeTripId,
    agentRun,
    attractions,
    loadAttractions,
    loadItinerary,
    loadMatches,
    matches,
    result,
    runTravelAgent,
    selectedMatch,
    status,
    toggleAttraction,
    user,
  } = useTripStore();

  const hasTti = Boolean(result?.code ?? user?.ttiCode);
  const hasTripSource = Boolean(activeTripId || selectedMatch || matches.length);

  useEffect(() => {
    if (!hasTti) return;
    if (!hasTripSource && status.matches !== 'loading') {
      void loadMatches();
      return;
    }
    if (!attractions.length && hasTripSource) void loadAttractions();
  }, [attractions.length, hasTripSource, hasTti, loadAttractions, loadMatches, status.matches]);

  const filtered = useMemo(() => attractions.filter((item) => {
    if (item.excluded) return false;
    if (filter === '전체') return true;
    if (filter === '실내') return item.indoor;
    if (filter === '실외') return !item.indoor;
    if (filter === '활동형') return item.active;
    if (filter === '휴식형') return !item.active;
    if (filter === '유명') return item.famous;
    return !item.famous || (item.hiddenScore ?? 0) >= 60;
  }), [attractions, filter]);

  const filterCounts = useMemo(() => Object.fromEntries(filters.map((item) => [
    item,
    attractions.filter((attraction) => {
      if (attraction.excluded) return false;
      if (item === '전체') return true;
      if (item === '실내') return attraction.indoor;
      if (item === '실외') return !attraction.indoor;
      if (item === '활동형') return attraction.active;
      if (item === '휴식형') return !attraction.active;
      if (item === '유명') return attraction.famous;
      return !attraction.famous || (attraction.hiddenScore ?? 0) >= 60;
    }).length,
  ])), [attractions]);

  if (!hasTti) {
    return <PrerequisiteCard title="TTI 진단이 먼저 필요합니다" description="관광지 추천은 내 여행 성향과 반대 성향 매칭을 기준으로 생성됩니다." primaryTo="/tti/start" primaryLabel="TTI 진단하기" />;
  }

  if (!hasTripSource && status.matches === 'loading') return <LoadingView label="반대 성향 후보를 확인하는 중입니다" />;
  if (!hasTripSource && status.matches === 'success') {
    return <PrerequisiteCard title="매칭 상대를 먼저 선택해주세요" description="두 사람의 균형점을 계산하려면 공동 일정을 만들 매칭 상대가 필요합니다." primaryTo="/matches" primaryLabel="매칭 보러가기" />;
  }

  if (status.attractions === 'loading') return <LoadingView label="추천 관광지를 구성하는 중입니다" />;
  if (status.attractions === 'error') {
    return <PrerequisiteCard title="관광지 추천을 불러오지 못했습니다" description="매칭 상세에서 공동 일정을 먼저 만들어주세요." primaryTo="/matches" primaryLabel="매칭으로 이동" />;
  }

  return (
    <div className="page-canvas space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
          <p className="relative text-xs font-black uppercase tracking-[0.22em] text-accent">추천 장소 고르기</p>
          <h1 className="relative mt-6 max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
            둘 다 낯설지만
            <br />
            둘 다 원할 수 있는 장소
          </h1>
          <p className="relative mt-5 max-w-xl text-sm font-bold leading-6 text-white/68">
            두 사람의 균형점에 가까운 장소를 추천합니다.
          </p>
          <div className="mt-7 flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                disabled={!filterCounts[item]}
                className={`relative inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 ${filter === item ? 'bg-white text-accent' : 'bg-white/12 text-white/70'}`}
                aria-pressed={filter === item}
              >
                {item}
                <span className={`ml-2 ${filter === item ? 'text-accent/70' : 'text-white/50'}`}>{filterCounts[item]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[38px] bg-accent p-6 text-white shadow-[0_26px_90px_rgba(255,90,54,0.20)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">추천 과정</p>
              <h2 className="mt-2 text-2xl font-black">조건 다시 확인</h2>
            </div>
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void runTravelAgent()} disabled={status.agent === 'loading'} className="bg-white text-accent hover:bg-white/90">
              {status.agent === 'loading' ? '확인 중' : '다시 보기'}
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {(agentRun?.steps ?? ['후보 찾기', '상황 확인', '취향 맞춤', '일정 준비']).map((step, index) => (
              <div key={typeof step === 'string' ? step : step.tool} className={`motion-card min-h-20 rounded-xl p-3 ${agentRun ? 'bg-white/22' : 'bg-white/12'}`} style={{ animationDelay: `${index * 90}ms` }}>
                <p className="text-xs font-black">{index + 1}</p>
                <p className="mt-4 text-[11px] font-bold leading-4 text-white/85">{typeof step === 'string' ? step : toolLabel(step.tool)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-white/70">
            {agentRun ? '현재 조건에 맞춰 추천 순서를 다시 정리했습니다.' : '다시 보기를 누르면 현재 취향과 일정 조건을 기준으로 추천 순서를 다시 정리합니다.'}
          </p>
        </div>
      </section>

      <CardNewsRail
        items={[
          { kicker: '추천 기준', title: '가볼 만한 후보 모으기', description: '관광지, 축제, 숙소, 음식점을 함께 보고 후보를 넓힙니다.', tone: 'bg-[#2388ff] text-white' },
          { kicker: '방문 타이밍', title: '붐비는 곳은 피하기', description: '혼잡 흐름과 주변 코스를 함께 보며 부담을 줄입니다.', tone: 'bg-[#21b8a5] text-white' },
          { kicker: '둘의 취향', title: '한쪽 취향만 따르지 않기', description: '두 사람 모두 받아들일 수 있는 장소를 위로 올립니다.', tone: 'bg-[#ffd45a] text-black' }
        ]}
      />

      <Card className="border-accent/15 bg-accent-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">동행의 장소 고르기</h2>
            <p className="mt-1 text-sm font-bold text-muted">가고 싶은 곳은 저장하고, 부담스러운 곳은 제외한 뒤 일정을 확인하세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-ink"><Save className="h-4 w-4 text-accent" /></span>
            <Link to="/proposal"><Button variant="secondary">AI 조율안 보기</Button></Link>
            <Link to="/itinerary" onClick={() => void loadItinerary()}><Button icon={<CalendarDays className="h-4 w-4" />}>일정 보기</Button></Link>
          </div>
        </div>
      </Card>

      {showMap ? (
        <GoogleMap
          label="추천 관광지 지도"
          points={filtered.map((item) => ({ id: item.id, name: item.name, lat: item.mapY, lng: item.mapX, address: item.addr1 }))}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-muted">{filter} 기준 {filtered.length}곳</p>
        {filter !== '전체' ? (
          <Button type="button" variant="secondary" onClick={() => setFilter('전체')} className="min-h-10 px-4 text-accent shadow-card">
            전체 보기
          </Button>
        ) : null}
      </div>

      {!filtered.length ? <EmptyView label={`${filter} 조건에 맞는 관광지가 없습니다`} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item, index) => (
          <Card key={item.id} className="motion-card hover-lift overflow-hidden p-0" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="grid min-h-[220px] md:grid-cols-[180px_1fr]">
              <Link to={`/attractions/${item.id}`} className="relative block bg-canvas">
                <img src={item.imageUrl ?? 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=700&q=80'} alt={item.name} className="h-full min-h-44 w-full object-cover" />
                <Badge className="absolute left-4 top-4 bg-accent text-white">{item.saved ? '저장됨' : '추천'}</Badge>
              </Link>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">{item.category}</p>
                <Link to={`/attractions/${item.id}`} className="mt-2 block text-2xl font-black leading-7 text-ink hover:text-accent">{item.name}</Link>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted">{item.addr1 ?? item.category}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Metric label="혼잡" value={item.congestionScore ?? null} suffix="점" />
                  <Metric label="숨은명소" value={item.hiddenScore ?? null} suffix="점" />
                  <Metric label="연관" value={item.relatedRank ?? null} suffix="위" emptyText="정보 없음" />
                </div>
                <div className="mt-4 rounded-2xl bg-canvas p-3">
                  <p className="text-xs font-black text-muted">장소 소개</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink">{displayPlaceIntro(item)}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => toggleAttraction(item.id, 'excluded')}>제외하기</Button>
                  <Button onClick={() => toggleAttraction(item.id, 'saved')}>{item.saved ? '저장 취소' : '저장하기'}</Button>
                </div>
                <Link to={`/attractions/${item.id}`} className="mt-2 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-black text-accent hover:underline">
                  상세 보기 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" icon={<Map className="h-4 w-4" />} onClick={() => setShowMap((value) => !value)}>{showMap ? '지도 닫기' : '지도 보기'}</Button>
        <Link to="/itinerary" onClick={() => void loadItinerary()}><Button className="w-full sm:w-auto">일정 결과 보기</Button></Link>
      </div>
    </div>
  );
}

function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    search_tourapi_candidates: '후보 찾기',
    collect_public_context: '상황 확인',
    rank_balanced_attractions: '취향 맞춤',
    prepare_itinerary_generation: '일정 준비'
  };
  return labels[tool] ?? tool;
}

export function displayPlaceIntro(item: {
  name: string;
  category: string;
  description?: string | null;
  addr1?: string | null;
  reason?: string | null;
}) {
  const reason = item.reason?.trim();
  const oldGeneratedReason = reason?.includes('공공데이터 후보') || reason?.includes('장소 성향') || reason?.includes('여행 성향(') || reason?.includes('두 사람이 함께');
  if (reason && !oldGeneratedReason) return reason;

  const description = item.description?.trim();
  if (description && description !== item.addr1 && !description.includes('한국관광공사 TourAPI 기반')) return description;

  return `${item.name}은 ${inferPlaceDetail(item.name, item.category)}입니다.`;
}

function inferPlaceDetail(name: string, category: string) {
  const lower = name.toLowerCase();
  if (name.includes('카페') || lower.includes('coffee')) return '커피와 디저트를 즐기며 쉬어가기 좋은 카페';
  if (name.includes('시장') || name.includes('마켓')) return '먹거리와 작은 상점들을 함께 둘러볼 수 있는 시장';
  if (name.includes('미술관') || name.includes('박물관') || name.includes('전시')) return '전시와 작품을 관람하며 실내에서 시간을 보내기 좋은 문화 공간';
  if (name.includes('한옥') || name.includes('골목') || name.includes('마을')) return '동네 골목과 건물 분위기를 천천히 걸으며 즐기는 산책형 장소';
  if (name.includes('축제') || name.includes('페스티벌')) return '공연, 조명, 체험 같은 볼거리가 모이는 행사 장소';
  if (name.includes('산책') || name.includes('공원') || name.includes('천') || name.includes('해변') || name.includes('바다')) return '가볍게 걷거나 사진을 남기기 좋은 야외 코스';
  if (category.includes('음식')) return '지역 음식과 휴식을 일정에 넣기 좋은 음식점 후보';
  if (category.includes('숙박')) return '이동 동선을 짧게 가져가기 위한 숙박 후보';
  return `${category}로 분류된 장소로, 일정 중간에 둘러보기 좋은 후보`;
}

function PrerequisiteCard({ title, description, primaryTo, primaryLabel }: { title: string; description: string; primaryTo: string; primaryLabel: string }) {
  return (
    <Card className="space-y-4 rounded-[24px]">
      <Compass className="h-6 w-6 text-accent" />
      <div>
        <h1 className="text-2xl font-black text-ink">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted">{description}</p>
      </div>
      <Link to={primaryTo}>
        <Button>{primaryLabel}</Button>
      </Link>
    </Card>
  );
}

function Metric({ label, value, suffix, emptyText = '-' }: { label: string; value: number | null; suffix: string; emptyText?: string }) {
  return (
    <div className="rounded-2xl bg-canvas p-3">
      <p className="text-[11px] font-black text-muted">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value === null ? emptyText : `${value}${suffix}`}</p>
    </div>
  );
}
