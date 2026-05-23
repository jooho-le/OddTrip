import { ArrowRight, CalendarDays, Check, Grid3X3, HeartHandshake, ListChecks, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTripStore } from '../entities/tripStore';
import { cn } from '../shared/lib/classNames';

const steps = [
  { key: 'tti', label: '진단', to: '/tti/start', icon: ListChecks },
  { key: 'matches', label: '매칭', to: '/matches', icon: HeartHandshake },
  { key: 'decision', label: '조율', to: '/decision', icon: SlidersHorizontal },
  { key: 'attractions', label: '추천', to: '/attractions', icon: Grid3X3 },
  { key: 'itinerary', label: '일정', to: '/itinerary', icon: CalendarDays },
  { key: 'safety', label: '안전', to: '/safety', icon: ShieldCheck },
];

export function JourneyGuide() {
  const location = useLocation();
  const { activeTripId, attractions, itinerary, matches, result, selectedMatch, user } = useTripStore();
  const hasTti = Boolean(result?.code ?? user?.ttiCode);
  const hasMatch = Boolean(activeTripId || selectedMatch || matches.length);
  const hasAttractions = attractions.length > 0;
  const hasItinerary = itinerary.length > 0;

  const completion: Record<string, boolean> = {
    tti: hasTti,
    matches: hasMatch,
    decision: Boolean(activeTripId),
    attractions: hasAttractions,
    itinerary: hasItinerary,
    safety: hasItinerary,
  };

  const currentIndex = Math.max(0, steps.findIndex((step) => location.pathname.startsWith(step.to.split('/').slice(0, 2).join('/'))));
  const next = nextAction({ hasTti, hasMatch, activeTripId: Boolean(activeTripId), hasAttractions, hasItinerary });

  return (
    <section className="mb-4 rounded-2xl border border-black/5 bg-white p-3 shadow-[0_14px_36px_rgba(16,17,20,0.08)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const done = completion[step.key];
            const active = index === currentIndex || location.pathname.startsWith(step.to);
            return (
              <Link
                key={step.key}
                to={step.to}
                className={cn(
                  'flex min-w-[92px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition',
                  active ? 'bg-[#101114] text-white' : done ? 'bg-[#e8f8f3] text-[#087466]' : 'bg-[#f5f0e9] text-slate-500',
                )}
              >
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', active ? 'bg-white/16' : 'bg-white')}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                {step.label}
              </Link>
            );
          })}
        </div>
        <Link to={next.to} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#fd267a] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(253,38,122,0.22)]">
          {next.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function nextAction(state: {
  hasTti: boolean;
  hasMatch: boolean;
  activeTripId: boolean;
  hasAttractions: boolean;
  hasItinerary: boolean;
}) {
  if (!state.hasTti) return { to: '/tti/start', label: '먼저 TTI 진단하기' };
  if (!state.hasMatch) return { to: '/matches', label: '반대 성향 선택하기' };
  if (!state.activeTripId) return { to: '/matches', label: '공동 여행 만들기' };
  if (!state.hasAttractions) return { to: '/decision', label: '취향 조율 후 추천받기' };
  if (!state.hasItinerary) return { to: '/itinerary', label: '일정 생성 확인하기' };
  return { to: '/safety', label: '날씨와 안전 확인하기' };
}
