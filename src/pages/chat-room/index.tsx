import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ChevronDown, MoreVertical, SendHorizontal, ShieldAlert, ShieldOff } from 'lucide-react';
import { useChatStore, type LocalChatMessage } from '../../entities/chat/model/chatStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { chatService } from '../../entities/chat/api/chatService';
import { Avatar } from '../../shared/ui/Avatar';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { useToast } from '../../shared/ui/Toast';
import { ErrorView, LoadingView } from '../../shared/ui/StateView';
import { cn } from '../../shared/lib/classNames';
import { formatClockTime } from '../../shared/lib/formatDate';
import type { ChatReportReason } from '../../types';

const REPORT_REASONS: { value: ChatReportReason; label: string }[] = [
  { value: 'spam', label: '스팸 또는 광고' },
  { value: 'harassment', label: '괴롭힘 또는 비방' },
  { value: 'sexual_content', label: '성적인 콘텐츠' },
  { value: 'hate', label: '혐오 발언' },
  { value: 'fraud', label: '사기 의심' },
  { value: 'personal_information', label: '개인정보 노출' },
  { value: 'other', label: '기타' },
];

export function ChatRoomPage() {
  const { roomId } = useParams();
  const showToast = useToast((state) => state.show);
  const currentUserId = useTripStore((state) => state.user?.id);
  const {
    rooms,
    messagesByRoom,
    messagesStatus,
    messagesNextBefore,
    counterpartRead,
    loadRoom,
    loadMessages,
    sendMessage,
    deleteMessage,
    reportMessage,
    markRead,
    setActiveRoom,
    connectSocket,
    disconnectSocket,
  } = useChatStore();

  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<LocalChatMessage | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const room = rooms.find((item) => item.id === roomId);
  const messages = roomId ? messagesByRoom[roomId] ?? [] : [];
  const status = roomId ? messagesStatus[roomId] : undefined;

  useEffect(() => {
    if (!roomId) return;
    setActiveRoom(roomId);
    void loadRoom(roomId);
    void loadMessages(roomId);
    connectSocket();
    return () => {
      setActiveRoom(undefined);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (roomId && messages.length) void markRead(roomId);
  }, [roomId, messages.length, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (!roomId) return <Navigate to="/chat" replace />;
  if (status === 'error' && !messages.length) return <ErrorView label="채팅방을 불러오지 못했습니다" />;

  const isClosed = room?.status === 'closed';

  const handleSend = () => {
    if (!draft.trim()) return;
    void sendMessage(roomId, draft);
    setDraft('');
  };

  const handleBlock = async () => {
    if (!room) return;
    try {
      await chatService.blockCounterpart(room.counterpart.id);
      showToast(`${room.counterpart.nickname}님을 차단했습니다.`);
      setBlockOpen(false);
      setMenuOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '차단하지 못했습니다.', 'info');
    }
  };

  return (
    <div className="page-canvas flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-10rem)]">
      <header className="flex items-center gap-3 rounded-t-3xl border border-b-0 border-line bg-white px-4 py-3">
        <Link to="/chat" className="icon-button" aria-label="채팅 목록으로"><ArrowLeft className="h-5 w-5" /></Link>
        {room ? (
          <>
            <Avatar src={room.counterpart.avatarUrl} fallback={room.counterpart.nickname} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-black text-ink">{room.counterpart.nickname}</h1>
                {room.counterpart.ttiCode ? <Badge>{room.counterpart.ttiCode}</Badge> : null}
              </div>
              <p className="truncate text-xs font-bold text-muted">
                {room.matchLevel} · 반대도 {room.recommendationScore}%
                {room.trip?.region ? ` · ${room.trip.region}` : ''}
              </p>
            </div>
            <div className="relative">
              <button type="button" className="icon-button" aria-label="채팅방 메뉴" onClick={() => setMenuOpen((value) => !value)}>
                <MoreVertical className="h-5 w-5" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-11 z-20 w-48 rounded-2xl border border-line bg-white p-2 shadow-modal">
                  <button type="button" className="menu-item w-full text-danger" onClick={() => setBlockOpen(true)}>
                    <ShieldOff className="h-4 w-4" />
                    상대 차단하기
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <LoadingView label="상대 정보를 불러오는 중입니다" />
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto border-x border-line bg-canvas px-4 py-4">
        {roomId && messagesNextBefore[roomId] ? (
          <button
            type="button"
            onClick={() => void loadMessages(roomId, { more: true })}
            className="mx-auto flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-muted shadow-soft hover:text-ink"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
            이전 메시지 더 보기
          </button>
        ) : null}
        {status === 'loading' && !messages.length ? <LoadingView label="메시지를 불러오는 중입니다" /> : null}
        {messages.map((message) => {
          if (message.type === 'system') {
            return (
              <p key={message.id} className="mx-auto max-w-sm rounded-full bg-white/80 px-4 py-1.5 text-center text-xs font-bold text-muted">
                {message.displayText ?? message.content}
              </p>
            );
          }
          const isMine = message.senderId === currentUserId;
          const read = isMine && roomId ? (counterpartRead[roomId] ?? 0) >= message.sequence : false;

          return (
            <div key={message.id} className={cn('flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn('group max-w-[75%] rounded-3xl px-4 py-2.5 text-sm font-semibold leading-6', isMine ? 'bg-accent text-white' : 'border border-line bg-white text-ink')}>
                {message.deleted ? <span className="italic opacity-70">삭제된 메시지입니다.</span> : message.content}
                {!message.deleted && !isMine ? (
                  <button
                    type="button"
                    onClick={() => setReportTarget(message)}
                    className="ml-2 hidden align-middle text-xs font-bold text-muted underline group-hover:inline"
                  >
                    신고
                  </button>
                ) : null}
                {!message.deleted && isMine ? (
                  <button
                    type="button"
                    onClick={() => void deleteMessage(roomId, message.id)}
                    className="ml-2 hidden align-middle text-xs font-bold text-white/80 underline group-hover:inline"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              <div className="mb-0.5 flex shrink-0 flex-col items-center gap-0.5 text-[10px] font-bold text-muted">
                {isMine && read ? <span className="text-accent">읽음</span> : null}
                <span>{message.pending ? '전송 중' : formatClockTime(message.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="rounded-b-3xl border border-t-0 border-line bg-white p-3">
        {isClosed ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-canvas py-3 text-sm font-bold text-muted">
            <AlertTriangle className="h-4 w-4" />
            종료된 채팅방에서는 메시지를 보낼 수 없습니다.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="메시지를 입력해주세요."
              rows={1}
              maxLength={1000}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-line bg-canvas px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
            />
            <Button icon={<SendHorizontal className="h-4 w-4" />} onClick={handleSend} disabled={!draft.trim()} aria-label="메시지 전송">
              전송
            </Button>
          </div>
        )}
      </div>

      <Modal open={Boolean(reportTarget)} onClose={() => setReportTarget(null)} title="메시지 신고">
        <ReportForm
          onCancel={() => setReportTarget(null)}
          onSubmit={async (reason, details) => {
            if (!reportTarget) return;
            const ok = await reportMessage(roomId, reportTarget.id, reason, details);
            showToast(ok ? '신고가 접수되었습니다.' : '신고를 접수하지 못했습니다.', ok ? 'success' : 'info');
            setReportTarget(null);
          }}
        />
      </Modal>

      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="상대 차단하기">
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-ink">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            차단하면 이 상대와 더 이상 매칭되지 않고, 채팅방도 서로 볼 수 없게 됩니다.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBlockOpen(false)}>취소</Button>
            <Button variant="danger" onClick={() => void handleBlock()}>차단하기</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReportForm({ onSubmit, onCancel }: { onSubmit: (reason: ChatReportReason, details?: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState<ChatReportReason>('spam');
  const [details, setDetails] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {REPORT_REASONS.map((item) => (
          <label key={item.value} className={cn('flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold', reason === item.value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink')}>
            <input type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
            {item.label}
          </label>
        ))}
      </div>
      <label className="field-label">
        <span>상세 내용 (선택)</span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
          maxLength={2000}
          className="min-h-24 w-full resize-none rounded-xl border border-line bg-canvas px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>취소</Button>
        <Button variant="danger" onClick={() => onSubmit(reason, details.trim() || undefined)}>신고 접수</Button>
      </div>
    </div>
  );
}
