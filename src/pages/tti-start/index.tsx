import { ArrowRight, Clock, ListChecks, Route, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

export function TtiStartPage() {
  return (
    <div className="page-canvas">
      <section className="relative overflow-hidden rounded-[38px] bg-[#101114] p-6 text-white shadow-[0_26px_90px_rgba(16,17,20,0.20)] md:p-10">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=86"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-36"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(253,38,122,0.54),transparent_30%),linear-gradient(90deg,rgba(16,17,20,0.94),rgba(16,17,20,0.58))]" />
        <div className="relative grid min-h-[660px] gap-8 md:grid-cols-[1fr_420px] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/78 backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              Travel Type Indicator
            </p>
            <h1 className="mt-8 max-w-3xl text-6xl font-black leading-[0.9] tracking-[-0.055em] md:text-8xl">
              너의 여행
              <br />
              선택 방식을
              <br />
              먼저 볼게.
            </h1>
            <div className="mt-10 space-y-4">
              <ChatBubble speaker="Odd" text="12문항만 답하면 P/W, N/C, F/A, H/S 네 축 점수를 계산해." />
              <ChatBubble speaker="Odd" text="결과는 반대 성향 매칭과 관광지 추천에 바로 연결돼." />
            </div>
            <Link to="/tti/questions">
              <button className="mt-10 rounded-full bg-white px-8 py-4 text-sm font-black text-[#fd267a] shadow-[0_22px_60px_rgba(253,38,122,0.28)]">
                좋아! 시작할게
              </button>
            </Link>
          </div>

          <div className="motion-card rounded-[38px] bg-white p-6 text-[#111111] shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
            <p className="text-sm font-black text-slate-500">Travel Type Indicator</p>
            <h2 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.045em]">
              12문항으로
              <br />
              여행 성향 확인
            </h2>
            <div className="mt-8 space-y-3">
              <InfoRow icon={<ListChecks className="h-5 w-5" />} title="12문항" text="한 문항씩 선택" />
              <InfoRow icon={<Clock className="h-5 w-5" />} title="약 2분" text="빠른 시연 흐름" />
              <InfoRow icon={<Route className="h-5 w-5" />} title="추천 연결" text="매칭과 일정에 사용" />
            </div>
            <Link to="/tti/questions">
              <Button className="mt-8 w-full bg-[#f5d04c] text-black hover:bg-[#f5d04c]/90" icon={<ArrowRight className="h-4 w-4" />}>
                진단 시작
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatBubble({ speaker, text }: { speaker: string; text: string }) {
  return (
    <div className="motion-card flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[#fd267a]">{speaker[0]}</div>
      <div>
        <p className="mb-1 text-xs font-black text-white/52">{speaker}</p>
        <p className="max-w-lg rounded-[24px] bg-white/92 px-5 py-4 text-sm font-black leading-6 text-[#111111]">{text}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-black/5 bg-[#fbf5ee] p-4">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black">{icon}</div>
      <div>
        <p className="font-black text-black">{title}</p>
        <p className="text-sm font-bold text-slate-500">{text}</p>
      </div>
    </div>
  );
}
