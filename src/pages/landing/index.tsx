import { ArrowRight, Check, Compass, HeartHandshake, MapPinned, Route, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';

const steps = [
  { no: '01', title: 'Flexible & Structured', text: '즉흥과 계획의 리듬' },
  { no: '02', title: 'Comfortable & Novel', text: '익숙함과 새로움의 균형' },
  { no: '03', title: 'Relaxed & Active', text: '휴식과 활동의 온도' },
  { no: '04', title: 'Iconic & Local', text: '대표 명소와 숨은 장소' }
];

const flow = [
  { icon: Compass, title: '나의 여행 성향', text: '12개의 질문으로 여행 리듬을 발견해요.' },
  { icon: HeartHandshake, title: '취향 반대 매칭', text: '나를 보완해 줄 새로운 여행자를 만나요.' },
  { icon: MapPinned, title: '함께 고른 여행지', text: '서로의 취향 사이 균형점을 찾아요.' },
  { icon: Route, title: '둘만의 일정', text: '바로 떠날 수 있는 일정으로 완성해요.' }
];

export function LandingPage() {
  return <div className="landing bg-canvas text-ink">
    <section className="mx-auto grid min-h-[720px] max-w-6xl items-center gap-14 px-5 pb-20 pt-28 md:grid-cols-[1.05fr_.95fr] md:px-8 md:pt-32">
      <div className="motion-card">
        <Badge className="bg-accent-soft text-accent"><Sparkles className="mr-1.5 h-3.5 w-3.5"/>ODD MATCHING · TRAVEL VOYAGE</Badge>
        <h1 className="mt-6 text-[46px] font-black leading-[1.06] tracking-[-0.055em] md:text-[68px]">낯선 취향과의 만남,<br/>완벽하게 조율되는<br/>우리만의 여행</h1>
        <p className="mt-6 max-w-xl text-sm font-medium leading-7 text-muted md:text-base">TTI 4가지 지표로 서로 다른 여행 취향을 이해하고, AI와 함께 누구도 포기하지 않는 여행을 설계합니다.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link to="/tti/start"><Button icon={<ArrowRight className="h-4 w-4"/>}>취향 여행 찾기</Button></Link><Link to="/matches" className="inline-flex min-h-12 items-center rounded-full border border-line bg-white px-6 text-sm font-extrabold">여행 성향 먼저 살펴보기</Link></div>
      </div>
      <div className="relative mx-auto w-full max-w-md motion-card">
        <div className="absolute -inset-6 rounded-[44px] bg-accent/10 blur-3xl"/>
        <article className="relative rotate-[1.5deg] overflow-hidden rounded-[30px] border-[10px] border-white bg-white shadow-[0_35px_80px_rgba(29,27,25,.24)]">
          <div className="relative h-[390px]"><img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=88" alt="노을이 비치는 바다 여행지" className="h-full w-full object-cover"/><div className="absolute left-4 top-4 flex -space-x-2"><span className="h-8 w-8 rounded-full border-2 border-white bg-[#ffd7c7]"/><span className="h-8 w-8 rounded-full border-2 border-white bg-[#b8d8db]"/><Badge className="ml-2 bg-white text-ink">2,000+ 함께한 여행</Badge></div></div>
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/94 p-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.16em] text-muted">Today’s matching</p><div className="mt-1 flex items-center justify-between"><strong className="text-xl">SNRI · FCAL</strong><Badge className="bg-accent text-white">MATCH 89%</Badge></div></div>
        </article>
      </div>
    </section>

    <section className="border-y border-line bg-white/55"><div className="mx-auto grid max-w-6xl grid-cols-2 px-5 md:grid-cols-4 md:px-8">{['TTI 성향 진단','반대 취향 매칭','균형점 여행지','AI 일정 완성'].map((item, index) => <div key={item} className="border-line px-4 py-7 text-center md:border-r last:border-r-0"><span className="block text-xs font-black text-accent">0{index + 1}</span><span className="mt-1 block text-xs font-extrabold">{item}</span></div>)}</div></section>

    <section className="mx-auto max-w-6xl px-5 py-24 md:px-8"><p className="eyebrow">STEP 01 · TTI 4개 성향 진단</p><h2 className="section-heading">12개 문항으로 계산하는<br/>당신의 4가지 여행 지표</h2><p className="section-copy">Travel Type Indicator, 네 가지 축은 여행에서 중요한 선택을 명확하게 보여줍니다.</p><div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">{steps.map((step) => <article key={step.no} className="rounded-2xl border border-line bg-white p-5 shadow-card"><span className="text-xs font-black text-accent">{step.no}</span><h3 className="mt-6 text-sm font-black">{step.title}</h3><p className="mt-2 text-xs text-muted">{step.text}</p></article>)}</div><div className="mt-5 flex items-center gap-3 rounded-2xl bg-ink p-5 text-sm font-bold text-white"><span className="grid h-7 w-7 place-items-center rounded-full border border-white/20"><Check className="h-4 w-4 text-accent"/></span>정답은 없어요. 지금의 나와 가장 가까운 선택으로 여행 취향을 찾아보세요.</div></section>

    <section className="bg-ink py-24 text-white"><div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2 md:px-8"><div><p className="eyebrow">STEP 02 · OPPOSITE MATCH</p><h2 className="section-heading text-white">나를 닮은 사람이 아닌,<br/>넓혀줄 사람을 찾습니다</h2><p className="mt-6 max-w-lg text-sm leading-7 text-white/60">비슷한 취향의 편안함보다 서로의 시야를 넓힐 수 있는 균형점을 계산해 연결합니다.</p><ul className="mt-8 space-y-4 text-sm font-bold">{['반대 성향을 명확하게 비교','서로 보완할 수 있는 지점 발견','함께할 때의 여행 모습 미리보기'].map((item, i) => <li key={item} className="flex items-center gap-3 border-b border-white/10 pb-4"><span className="text-accent">0{i+1}</span>{item}</li>)}</ul></div><img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=86" alt="호수와 산 여행지" className="h-[420px] w-full rounded-[28px] object-cover shadow-modal"/></div></section>

    <section className="mx-auto max-w-6xl px-5 py-24 md:px-8"><p className="eyebrow">STEP 03 · JOURNEY FLOW</p><h2 className="section-heading">한쪽 취향만 따라가지 않도록,<br/>함께 조율하는 4단계</h2><div className="mt-10 grid gap-4 md:grid-cols-4">{flow.map(({ icon: Icon, title, text }, i) => <article key={title} className="rounded-2xl border border-line bg-white p-6"><Icon className="h-5 w-5 text-accent"/><span className="mt-8 block text-[10px] font-black text-accent">0{i+1}</span><h3 className="mt-2 font-black">{title}</h3><p className="mt-3 text-xs leading-5 text-muted">{text}</p></article>)}</div></section>
  </div>;
}
