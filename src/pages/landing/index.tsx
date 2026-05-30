import { ArrowRight, CalendarRange, Check, CloudSun, Compass, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

const newsCards = [
  { kicker: '01 TTI', title: '여행 리듬을 읽고', text: '12문항으로 즉흥/계획, 자연/도시, 활동/휴식 축을 계산합니다.', tone: 'bg-[#101114] text-white' },
  { kicker: '02 MATCH', title: '다른 취향과 연결', text: '비슷한 사람이 아니라 여행을 넓혀줄 반대 성향을 보여줍니다.', tone: 'gradient-panel text-white' },
  { kicker: '03 취향 균형', title: '둘 사이의 적당한 온도', text: '한 사람 취향만 따라가지 않도록 중간 지점 후보를 만듭니다.', tone: 'bg-[#f5d04c] text-[#111111]' },
  { kicker: '04 PLAN', title: '바로 실행 가능한 일정', text: '관광지, 식사, 이동, 휴식을 시간대별로 배치합니다.', tone: 'bg-white text-[#111111]' }
];

const moments = [
  {
    title: '즉흥파와 계획파가 같이 가는 방법',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=86'
  },
  {
    title: '숨은 명소와 대표 코스를 한 번에',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=86'
  },
  {
    title: '날씨가 바뀌면 일정도 바로 조정',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=86'
  }
];

const featureCards = [
  { title: 'TTI 진단', text: '12문항으로 여행 성향을 16개 유형 중 하나로 계산합니다.', icon: Compass, tone: 'bg-white text-[#111111]' },
  { title: '반대 성향 매칭', text: '비슷한 사람이 아니라 나를 보완하는 여행자를 찾습니다.', icon: Heart, tone: 'gradient-panel text-white' },
  { title: '공동 일정', text: '장소, 음식, 예산, 속도를 함께 조율합니다.', icon: CalendarRange, tone: 'bg-[#101114] text-white' },
  { title: '날씨 주의', text: '비와 강풍처럼 일정에 영향을 주는 상황을 알려줍니다.', icon: CloudSun, tone: 'bg-[#e9f7ff] text-[#0f3450]' }
];

export function LandingPage() {
  return (
    <div className="bg-[#fbf5ee] text-[#111111]">
      <section className="relative min-h-[92svh] overflow-hidden bg-[#101114] text-white">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=88"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-42"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,17,20,0.96)_0%,rgba(16,17,20,0.82)_46%,rgba(16,17,20,0.34)_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[46vw] bg-[radial-gradient(circle_at_20%_24%,rgba(253,38,122,0.44),transparent_38%)]" />

        <div className="relative z-10 mx-auto grid min-h-[92svh] max-w-7xl items-center gap-10 px-5 pb-14 pt-32 md:grid-cols-[1fr_380px] md:px-8">
          <div>
            <p className="motion-card inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/86 backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              AI Travel Match
            </p>
            <h1 className="mt-8 max-w-4xl text-[62px] font-black leading-[0.9] tracking-[-0.055em] md:text-[104px]">
              혼자 떠난 여행을,
              <br />
              가장 낯선 취향과
              <br />
               연결하다
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-bold leading-8 text-white/78 md:text-xl md:leading-9">
              OddTrip은 혼자 여행하는 사람을 반대 성향 여행자와 연결하고, 
              <br />
              새로운 여행 라이프스타일을 만들어갑니다.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/tti/start">
                <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full bg-white text-[#fd267a] shadow-[0_22px_60px_rgba(253,38,122,0.32)] hover:bg-white/95 sm:w-auto">
                  여행 성향 진단 시작하기
                </Button>
              </Link>
              <Link to="/matches" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/24 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/16">
                매칭 카드 보기
              </Link>
            </div>
          </div>

          <div className="motion-card hidden rounded-[38px] border border-white/16 bg-white/12 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:block">
            <div className="overflow-hidden rounded-[30px]">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=86"
                alt=""
                className="h-72 w-full object-cover"
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/52">today match</p>
                <p className="mt-2 text-3xl font-black leading-8">PNFH + WCAS</p>
              </div>
              <span className="rounded-full bg-[#f5d04c] px-3 py-2 text-xs font-black text-[#111111]">89%</span>
            </div>
            <div className="mt-5 space-y-2">
              {['반대 성향 매칭', '균형점 관광지 추천', 'AI 일정 생성'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-sm font-black">
                  <Check className="h-4 w-4 text-[#f5d04c]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbf5ee] py-8 md:py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 sm:grid-cols-2 md:px-8 xl:grid-cols-4">
          {newsCards.map((card) => (
            <article key={card.title} className={`min-h-[250px] rounded-[34px] p-7 shadow-[0_20px_60px_rgba(16,17,20,0.12)] ${card.tone}`}>
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{card.kicker}</p>
              <h2 className="mt-14 text-3xl font-black leading-9 tracking-[-0.035em]">{card.title}</h2>
              <p className="mt-4 text-sm font-bold leading-6 opacity-74">{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-10 md:grid-cols-[0.78fr_1.22fr] md:px-8 md:py-16">
        <div className="rounded-[38px] bg-[#101114] p-8 text-white md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f5d04c]">Why oddtrip</p>
          <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.045em] md:text-5xl">
            취향을
            <br />
            맞추는 것이 아니라
            <br />
            넓히는 것.
          </h2>
          <p className="mt-8 text-base font-bold leading-7 text-white/68">
            둘 중 한 명의 취향만 따라가는 일정이 아니라, 
            <br />
            서로에게 새롭지만 감당 가능한 선택지를 찾습니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {moments.map((moment, index) => (
            <article key={moment.title} className="motion-card hover-lift group relative min-h-[390px] overflow-hidden rounded-[36px] bg-[#111111] shadow-[0_22px_70px_rgba(16,17,20,0.16)]" style={{ animationDelay: `${index * 100}ms` }}>
              <img src={moment.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="mb-3 inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-black backdrop-blur">story {index + 1}</p>
                <h3 className="text-2xl font-black leading-8 tracking-[-0.025em]">{moment.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-32 md:grid-cols-4 md:px-8">
        {featureCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className={`motion-card hover-lift min-h-64 rounded-[32px] p-7 shadow-[0_20px_60px_rgba(16,17,20,0.10)] ${card.tone}`} style={{ animationDelay: `${index * 80}ms` }}>
              <Icon className="h-7 w-7" />
              <h2 className="mt-20 text-2xl font-black leading-8 tracking-[-0.025em]">{card.title}</h2>
              <p className="mt-3 text-sm font-bold leading-6 opacity-76">{card.text}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
