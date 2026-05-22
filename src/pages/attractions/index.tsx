import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Map } from 'lucide-react';
import { GoogleMap } from '../../components/GoogleMap';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';

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
    return (
      <PrerequisiteCard
        title="TTI 진단이 먼저 필요합니다"
        description="관광지 추천은 내 여행 성향과 반대 성향 매칭을 기준으로 생성됩니다."
        primaryTo="/tti/start"
        primaryLabel="TTI 진단하기"
      />
    );
  }

  if (!hasTripSource && status.matches === 'loading') return <LoadingView label="반대 성향 후보를 확인하는 중입니다" />;
  if (!hasTripSource && status.matches === 'success') {
    return (
      <PrerequisiteCard
        title="매칭 상대를 먼저 선택해주세요"
        description="두 사람의 균형점을 계산하려면 공동 일정을 만들 매칭 상대가 필요합니다."
        primaryTo="/matches"
        primaryLabel="매칭 보러가기"
      />
    );
  }

  if (status.attractions === 'loading') return <LoadingView label="추천 관광지를 구성하는 중입니다" />;
  if (status.attractions === 'error') {
    return (
      <PrerequisiteCard
        title="관광지 추천을 불러오지 못했습니다"
        description="매칭 또는 공동 여행이 아직 만들어지지 않았을 수 있습니다. 매칭 상세에서 공동 일정을 먼저 만들어주세요."
        primaryTo="/matches"
        primaryLabel="매칭으로 이동"
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle title="관광지 추천" description="공동 선호와 날씨 리스크를 반영한 후보입니다." />
      <Card className="space-y-3 bg-ink text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100">Tool Calling Agent</p>
            <h2 className="mt-1 text-lg font-black">AI가 필요한 공공데이터 호출 순서를 직접 판단합니다</h2>
          </div>
          <Button
            icon={<Bot className="h-4 w-4" />}
            onClick={() => void runTravelAgent()}
            disabled={status.agent === 'loading'}
            className="bg-brand-500 text-white hover:bg-brand-600"
          >
            {status.agent === 'loading' ? '에이전트 실행 중' : 'AI 에이전트 실행'}
          </Button>
        </div>
        {agentRun ? (
          <div className="grid gap-2 md:grid-cols-4">
            {agentRun.steps.map((step, index) => (
              <div key={`${step.tool}-${index}`} className="rounded-lg bg-white/10 p-3">
                <p className="text-xs font-bold text-brand-100">{index + 1}. {toolLabel(step.tool)}</p>
                <p className="mt-2 text-xs leading-5 text-white/80">{step.reason}</p>
                <p className="mt-2 text-[11px] font-bold text-white/60">결과 {step.resultCount}개</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-white/70">실행하면 TourAPI 후보 수집, 연관 관광지/방문자/혼잡 context, 균형점 랭킹, 일정 생성 준비 단계가 기록됩니다.</p>
        )}
        {status.agent === 'error' ? <p className="rounded-lg bg-red-500/20 p-3 text-sm font-bold text-red-100">AI 에이전트 실행에 실패했습니다. 백엔드 서버와 API 키 설정을 확인해주세요.</p> : null}
      </Card>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold ${filter === item ? 'bg-brand-700 text-white' : 'bg-white text-slate-700'}`}>{item}</button>)}</div>
      {showMap ? (
        <GoogleMap
          label="추천 관광지 지도"
          points={filtered.map((item) => ({
            id: item.id,
            name: item.name,
            lat: item.mapY,
            lng: item.mapX,
            address: item.addr1,
          }))}
        />
      ) : null}
      {!filtered.length ? <EmptyView label="조건에 맞는 관광지가 없습니다" /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item, index) => (
          <Card key={item.id} className="reveal-card overflow-hidden p-0" style={{ animationDelay: `${index * 90}ms` }}>
            <img src={item.imageUrl ?? 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'} alt={item.name} className="h-44 w-full object-cover" />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-brand-700">{item.category}</p><h2 className="text-lg font-bold">{item.name}</h2></div><Badge>{item.saved ? '저장됨' : '추천'}</Badge></div>
              <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="혼잡" value={item.congestionScore ?? null} suffix="점" />
                <Metric label="숨은명소" value={item.hiddenScore ?? null} suffix="점" />
                <Metric label="연관" value={item.relatedRank ?? null} suffix="위" />
              </div>
              {item.addr1 ? <p className="text-xs font-semibold text-slate-500">{item.addr1}</p> : null}
              {item.openingHours?.raw ? <p className="rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-900">운영 정보: {String(item.openingHours.raw)}</p> : null}
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item.reason}</p>
              <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag} className="bg-slate-100 text-slate-700">{tag}</Badge>)}</div>
              <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => toggleAttraction(item.id, 'excluded')}>제외하기</Button><Button onClick={() => toggleAttraction(item.id, 'saved')}>{item.saved ? '저장 취소' : '저장하기'}</Button></div>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row"><Button variant="secondary" icon={<Map className="h-4 w-4" />} onClick={() => setShowMap((value) => !value)}>{showMap ? '지도 닫기' : '지도 보기'}</Button><Link to="/itinerary" onClick={() => void loadItinerary()}><Button className="w-full sm:w-auto">일정 결과 보기</Button></Link></div>
    </div>
  );
}

function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    search_tourapi_candidates: 'TourAPI 후보 수집',
    collect_public_context: '공공데이터 context',
    rank_balanced_attractions: '균형점 랭킹',
    prepare_itinerary_generation: '일정 입력 준비'
  };
  return labels[tool] ?? tool;
}

function PrerequisiteCard({ title, description, primaryTo, primaryLabel }: { title: string; description: string; primaryTo: string; primaryLabel: string }) {
  return (
    <Card className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <Link to={primaryTo}>
        <Button>{primaryLabel}</Button>
      </Link>
    </Card>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div className="rounded-lg bg-white/70 p-2">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value === null ? '-' : `${value}${suffix}`}</p>
    </div>
  );
}
