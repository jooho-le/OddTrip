import { type FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarCheck, Heart, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { AxisBar } from '../../shared/ui/AxisBar';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { matchRequestService } from '../../entities/match-request/api/matchRequestService';
import type { MatchRequest } from '../../types';

export function MatchDetailPage() {
  const { id } = useParams();
  const { matches, selectedMatch, selectMatch, loadMatches, result, user } = useTripStore();
  const [region, setRegion] = useState('');
  const [startDate, setStartDate] = useState(defaultDate(14));
  const [endDate, setEndDate] = useState(defaultDate(16));
  const [greeting, setGreeting] = useState('서로 다른 취향을 존중하며 같이 여행하고 싶어요.');
  const [pending, setPending] = useState<MatchRequest>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!matches.length) void loadMatches();
  }, [loadMatches, matches.length]);

  useEffect(() => {
    if (id) selectMatch(id);
  }, [id, matches.length, selectMatch]);
  useEffect(() => {
    if (!id) return;
    void matchRequestService.sent().then((response) => setPending(response.data.find((item) => item.receiverId === id && item.status === 'pending')));
  }, [id]);

  const match = selectedMatch ?? matches.find((item) => item.id === id);
  useEffect(() => {
    if (match?.region) setRegion((current) => current || match.region);
  }, [match?.region]);
  if (!match) return <Card>매칭 정보를 찾을 수 없습니다.</Card>;

  const myCode = result?.code ?? user?.ttiCode ?? 'TTI';
  const travelFit = buildTravelFitText(match.differences, match.complements, match.matchLevel);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await matchRequestService.create({ receiverId: match.id, region, startDate, endDate, greetingMessage: greeting });
      setPending(response.data); setMessage('동행 요청을 보냈습니다. 상대방이 수락하면 채팅방이 열립니다.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '동행 요청을 보내지 못했습니다.'); }
    finally { setBusy(false); }
  };

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
              <TypeTile label="나" code={myCode} />
              <TypeTile label="상대" code={match.ttiCode} dark />
            </div>
          </div>
        </div>
      </section>

      <Card className="border-[#fd267a]/20 bg-[#fff8fb]">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 className="text-xl font-black">동행 요청</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">여행 조건과 첫 인사를 보내면 상대방이 수락하거나 거절합니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2"><label className="field-label md:col-span-2"><span>여행 지역</span><input required maxLength={100} value={region} onChange={(event) => setRegion(event.target.value)} /></label><label className="field-label"><span>시작일</span><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field-label"><span>종료일</span><input required type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label className="field-label md:col-span-2"><span>인사 메시지</span><textarea required maxLength={300} value={greeting} onChange={(event) => setGreeting(event.target.value)} className="min-h-24" /></label></div>
          {message ? <p className="text-sm font-bold text-slate-600">{message}</p> : null}
          {pending ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void matchRequestService.cancel(pending.id).then(() => { setPending(undefined); setMessage('동행 요청을 취소했습니다.'); })}>요청 취소</Button> : <Button icon={<Heart className="h-4 w-4" />} disabled={busy}>{busy ? '요청 전송 중' : '동행 요청 보내기'}</Button>}
        </form>
      </Card>
      {result ? <Card className="space-y-4"><h2 className="font-bold">내 성향 축</h2>{result.axisScores.map((score) => <AxisBar key={score.axis} score={score} />)}</Card> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="mb-4 text-2xl font-black">서로 다른 점</h2>{match.differences.map((item) => <p key={item} className="mb-2 rounded-[22px] bg-[#fbf5ee] p-4 text-sm font-bold leading-6">{item}</p>)}</Card>
        <div className="rounded-[30px] border border-black/5 gradient-panel p-5 text-white shadow-[0_20px_60px_rgba(16,17,20,0.10)]">
          <h2 className="mb-4 text-2xl font-black">보완되는 점</h2>
          {match.complements.map((item) => <p key={item} className="mb-2 rounded-[22px] bg-white/16 p-4 text-sm font-bold leading-6 text-white">{item}</p>)}
        </div>
      </div>
      <div className="rounded-[30px] border border-black/5 bg-[#101114] p-5 text-white shadow-[0_20px_60px_rgba(16,17,20,0.10)]">
        <CalendarCheck className="h-7 w-7 text-[#f5d04c]" />
        <h2 className="mt-8 text-3xl font-black tracking-[-0.03em]">함께 어울릴 여행 방식</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-white/68">{travelFit}</p>
      </div>
    </div>
  );
}

function defaultDate(offset: number) {
  const value = new Date(); value.setDate(value.getDate() + offset); return value.toISOString().slice(0, 10);
}

function buildTravelFitText(differences: string[], complements: string[], matchLevel: string) {
  if (!differences.length && !complements.length) {
    return '두 사람의 TTI 결과를 기준으로 장소 선택과 일정 속도를 함께 조율하는 방식이 적합합니다.';
  }

  const diffText = differences.length ? differences.slice(0, 2).join(', ') : '여행 선택 방식';
  const complementText = complements.length ? complements[0] : '서로의 선택을 보완';
  const levelText = matchLevel === '완전 반대' ? '차이가 큰 만큼 역할을 나누기 좋습니다.' : '겹치는 부분을 유지하면서 다른 취향을 조금씩 섞기 좋습니다.';

  return `${diffText}에서 차이가 있어 ${complementText}하는 흐름이 잘 맞습니다. ${levelText}`;
}

function TypeTile({ label, code, dark = false }: { label: string; code: string; dark?: boolean }) {
  return (
    <div className={`rounded-[24px] p-4 ${dark ? 'bg-[#101114] text-white' : 'bg-[#fbf5ee] text-[#111111]'}`}>
      <p className="text-xs font-black opacity-60">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-[-0.04em]">{code}</p>
    </div>
  );
}
