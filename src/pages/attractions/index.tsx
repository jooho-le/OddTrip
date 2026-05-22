import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Map, Sparkles } from 'lucide-react';
import { GoogleMap } from '../../components/GoogleMap';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView, LoadingView } from '../../shared/ui/StateView';

const filters = ['전체', '실내', '실외', '활동형', '휴식형', '유명', '숨은 명소'];

export function AttractionsPage() {
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
    if (filter === '전체') return !item.excluded;
    if (filter === '실내') return item.indoor && !item.excluded;
    if (filter === '실외') return !item.indoor && !item.excluded;
    if (filter === '활동형') return item.active && !item.excluded;
    if (filter === '휴식형') return !item.active && !item.excluded;
    if (filter === '유명') return item.famous && !item.excluded;
    return !item.famous && !item.excluded;
  }), [attractions, filter]);

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
    <div className="-mx-4 -mt-4 space-y-5 bg-[#f4f0e6] px-4 py-5 md:mx-0 md:mt-0 md:rounded-lg md:px-8 md:py-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="rounded-[28px] bg-white p-6 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff5a1f]">TourAPI Recommendation</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.98] tracking-tight text-black md:text-6xl">
            둘 다 낯설지만
            <br />
            부담 없는 장소
          </h1>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-600">
            공공데이터 후보를 모으고, 연관 관광지와 혼잡 흐름을 더해 두 사람의 균형점에 가까운 장소를 정렬합니다.
          </p>
          <div className="mt-7 flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${filter === item ? 'bg-black text-white' : 'bg-[#f2f2ef] text-slate-500'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-[#101828] p-5 text-white shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Agent Board</p>
              <h2 className="mt-2 text-2xl font-black">API 호출 판단</h2>
            </div>
            <Button icon={<Bot className="h-4 w-4" />} onClick={() => void runTravelAgent()} disabled={status.agent === 'loading'} className="bg-[#ffd45a] text-black hover:bg-[#ffd45a]/90">
              {status.agent === 'loading' ? '실행 중' : '실행'}
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {(agentRun?.steps ?? ['tour', 'context', 'rank', 'plan']).map((step, index) => (
              <div key={typeof step === 'string' ? step : step.tool} className={`min-h-20 rounded-xl p-3 ${agentRun ? 'bg-[#2388ff]' : 'bg-white/10'}`}>
                <p className="text-xs font-black">{index + 1}</p>
                <p className="mt-4 text-[11px] font-bold leading-4 text-white/80">{typeof step === 'string' ? step : toolLabel(step.tool)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-white/60">
            {agentRun ? agentRun.summary : '실행하면 TourAPI 후보 수집부터 일정 입력 준비까지 순서가 기록됩니다.'}
          </p>
        </div>
      </section>

      {showMap ? (
        <GoogleMap
          label="추천 관광지 지도"
          points={filtered.map((item) => ({ id: item.id, name: item.name, lat: item.mapY, lng: item.mapX, address: item.addr1 }))}
        />
      ) : null}

      {!filtered.length ? <EmptyView label="조건에 맞는 관광지가 없습니다" /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item, index) => (
          <Card key={item.id} className="reveal-card overflow-hidden p-0" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="grid min-h-[250px] md:grid-cols-[220px_1fr]">
              <div className="relative bg-[#e7edf7]">
                <img src={item.imageUrl ?? 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=700&q=80'} alt={item.name} className="h-full min-h-56 w-full object-cover" />
                <Badge className="absolute left-4 top-4 bg-[#ffd45a] text-black">{item.saved ? '저장됨' : '추천'}</Badge>
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2388ff]">{item.category}</p>
                <h2 className="mt-2 text-2xl font-black leading-7 text-black">{item.name}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Metric label="혼잡" value={item.congestionScore ?? null} suffix="점" />
                  <Metric label="숨은명소" value={item.hiddenScore ?? null} suffix="점" />
                  <Metric label="연관" value={item.relatedRank ?? null} suffix="위" />
                </div>
                <p className="mt-4 rounded-2xl bg-[#f6f4ec] p-3 text-sm font-semibold leading-6 text-slate-700">{item.reason}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => toggleAttraction(item.id, 'excluded')}>제외하기</Button>
                  <Button onClick={() => toggleAttraction(item.id, 'saved')}>{item.saved ? '저장 취소' : '저장하기'}</Button>
                </div>
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
    search_tourapi_candidates: 'TourAPI',
    collect_public_context: 'context',
    rank_balanced_attractions: 'rank',
    prepare_itinerary_generation: 'plan'
  };
  return labels[tool] ?? tool;
}

function PrerequisiteCard({ title, description, primaryTo, primaryLabel }: { title: string; description: string; primaryTo: string; primaryLabel: string }) {
  return (
    <Card className="space-y-4 rounded-[24px]">
      <Sparkles className="h-6 w-6 text-[#ff5a1f]" />
      <div>
        <h1 className="text-2xl font-black text-black">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{description}</p>
      </div>
      <Link to={primaryTo}>
        <Button>{primaryLabel}</Button>
      </Link>
    </Card>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div className="rounded-2xl bg-[#f6f4ec] p-3">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-black">{value === null ? '-' : `${value}${suffix}`}</p>
    </div>
  );
}
