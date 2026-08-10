import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Heart, RefreshCw, Sparkles, UsersRound } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
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

  const featured = matches[0];

  return (
    <div className="page-canvas space-y-6">
      <section className="gradient-panel-alt relative overflow-hidden rounded-[34px] p-6 text-white shadow-[0_26px_80px_rgba(253,38,122,0.22)]">
        <div className="absolute -right-10 -top-12 h-48 w-72 rotate-12 rounded-[48px] bg-white/16" />
        <div className="absolute bottom-0 right-28 h-20 w-48 -rotate-6 rounded-t-[28px] bg-white/14" />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/72">
          <UsersRound className="h-4 w-4 text-[#f5d04c]" />
          여행 메이트 추천
        </p>
        <h1 className="relative mt-5 max-w-3xl text-5xl font-black leading-[0.95] md:text-7xl">
          나와 다른 여행자를 만나
          <br />
          새로운 여행 경험을 
          <br />
          만들어보세요
        </h1>
        <p className="relative mt-5 max-w-xl text-m font-semibold leading-6 text-white/74">비슷한 취향이 아니라, 반대의 취향의 사람을 추천합니다. 후보를 보고 내 여행을 보완해 보세요.</p>
      </section>

      {featured ? (
        <section className="grid gap-5 lg:grid-cols-[410px_1fr]">
          <div className="relative mx-auto h-[560px] w-full max-w-[410px]">
            {matches.slice(0, 3).map((match, index) => (
              <div
                key={match.id}
                className={`motion-card absolute inset-x-6 top-4 rounded-[36px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)] ${index === 0 ? 'rotate-[-3deg]' : index === 1 ? 'translate-y-8 rotate-[5deg] opacity-80' : 'translate-y-16 rotate-[-7deg] opacity-60'}`}
                style={{ animationDelay: `${index * 120}ms`, zIndex: 10 - index }}
              >
                <img src={match.avatarUrl ?? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=80'} alt="" className="h-72 w-full rounded-[28px] object-cover" />
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-black text-[#191322]">{match.nickname}</h2>
                    <Badge className="gradient-panel text-white">{getTypeLabel(match.ttiCode)}</Badge>
                  </div>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{match.ageRange} · {match.region} · {match.matchLevel}</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{match.summary}</p>
                  <div className="mt-5">
                    <Link to={`/matches/${match.id}`} onClick={() => selectMatch(match.id)} className="gradient-panel inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-white shadow-[0_18px_38px_rgba(253,38,122,0.28)]">
                      상세 보고 선택
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Card className="rounded-[32px] p-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#fff0f3] px-3 py-2 text-xs font-black text-[#fd267a]">
                <Sparkles className="h-4 w-4" />
              메이트 추천
              </p>
              <h2 className="mt-5 text-3xl font-black leading-9 tracking-[-0.035em] text-[#191322]">메이트의 여행 방식을 확인해보세요</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <GuideStep title="1. 후보 확인" description="나와 다른 여행 습관을 가진 사람" />
                <GuideStep title="2. 상세 비교" description="서로 다른 점과 보완되는 점" />
                <GuideStep title="3. 공동 여행 생성" description="동행의 시작" />
              </div>
            </Card>
            <Card className="rounded-[28px] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd267a]">가장 먼저 볼 후보</p>
              <p className="mt-3 text-5xl font-black text-[#191322]">{featured.recommendationScore}%</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{featured.compatibility}</p>
              <div className="mt-4 rounded-[22px] bg-[#fbf5ee] p-4">
                <p className="text-sm font-black text-[#191322]">추천 이유</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">내가 놓치기 쉬운 여행 선택을 상대가 보완해 줄 가능성이 높습니다.</p>
              </div>
              <Link to={`/matches/${featured.id}`} onClick={() => selectMatch(featured.id)}>
                <Button icon={<Heart className="h-4 w-4" />} className="mt-5 w-full">이 사람과 공동 여행 만들기</Button>
              </Link>
            </Card>
          </div>
        </section>
      ) : <EmptyView label="추천 후보가 없습니다" />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {matches.slice(3).map((match, index) => (
          <Card key={match.id} className="motion-card hover-lift rounded-[28px] p-4" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="flex gap-3">
              <img src={match.avatarUrl ?? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80'} alt="" className="h-20 w-20 rounded-[22px] object-cover" />
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[#191322]">{match.nickname}</h2>
                <p className="text-xs font-black text-slate-400">{match.region} · {getTypeLabel(match.ttiCode)}</p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-600">{match.summary}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadMatches()}>다시 추천</Button>
    </div>
  );
}

function GuideStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] bg-[#fbf5ee] p-4">
      <CheckCircle2 className="h-5 w-5 text-[#fd267a]" />
      <p className="mt-4 text-base font-black text-[#191322]">{title}</p>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{description}</p>
    </div>
  );
}

function getTypeLabel(code: string) {
  const labels: Record<string, string> = {
    P: '즉흥',
    W: '계획',
    N: '새로움',
    C: '검증',
    F: '휴식',
    A: '활동',
    H: '여유',
    S: '촘촘',
  };

  return code
    .split('')
    .map((letter) => labels[letter] ?? letter)
    .join(' · ');
}
