import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircleMore, MessagesSquare } from 'lucide-react';
import { useChatStore } from '../../entities/chat/model/chatStore';
import { Avatar } from '../../shared/ui/Avatar';
import { Badge } from '../../shared/ui/Badge';
import { EmptyView, ErrorView, LoadingView } from '../../shared/ui/StateView';
import { cn } from '../../shared/lib/classNames';
import { formatRelativeTime } from '../../shared/lib/formatDate';
import type { ChatRoom } from '../../types';

const STEP_LABELS: Record<string, string> = {
  preference: '선호 입력 중',
  analysis: '차이 분석 중',
  concession: '양보 범위 조율 중',
  odd_rule: 'Odd Rule 선택 중',
  proposal: 'AI 조율안 확인 중',
  itinerary: '일정 검토 중',
  approval: '일정 승인 대기',
};

export function ChatListPage() {
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const { rooms, roomsStatus, loadRooms, connectSocket, disconnectSocket } = useChatStore();

  useEffect(() => {
    void loadRooms(tab);
  }, [loadRooms, tab]);

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  return (
    <div className="page-canvas space-y-5">
      <section className="rounded-[32px] bg-ink p-7 text-white md:p-9">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <MessagesSquare className="h-4 w-4 text-accent" />
          Chat
        </p>
        <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight tracking-[-0.03em] md:text-5xl">매칭된 상대와 대화하며 여행을 조율해요.</h1>
        <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/68">채팅방에서 선호를 나누고, 장소와 일정을 함께 정할 수 있어요.</p>
      </section>

      <div className="inline-flex gap-1 rounded-full border border-line bg-white p-1">
        {(['active', 'closed'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn('rounded-full px-4 py-2 text-sm font-black transition', tab === value ? 'bg-accent text-white' : 'text-muted hover:text-ink')}
          >
            {value === 'active' ? '진행 중' : '종료된 채팅'}
          </button>
        ))}
      </div>

      {roomsStatus === 'loading' ? <LoadingView label="채팅방을 불러오는 중입니다" /> : null}
      {roomsStatus === 'error' ? <ErrorView label="채팅방 목록을 불러오지 못했습니다" /> : null}
      {roomsStatus === 'success' && !rooms.length ? (
        <EmptyView label={tab === 'active' ? '아직 진행 중인 채팅방이 없습니다. 매칭이 성사되면 여기에 표시돼요.' : '종료된 채팅방이 없습니다.'} />
      ) : null}

      <div className="space-y-3">
        {rooms.map((room) => (
          <ChatRoomRow key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}

function ChatRoomRow({ room }: { room: ChatRoom }) {
  const preview = room.lastMessage?.deleted
    ? '삭제된 메시지입니다.'
    : room.lastMessage?.displayText ?? room.lastMessage?.content ?? '대화를 시작해보세요.';

  return (
    <Link
      to={`/chat/${room.id}`}
      className="motion-card hover-lift flex items-center gap-4 rounded-3xl border border-line bg-white p-4 shadow-card transition"
    >
      <Avatar src={room.counterpart.avatarUrl} fallback={room.counterpart.nickname} className="h-14 w-14 text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-black text-ink">{room.counterpart.nickname}</h2>
          {room.counterpart.ttiCode ? <Badge>{room.counterpart.ttiCode}</Badge> : null}
          {room.currentStep && STEP_LABELS[room.currentStep] ? (
            <span className="hidden shrink-0 rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-muted sm:inline-flex">{STEP_LABELS[room.currentStep]}</span>
          ) : null}
        </div>
        <p className={cn('mt-1 truncate text-sm', room.unreadCount > 0 ? 'font-bold text-ink' : 'font-medium text-muted')}>
          <MessageCircleMore className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-muted" />
          {preview}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-xs font-bold text-muted">{formatRelativeTime(room.updatedAt)}</span>
        {room.unreadCount > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-black text-white">{room.unreadCount}</span>
        ) : null}
      </div>
    </Link>
  );
}
