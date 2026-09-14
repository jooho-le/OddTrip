import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatService } from '../../entities/chat/api/chatService';
import { useChatStore } from '../../entities/chat/model/chatStore';
import type { ChatReportReason } from '../../types';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { matchRequestService } from '../../entities/match-request/api/matchRequestService';
import { useTripStore } from '../../entities/trip/model/tripStore';

export function ChatListPage() {
  return <ChatWorkspace />;
}

export function ChatWorkspace({ roomId }: { roomId?: string }) {
  const { rooms, roomsStatus, roomsNextBefore, error, loadRooms, connectSocket, disconnectSocket } = useChatStore();

  useEffect(() => {
    void loadRooms('active');
    connectSocket();
    return () => disconnectSocket();
  }, [loadRooms, connectSocket, disconnectSocket]);

  return (
    <main className="page"><div className="container">
      <header className="page-heading"><div><h1>채팅</h1><p>수락된 매칭에서 생성된 채팅방만 표시합니다.</p></div></header>
      {error ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadRooms('active')}>다시 시도</button></div> : null}
      <section className="chat-page">
        <div className="chat-rooms">
          {roomsStatus === 'loading' && !rooms.length ? <div className="skeleton-stack" style={{ padding: 14 }}>{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} style={{ height: 70 }} />)}</div> : null}
          {rooms.map((room) => <Link className={`chat-room-row ${room.id === roomId ? 'active' : ''}`} to={`/chat/${room.id}`} key={room.id}>{room.counterpart.avatarUrl ? <img className="avatar" src={room.counterpart.avatarUrl} alt="" /> : <span className="avatar" style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff', fontWeight: 800 }}>{room.counterpart.nickname.slice(0, 1)}</span>}<div><h3>{room.counterpart.nickname} · {room.counterpart.ttiCode ?? 'TTI 미제공'}</h3><p>{room.lastMessage?.displayText ?? room.lastMessage?.content ?? '대화를 시작해보세요.'}</p></div><div><time>{formatShort(room.updatedAt)}</time>{room.unreadCount > 0 ? <span className="unread">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span> : null}</div></Link>)}
          {roomsStatus === 'success' && !rooms.length ? <div className="empty-state" style={{ borderTop: 0 }}><strong>활성 채팅방이 없습니다.</strong><p>동행 요청을 수락하면 채팅방이 자동으로 생성됩니다.</p><Link className="solid-btn" to="/matches">동행 찾기</Link></div> : null}
          {roomsNextBefore ? <button className="chat-load-more" onClick={() => void loadRooms('active', { more: true })}>이전 채팅방 더 보기</button> : null}
        </div>
        <div className="chat-placeholder"><div><span className="eyebrow">ODDTRIP CHAT</span><h2>대화를 선택해주세요.</h2><p>채팅은 조율을 돕고, 장소와 일정의 실제 저장은 각 여행 화면에서 진행합니다.</p></div></div>
      </section>
      {roomId ? <ChatDrawer roomId={roomId} /> : null}
    </div></main>
  );
}

function ChatDrawer({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const user = useTripStore((state) => state.user);
  const { rooms, messagesByRoom, messagesNextBefore, messagesStatus, counterpartRead, socketStatus, error, loadRoom, loadMessages, sendMessage, deleteMessage, reportMessage, markRead, hideRoom, loadRooms, setActiveRoom, clearError } = useChatStore();
  const [content, setContent] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const room = rooms.find((item) => item.id === roomId);
  const messages = messagesByRoom[roomId] ?? [];

  useEffect(() => {
    document.body.classList.add('no-scroll');
    setActiveRoom(roomId);
    void loadRoom(roomId);
    void loadMessages(roomId).then(() => markRead(roomId));
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') navigate('/chat'); };
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.classList.remove('no-scroll');
      setActiveRoom(undefined);
      window.removeEventListener('keydown', keydown);
    };
  }, [roomId, loadRoom, loadMessages, markRead, setActiveRoom, navigate]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim() || room?.status === 'closed') return;
    const value = content;
    setContent('');
    await sendMessage(roomId, value);
  };

  const endMatch = async () => {
    if (!room || !window.confirm('매칭과 채팅을 종료할까요? 기록은 DB에 유지됩니다.')) return;
    await matchRequestService.endMatch(room.matchId);
    await loadRoom(roomId);
  };

  const blockCounterpart = async () => {
    if (!room || !window.confirm(`${room.counterpart.nickname}님을 차단할까요? 매칭과 채팅도 종료됩니다.`)) return;
    await chatService.blockCounterpart(room.counterpart.id);
    await loadRooms('active');
    navigate('/chat');
  };

  const hideCurrentRoom = async () => {
    if (!window.confirm('이 채팅방을 목록에서 숨길까요? 상대방의 화면에는 영향을 주지 않습니다.')) return;
    await hideRoom(roomId);
    navigate('/chat');
  };

  const socketCopy = socketLabel(socketStatus);
  return (
    <><button className="scrim" aria-label="채팅 닫기" onClick={() => navigate('/chat')} /><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="chat-drawer-title">
      <div className="drawer-head"><h2 id="chat-drawer-title">{room ? `${room.counterpart.nickname}님과의 채팅` : '채팅 불러오는 중'}</h2><button onClick={() => navigate('/chat')} aria-label="채팅 닫기">×</button></div>
      <div className={`socket-state ${socketStatus === 'connected' ? 'connected' : ''}`} role="status">{socketCopy}</div>
      <div className="chat-context"><b>{room?.trip?.title ?? room?.trip?.region ?? '연결된 여행'}</b><p>{room?.status === 'closed' ? '종료된 채팅 · 읽기 전용' : `현재 단계 · ${room?.currentStep ?? '함께 정하기'}`}</p></div>
      {room ? <div className="button-row" style={{ padding: '8px 14px', borderBottom: '1px solid #eee' }}><button type="button" className="text-btn" onClick={() => void hideCurrentRoom()}>목록에서 숨기기</button>{room.status !== 'closed' ? <button type="button" className="text-btn" onClick={() => void endMatch()}>매칭 종료</button> : null}<button type="button" className="text-btn" onClick={() => void blockCounterpart()}>사용자 차단</button></div> : null}
      {error ? <div className="error-strip" style={{ margin: 0 }} role="alert"><span>{error}</span><button onClick={clearError}>닫기</button></div> : null}
      <div className="messages">
        {messagesNextBefore[roomId] ? <button className="chat-load-more" onClick={() => void loadMessages(roomId, { more: true })}>이전 메시지 더 보기</button> : null}
        {messagesStatus[roomId] === 'loading' && !messages.length ? <div className="skeleton-stack"><div className="skeleton-row" style={{ height: 48 }} /><div className="skeleton-row" style={{ height: 48, width: '75%', marginLeft: 'auto' }} /></div> : null}
        {messagesStatus[roomId] === 'success' && !messages.length ? <div className="empty-state" style={{ borderTop: 0 }}><strong>첫 메시지를 보내보세요.</strong><p>여행 조건을 다시 확인하고 대화를 시작할 수 있습니다.</p></div> : null}
        {messages.map((message) => {
          const mine = message.senderId === user?.id;
          const read = mine && counterpartRead[roomId] >= message.sequence;
          return <div className={`bubble ${mine ? 'me' : ''}`} key={message.id}>{message.deleted ? '삭제된 메시지입니다.' : message.displayText ?? message.content}<span className="message-meta">{formatTime(message.createdAt)}{message.pending ? ' · 전송 중' : read ? ' · 읽음' : ''}</span>{!message.deleted && !message.pending ? <span className="button-row" style={{ marginTop: 6 }}>{mine ? <button className="text-btn" onClick={() => { if (window.confirm('이 메시지를 삭제할까요?')) void deleteMessage(roomId, message.id); }}>삭제</button> : <button className="text-btn" onClick={() => setReporting(message.id)}>신고</button>}</span> : null}</div>;
        })}
        <div ref={messagesEnd} />
      </div>
      {reporting ? (
        <ReportDialog
          onClose={() => setReporting(null)}
          onSubmit={async (reason, details) => {
            const ok = await reportMessage(roomId, reporting, reason, details);
            setReporting(null);
            if (ok) {
              showInfo(
                '신고가 접수되었습니다.',
                '운영자가 검토한 뒤 처리 결과를 알림으로 알려드립니다. 처리 내용은 상대방에게 공개되지 않습니다.',
              );
            }
          }}
        />
      ) : null}
      <form className="message-box" onSubmit={submit}><input aria-label="메시지" value={content} onChange={(event) => setContent(event.target.value)} placeholder={room?.status === 'closed' ? '종료된 채팅입니다.' : '메시지를 입력하세요'} disabled={room?.status === 'closed'} maxLength={1000} /><button disabled={!content.trim() || room?.status === 'closed'}>전송</button></form>
    </aside></>
  );
}

const REPORT_REASONS: { value: ChatReportReason; label: string; hint: string }[] = [
  { value: 'harassment', label: '괴롭힘·욕설', hint: '비하, 위협, 반복적인 불쾌한 연락' },
  { value: 'sexual_content', label: '성적 대화·이미지', hint: '원하지 않는 성적 표현이나 사진' },
  { value: 'fraud', label: '사기·금전 요구', hint: '송금, 예약금, 투자 권유' },
  { value: 'personal_information', label: '개인정보 요구·유포', hint: '신분증, 계좌번호, 주소 요구' },
  { value: 'hate', label: '혐오·차별', hint: '특정 집단에 대한 차별 표현' },
  { value: 'spam', label: '스팸·광고', hint: '반복 광고, 외부 링크 유도' },
  { value: 'other', label: '기타', hint: '위에 해당하지 않는 경우' },
];

/**
 * 신고 전 확인.
 *
 * 접수하면 되돌릴 수 없고 허위·보복 신고를 반복하면 그 자체가 제재 대상이라
 * (약관 제20조 19호) 한 번 묻는다. 사유를 고르게 하는 것도 같은 이유다.
 * 전부 "기타"로 들어오면 운영자가 무엇을 검토해야 하는지 알 수 없다.
 */
function ReportDialog({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (reason: ChatReportReason, details?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<ChatReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="ui-notice-layer" role="presentation">
      <section className="ui-notice-dialog report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="ui-notice-kicker">REPORT</div>
        <h2 id="report-title">이 메시지를 신고할까요?</h2>
        <p>접수한 신고는 취소할 수 없습니다. 어떤 점이 문제였는지 골라주세요.</p>

        <div className="report-reasons">
          {REPORT_REASONS.map((item) => (
            <label key={item.value} className={reason === item.value ? 'report-reason selected' : 'report-reason'}>
              <input
                type="radio"
                name="report-reason"
                checked={reason === item.value}
                onChange={() => setReason(item.value)}
              />
              <span><b>{item.label}</b><small>{item.hint}</small></span>
            </label>
          ))}
        </div>

        <label className="field full" style={{ marginTop: 12 }}>
          <span>추가 설명 (선택)</span>
          <textarea
            rows={2}
            maxLength={2000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="운영자가 확인할 때 참고할 내용을 적어주세요."
          />
        </label>

        <p className="report-guard">
          신체적 위험이 있다면 신고와 별도로 112에 즉시 연락해주세요.
          허위·보복 신고를 반복하면 이용이 제한될 수 있습니다.
        </p>

        <div className="button-row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="line-btn" onClick={onClose}>취소</button>
          <button
            type="button"
            className="solid-btn"
            disabled={!reason || busy}
            onClick={async () => {
              if (!reason) return;
              setBusy(true);
              await onSubmit(reason, details.trim() || undefined);
              setBusy(false);
            }}
          >
            {busy ? '접수 중…' : '신고하기'}
          </button>
        </div>
      </section>
    </div>
  );
}

function socketLabel(status: ReturnType<typeof useChatStore.getState>['socketStatus']) {
  const labels = { idle: '실시간 연결 준비', connecting: '실시간 채팅 연결 중…', connected: '실시간 연결됨', reconnecting: '연결이 끊겨 다시 연결하는 중…', offline: '실시간 연결 끊김 · 전송 시 서버 상태를 확인합니다' };
  return labels[status];
}

function formatShort(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
