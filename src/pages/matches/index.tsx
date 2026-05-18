import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';

export function MatchesPage() {
  const { matches, loadMatches, selectMatch, status } = useTripStore();

  useEffect(() => {
    if (!matches.length) void loadMatches();
  }, [loadMatches, matches.length]);

  if (status.matches === 'loading') return <LoadingView label="반대 성향 후보를 찾는 중입니다" />;
  if (status.matches === 'error') return <ErrorView label="매칭 후보를 불러오지 못했습니다" />;

  return (
    <div className="space-y-5">
      <SectionTitle title="반대 성향 매칭 추천" description="성향 차이가 일정 품질을 높일 수 있는 후보를 우선 보여줍니다." />
      {!matches.length ? <EmptyView label="추천 후보가 없습니다" /> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {matches.map((match, index) => (
          <Card key={match.id} className="reveal-card flex flex-col gap-4" style={{ animationDelay: `${index * 110}ms` }}>
            <div className="flex items-center gap-3">
              <img src={match.avatarUrl ?? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80'} alt="" className="h-14 w-14 rounded-full object-cover" />
              <div className="min-w-0">
                <h2 className="font-bold">{match.nickname}</h2>
                <p className="text-xs text-slate-500">{match.ageRange} · {match.region} · {match.ttiCode}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2"><Badge>{match.matchLevel}</Badge><Badge className="bg-amber-50 text-amber-800">추천도 {match.recommendationScore}%</Badge></div>
            <p className="text-sm leading-6 text-slate-600">{match.summary}</p>
            <p className="rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-700">{match.compatibility}</p>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Button variant="secondary">보류</Button>
              <Link to={`/matches/${match.id}`} onClick={() => selectMatch(match.id)}><Button className="w-full">상세</Button></Link>
            </div>
          </Card>
        ))}
      </div>
      <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadMatches()}>다시 추천</Button>
    </div>
  );
}
