import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useProtoStore } from '../features/prototype/protoStore';
import { img } from '../features/prototype/protoData';
import { useTripStore } from '../entities/trip/model/tripStore';

const NAV = [
  { to: '/home', label: '홈', match: ['/home'] },
  { to: '/matches', label: '동행 찾기', match: ['/matches'] },
  { to: '/my', label: '내 여행', match: ['/my', '/trip'] }
];

export function PrototypeLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const chatOpen = useProtoStore((s) => s.chatOpen);
  const setChatOpen = useProtoStore((s) => s.setChatOpen);
  const messages = useProtoStore((s) => s.messages);
  const sendMessage = useProtoStore((s) => s.sendMessage);
  const toastMessage = useProtoStore((s) => s.toastMessage);
  const toast = useProtoStore((s) => s.toast);

  const user = useTripStore((s) => s.user);
  const logout = useTripStore((s) => s.logout);

  // 세션(스토어 + localStorage 토큰)을 실제로 비운 뒤 인트로로 돌아갑니다.
  const signOut = () => {
    logout();
    setProfileOpen(false);
    navigate('/', { replace: true });
  };

  useEffect(() => { setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', chatOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [chatOpen]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const send = () => {
    const value = inputRef.current?.value.trim();
    if (!value || !inputRef.current) return;
    sendMessage(value);
    inputRef.current.value = '';
  };

  return (
    <>
      <div id="appShell">
        <div className="utility-bar">
          <div className="utility-inner">
            <Link className="intro-return" to="/">OddTrip 소개</Link>
            <span>도움말</span>
            {user
              ? <button type="button" className="intro-return" onClick={signOut}>로그아웃</button>
              : <button type="button" className="intro-return" onClick={() => navigate('/auth')}>로그인</button>}
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
              <button type="button" className="round-btn" aria-label="채팅 열기" onClick={() => setChatOpen(true)}>💬︎<span className="tool-dot"></span></button>
              <button type="button" className="round-btn" aria-label="알림 보기" onClick={() => toast('새 알림 2개 · 지우님 제출 완료, 부산 비 소식')}>🔔︎<span className="tool-dot"></span></button>
              <button type="button" className="profile-btn" onClick={(event) => { event.stopPropagation(); setProfileOpen((open) => !open); }}>
                <img src={img('photo-1494790108377-be9c29b29330', 120, 80)} alt="은진" /><span>은진</span>⌄
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
            <Link to="/">서비스 소개</Link>
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
            <a href="mailto:hello@oddtrip.example">문의</a>
          </nav>
        </div>
        <div className="footer-bottom">© 2026 OddTrip. All rights reserved.</div>
      </footer>

      <div className={chatOpen ? 'scrim' : 'scrim hidden'} onClick={() => setChatOpen(false)}></div>
      <aside className={chatOpen ? 'drawer' : 'drawer hidden'} aria-label="채팅 패널">
        <div className="drawer-head">
          <h2>지우님과의 채팅</h2>
          <button type="button" aria-label="채팅 닫기" onClick={() => setChatOpen(false)}>×</button>
        </div>
        <div className="chat-context"><b>부산 2박 3일</b><p>현재 단계 · 함께 정하기</p></div>
        <div className="messages" ref={messagesRef}>
          {messages.map((message, index) => (
            <div className={message.me ? 'bubble me' : 'bubble'} key={`${index}-${message.text}`}>{message.text}</div>
          ))}
        </div>
        <div className="message-box">
          <input ref={inputRef} placeholder="메시지를 입력하세요" onKeyDown={(event) => { if (event.key === 'Enter') send(); }} />
          <button type="button" onClick={send}>전송</button>
        </div>
      </aside>

      <div className={profileOpen ? 'profile-menu' : 'profile-menu hidden'}>
        <button type="button" onClick={() => navigate('/my')}>내 여행</button>
        <button type="button" onClick={() => navigate('/survey/tti')}>여행 성향 다시 진단</button>
        <button type="button" onClick={() => navigate('/settings')}>계정 설정</button>
        {user
          ? <button type="button" onClick={signOut}>로그아웃</button>
          : <button type="button" onClick={() => navigate('/auth')}>로그인</button>}
      </div>

      <div className={toastMessage ? 'toast show' : 'toast'}>{toastMessage}</div>
    </>
  );
}
