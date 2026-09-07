import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useMatchRequestStore } from '../../entities/match-request/model/matchRequestStore';
import type { MatchRequest, MatchRequestStatus } from '../../types';

type Tab = 'candidates' | 'received' | 'sent';

export function MatchesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? 'candidates';
  const { user, matches, status, error, loadMatches, openTrip } = useTripStore();
  const requests = useMatchRequestStore();

  useEffect(() => {
    if (user?.ttiCode) void loadMatches();
    void requests.load();
  }, [user?.ttiCode, loadMatches, requests.load]);

  const accept = async (requestId: string) => {
    const accepted = await requests.accept(requestId);
    if (!accepted) return;
    await openTrip(accepted.tripId);
    navigate(`/chat/${accepted.roomId}`);
  };

  const counts = { candidates: matches.length, received: requests.received.filter((item) => item.status === 'pending').length, sent: requests.sent.filter((item) => item.status === 'pending').length };

  return (
    <main className="page"><div className="container">
      <header className="page-heading"><div><h1>동행 찾기</h1><p>내 여행 성향을 새로운 방향으로 넓혀줄 사람을 추천합니다.</p></div></header>
      <div className="filter-row" role="tablist">{([['candidates', '추천 후보'], ['received', '받은 요청'], ['sent', '보낸 요청']] as const).map(([key, label]) => <button key={key} className={tab === key ? 'on' : ''} onClick={() => setParams(key === 'candidates' ? {} : { tab: key })} role="tab" aria-selected={tab === key}>{label}<span className="tab-count">{counts[key]}</span></button>)}</div>
      {error || requests.error ? <div className="error-strip" role="alert"><span>{requests.error ?? error}</span><button onClick={() => { void requests.load(); if (user?.ttiCode) void loadMatches(); }}>다시 시도</button></div> : null}

      {tab === 'candidates' ? (
        !user?.ttiCode ? <Empty title="TTI 진단이 먼저 필요합니다." copy="저장된 여행 성향이 있어야 추천 후보를 계산할 수 있습니다." action={<Link className="solid-btn" to="/tti/start">TTI 시작</Link>} />
          : status.matches === 'loading' ? <LoadingRows />
          : matches.length ? <section className="mate-grid">{[...matches].sort((a, b) => b.recommendationScore - a.recommendationScore).map((candidate) => <article className="mate-card" key={candidate.id}>{candidate.avatarUrl ? <img src={candidate.avatarUrl} alt="" /> : <CandidateInitial name={candidate.nickname} />}<div className="mate-card-body"><small>{candidate.ttiCode} · {candidate.matchLevel} · 추천 {candidate.recommendationScore}%</small><h2>{candidate.nickname}의 여행 방식</h2><p>{candidate.summary}</p><Link className="line-btn accent" to={`/matches/${candidate.id}`}>상세 비교</Link></div></article>)}</section>
          : <Empty title="현재 추천 후보가 없습니다." copy="조건에 맞는 새로운 여행자가 생기면 이곳에 표시됩니다." />
      ) : null}

      {tab === 'received' ? requests.status === 'loading' ? <LoadingRows /> : requests.received.length ? <RequestList items={requests.received} direction="received" busyId={requests.actionId} onAccept={(id) => void accept(id)} onReject={(id) => void requests.reject(id)} /> : <Empty title="받은 동행 요청이 없습니다." copy="새 요청이 도착하면 수락하거나 거절할 수 있습니다." /> : null}
      {tab === 'sent' ? requests.status === 'loading' ? <LoadingRows /> : requests.sent.length ? <RequestList items={requests.sent} direction="sent" busyId={requests.actionId} onCancel={(id) => void requests.cancel(id)} /> : <Empty title="보낸 동행 요청이 없습니다." copy="추천 후보의 상세 화면에서 여행 조건과 인사를 작성해 요청할 수 있습니다." /> : null}
    </div></main>
  );
}

function RequestList({ items, direction, busyId, onAccept, onReject, onCancel }: { items: MatchRequest[]; direction: 'received' | 'sent'; busyId?: string; onAccept?: (id: string) => void; onReject?: (id: string) => void; onCancel?: (id: string) => void }) {
  return <section className="request-list">{items.map((request) => <article className="request-row" key={request.id}><div className="request-person">{request.counterpart?.avatarUrl ? <img className="avatar" src={request.counterpart.avatarUrl} alt="" /> : <CandidateInitial name={request.counterpart?.nickname ?? '동행'} />}<div><h3>{request.counterpart?.nickname ?? '알 수 없는 사용자'} · {request.counterpart?.ttiCode ?? 'TTI 미제공'}</h3><p>{request.region} · {request.startDate} — {request.endDate}</p><p>“{request.greetingMessage}”</p><small>요청 {formatDate(request.createdAt)} · 만료 {request.expiresAt ? formatDate(request.expiresAt) : '정보 없음'}</small></div></div><div className="request-actions"><span className="request-status">{requestStatusLabel(request.status)}</span>{request.status === 'pending' ? <div className="button-row">{direction === 'received' ? <><button className="line-btn" disabled={busyId === request.id} onClick={() => onReject?.(request.id)}>거절</button><button className="solid-btn" disabled={busyId === request.id} aria-busy={busyId === request.id} onClick={() => onAccept?.(request.id)}>수락</button></> : <button className="line-btn" disabled={busyId === request.id} aria-busy={busyId === request.id} onClick={() => onCancel?.(request.id)}>요청 취소</button>}</div> : null}</div></article>)}</section>;
}

function CandidateInitial({ name }: { name: string }) {
  return <span className="avatar" style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff', fontSize: 13, fontWeight: 800 }}>{name.slice(0, 1)}</span>;
}

function LoadingRows() {
  return <div className="skeleton-stack" role="status" aria-label="불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong><p>{copy}</p>{action}</div>;
}

function requestStatusLabel(status: MatchRequestStatus) {
  const labels: Record<MatchRequestStatus, string> = { pending: '응답 대기', accepted: '수락됨', rejected: '거절됨', cancelled: '취소됨', expired: '만료됨' };
  return labels[status];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}
