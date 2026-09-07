import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useChatStore } from '../../entities/chat/model/chatStore';

const links = [
  { to: '/', label: '홈', end: true },
  { to: '/matches', label: '동행 찾기' },
  { to: '/my', label: '내 여행' },
];

export function AppHeader() {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useTripStore();
  const unreadTotal = useChatStore((state) => state.unreadTotal);
  const loadUnreadCount = useChatStore((state) => state.loadUnreadCount);

  useEffect(() => {
    if (!user) return;
    void loadUnreadCount();
    const timer = window.setInterval(() => void loadUnreadCount(), 30_000);
    return () => window.clearInterval(timer);
  }, [user, loadUnreadCount]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const signOut = () => {
    logout();
    setProfileOpen(false);
    navigate('/');
  };

  return (
    <>
      <div className="utility-bar"><div className="utility-inner"><Link to="/">OddTrip 소개</Link><span>도움말 · 준비 중</span>{user ? <button className="text-btn" onClick={signOut}>로그아웃</button> : null}</div></div>
      <header className="header">
        <div className="header-main">
          <Link className="brand" to="/"><i>odd</i>trip<small>DIFFERENT TASTES, ONE TRIP</small></Link>
          {user ? <nav className="global-nav" aria-label="전역 메뉴">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}</nav> : null}
          <div className="header-tools">
            {user ? <Link className="round-btn" to="/chat" aria-label={`채팅${unreadTotal ? `, 읽지 않음 ${unreadTotal}개` : ''}`}><MessageCircle />{unreadTotal > 0 ? <span className="tool-dot" /> : null}</Link> : null}
            {user ? <button className="round-btn" onClick={() => setNoticeOpen((open) => !open)} aria-label="알림 안내" aria-expanded={noticeOpen}><Bell />{unreadTotal > 0 ? <span className="tool-dot" /> : null}</button> : null}
            {user ? (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button className="profile-btn" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="avatar" style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff' }}>{user.nickname.slice(0, 1)}</span>}
                  <span>{user.nickname}</span><span aria-hidden="true">⌄</span>
                </button>
                {profileOpen ? <div className="profile-menu" style={{ position: 'absolute', top: 47, right: 0 }}><Link to="/my" onClick={() => setProfileOpen(false)}>내 여행</Link><Link to="/tti/start" onClick={() => setProfileOpen(false)}>여행 성향 다시 진단</Link><Link to="/settings" onClick={() => setProfileOpen(false)}>계정 설정</Link>{user.role === 'admin' ? <Link to="/admin" onClick={() => setProfileOpen(false)}>관리자 콘솔</Link> : null}<button onClick={signOut}>로그아웃</button></div> : null}
              </div>
            ) : <Link className="header-login" to="/auth">로그인</Link>}
          </div>
        </div>
      </header>
      {noticeOpen ? <div className="notice-popover"><div className="side-head">알림 <button className="round-btn" style={{ width: 28, height: 28, marginLeft: 'auto' }} onClick={() => setNoticeOpen(false)} aria-label="닫기"><X style={{ width: 14, height: 14 }} /></button></div><div className="notice-empty"><b>{unreadTotal ? `읽지 않은 채팅 ${unreadTotal}개` : '새 채팅이 없습니다.'}</b>채팅 수는 실시간 API 값입니다. 여행 단계·날씨 알림은 서버 알림 계약이 없어 표시하지 않습니다.<div style={{ marginTop: 9 }}><span className="waiting-label">서버 알림 연결 대기</span></div></div></div> : null}
    </>
  );
}
