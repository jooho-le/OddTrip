import { ChevronLeft, ShieldCheck } from 'lucide-react';
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
    <header className="safe-top sticky top-0 z-30 border-b border-white/60 bg-[#fffaf0]/80 px-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          {!isHome ? <button aria-label="뒤로가기" onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button> : null}
          <Link to="/" className="flex items-center gap-2 font-black text-brand-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white">o</span>
            <span className="hidden sm:inline">oddtrip</span>
          </Link>
          <span className="text-sm font-bold text-slate-700">{title}</span>
        </div>
        <Link to="/safety" className="rounded-full p-2 text-brand-900 hover:bg-brand-50" aria-label="안전 알림"><ShieldCheck className="h-5 w-5" /></Link>
      </div>
    </header>
  );
}
