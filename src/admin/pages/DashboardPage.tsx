import type { ReactNode } from 'react';
import { ArrowUpRight, BrainCircuit, HeartHandshake, MapPinned, MoreHorizontal, Plane, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminTrips, adminUsers } from '../data';
import { PageHeading, Panel, StatusPill } from '../ui';

export function DashboardPage() {
  return <>
    <PageHeading eyebrow="Overview" title="오늘의 OddTrip" description="회원부터 매칭, 여행 생성과 외부 데이터 상태까지 서비스 흐름을 한눈에 확인합니다." action={<div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-500 shadow-sm">2026년 7월 22일 · 데모 기준</div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Users />} label="전체 회원" value="1,284" change="+12.8%" tone="dark" />
      <Metric icon={<HeartHandshake />} label="매칭 성사율" value="68.4%" change="+4.2%" tone="coral" />
      <Metric icon={<Plane />} label="진행 중 여행" value="42" change="+7건" />
      <Metric icon={<BrainCircuit />} label="TTI 완료율" value="86.7%" change="+2.1%" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      <Panel>
        <div className="flex items-start justify-between"><div><p className="text-lg font-black">서비스 성장</p><p className="mt-1 text-xs text-slate-400">최근 7일 가입자 및 여행 생성</p></div><button className="rounded-xl bg-slate-100 p-2"><MoreHorizontal className="h-4 w-4" /></button></div>
        <div className="mt-8 flex h-56 items-end gap-3 border-b border-slate-100 px-2">
          {[38, 52, 47, 67, 58, 81, 92].map((height, index) => <div key={index} className="flex h-full flex-1 items-end justify-center gap-1"><div className="w-2/5 rounded-t-lg bg-[#17201f]" style={{ height: `${height}%` }} /><div className="w-2/5 rounded-t-lg bg-[#ff6b55]" style={{ height: `${height * .68}%` }} /></div>)}
        </div>
        <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">{['수', '목', '금', '토', '일', '월', '오늘'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="mt-5 flex gap-5 text-xs font-bold"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#17201f]" />신규 회원</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#ff6b55]" />여행 생성</span></div>
      </Panel>
      <Panel>
        <div className="flex items-start justify-between"><div><p className="text-lg font-black">TTI 유형 분포</p><p className="mt-1 text-xs text-slate-400">상위 4개 유형 기준</p></div><BrainCircuit className="h-5 w-5 text-[#ff5a47]" /></div>
        <div className="mt-8 space-y-5">{[['PNFH', 28, '#ff5a47'], ['WCAS', 24, '#17201f'], ['WCAH', 19, '#4f46e5'], ['PCAH', 14, '#0d9488']].map(([code, value, color]) => <div key={String(code)}><div className="mb-2 flex justify-between text-xs font-black"><span>{code}</span><span>{value}%</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${value}%`, background: String(color) }} /></div></div>)}</div>
        <Link to="/admin/tti" className="mt-7 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-xs font-black hover:bg-slate-100">전체 유형 보기 <ArrowUpRight className="h-4 w-4" /></Link>
      </Panel>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Panel><SectionTitle title="최근 가입 회원" to="/admin/users" />{adminUsers.slice(0, 4).map(user => <div key={user.id} className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-xs font-black">{user.nickname.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="font-black">{user.nickname} <span className="ml-1 text-[10px] text-[#ff5a47]">{user.ttiCode}</span></p><p className="truncate text-xs text-slate-400">{user.email}</p></div><StatusPill value={user.status} /></div>)}</Panel>
      <Panel><SectionTitle title="최근 생성 여행" to="/admin/trips" />{adminTrips.slice(0, 4).map(trip => <Link to={`/admin/trips/${trip.id}`} key={trip.id} className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-orange-600"><MapPinned className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-black">{trip.title}</p><p className="text-xs text-slate-400">{trip.travelers.join(' · ')} · {trip.period}</p></div><StatusPill value={trip.status} /></Link>)}</Panel>
    </div>
  </>;
}

function Metric({ icon, label, value, change, tone }: { icon: ReactNode; label: string; value: string; change: string; tone?: 'dark' | 'coral' }) {
  return <div className={`rounded-[24px] border border-black/[.06] p-5 shadow-sm ${tone === 'dark' ? 'bg-[#17201f] text-white' : tone === 'coral' ? 'bg-[#ff624e] text-white' : 'bg-white'}`}><div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone ? 'bg-white/15' : 'bg-slate-100'}`}>{icon}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${tone ? 'bg-white/15' : 'bg-emerald-50 text-emerald-700'}`}>{change}</span></div><p className={`mt-8 text-xs font-bold ${tone ? 'text-white/55' : 'text-slate-400'}`}>{label}</p><p className="mt-1 text-3xl font-black tracking-[-.04em]">{value}</p></div>;
}

function SectionTitle({ title, to }: { title: string; to: string }) { return <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-black">{title}</h2><Link to={to} className="text-xs font-black text-[#ff5a47]">전체 보기</Link></div>; }
