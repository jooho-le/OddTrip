import { ArrowRight, CalendarCheck, MessageCircle, Route, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

const featureCards = [
  { title: 'TTI 진단', text: '12문항으로 여행 성향을 16개 유형 중 하나로 계산합니다.', icon: Route, tone: 'bg-[#101828] text-white' },
  { title: '반대 성향 매칭', text: '비슷한 사람이 아니라 나를 보완하는 여행자를 찾습니다.', icon: UsersRound, tone: 'bg-[#ff5a1f] text-white' },
  { title: '공동 일정', text: '장소, 음식, 예산, 속도를 함께 조율합니다.', icon: CalendarCheck, tone: 'bg-[#ffd45a] text-ink' },
  { title: '안전 대응', text: '날씨와 재난 알림을 일정 조정 신호로 보여줍니다.', icon: ShieldCheck, tone: 'bg-[#21b8a5] text-white' }
];

export function LandingPage() {
  return (
    <div className="-mx-4 -mt-4 space-y-8 bg-[#f4f0e6] px-4 py-5 md:mx-0 md:mt-0 md:rounded-lg md:px-8 md:py-8">
      <section className="relative min-h-[620px] overflow-hidden rounded-[28px] bg-white p-7 shadow-[0_24px_80px_rgba(16,24,40,0.10)] md:p-12">
        <div className="absolute -right-20 -top-24 h-72 w-72 rotate-12 rounded-[42px] bg-[#ff5a1f]" />
        <div className="absolute right-12 top-52 h-36 w-52 -rotate-12 rounded-[32px] bg-[#e6f1ff] ring-[28px] ring-[#2388ff]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full border-[32px] border-black/8" />
        <div className="absolute bottom-16 right-10 hidden h-28 w-28 rounded-full border-[26px] border-[#21b8a5] md:block" />

        <div className="relative z-10 grid min-h-[560px] gap-8 md:grid-cols-[1fr_360px] md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ff5a1f]">oddtrip</p>
            <h1 className="mt-16 max-w-3xl text-6xl font-black leading-[0.96] tracking-tight text-black md:text-7xl">
              Opposite Travelers,
              <br />
              One Trip.
            </h1>
            <p className="mt-7 max-w-xl text-xl font-black leading-8 text-black">
              반대 성향 여행자를 연결하는 AI 트래블 에이전트
            </p>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-600">
              TTI 진단으로 나를 분석하고, 나와 다른 판단 방식을 가진 사람과 관광지, 우선순위, 일정까지 같이 만듭니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/tti/start">
                <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full bg-black text-white hover:bg-black/88 sm:w-auto">
                  시작하기
                </Button>
              </Link>
              <Link to="/matches" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-black text-black">
                매칭 보기
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[360px] rounded-[34px] border border-black/10 bg-[#ebe8dc] p-4 shadow-[0_24px_70px_rgba(16,24,40,0.16)]">
            <div className="mb-5 flex items-center justify-between px-1 text-sm font-black">
              <span>9:58</span>
              <span className="text-slate-400">•••</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              <p className="font-black">oddtrip과 대화</p>
            </div>
            <div className="mt-16 space-y-4">
              <Bubble name="Odd" text="혼자 여행해도 결정은 같이 할 수 있어요." />
              <Bubble name="Odd" text="먼저 12문항으로 네 여행 성향을 알려줘요." />
              <div className="ml-auto w-fit max-w-[78%] rounded-[22px] bg-[#ffd45a] px-4 py-3 text-sm font-black text-black">
                좋아. 시작할게!
              </div>
              <Bubble name="Odd" text="완전 반대 성향부터 찾아서 둘의 중간지점을 계산할게요." />
            </div>
            <Link to="/tti/start">
              <button className="mt-20 w-full rounded-full border border-black bg-white px-5 py-4 text-sm font-black text-black">
                좋아! 소개시켜줘!
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {featureCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className={`reveal-card min-h-56 rounded-[22px] p-6 shadow-soft ${card.tone}`} style={{ animationDelay: `${index * 90}ms` }}>
              <Icon className="h-7 w-7" />
              <h2 className="mt-16 text-2xl font-black leading-8">{card.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 opacity-80">{card.text}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Bubble({ name, text }: { name: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-black">{name[0]}</div>
      <div>
        <p className="mb-1 text-xs font-black text-slate-500">{name}</p>
        <p className="rounded-[20px] bg-white px-4 py-3 text-sm font-bold leading-6 text-black">{text}</p>
      </div>
    </div>
  );
}
