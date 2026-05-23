import { Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { AxisBar } from '../../shared/ui/AxisBar';

export function TtiResultPage() {
  const result = useTripStore((state) => state.result);

  if (!result) {
    return <Card><p className="mb-4 text-sm text-slate-600">아직 진단 결과가 없습니다.</p><Link to="/tti/start"><Button>진단 시작하기</Button></Link></Card>;
  }

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
            <p className="mt-5 text-sm font-bold leading-6 text-slate-600">나와 다른 판단 기준을 가진 여행자와 매칭해 취향 편향을 줄입니다.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="space-y-4">
          <h2 className="text-2xl font-black tracking-[-0.025em]">축별 점수</h2>
          {result.axisScores.map((score) => <AxisBar key={score.axis} score={score} />)}
        </Card>
        <Card className="relative overflow-hidden space-y-4 bg-[#101114] text-white">
          <Heart className="h-8 w-8 fill-[#fd267a] text-[#fd267a]" />
          <p className="text-4xl font-black leading-[0.98] tracking-[-0.04em]">이제 반대 성향 카드를 넘겨볼 차례</p>
          <p className="text-sm font-bold leading-6 text-white/64">완전 반대부터 부분 반대까지 단계적으로 추천합니다.</p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-2xl font-black tracking-[-0.025em]">강점</h2>
        <div className="grid gap-3 md:grid-cols-3">{result.strengths.map((item, index) => <div key={item} className={`motion-card rounded-[26px] p-5 text-sm font-bold leading-6 ${index === 1 ? 'gradient-panel text-white' : 'bg-[#fbf5ee] text-slate-700'}`}>{item}</div>)}</div>
      </Card>
      <Link to="/matches"><Button className="w-full md:w-auto">매칭 시작하기</Button></Link>
    </div>
  );
}
