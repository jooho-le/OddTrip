import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { AxisBar } from '../../shared/ui/AxisBar';

export function TtiResultPage() {
  const result = useTripStore((state) => state.result);

  if (!result) {
    return <Card><p className="mb-4 text-sm text-slate-600">아직 진단 결과가 없습니다.</p><Link to="/tti/start"><Button>진단 시작하기</Button></Link></Card>;
  }

  const resultPoints = [
    {
      label: 'matching',
      title: '나와 다른 여행자를 찾는 기준',
      description: `${result.code}와 반대되는 ${result.oppositeCode} 성향을 우선 추천합니다.`,
    },
    {
      label: 'balance',
      title: '함께 조율할 부분을 확인',
      description: '계획 방식, 장소 취향, 일정 속도처럼 서로 다르게 선택할 부분을 보여줍니다.',
    },
    {
      label: 'plan',
      title: '공동 일정 추천에 반영',
      description: '두 사람 중 한쪽 취향만 따르지 않도록 장소와 일정 순서를 조정합니다.',
    },
  ];

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] gradient-panel-alt p-7 text-white shadow-[0_26px_90px_rgba(253,38,122,0.24)] md:p-10">
        <div className="absolute -right-14 -top-16 h-72 w-72 rounded-full bg-white/12 drift-a" />
        <div className="absolute bottom-6 right-16 hidden h-36 w-64 rotate-6 rounded-[34px] bg-[#f5d04c] md:block" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_360px] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/72">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              TTI Result
            </p>
            <h1 className="mt-6 text-6xl font-black leading-[0.9] tracking-[-0.055em] md:text-8xl">{result.code}</h1>
            <p className="mt-5 max-w-2xl text-3xl font-black leading-9">{result.title}</p>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/72">{result.description}</p>
          </div>
          <div className="motion-card rounded-[34px] bg-white p-6 text-[#111111] shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#fd267a]">opposite type</p>
            <p className="mt-5 text-6xl font-black leading-none tracking-[-0.05em]">{result.oppositeCode}</p>
            <p className="mt-5 text-sm font-bold leading-6 text-slate-600">나와 다른 판단 기준을 가진 여행자와 만나봅니다.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="space-y-4">
          <h2 className="text-2xl font-black tracking-[-0.025em]">항목별 점수</h2>
          {result.axisScores.map((score) => <AxisBar key={score.axis} score={score} />)}
        </Card>
        <div className="relative overflow-hidden rounded-[30px] border border-black/5 bg-[#101114] p-5 text-white shadow-[0_20px_60px_rgba(16,17,20,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(16,17,20,0.14)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#fd267a]/28" />
          <div className="relative space-y-5">
            <Heart className="h-8 w-8 fill-[#fd267a] text-[#fd267a]" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/48">matching preview</p>
              <p className="mt-3 text-3xl font-black leading-tight tracking-[-0.025em]">다음 화면에서는 이런 매칭 카드를 봅니다</p>
              <p className="mt-3 text-sm font-bold leading-6 text-white/66">내 결과와 반대 성향 후보를 비교해서, 같이 여행할 때 보완되는 항목입니다.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <TypePreview label="나" code={result.code} />
              <div className="hidden h-10 w-10 place-items-center rounded-full bg-white/12 sm:grid">
                <ArrowRight className="h-5 w-5 text-[#f5d04c]" />
              </div>
              <TypePreview label="추천 후보" code={result.oppositeCode} highlight />
            </div>
            <div className="grid gap-2 text-sm font-black sm:grid-cols-3">
              <span className="rounded-2xl bg-white/10 px-4 py-3">성향 비교</span>
              <span className="rounded-2xl bg-white/10 px-4 py-3">같이 여행할 이유</span>
              <span className="rounded-2xl bg-white/10 px-4 py-3">일정 만들기</span>
            </div>
          </div>
        </div>
      </div>
      <Card>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd267a]">how to use this result</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.025em]">결과 해석 포인트</h2>
          </div>
        
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {resultPoints.map((item, index) => (
            <div key={item.label} className={`motion-card rounded-[26px] p-5 ${index === 1 ? 'gradient-panel text-white' : 'bg-[#fbf5ee] text-slate-700'}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] opacity-60">{item.label}</p>
              <p className="mt-4 text-lg font-black leading-6">{item.title}</p>
              <p className="mt-3 text-sm font-bold leading-6 opacity-75">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>
      <Link to="/matches"><Button className="w-full md:w-auto">매칭 시작하기</Button></Link>
    </div>
  );
}

function TypePreview({ label, code, highlight = false }: { label: string; code: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[24px] p-4 ${highlight ? 'bg-white text-[#111111]' : 'bg-white/10 text-white'}`}>
      <p className={`text-xs font-black uppercase tracking-[0.16em] ${highlight ? 'text-[#fd267a]' : 'text-white/48'}`}>{label}</p>
      <p className="mt-2 text-4xl font-black leading-none tracking-[-0.045em]">{code}</p>
    </div>
  );
}
