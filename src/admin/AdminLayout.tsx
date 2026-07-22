import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Bell, BrainCircuit, ChevronLeft, Compass, Database, LayoutDashboard, MapPinned, Menu, Plane, Search, Users, X } from 'lucide-react';
import { cn } from '../shared/lib/classNames';

const navigation = [
  { to: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: '회원 관리', icon: Users },
  { to: '/admin/trips', label: '여행 관리', icon: Plane },
  { to: '/admin/attractions', label: '관광지 데이터', icon: MapPinned },
  { to: '/admin/tti', label: 'TTI 콘텐츠', icon: BrainCircuit },
  { to: '/admin/operations', label: '운영 상태', icon: Activity },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#17201f]">
      {open ? <button className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-label="메뉴 닫기" /> : null}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#111817] text-white transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <NavLink to="/admin" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ff5a47]"><Compass className="h-5 w-5" /></span>
            <div><p className="text-lg font-black tracking-tight">oddtrip</p><p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/45">Admin console</p></div>
          </NavLink>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[.2em] text-white/35">Workspace</p>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-white/60 transition hover:bg-white/5 hover:text-white', isActive && 'bg-white text-[#17201f] shadow-lg')}>
              <Icon className="h-5 w-5" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />모든 시스템 정상</div>
          <p className="mt-2 text-[11px] leading-5 text-white/40">프론트 데모 모드<br />마지막 확인 1분 전</p>
        </div>
      </aside>
      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="relative hidden sm:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="h-11 w-64 rounded-2xl bg-slate-100 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#ff5a47]/30" placeholder="회원, 여행 ID 검색" /></div>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/" className="hidden items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 sm:flex"><ChevronLeft className="h-4 w-4" />서비스로 돌아가기</NavLink>
            <button className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff5a47]" /></button>
            <div className="flex items-center gap-3 border-l pl-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17201f] text-sm font-black text-white">AD</span><div className="hidden sm:block"><p className="text-sm font-black">운영 관리자</p><p className="text-[11px] text-slate-400">super_admin</p></div></div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
