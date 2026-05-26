import { ChevronLeft, LogIn, LogOut, Search, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../shared/lib/classNames';
import { useTripStore } from '../entities/tripStore';

const titles: Record<string, string> = {
  '/tti/start': 'TTI 진단',
  '/auth': '로그인',
  '/tti/questions': 'TTI 진단',
  '/tti/result': '진단 결과',
  '/matches': '매칭 추천',
  '/decision': '공동 의사결정',
  '/attractions': '관광지 추천',
  '/itinerary': '일정',
  '/safety': '날씨 / 주의',
  '/my': '내 여행'
};

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useTripStore();
  const isHome = location.pathname === '/';
  const title = titles[location.pathname] ?? (location.pathname.startsWith('/matches/') ? '매칭 상세' : location.pathname.startsWith('/itinerary/') ? '일정 상세' : 'oddtrip');

  return (
    <header className={cn('safe-top z-30 px-4 backdrop-blur-xl md:px-8', isHome ? 'absolute left-0 right-0 top-0 border-b border-white/10 bg-transparent text-white' : 'sticky top-0 border-b border-black/5 bg-white/92')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          {!isHome ? <button aria-label="뒤로가기" onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-slate-100"><ChevronLeft className="h-6 w-6" /></button> : null}
          <Link to="/" className={cn('flex items-center gap-3 font-black', isHome ? 'text-white' : 'text-ink')}>
            <span className="gradient-panel grid h-10 w-10 place-items-center rounded-full text-lg text-white shadow-[0_10px_24px_rgba(253,38,122,0.25)]">o</span>
            <span className="text-xl tracking-tight">oddtrip</span>
          </Link>
          <span className={cn('hidden text-sm font-black sm:inline', isHome ? 'text-white/72' : 'text-slate-700')}>{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={cn('grid h-10 w-10 place-items-center rounded-full hover:bg-white/12', isHome ? 'text-white' : 'text-ink hover:bg-slate-100')} aria-label="검색"><Search className="h-5 w-5" /></button>
          <Link to="/safety" className={cn('grid h-10 w-10 place-items-center rounded-full hover:bg-white/12', isHome ? 'text-white' : 'text-ink hover:bg-slate-100')} aria-label="날씨 주의사항"><ShieldCheck className="h-5 w-5" /></Link>
          {user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/auth');
              }}
              className={cn('grid h-10 w-10 place-items-center rounded-full hover:bg-white/12', isHome ? 'text-white' : 'text-ink hover:bg-slate-100')}
              aria-label="로그아웃"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/auth" className={cn('grid h-10 w-10 place-items-center rounded-full hover:bg-white/12', isHome ? 'text-white' : 'text-ink hover:bg-slate-100')} aria-label="로그인"><LogIn className="h-5 w-5" /></Link>
          )}
        </div>
      </div>
    </header>
  );
}
