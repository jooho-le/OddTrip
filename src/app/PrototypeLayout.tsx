import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useChatStore } from '../entities/chat/model/chatStore';
import { useTripStore } from '../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../shared/model/uiNoticeStore';

const NAV = [
  { to: '/home', label: '홈', match: ['/home'] },
  { to: '/matches', label: '동행 찾기', match: ['/matches'] },
  { to: '/my', label: '내 여행', match: ['/my', '/trip', '/decision', '/proposal', '/attractions', '/itinerary', '/safety', '/approval'] },
];

export function PrototypeLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useTripStore((state) => state.user);
  const logout = useTripStore((state) => state.logout);
  const unreadTotal = useChatStore((state) => state.unreadTotal);
  const loadUnreadCount = useChatStore((state) => state.loadUnreadCount);
  const connectSocket = useChatStore((state) => state.connectSocket);
  const disconnectSocket = useChatStore((state) => state.disconnectSocket);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => {
    void loadUnreadCount();
    connectSocket();
    return () => disconnectSocket();
  }, [loadUnreadCount, connectSocket, disconnectSocket]);

  useEffect(() => { setProfileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!profileOpen) return;
    const close = () => setProfileOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [profileOpen]);

  const signOut = () => {
    logout();
    setProfileOpen(false);
    navigate('/', { replace: true });
  };

  const nickname = user?.nickname ?? '여행자';

  return (
    <>
      <div id="appShell">
        <div className="utility-bar">
          <div className="utility-inner">
            <Link className="intro-return" to="/about">OddTrip 소개</Link>
            <button type="button" className="intro-return" onClick={() => showComingSoon('도움말')}>도움말</button>
            <button type="button" className="intro-return" onClick={signOut}>로그아웃</button>
          </div>
        </div>
        <header className="header">
          <div className="header-main">
            <Link className="brand" to="/home"><i>odd</i>trip<small>DIFFERENT TASTES, ONE TRIP</small></Link>
            <nav className="global-nav" aria-label="전역 메뉴">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={() => (item.match.some((path) => location.pathname.startsWith(path)) ? 'active' : '')}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="header-tools">
              <button type="button" className="round-btn" aria-label={unreadTotal ? `채팅 열기, 읽지 않은 메시지 ${unreadTotal}개` : '채팅 열기'} onClick={() => navigate('/chat')}>
                💬︎{unreadTotal > 0 ? <span className="tool-count">{unreadTotal > 99 ? '99+' : unreadTotal}</span> : null}
              </button>
              <button
                type="button"
                className="round-btn"
                aria-label="알림 기능 안내"
                onClick={() => showComingSoon('여행 알림', '여행 단계와 날씨를 알려주는 서버 알림은 현재 준비 중인 기능입니다. 채팅의 읽지 않은 메시지는 채팅 버튼에서 별도로 확인할 수 있습니다.')}
              >
                🔔︎
              </button>
              <button type="button" className="profile-btn" aria-expanded={profileOpen} onClick={(event) => { event.stopPropagation(); setProfileOpen((open) => !open); }}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" />
                  : <span className="profile-initial" aria-hidden="true">{nickname.slice(0, 1)}</span>}
                <span>{nickname}</span>⌄
              </button>
            </div>
          </div>
        </header>
      </div>

      <Outlet />

      <footer className="site-footer app-footer">
        <div className="site-footer-inner">
          <div>
            <div className="footer-brand"><i>odd</i>trip</div>
            <div className="footer-copy">Different tastes, one trip.<br />서로 다른 여행 취향을 한 번의 여행으로 조율합니다.</div>
          </div>
          <nav className="footer-links" aria-label="사이트 정보">
            <Link to="/about">서비스 소개</Link>
            <button type="button" onClick={() => showComingSoon('이용약관')}>이용약관</button>
            <button type="button" onClick={() => showComingSoon('개인정보처리방침')}>개인정보처리방침</button>
            <a href="mailto:hello@oddtrip.example">문의</a>
          </nav>
        </div>
        <div className="footer-bottom">© 2026 OddTrip. All rights reserved.</div>
      </footer>

      <div className={profileOpen ? 'profile-menu' : 'profile-menu hidden'} onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => navigate('/my')}>내 여행</button>
        <button type="button" onClick={() => navigate('/tti/start')}>여행 성향 다시 진단</button>
        <button type="button" onClick={() => navigate('/settings')}>계정 설정</button>
        <button type="button" onClick={signOut}>로그아웃</button>
      </div>
    </>
  );
}
