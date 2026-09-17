import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useChatStore } from '../entities/chat/model/chatStore';
import { chatService } from '../entities/chat/api/chatService';
import { safetyService } from '../entities/chat/api/safetyService';
import { useTripStore } from '../entities/trip/model/tripStore';
import { imageUrl, PROFILE_FALLBACKS } from '../features/prototype/designContent';
import { ReportDialog } from '../features/safety/ReportDialog';
import { useUiNoticeStore } from '../shared/model/uiNoticeStore';
import { NotificationTray } from '../widgets/notification/NotificationTray';
import { BottomTabs } from '../widgets/navigation/BottomTabs';

const NAV = [
  { to: '/home', label: '홈', match: ['/home'] },
  { to: '/matches', label: '동행 찾기', match: ['/matches'] },
  { to: '/my', label: '내 여행', match: ['/my', '/trip', '/survey', '/trips'] },
  { to: '/community', label: '커뮤니티', match: ['/community'] },
];

export function PrototypeLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useTripStore((state) => state.user);
  const logout = useTripStore((state) => state.logout);
  const roomsStatus = useChatStore((state) => state.roomsStatus);
  const unreadTotal = useChatStore((state) => state.unreadTotal);
  const loadRooms = useChatStore((state) => state.loadRooms);
  const loadUnreadCount = useChatStore((state) => state.loadUnreadCount);
  const connectSocket = useChatStore((state) => state.connectSocket);
  const disconnectSocket = useChatStore((state) => state.disconnectSocket);
  const showInfo = useUiNoticeStore((state) => state.showInfo);

  useEffect(() => {
    void loadRooms('active');
    void loadUnreadCount();
    connectSocket();
    return () => disconnectSocket();
  }, [loadRooms, loadUnreadCount, connectSocket, disconnectSocket]);

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

  const openChat = () => {
    if (roomsStatus === 'loading' || roomsStatus === 'idle') {
      showInfo('채팅방을 확인하고 있습니다.', '활성 채팅방 목록을 불러온 뒤 다시 눌러 주세요.');
      return;
    }
    navigate('/chat');
  };

  const nickname = user?.nickname ?? '여행자';

  return (
    <>
      <div id="appShell">
        <div className="utility-bar">
          <div className="utility-inner">
            <Link className="intro-return" to="/about">OddTrip 소개</Link>
            <Link className="intro-return" to="/help">도움말</Link>
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
              <button
                type="button"
                className="round-btn"
                aria-label={unreadTotal ? `채팅 열기, 읽지 않은 메시지 ${unreadTotal}개` : '채팅 열기'}
                onClick={openChat}
              >
                💬︎{unreadTotal > 0 ? <span className="tool-dot" /> : null}
              </button>
              <NotificationTray />
              <button type="button" className="profile-btn" aria-expanded={profileOpen} onClick={(event) => { event.stopPropagation(); setProfileOpen((open) => !open); }}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" />
                  : <img src={imageUrl(PROFILE_FALLBACKS[0], 120)} alt="" />}
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
            <Link to="/legal/terms">이용약관</Link>
            <Link to="/legal/community">커뮤니티 운영정책</Link>
            <Link to="/legal/privacy">개인정보 처리 안내</Link>
            <a href="mailto:hello@oddtrip.example">문의</a>
          </nav>
        </div>
        <div className="footer-bottom">© 2026 OddTrip. All rights reserved.</div>
      </footer>
      <BottomTabs />

      <div className={profileOpen ? 'profile-menu' : 'profile-menu hidden'} onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => navigate('/my')}>내 여행</button>
        <button type="button" onClick={() => navigate('/survey/tti')}>여행 성향 다시 진단</button>
        <button type="button" onClick={() => navigate('/settings/notifications')}>알림 설정</button>
        <button type="button" onClick={() => navigate('/settings/privacy')}>개인정보 관리</button>
        <button type="button" onClick={() => navigate('/settings')}>계정 설정</button>
        <button type="button" onClick={signOut}>로그아웃</button>
      </div>
    </>
  );
}

export function PrototypeChatDrawer({ roomId, closeTo }: { roomId: string; closeTo: string }) {
  const navigate = useNavigate();
  const user = useTripStore((state) => state.user);
  const {
    rooms,
    messagesByRoom,
    messagesNextBefore,
    messagesStatus,
    counterpartRead,
    socketStatus,
    error,
    loadRoom,
    loadMessages,
    sendMessage,
    deleteMessage,
    reportMessage,
    markRead,
    loadRooms,
    setActiveRoom,
    clearError,
  } = useChatStore();
  const [content, setContent] = useState('');
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportingUser, setReportingUser] = useState(false);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const room = rooms.find((item) => item.id === roomId);
  const messages = messagesByRoom[roomId] ?? [];

  const close = () => navigate(closeTo, { replace: true });

  useEffect(() => {
    document.body.classList.add('no-scroll');
    setActiveRoom(roomId);
    void loadRoom(roomId);
    void loadMessages(roomId).then(() => markRead(roomId));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.body.classList.remove('no-scroll');
      setActiveRoom(undefined);
      window.removeEventListener('keydown', onKeyDown);
    };
  // closeTo is intentionally part of the route state for this drawer instance.
  }, [roomId, closeTo, loadRoom, loadMessages, markRead, setActiveRoom]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = content.trim();
    if (!value || room?.status === 'closed') return;
    setContent('');
    await sendMessage(roomId, value);
  };

  const blockCounterpart = async () => {
    if (!room || !window.confirm(`${room.counterpart.nickname}님을 차단할까요? 매칭과 채팅도 종료됩니다.`)) return;
    try {
      await chatService.blockCounterpart(room.counterpart.id);
      await loadRooms('active');
      showInfo('사용자를 차단했습니다.', '차단 목록은 개인정보 관리에서 확인하고 해제할 수 있습니다.');
      close();
    } catch (caught) {
      showInfo('차단하지 못했습니다.', caught instanceof Error ? caught.message : '잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <>
      <button className="scrim" aria-label="채팅 닫기" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="chat-drawer-title">
        <div className="drawer-head">
          <h2 id="chat-drawer-title">{room ? `${room.counterpart.nickname}님과의 채팅` : '채팅 불러오는 중'}</h2>
          <button type="button" aria-label="채팅 닫기" onClick={close}>×</button>
        </div>
        <div className="chat-context">
          <b>{room?.trip?.title ?? room?.trip?.region ?? '연결된 여행'}</b>
          <p>{room?.status === 'closed' ? '종료된 채팅 · 읽기 전용' : `현재 단계 · ${room?.currentStep ?? '함께 정하기'} · ${socketLabel(socketStatus)}`}</p>
        </div>
        {room ? (
          <div className="chat-safety-actions" aria-label="채팅 안전 도구">
            <button type="button" className="text-btn" onClick={() => setReportingUser(true)}>사용자 신고</button>
            <button type="button" className="text-btn" onClick={() => void blockCounterpart()}>사용자 차단</button>
          </div>
        ) : null}
        <div className="messages" ref={messagesRef}>
          {messagesNextBefore[roomId]
            ? <button className="chat-load-more" onClick={() => void loadMessages(roomId, { more: true })}>이전 메시지 더 보기</button>
            : null}
          {messagesStatus[roomId] === 'loading' && !messages.length ? <div className="bubble">메시지를 불러오고 있습니다.</div> : null}
          {messagesStatus[roomId] === 'success' && !messages.length ? <div className="bubble">첫 메시지를 보내 여행 조건을 확인해 보세요.</div> : null}
          {error ? <div className="bubble"><span>{error}</span><button className="text-btn" onClick={clearError}>닫기</button></div> : null}
          {messages.map((message) => {
            const mine = message.senderId === user?.id;
            const read = mine && counterpartRead[roomId] >= message.sequence;
            return (
              <div className={mine ? 'bubble me' : 'bubble'} key={message.id}>
                {message.deleted ? '삭제된 메시지입니다.' : message.displayText ?? message.content}
                <span className="message-meta">{formatTime(message.createdAt)}{message.pending ? ' · 전송 중' : read ? ' · 읽음' : ''}</span>
                {!message.deleted && !message.pending ? (
                  <span className="message-actions">
                    {mine
                      ? <button type="button" className="text-btn" onClick={() => { if (window.confirm('이 메시지를 삭제할까요?')) void deleteMessage(roomId, message.id); }}>삭제</button>
                      : <button type="button" className="text-btn" onClick={() => setReportingMessageId(message.id)}>메시지 신고</button>}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <form className="message-box" onSubmit={submit}>
          <input
            ref={inputRef}
            aria-label="메시지"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={room?.status === 'closed' ? '종료된 채팅입니다.' : '메시지를 입력하세요'}
            disabled={room?.status === 'closed'}
            maxLength={1000}
          />
          <button type="submit" disabled={!content.trim() || room?.status === 'closed'}>전송</button>
        </form>
      </aside>
      {reportingMessageId ? (
        <ReportDialog
          title="이 메시지를 신고할까요?"
          onClose={() => setReportingMessageId(null)}
          onSubmit={async (reason, details) => {
            const ok = await reportMessage(roomId, reportingMessageId, reason, details);
            if (!ok) throw new Error(useChatStore.getState().error ?? '신고를 접수하지 못했습니다.');
            setReportingMessageId(null);
            showInfo('메시지 신고가 접수되었습니다.', '운영자가 내용을 검토한 뒤 처리 결과를 알림으로 알려드립니다.');
          }}
        />
      ) : null}
      {reportingUser && room ? (
        <ReportDialog
          title={`${room.counterpart.nickname}님을 신고할까요?`}
          description="프로필과 현재 상호작용을 기준으로 운영자가 검토합니다. 구체적인 상황을 추가 설명에 적어주세요."
          onClose={() => setReportingUser(false)}
          onSubmit={async (reason, details) => {
            await safetyService.reportUser(room.counterpart.id, { reason, details });
            setReportingUser(false);
            showInfo('사용자 신고가 접수되었습니다.', '신고와 차단은 별개입니다. 더 이상 대화하고 싶지 않다면 사용자 차단도 이용해주세요.');
          }}
        />
      ) : null}
    </>
  );
}

function socketLabel(status: ReturnType<typeof useChatStore.getState>['socketStatus']) {
  return ({
    idle: '연결 준비',
    connecting: '연결 중',
    connected: '실시간 연결됨',
    reconnecting: '재연결 중',
    offline: '연결 끊김',
  } as const)[status];
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
