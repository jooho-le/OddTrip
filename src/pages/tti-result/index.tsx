import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { AxisBar } from '../../shared/ui/AxisBar';

export function TtiResultPage() {
  const result = useTripStore((state) => state.result);

  if (!result) {
    return <Card><p className="mb-4 text-sm text-slate-600">아직 진단 결과가 없습니다.</p><Link to="/tti/start"><Button>진단 시작하기</Button></Link></Card>;
  }

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="TTI Result" title={`${result.code} · ${result.title}`} description={result.description} />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="space-y-4">
          <h2 className="font-bold">축별 점수</h2>
          {result.axisScores.map((score) => <AxisBar key={score.axis} score={score} />)}
        </Card>
        <Card className="space-y-4 bg-brand-900 text-white">
          <p className="text-sm font-semibold text-brand-100">반대 성향 추천 유형</p>
          <p className="text-5xl font-black">{result.oppositeCode}</p>
          <p className="text-sm leading-6 text-brand-50">나와 다른 판단 기준을 가진 여행자와 매칭하면 일정 과밀, 선택 피로, 취향 편향을 줄일 수 있습니다.</p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-bold">강점</h2>
        <div className="grid gap-2 md:grid-cols-3">{result.strengths.map((item) => <div key={item} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item}</div>)}</div>
      </Card>
      <Link to="/matches"><Button className="w-full md:w-auto">매칭 시작하기</Button></Link>
    </div>
  );
}
