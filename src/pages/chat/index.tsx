import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Ban, EyeOff, Flag, MessageCircle, Send, Unplug } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { chatService, chatSocketUrl, type ChatSocketEnvelope } from '../../entities/chat/api/chatService';
import { useTripStore } from '../../entities/trip/model/tripStore';
import type { ChatMessage, ChatRoom } from '../../types';
import { Avatar } from '../../shared/ui/Avatar';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

export function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = useTripStore((state) => state.user);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [room, setRoom] = useState<ChatRoom>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>();
  const [counterpartRead, setCounterpartRead] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    try {
      const [roomResponse, unreadResponse] = await Promise.all([chatService.listRooms(), chatService.getUnreadCount()]);
      setRooms(roomResponse.data.items); setUnreadTotal(unreadResponse.data.count);
    } catch (reason) { setError(messageOf(reason)); }
  }, []);
  const loadRoom = useCallback(async () => {
    if (!roomId) { setRoom(undefined); setMessages([]); return; }
    try {
      const [roomResponse, messageResponse] = await Promise.all([chatService.getRoom(roomId), chatService.getMessages(roomId)]);
      setRoom(roomResponse.data);
      setCounterpartRead(roomResponse.data.counterpartLastReadSequence);
      const ordered = messageResponse.data.items;
      setMessages(ordered);
      setNextBefore(messageResponse.data.nextBeforeSequence);
      const latest = ordered[ordered.length - 1];
      if (latest) void chatService.markRead(roomId, latest.sequence);
    } catch (reason) { setError(messageOf(reason)); }
  }, [roomId]);

  useEffect(() => { void loadRooms(); }, [loadRooms]);
  useEffect(() => { void loadRoom(); }, [loadRoom]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  useEffect(() => {
    const url = chatSocketUrl();
    if (!url) return;
    const socket = new WebSocket(url);
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as ChatSocketEnvelope;
        const affectsRoom = event.data?.roomId === roomId;
        const affectsMatch = event.data?.matchId === room?.matchId;
        if (event.event === 'room.read' && affectsRoom && event.data?.userId === room?.counterpart.id) {
          setCounterpartRead(event.data?.lastReadSequence ?? 0);
        } else if (event.event === 'message.created' || event.event === 'message.deleted' || ((event.event === 'match.ended' || event.event === 'user.blocked') && affectsMatch)) {
          if (affectsRoom || affectsMatch) void loadRoom();
          void loadRooms();
        }
      } catch { /* Ignore malformed WebSocket frames. */ }
    };
    return () => socket.close();
  }, [roomId, room?.matchId, loadRoom, loadRooms]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = content.trim();
    if (!roomId || !value || room?.status === 'closed') return;
    setContent('');
    try { await chatService.sendMessage(roomId, value); await loadRoom(); } catch (reason) { setError(messageOf(reason)); }
  };
  const loadOlder = async () => {
    if (!roomId || nextBefore == null) return;
    try {
      const response = await chatService.getMessages(roomId, nextBefore);
      setMessages((current) => [...response.data.items, ...current]);
      setNextBefore(response.data.nextBeforeSequence);
    } catch (reason) { setError(messageOf(reason)); }
  };
  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true); setError('');
    try { await action(); after(); } catch (reason) { setError(messageOf(reason)); } finally { setBusy(false); }
  };

  return <div className="page-canvas space-y-5">
    <div><h1 className="text-4xl font-black">채팅 {unreadTotal ? <span className="text-[#fd267a]">{unreadTotal}</span> : null}</h1><p className="mt-2 text-sm font-bold text-slate-500">수락된 동행과 여행을 조율합니다.</p></div>
    {error ? <Card className="border-red-200 bg-red-50 text-sm font-bold text-red-700">{error}</Card> : null}
    <div className="grid min-h-[620px] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-card md:grid-cols-[320px_1fr]">
      <aside className="border-r border-black/5">
        {rooms.map((item) => <Link key={item.id} to={`/chat/${item.id}`} className={`flex gap-3 border-b border-black/5 p-4 ${item.id === roomId ? 'bg-[#fff0f3]' : 'hover:bg-slate-50'}`}><Avatar src={item.counterpart.avatarUrl} fallback={item.counterpart.nickname} /><div className="min-w-0 flex-1"><b>{item.counterpart.nickname}</b><p className="truncate text-xs text-slate-500">{item.lastMessage?.displayText ?? item.lastMessage?.content ?? '대화를 시작해보세요.'}</p></div>{item.unreadCount ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#fd267a] px-1 text-xs font-black text-white">{item.unreadCount}</span> : null}</Link>)}
        {!rooms.length ? <div className="p-6 text-sm font-bold text-slate-500">활성 채팅방이 없습니다.</div> : null}
      </aside>
      {room ? <section className="flex min-h-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 p-4"><div><h2 className="text-xl font-black">{room.counterpart.nickname}</h2><p className="text-xs font-bold text-slate-500">{room.trip?.title ?? room.trip?.region ?? '공동 여행'} · {room.status === 'closed' ? '종료됨' : '대화 중'}</p></div><div className="flex gap-2"><Button variant="secondary" disabled={busy} onClick={() => void run(() => chatService.hideRoom(room.id), () => { setRooms((items) => items.filter((item) => item.id !== room.id)); navigate('/chat'); })}><EyeOff className="h-4 w-4" /> 숨기기</Button>{room.status === 'active' ? <Button variant="secondary" disabled={busy} onClick={() => { if (confirm('매칭을 종료할까요? 채팅은 읽기 전용으로 바뀝니다.')) void run(() => chatService.endMatch(room.matchId), () => void loadRoom()); }}><Unplug className="h-4 w-4" /> 매칭 종료</Button> : null}<Button variant="secondary" disabled={busy} onClick={() => { if (confirm(`${room.counterpart.nickname}님을 차단할까요? 매칭과 채팅이 종료됩니다.`)) void run(() => chatService.blockUser(room.counterpart.id), () => { setRooms((items) => items.filter((item) => item.id !== room.id)); navigate('/chat'); }); }}><Ban className="h-4 w-4" /> 차단</Button></div></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbf8f4] p-5">{nextBefore != null ? <button className="mx-auto block text-xs font-black text-[#fd267a]" onClick={() => void loadOlder()}>이전 메시지 더 보기</button> : null}{messages.map((message) => { const mine = message.senderId === user?.id; const read = mine && counterpartRead >= message.sequence; return <div key={message.id} className={`group max-w-[78%] rounded-2xl px-4 py-3 text-sm font-semibold ${mine ? 'ml-auto bg-[#fd267a] text-white' : 'bg-white text-slate-800'}`}><p>{message.deleted ? '삭제된 메시지입니다' : message.displayText ?? message.content}</p><div className={`mt-2 flex items-center gap-2 text-[11px] ${mine ? 'justify-end text-white/65' : 'text-slate-400'}`}>{new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}{read ? ' · 읽음' : ''}{!message.deleted ? mine ? <button onClick={() => void run(() => chatService.deleteMessage(room.id, message.id), () => void loadRoom())}>삭제</button> : <button onClick={() => { const details = prompt('신고 내용을 입력해주세요.'); if (details !== null) void run(() => chatService.reportMessage(room.id, message.id, 'other', details), () => alert('신고가 접수되었습니다.')); }}><Flag className="h-3 w-3" /></button> : null}</div></div>; })}<div ref={endRef} /></div>
        <form onSubmit={submit} className="flex gap-2 border-t border-black/5 p-4"><input value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} disabled={room.status === 'closed'} placeholder={room.status === 'closed' ? '종료된 채팅입니다.' : '메시지를 입력하세요.'} className="min-h-12 flex-1 rounded-full border border-black/10 px-5 outline-none focus:border-[#fd267a]" /><Button disabled={!content.trim() || room.status === 'closed'}><Send className="h-4 w-4" /> 전송</Button></form>
      </section> : <div className="grid place-items-center p-8 text-center"><div><MessageCircle className="mx-auto h-12 w-12 text-[#fd267a]" /><h2 className="mt-4 text-2xl font-black">채팅방을 선택해주세요.</h2></div></div>}
    </div>
  </div>;
}

function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : '요청을 처리하지 못했습니다.'; }
