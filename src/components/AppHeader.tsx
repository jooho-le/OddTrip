import { ChevronLeft, Search, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const titles: Record<string, string> = {
  '/tti/start': 'TTI 진단',
  '/tti/questions': 'TTI 진단',
  '/tti/result': '진단 결과',
  '/matches': '매칭 추천',
  '/decision': '공동 의사결정',
  '/attractions': '관광지 추천',
  '/itinerary': '일정',
  '/safety': '알림 / 안전',
  '/my': '내 여행'
};

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const title = titles[location.pathname] ?? (location.pathname.startsWith('/matches/') ? '매칭 상세' : location.pathname.startsWith('/itinerary/') ? '일정 상세' : 'oddtrip');

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-black/5 bg-white/92 px-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          {!isHome ? <button aria-label="뒤로가기" onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-slate-100"><ChevronLeft className="h-6 w-6" /></button> : null}
          <Link to="/" className="flex items-center gap-3 font-black text-ink">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#006bff] text-lg text-white shadow-[0_10px_24px_rgba(0,107,255,0.25)]">o</span>
            <span className="text-xl tracking-tight">oddtrip</span>
          </Link>
          <span className="hidden text-sm font-black text-slate-700 sm:inline">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-slate-100" aria-label="검색"><Search className="h-5 w-5" /></button>
          <Link to="/safety" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-slate-100" aria-label="안전 알림"><ShieldCheck className="h-5 w-5" /></Link>
        </div>
      </div>
    </header>
  );
}
