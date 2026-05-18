import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/tripStore';
import { AxisBar } from '../../shared/ui/AxisBar';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';

export function MatchDetailPage() {
  const { id } = useParams();
  const { matches, selectedMatch, selectMatch, loadMatches, result, ensureTrip, status } = useTripStore();

  useEffect(() => {
    if (!matches.length) void loadMatches();
  }, [loadMatches, matches.length]);

  useEffect(() => {
    if (id) selectMatch(id);
  }, [id, matches.length, selectMatch]);

  const match = selectedMatch ?? matches.find((item) => item.id === id);
  if (!match) return <Card>매칭 정보를 찾을 수 없습니다.</Card>;

  return (
    <div className="space-y-5">
      <SectionTitle title={`${match.nickname}님과의 여행 균형`} description={match.compatibility} />
      <Card className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-brand-50 p-4"><p className="text-sm font-semibold text-brand-900">나</p><p className="mt-2 text-4xl font-black">{result?.code ?? 'PNFH'}</p></div>
        <div className="rounded-lg bg-slate-900 p-4 text-white"><p className="text-sm font-semibold text-slate-200">상대</p><p className="mt-2 text-4xl font-black">{match.ttiCode}</p></div>
      </Card>
      {result ? <Card className="space-y-4"><h2 className="font-bold">내 성향 축</h2>{result.axisScores.map((score) => <AxisBar key={score.axis} score={score} />)}</Card> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="mb-3 font-bold">서로 다른 점</h2>{match.differences.map((item) => <p key={item} className="mb-2 rounded-lg bg-slate-50 p-3 text-sm">{item}</p>)}</Card>
        <Card><h2 className="mb-3 font-bold">보완되는 점</h2>{match.complements.map((item) => <p key={item} className="mb-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{item}</p>)}</Card>
      </div>
      <Card><h2 className="font-bold">함께 어울릴 여행 방식</h2><p className="mt-2 text-sm leading-6 text-slate-600">오전에는 대표 명소를 예약 기반으로 확인하고, 오후에는 카페와 골목을 선택형으로 열어두는 하이브리드 일정이 적합합니다.</p></Card>
      <Link to="/decision" onClick={() => void ensureTrip()}><Button className="w-full md:w-auto" disabled={status.trip === 'loading'}>{status.trip === 'loading' ? '공동 여행 생성 중' : '공동 일정 만들기'}</Button></Link>
    </div>
  );
}
