import { useEffect, useState } from 'react';
import { ChevronDown, Compass, LogOut, MessageCircle, Settings, UserRound } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../shared/lib/classNames';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Avatar } from '../../shared/ui/Avatar';
import { NotificationBell, NotificationCenter } from '../../features/notifications/NotificationCenter';
import { chatService } from '../../entities/chat/api/chatService';
import { subscribeRealtime } from '../../shared/realtime/socketBus';

const links = [{ to: '/tti/start', label: '여행 성향' }, { to: '/matches', label: '매칭' }, { to: '/attractions', label: '여행지' }, { to: '/itinerary', label: '일정' }];

export function AppHeader() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useTripStore();
  const isHome = location.pathname === '/';
  useEffect(() => {
    if (!user) { setChatUnread(0); return; }
    const refresh = () => void chatService.getUnreadCount().then((response) => setChatUnread(response.data.count)).catch(() => undefined);
    refresh();
    return subscribeRealtime(refresh);
  }, [user?.id]);

  return <>
    <header className={cn('safe-top z-40 border-b px-4 backdrop-blur-xl md:px-8', isHome ? 'absolute inset-x-0 top-0 border-black/5 bg-[#f8f5f0]/90 text-ink' : 'sticky top-0 border-black/5 bg-[#f8f5f0]/94 text-ink')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5">
        <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-[-0.04em]"><span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white"><Compass className="h-4 w-4" strokeWidth={3}/></span>oddtrip</Link>
        <nav className="hidden items-center gap-7 md:flex">{links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => cn('text-sm font-bold text-muted transition hover:text-ink', isActive && 'text-ink')}>{link.label}</NavLink>)}</nav>
        <div className="flex items-center gap-1">
          {user ? <Link to="/chat" className="icon-button relative" aria-label={`채팅${chatUnread ? `, 읽지 않은 메시지 ${chatUnread}개` : ''}`}><MessageCircle className="h-5 w-5" />{chatUnread ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#fd267a] px-1 text-[10px] font-black text-white">{chatUnread > 99 ? '99+' : chatUnread}</span> : null}</Link> : null}
          <button onClick={() => setNotificationsOpen(true)} className="icon-button" aria-label="알림"><NotificationBell /></button>
          {user ? <div className="relative"><button onClick={() => setAccountOpen((value) => !value)} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-black/5"><Avatar src={user.avatarUrl} fallback={user.nickname} className="h-8 w-8"/><span className="hidden text-xs font-extrabold sm:inline">{user.nickname}</span><ChevronDown className="h-3.5 w-3.5"/></button>
            {accountOpen ? <div className="absolute right-0 top-12 w-48 rounded-2xl border border-line bg-white p-2 shadow-modal"><Link onClick={() => setAccountOpen(false)} to="/my" className="menu-item"><UserRound className="h-4 w-4"/>내 여행</Link><Link onClick={() => setAccountOpen(false)} to="/settings" className="menu-item"><Settings className="h-4 w-4"/>계정 설정</Link><button onClick={() => { logout(); navigate('/auth'); }} className="menu-item w-full text-danger"><LogOut className="h-4 w-4"/>로그아웃</button></div> : null}
          </div> : <Link to="/auth" className="ml-1 rounded-full bg-accent px-4 py-2 text-xs font-extrabold text-white">로그인</Link>}
        </div>
      </div>
    </header>
    <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
  </>;
}
