import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';

export function MatchesPage() {
  const { matches, loadMatches, selectMatch, status } = useTripStore();

  useEffect(() => {
    if (!matches.length) void loadMatches();
  }, [loadMatches, matches.length]);

  if (status.matches === 'loading') return <LoadingView label="반대 성향 후보를 찾는 중입니다" />;
  if (status.matches === 'error') return <ErrorView label="매칭 후보를 불러오지 못했습니다" />;

  return (
    <div className="-mx-4 -mt-4 space-y-5 bg-[#ebe8dc] px-4 py-5 md:mx-0 md:mt-0 md:rounded-lg md:px-8 md:py-8">
      <section className="rounded-[28px] bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff5a1f]">Opposite Match</p>
        <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-black md:text-6xl">
          나와 다른 사람이
          <br />
          여행을 넓힙니다
        </h1>
        <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-600">완전 반대부터 부분 반대까지 단계적으로 추천합니다.</p>
      </section>

      {!matches.length ? <EmptyView label="추천 후보가 없습니다" /> : null}

      <div className="grid gap-3">
        {matches.map((match, index) => (
          <Card key={match.id} className="reveal-card rounded-[24px] p-4" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="grid gap-4 md:grid-cols-[88px_1fr_190px] md:items-center">
              <img src={match.avatarUrl ?? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80'} alt="" className="h-20 w-20 rounded-[24px] object-cover" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-black">{match.nickname}</h2>
                  <Badge className="bg-[#ffd45a] text-black">{match.ttiCode}</Badge>
                  <Badge className="bg-[#f2f2ef] text-slate-700">{match.matchLevel}</Badge>
                </div>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{match.ageRange} · {match.region}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{match.summary}</p>
              </div>
              <div className="space-y-2">
                <div className="rounded-2xl bg-[#f6f4ec] p-3">
                  <p className="text-xs font-black text-slate-500">추천도</p>
                  <p className="mt-1 text-3xl font-black text-black">{match.recommendationScore}%</p>
                </div>
                <Link to={`/matches/${match.id}`} onClick={() => selectMatch(match.id)}>
                  <Button className="w-full">상세 보기</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadMatches()}>다시 추천</Button>
    </div>
  );
}
