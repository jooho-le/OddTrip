import { ArrowRight, BrainCircuit, CalendarCheck, MapPinned, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';

export function LandingPage() {
  const storyCards = [
    { number: '01', title: '혼자 떠나도 혼자 결정하지 않게', text: 'TTI가 여행 판단 방식을 읽고 필요한 균형을 찾습니다.', tone: 'bg-brand-900 text-white' },
    { number: '02', title: '나와 반대인 사람이 여행을 넓히게', text: '즉흥형에게 계획형을, 휴식형에게 활동형을 연결합니다.', tone: 'bg-coral text-white' },
    { number: '03', title: '둘의 중간지점으로 일정 생성', text: '장소, 음식, 예산, 날씨를 함께 조율해 실제 코스로 만듭니다.', tone: 'bg-[#f4b942] text-ink' },
    { number: '04', title: '비와 재난 알림까지 일정에 반영', text: '날씨가 바뀌면 대체 코스를 먼저 보여줍니다.', tone: 'bg-[#273c35] text-white' }
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-white/60 bg-[#f5ead7]/75 shadow-soft backdrop-blur">
        <div className="grid min-h-[560px] md:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col justify-center gap-6 p-6 md:p-10">
            <Badge className="w-fit bg-[#17201f] text-white">AI Travel Agent for Solo Travelers</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight text-ink md:text-6xl">oddtrip</h1>
              <p className="text-2xl font-bold leading-snug text-brand-900 md:text-4xl">반대 성향 여행자를 연결하는 AI 트래블 에이전트</p>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                TTI 진단으로 여행 성향을 분석하고, 나와 다른 강점을 가진 동행자와 함께 관광지, 우선순위, 일정까지 조율합니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/tti/start"><Button className="w-full sm:w-auto" icon={<ArrowRight className="h-4 w-4" />}>시작하기</Button></Link>
              <Link to="/itinerary" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink/10 bg-[#fff7e6]/80 px-4 text-sm font-semibold text-slate-700 backdrop-blur">시연 일정 보기</Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-ink/10 bg-ink py-2 text-white">
              <div className="ticker-track flex w-max gap-3 px-3 text-xs font-bold">
                {['TTI 12문항', '반대 성향 매칭', '공동 우선순위', '관광지 추천', '3일 일정 생성', '날씨 대응', 'TTI 12문항', '반대 성향 매칭', '공동 우선순위', '관광지 추천', '3일 일정 생성', '날씨 대응'].map((item, index) => (
                  <span key={`${item}-${index}`} className="rounded-full bg-white/12 px-3 py-1">{item}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="relative min-h-80 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
            <div className="absolute left-5 top-6 w-[78%] max-w-sm rounded-lg border border-white/30 bg-white/18 p-4 text-white shadow-soft backdrop-blur-md float-slow">
              <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold">MATCHING PREVIEW</span><Sparkles className="h-4 w-4 text-sun" /></div>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-700 font-black">P</div>
                <div className="h-px flex-1 bg-white/40" />
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-coral font-black">W</div>
              </div>
              <p className="mt-3 text-sm font-semibold leading-5">즉흥 탐색가와 계획 실행가의 중간 일정 생성 중</p>
            </div>
            <div className="absolute bottom-6 right-5 w-[76%] max-w-sm rounded-lg border border-white/30 bg-[#fff8e7]/92 p-4 shadow-soft backdrop-blur float-delay">
              <div className="mb-3 flex items-center justify-between"><span className="text-xs font-black text-brand-900">DAY 2</span><MapPinned className="h-4 w-4 text-coral" /></div>
              {['10:30 성수 공방 체험', '13:00 검증 맛집 점심', '15:30 실내 전시 대체'].map((item) => (
                <div key={item} className="mb-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-bold text-ink">{item}</div>
              ))}
            </div>
            <div className="absolute bottom-5 left-5 hidden gap-3 lg:flex">
              {[
                { icon: BrainCircuit, label: 'TTI 분석' },
                { icon: UsersRound, label: '매칭' },
                { icon: CalendarCheck, label: '일정' }
              ].map((item) => {
                const Icon = item.icon;
                return <Card key={item.label} className="bg-[#fff8e7]/88 p-3"><Icon className="mb-2 h-5 w-5 text-brand-700" /><p className="text-sm font-bold">{item.label}</p></Card>;
              })}
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-3 md:grid-cols-4">
        {storyCards.map((card, index) => (
          <article key={card.number} className={`reveal-card min-h-44 rounded-lg p-5 shadow-soft ${card.tone}`} style={{ animationDelay: `${index * 90}ms` }}>
            <p className="text-sm font-black opacity-70">{card.number}</p>
            <h2 className="mt-7 text-xl font-black leading-7">{card.title}</h2>
            <p className="mt-3 text-sm font-semibold leading-6 opacity-80">{card.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
