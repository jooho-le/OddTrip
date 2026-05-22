import { ArrowRight, Clock, ListChecks, Route } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

export function TtiStartPage() {
  return (
    <div className="-mx-4 -mt-4 min-h-[calc(100dvh-5rem)] bg-[#ebe8dc] px-4 py-5 md:mx-0 md:mt-0 md:rounded-lg md:px-8 md:py-8">
      <section className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_390px] md:items-end">
        <div className="min-h-[560px] rounded-[28px] bg-[#ebe8dc] p-4 md:p-6">
          <div className="mb-10 flex items-center justify-between">
            <span className="text-2xl font-black">TTI 진단</span>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-black">약 2분</span>
          </div>

          <div className="mt-24 space-y-4">
            <ChatBubble speaker="Odd" text="안녕. 여행할 때 네가 어떤 선택을 편하게 느끼는지 먼저 볼게." />
            <ChatBubble speaker="Odd" text="12문항만 답하면 P/W, N/C, F/A, H/S 네 축 점수를 계산해." />
            <ChatBubble speaker="Odd" text="결과는 반대 성향 매칭과 관광지 추천에 바로 연결돼." />
          </div>

          <Link to="/tti/questions">
            <button className="mt-20 rounded-full border border-black bg-white px-7 py-4 text-sm font-black text-black shadow-sm">
              좋아! 시작할게
            </button>
          </Link>
        </div>

        <div className="rounded-[34px] bg-white p-5 shadow-[0_24px_70px_rgba(16,24,40,0.14)]">
          <p className="text-sm font-black text-slate-500">Travel Type Indicator</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-black">
            12문항으로
            <br />
            여행 성향 확인
          </h1>
          <div className="mt-8 space-y-3">
            <InfoRow icon={<ListChecks className="h-5 w-5" />} title="12문항" text="한 문항씩 선택" />
            <InfoRow icon={<Clock className="h-5 w-5" />} title="약 2분" text="시연 흐름 유지" />
            <InfoRow icon={<Route className="h-5 w-5" />} title="추천 연결" text="매칭과 일정에 사용" />
          </div>
          <Link to="/tti/questions">
            <Button className="mt-8 w-full bg-[#ffd45a] text-black hover:bg-[#ffd45a]/90" icon={<ArrowRight className="h-4 w-4" />}>
              진단 시작
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function ChatBubble({ speaker, text }: { speaker: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sm font-black">{speaker[0]}</div>
      <div>
        <p className="mb-1 text-xs font-black text-slate-500">{speaker}</p>
        <p className="max-w-lg rounded-[22px] bg-white px-4 py-3 text-sm font-bold leading-6 text-black">{text}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#f6f4ec] p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-black">{icon}</div>
      <div>
        <p className="font-black text-black">{title}</p>
        <p className="text-sm font-semibold text-slate-500">{text}</p>
      </div>
    </div>
  );
}
