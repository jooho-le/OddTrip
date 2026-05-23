import { ArrowRight, CalendarCheck, Heart, MapPin, Plane, Route, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

const heroPhotos = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=86',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1000&q=86',
  'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1000&q=86'
];

const newsCards = [
  { kicker: '01 TTI', title: '너의 여행 리듬을 먼저 읽고', text: '12문항으로 즉흥/계획, 자연/도시, 활동/휴식 축을 계산합니다.', tone: 'bg-[#101114] text-white' },
  { kicker: '02 MATCH', title: '다른 취향을 스와이프', text: '비슷한 사람이 아니라 여행을 넓혀줄 반대 성향을 보여줍니다.', tone: 'gradient-panel text-white' },
  { kicker: '03 BALANCE', title: '둘 사이의 적당한 온도', text: '한 사람 취향만 따라가지 않도록 중간 지점 후보를 만듭니다.', tone: 'bg-[#f5d04c] text-[#111111]' },
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
  { title: 'TTI 진단', text: '12문항으로 여행 성향을 16개 유형 중 하나로 계산합니다.', icon: Route, tone: 'bg-white text-[#111111]' },
  { title: '반대 성향 매칭', text: '비슷한 사람이 아니라 나를 보완하는 여행자를 찾습니다.', icon: UsersRound, tone: 'gradient-panel text-white' },
  { title: '공동 일정', text: '장소, 음식, 예산, 속도를 함께 조율합니다.', icon: CalendarCheck, tone: 'bg-[#101114] text-white' },
  { title: '안전 대응', text: '날씨와 재난 알림을 일정 조정 신호로 보여줍니다.', icon: ShieldCheck, tone: 'bg-[#e9f7ff] text-[#0f3450]' }
];

export function LandingPage() {
  return (
    <div className="bg-[#fbf5ee] text-[#111111]">
      <section className="relative min-h-[100svh] overflow-hidden bg-[#101114] text-white">
        <PhotoMosaic />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(253,38,122,0.52),transparent_32%),linear-gradient(90deg,rgba(16,17,20,0.94)_0%,rgba(16,17,20,0.72)_45%,rgba(16,17,20,0.26)_100%)]" />

        <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-7xl items-center gap-10 px-5 pb-16 pt-32 md:grid-cols-[1fr_430px] md:px-8 md:pb-20">
          <div>
            <p className="motion-card inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/86 backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              AI Travel Match
            </p>
            <h1 className="mt-8 max-w-4xl text-[64px] font-black leading-[0.86] tracking-[-0.055em] md:text-[118px]">
              반대라서
              <br />
              더 재밌는
              <br />
              여행.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-bold leading-8 text-white/78 md:text-2xl md:leading-10">
              oddtrip은 혼자 여행하는 사람을 반대 성향 여행자와 연결하고, 둘의 균형점으로 관광지와 일정을 만듭니다.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/tti/start">
                <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full bg-white text-[#fd267a] shadow-[0_22px_60px_rgba(253,38,122,0.32)] hover:bg-white/95 sm:w-auto">
                  TTI 시작하기
                </Button>
              </Link>
              <Link to="/matches" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/24 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/16">
                매칭 카드 보기
              </Link>
            </div>
            <LiveTicker />
          </div>

          <div className="relative mx-auto h-[610px] w-full max-w-[430px]">
            <MatchPhotoCard
              className="left-3 top-20 rotate-[-10deg]"
              imageUrl="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=86"
              name="지후"
              type="WCAS"
              caption="계획적으로 동선을 잡지만, 새로운 장소에도 열려 있어요."
            />
            <MatchPhotoCard
              className="right-2 top-2 rotate-[7deg]"
              imageUrl="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=86"
              name="민서"
              type="PNFH"
              caption="걷다가 발견하는 골목과 카페를 좋아하는 즉흥파예요."
            />
            <div className="motion-card absolute bottom-6 left-8 right-8 rounded-[34px] border border-white/14 bg-white/12 p-5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)]" style={{ animationDelay: '380ms' }}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#f5d04c] px-3 py-1 text-xs font-black text-[#111111]">89% 추천</span>
                <span className="text-xs font-black text-white/62">opposite match</span>
              </div>
              <p className="mt-5 text-3xl font-black leading-9">도시 산책 + 예약된 저녁 코스</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="grid h-14 place-items-center rounded-full bg-white/12 text-white"><X className="h-6 w-6" /></button>
                <button className="grid h-14 place-items-center rounded-full bg-white text-[#fd267a]"><Heart className="h-6 w-6 fill-current" /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#fbf5ee] py-8 md:py-12">
        <div className="card-swipe flex w-[210%] gap-4 px-5 md:w-[140%] md:px-8">
          {newsCards.map((card) => (
            <article key={card.title} className={`min-h-[250px] w-[310px] shrink-0 rounded-[34px] p-7 shadow-[0_20px_60px_rgba(16,17,20,0.12)] md:w-[390px] ${card.tone}`}>
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
          <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.045em] md:text-7xl">
            취향을
            <br />
            섞는 게
            <br />
            아니라
            <br />
            넓히는 것.
          </h2>
          <p className="mt-8 text-base font-bold leading-7 text-white/68">
            둘 중 한 명의 취향만 따라가는 일정이 아니라, 서로에게 새롭지만 감당 가능한 선택지를 찾습니다.
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

function PhotoMosaic() {
  return (
    <div className="absolute inset-y-0 right-0 hidden w-[56vw] grid-cols-3 gap-3 p-5 opacity-92 md:grid">
      {heroPhotos.map((photo, index) => (
        <div key={photo} className="drift-a overflow-hidden rounded-[34px]" style={{ marginTop: `${index * 56}px`, animationDelay: `${index * 420}ms` }}>
          <img src={photo} alt="" className="h-full min-h-[82vh] w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function LiveTicker() {
  return (
    <div className="mt-9 max-w-2xl overflow-hidden rounded-full border border-white/12 bg-white/10 px-3 py-3 backdrop-blur">
      <div className="ticker-track flex w-max gap-3 text-xs font-black text-white">
        {['TTI 12문항', '반대 성향 매칭', 'TourAPI 관광지', '혼잡 회피', '공동 우선순위', 'AI 일정 생성', '날씨 대응', 'TTI 12문항', '반대 성향 매칭', 'TourAPI 관광지', '혼잡 회피', '공동 우선순위', 'AI 일정 생성', '날씨 대응'].map((item, index) => (
          <span key={`${item}-${index}`} className="rounded-full bg-white/14 px-3 py-1">{item}</span>
        ))}
      </div>
    </div>
  );
}

function MatchPhotoCard({ className, imageUrl, name, type, caption }: { className: string; imageUrl: string; name: string; type: string; caption: string }) {
  return (
    <article className={`motion-card absolute h-[500px] w-[320px] overflow-hidden rounded-[38px] bg-white shadow-[0_34px_90px_rgba(0,0,0,0.34)] ${className}`}>
      <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/20 to-transparent" />
      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#fd267a]">{type}</span>
        <Plane className="h-5 w-5 text-white" />
      </div>
      <div className="absolute bottom-6 left-5 right-5 text-white">
        <div className="mb-4 flex items-center gap-2 text-xs font-black text-white/76">
          <MapPin className="h-4 w-4 text-[#f5d04c]" />
          Seoul, Busan, Jeju
        </div>
        <h2 className="text-5xl font-black leading-none tracking-[-0.04em]">{name}</h2>
        <p className="mt-4 text-sm font-bold leading-6 text-white/82">{caption}</p>
      </div>
    </article>
  );
}
