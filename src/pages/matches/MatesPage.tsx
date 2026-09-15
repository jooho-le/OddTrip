import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMatchRequestStore } from '../../entities/match-request/model/matchRequestStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { imageUrl, PROFILE_FALLBACKS } from '../../features/prototype/designContent';
import { subscribeRealtime } from '../../shared/realtime/socketBus';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { MatchCandidate, MatchRequest, MatchRequestStatus } from '../../types';

type Tab = 'candidates' | 'received' | 'sent';

export function MatesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? 'candidates';
  const { user, matches, status, error, loadMatches, openTrip } = useTripStore();
  const requests = useMatchRequestStore();

  useEffect(() => {
    if (user?.ttiCode) void loadMatches();
    void requests.load();
  }, [user?.ttiCode, loadMatches, requests.load]);

  useEffect(() => subscribeRealtime((event) => {
    if (event.event === 'match_request.created' || event.event === 'match_request.updated' || event.event === 'chat.room_created') {
      void requests.load();
    }
  }), [requests.load]);

  const accept = async (requestId: string) => {
    const accepted = await requests.accept(requestId);
    if (!accepted) return;
    await openTrip(accepted.tripId);
    navigate(`/chat/${accepted.roomId}`);
  };

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <h1>동행 찾기</h1>
          <p>작성하신 내용으로 추천드립니다.</p>
        </header>
        <div className="filter-row" role="tablist">
          <button type="button" className={tab === 'candidates' ? 'on' : ''} role="tab" aria-selected={tab === 'candidates'} onClick={() => setParams({})}>반대도 높은 순</button>
          <button type="button" className={tab === 'received' ? 'on' : ''} role="tab" aria-selected={tab === 'received'} onClick={() => setParams({ tab: 'received' })}>받은 요청</button>
          <button type="button" className={tab === 'sent' ? 'on' : ''} role="tab" aria-selected={tab === 'sent'} onClick={() => setParams({ tab: 'sent' })}>보낸 요청</button>
        </div>

        {error || requests.error ? (
          <div className="error-strip" role="alert"><span>{requests.error ?? error}</span><button onClick={() => { void requests.load(); if (user?.ttiCode) void loadMatches(); }}>다시 시도</button></div>
        ) : null}

        {tab === 'candidates' ? (
          !user?.ttiCode
            ? <Empty title="여행 성향 조사서가 먼저 필요합니다." copy="TTI 결과가 저장되면 실제 매칭 후보를 계산합니다." action={<Link className="solid-btn" to="/survey/tti">조사서 작성</Link>} />
            : status.matches === 'loading' && !matches.length
              ? <LoadingRows />
              : matches.length
                ? <section className="mate-grid">{[...matches].sort((a, b) => b.recommendationScore - a.recommendationScore).map((candidate, index) => <MateCard candidate={candidate} index={index} key={candidate.id} />)}</section>
                : <Empty title="현재 추천 후보가 없습니다." copy="조건에 맞는 새로운 여행자가 생기면 이곳에 표시됩니다." />
        ) : null}

        {tab === 'received' ? (
          requests.status === 'loading'
            ? <LoadingRows />
            : requests.received.length
              ? <RequestList items={requests.received} direction="received" busyId={requests.actionId} onAccept={(id) => void accept(id)} onReject={(id) => void requests.reject(id)} />
              : <Empty title="받은 동행 요청이 없습니다." copy="새 요청이 도착하면 수락하거나 거절할 수 있습니다." />
        ) : null}

        {tab === 'sent' ? (
          requests.status === 'loading'
            ? <LoadingRows />
            : requests.sent.length
              ? <RequestList items={requests.sent} direction="sent" busyId={requests.actionId} onCancel={(id) => void requests.cancel(id)} />
              : <Empty title="보낸 동행 요청이 없습니다." copy="추천 후보의 상세 화면에서 여행 조건과 인사를 작성해 요청할 수 있습니다." />
        ) : null}
      </div>
    </main>
  );
}

function MateCard({ candidate, index }: { candidate: MatchCandidate; index: number }) {
  return (
    <article className="mate-card">
      <img src={candidate.avatarUrl ?? imageUrl(PROFILE_FALLBACKS[(index + 1) % PROFILE_FALLBACKS.length], 280)} alt="" />
      <div className="mate-card-body">
        <small>{candidate.ttiCode} · {candidate.matchLevel} {candidate.recommendationScore}%</small>
        <h2>{candidate.nickname}의 여행 기록</h2>
        <p>{candidate.summary}</p>
        <Link className="line-btn accent" to={`/matches/${candidate.id}`} style={{ display: 'inline-block', marginTop: 14 }}>상세 비교</Link>
      </div>
    </article>
  );
}

export function MateDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { matches, selectedMatch, selectMatch, loadMatches, status } = useTripStore();
  const requests = useMatchRequestStore();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    if (!matches.length) void loadMatches();
    void requests.load();
  }, [matches.length, loadMatches, requests.load]);
  useEffect(() => { selectMatch(id); }, [id, matches, selectMatch]);

  const candidate = matches.find((item) => item.id === id) ?? selectedMatch;
  const pending = useMemo(
    () => requests.sent.find((request) => request.receiverId === id && request.status === 'pending'),
    [requests.sent, id],
  );

  if (!candidate) {
    return <main className="page"><div className="container"><Empty title={status.matches === 'loading' ? '후보 정보를 불러오고 있습니다.' : '후보를 찾을 수 없습니다.'} copy="추천 목록으로 돌아가 다시 선택해 주세요." action={<Link className="solid-btn" to="/matches">동행 찾기로</Link>} /></div></main>;
  }

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div>
            <button type="button" className="text-btn" onClick={() => navigate('/matches')}>‹ 동행 찾기로</button>
            <h1 style={{ marginTop: 9 }}>{candidate.nickname}의 여행 기록</h1>
          </div>
          <p>후보의 여행 방식과 차이를 비교합니다.</p>
        </header>
        {requests.error ? <div className="error-strip" role="alert">{requests.error}</div> : null}
        <section className="match-detail">
          <article className="match-profile">
            <img src={candidate.avatarUrl ?? imageUrl(PROFILE_FALLBACKS[1], 700, 82)} alt="" />
            <div className="match-profile-body">
              <span className="status pink">{candidate.matchLevel} {candidate.recommendationScore}%</span>
              <h2>{candidate.nickname} · {candidate.ttiCode}</h2>
              <p>{candidate.ageRange} · {candidate.region}<br />{candidate.summary}</p>
              <button
                type="button"
                className={pending ? 'line-btn' : 'solid-btn'}
                style={{ width: '100%', marginTop: 16 }}
                disabled={Boolean(requests.actionId)}
                onClick={() => {
                  if (pending) {
                    void requests.cancel(pending.id).then((ok) => { if (ok) showInfo('동행 요청을 취소했습니다.', '보낸 요청 목록에서도 변경된 상태를 확인할 수 있습니다.'); });
                  } else {
                    setRequestOpen(true);
                  }
                }}
              >
                {pending ? '요청 보냄 · 취소하기' : '동행 요청 보내기'}
              </button>
            </div>
          </article>
          <div>
            <div className="section-title">
              <h2>여행 성향 비교</h2>
              <p>서로 다른 정도와 예상 차이를 확인합니다.</p>
            </div>
            <div className="axis-list">
              {candidate.differences.map((difference) => (
                <div className="axis-row" key={difference}>
                  <b>{difference}</b>
                  <div className="axis-bar"><span style={{ width: `${candidate.recommendationScore}%` }} /></div>
                  <em>{candidate.recommendationScore}%</em>
                </div>
              ))}
            </div>
            <div className="detail-note">
              <h3>함께 여행하면</h3>
              <p>{candidate.compatibility}</p>
              {candidate.complements.length ? <div className="feed-tags" style={{ marginTop: 12 }}>{candidate.complements.map((item) => <span className="tag" key={item}>{item}</span>)}</div> : null}
            </div>
          </div>
        </section>
      </div>
      {requestOpen ? <MatchRequestDialog candidate={candidate} onClose={() => setRequestOpen(false)} /> : null}
    </main>
  );
}

function MatchRequestDialog({ candidate, onClose }: { candidate: MatchCandidate; onClose: () => void }) {
  const requests = useMatchRequestStore();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [region, setRegion] = useState(candidate.region || '');
  const [startDate, setStartDate] = useState(defaultDate(14));
  const [endDate, setEndDate] = useState(defaultDate(16));
  const [greeting, setGreeting] = useState('서로 다른 취향을 존중하며 같이 여행하고 싶어요.');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.classList.add('notice-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('notice-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await requests.create({ receiverId: candidate.id, region, startDate, endDate, greetingMessage: greeting });
    if (!created) return;
    onClose();
    showInfo('동행 요청을 보냈습니다.', '상대가 수락하면 채팅방과 여행 공간이 함께 생성됩니다. 보낸 요청 탭에서 상태를 확인할 수 있습니다.');
  };

  return (
    <div className="ui-notice-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ui-notice-dialog request-dialog" role="dialog" aria-modal="true" aria-labelledby="match-request-title">
        <div className="ui-notice-kicker">ODDTRIP MATCH REQUEST</div>
        <h2 id="match-request-title">{candidate.nickname}님에게 보낼 동행 요청서</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field full"><span>여행 지역</span><input required maxLength={100} value={region} onChange={(event) => setRegion(event.target.value)} /></label>
            <label className="field"><span>시작일</span><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="field"><span>종료일</span><input required type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label className="field full"><span>인사 메시지 · 300자 이내</span><textarea required maxLength={300} value={greeting} onChange={(event) => setGreeting(event.target.value)} /></label>
          </div>
          {requests.error ? <div className="error-strip" role="alert">{requests.error}</div> : null}
          <div className="button-row request-dialog-actions">
            <button type="button" className="line-btn" onClick={onClose}>취소</button>
            <button type="submit" className="solid-btn" disabled={requests.actionId === candidate.id}>{requests.actionId === candidate.id ? '전송 중…' : '동행 요청 보내기'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RequestList({ items, direction, busyId, onAccept, onReject, onCancel }: { items: MatchRequest[]; direction: 'received' | 'sent'; busyId?: string; onAccept?: (id: string) => void; onReject?: (id: string) => void; onCancel?: (id: string) => void }) {
  return (
    <section className="request-list">
      {items.map((request, index) => (
        <article className="request-row" key={request.id}>
          <div className="request-person">
            <img className="avatar" src={request.counterpart?.avatarUrl ?? imageUrl(PROFILE_FALLBACKS[(index + 1) % PROFILE_FALLBACKS.length], 120)} alt="" />
            <div>
              <h3>{request.counterpart?.nickname ?? '알 수 없는 사용자'} · {request.counterpart?.ttiCode ?? 'TTI 미제공'}</h3>
              <p>{request.region} · {request.startDate} — {request.endDate}</p>
              <p>“{request.greetingMessage}”</p>
              <small>요청 {formatDate(request.createdAt)} · 만료 {request.expiresAt ? formatDate(request.expiresAt) : '정보 없음'}</small>
            </div>
          </div>
          <div className="request-actions">
            <span className="request-status">{requestStatusLabel(request.status)}</span>
            {request.status === 'pending' ? (
              <div className="button-row">
                {direction === 'received'
                  ? <><button className="line-btn" disabled={busyId === request.id} onClick={() => onReject?.(request.id)}>거절</button><button className="solid-btn" disabled={busyId === request.id} onClick={() => onAccept?.(request.id)}>수락</button></>
                  : <button className="line-btn" disabled={busyId === request.id} onClick={() => onCancel?.(request.id)}>요청 취소</button>}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function LoadingRows() {
  return <div className="skeleton-stack" role="status" aria-label="불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong><p>{copy}</p>{action}</div>;
}

function requestStatusLabel(status: MatchRequestStatus) {
  return ({ pending: '응답 대기', accepted: '수락됨', rejected: '거절됨', cancelled: '취소됨', expired: '만료됨' } as const)[status];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function defaultDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
