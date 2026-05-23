import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Map, Sparkles } from 'lucide-react';
import { CardNewsRail } from '../../components/CardNewsRail';
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
    <div className="page-canvas space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="relative overflow-hidden rounded-[38px] bg-[#101114] p-7 text-white shadow-[0_26px_90px_rgba(16,17,20,0.18)] md:p-10">
          <img src="https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=86" alt="" className="absolute inset-0 h-full w-full object-cover opacity-32" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(245,208,76,0.46),transparent_28%),linear-gradient(90deg,rgba(16,17,20,0.96),rgba(16,17,20,0.52))]" />
          <p className="relative text-xs font-black uppercase tracking-[0.22em] text-[#f5d04c]">TourAPI Recommendation</p>
          <h1 className="relative mt-6 max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
            둘 다 낯설지만
            <br />
            부담 없는 장소
          </h1>
          <p className="relative mt-5 max-w-xl text-sm font-bold leading-6 text-white/72">
            공공데이터 후보를 모으고, 연관 관광지와 혼잡 흐름을 더해 두 사람의 균형점에 가까운 장소를 정렬합니다.
          </p>
          <div className="mt-7 flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${filter === item ? 'bg-white text-[#fd267a]' : 'bg-white/12 text-white/72'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="gradient-panel pulse-sheen rounded-[38px] p-6 text-white shadow-[0_26px_90px_rgba(253,38,122,0.20)]">
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
              <div key={typeof step === 'string' ? step : step.tool} className={`motion-card min-h-20 rounded-xl p-3 ${agentRun ? stepColor(index) : 'bg-white/12'}`} style={{ animationDelay: `${index * 90}ms` }}>
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

      <CardNewsRail
        items={[
          { kicker: 'DATA', title: 'TourAPI 후보 수집', description: '관광지, 축제, 숙박, 음식점 데이터를 한 번에 후보화합니다.', tone: 'bg-[#2388ff] text-white' },
          { kicker: 'CONTEXT', title: '혼잡과 연관성 반영', description: '방문자 추이, 연관 관광지, 혼잡 예측으로 추천 이유를 보강합니다.', tone: 'bg-[#21b8a5] text-white' },
          { kicker: 'BALANCE', title: '두 사람의 균형점', description: '한쪽 취향만 따르지 않도록 중간 성향에 맞게 재정렬합니다.', tone: 'bg-[#ffd45a] text-black' }
        ]}
      />

      {showMap ? (
        <GoogleMap
          label="추천 관광지 지도"
          points={filtered.map((item) => ({ id: item.id, name: item.name, lat: item.mapY, lng: item.mapX, address: item.addr1 }))}
        />
      ) : null}

      {!filtered.length ? <EmptyView label="조건에 맞는 관광지가 없습니다" /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item, index) => (
          <Card key={item.id} className="motion-card hover-lift overflow-hidden p-0" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="grid min-h-[250px] md:grid-cols-[220px_1fr]">
              <div className="relative bg-[#e7edf7]">
                <img src={item.imageUrl ?? 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=700&q=80'} alt={item.name} className="h-full min-h-56 w-full object-cover" />
                <Badge className="absolute left-4 top-4 bg-[#ff5a1f] text-white">{item.saved ? '저장됨' : '추천'}</Badge>
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2388ff]">{item.category}</p>
                <h2 className="mt-2 text-2xl font-black leading-7 text-black">{item.name}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Metric label="혼잡" value={item.congestionScore ?? null} suffix="점" tone="orange" />
                  <Metric label="숨은명소" value={item.hiddenScore ?? null} suffix="점" tone="mint" />
                  <Metric label="연관" value={item.relatedRank ?? null} suffix="위" tone="blue" />
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

function stepColor(index: number) {
  return ['bg-[#2388ff]', 'bg-[#ff5a1f]', 'bg-[#21b8a5]', 'bg-[#ffd45a] text-black'][index % 4];
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

function Metric({ label, value, suffix, tone }: { label: string; value: number | null; suffix: string; tone: 'orange' | 'mint' | 'blue' }) {
  const toneClass = {
    orange: 'bg-[#ffe7d8]',
    mint: 'bg-[#e1f8f4]',
    blue: 'bg-[#e6f1ff]'
  }[tone];
  return (
    <div className={`rounded-2xl p-3 ${toneClass}`}>
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-black">{value === null ? '-' : `${value}${suffix}`}</p>
    </div>
  );
}
