import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Heart, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { AxisBar } from '../../shared/ui/AxisBar';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

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
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-[#101114] p-6 text-white shadow-[0_26px_90px_rgba(16,17,20,0.20)] md:p-9">
        <img src={match.avatarUrl ?? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=86'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-34" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_24%,rgba(253,38,122,0.58),transparent_28%),linear-gradient(90deg,rgba(16,17,20,0.96),rgba(16,17,20,0.52))]" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_330px] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/72">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              Match Detail
            </p>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-8xl">
              {match.nickname}님과
              <br />
              만드는 균형.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-6 text-white/72">{match.compatibility}</p>
          </div>
          <div className="motion-card rounded-[34px] bg-white p-5 text-[#111111]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd267a]">type compare</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <TypeTile label="나" code={result?.code ?? 'PNFH'} />
              <TypeTile label="상대" code={match.ttiCode} dark />
            </div>
          </div>
        </div>
      </section>

      <Card className="border-[#fd267a]/20 bg-[#fff8fb]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">다음 단계</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">공동 여행을 만들면 장소 취향 조율 화면으로 이동합니다.</p>
          </div>
          <Link to="/decision" onClick={() => void ensureTrip()}>
            <Button icon={<Heart className="h-4 w-4" />} disabled={status.trip === 'loading'}>{status.trip === 'loading' ? '생성 중' : '공동 여행 만들기'}</Button>
          </Link>
        </div>
      </Card>
      {result ? <Card className="space-y-4"><h2 className="font-bold">내 성향 축</h2>{result.axisScores.map((score) => <AxisBar key={score.axis} score={score} />)}</Card> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="mb-4 text-2xl font-black">서로 다른 점</h2>{match.differences.map((item) => <p key={item} className="mb-2 rounded-[22px] bg-[#fbf5ee] p-4 text-sm font-bold leading-6">{item}</p>)}</Card>
        <Card className="gradient-panel text-white"><h2 className="mb-4 text-2xl font-black">보완되는 점</h2>{match.complements.map((item) => <p key={item} className="mb-2 rounded-[22px] bg-white/14 p-4 text-sm font-bold leading-6">{item}</p>)}</Card>
      </div>
      <Card className="bg-[#101114] text-white"><CalendarCheck className="h-7 w-7 text-[#f5d04c]" /><h2 className="mt-8 text-3xl font-black tracking-[-0.03em]">함께 어울릴 여행 방식</h2><p className="mt-3 text-sm font-bold leading-6 text-white/68">오전에는 대표 명소를 예약 기반으로 확인하고, 오후에는 카페와 골목을 선택형으로 열어두는 하이브리드 일정이 적합합니다.</p></Card>
    </div>
  );
}

function TypeTile({ label, code, dark = false }: { label: string; code: string; dark?: boolean }) {
  return (
    <div className={`rounded-[24px] p-4 ${dark ? 'bg-[#101114] text-white' : 'bg-[#fbf5ee] text-[#111111]'}`}>
      <p className="text-xs font-black opacity-60">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-[-0.04em]">{code}</p>
    </div>
  );
}
