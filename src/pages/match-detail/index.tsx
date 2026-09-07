import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useMatchRequestStore } from '../../entities/match-request/model/matchRequestStore';

export function MatchDetailPage() {
  const { id = '' } = useParams();
  const { matches, selectedMatch, selectMatch, loadMatches, status } = useTripStore();
  const requests = useMatchRequestStore();
  const [region, setRegion] = useState('');
  const [startDate, setStartDate] = useState(defaultDate(14));
  const [endDate, setEndDate] = useState(defaultDate(16));
  const [greeting, setGreeting] = useState('서로 다른 취향을 존중하며 같이 여행하고 싶어요.');
  const [sentMessage, setSentMessage] = useState('');

  useEffect(() => {
    if (!matches.length) void loadMatches();
    void requests.load();
  }, [matches.length, loadMatches, requests.load]);
  useEffect(() => { selectMatch(id); }, [id, matches, selectMatch]);

  const candidate = matches.find((item) => item.id === id) ?? selectedMatch;
  const pending = useMemo(() => requests.sent.find((request) => request.receiverId === id && request.status === 'pending'), [requests.sent, id]);
  useEffect(() => { if (candidate && !region) setRegion(candidate.region || ''); }, [candidate, region]);

  if (!candidate) return <main className="page"><div className="container"><div className="empty-state"><strong>{status.matches === 'loading' ? '후보 정보를 불러오고 있습니다.' : '후보를 찾을 수 없습니다.'}</strong><p>추천 목록으로 돌아가 다시 선택해주세요.</p><Link className="solid-btn" to="/matches">동행 찾기로</Link></div></div></main>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await requests.create({ receiverId: candidate.id, region, startDate, endDate, greetingMessage: greeting });
    if (created) setSentMessage('동행 요청을 보냈습니다. 보낸 요청 탭에서 상태를 확인할 수 있습니다.');
  };

  return (
    <main className="page"><div className="container">
      <header className="page-heading"><div><Link className="text-btn" to="/matches">‹ 동행 찾기로</Link><h1 style={{ marginTop: 9 }}>{candidate.nickname}의 여행 기록</h1></div><p>후보의 여행 방식과 실제 추천 정보를 비교합니다.</p></header>
      {requests.error ? <div className="error-strip" role="alert">{requests.error}</div> : null}
      <section className="match-detail">
        <article className="match-profile">{candidate.avatarUrl ? <img src={candidate.avatarUrl} alt={`${candidate.nickname} 프로필`} /> : <div style={{ height: 300, display: 'grid', placeItems: 'center', background: '#242424', color: '#fff', fontSize: 64, fontWeight: 900 }}>{candidate.nickname.slice(0, 1)}</div>}<div className="match-profile-body"><span className="status pink">추천 {candidate.recommendationScore}%</span><h2>{candidate.nickname} · {candidate.ttiCode}</h2><p>{candidate.ageRange} · {candidate.region}<br />{candidate.summary}</p>{pending ? <button className="line-btn" style={{ width: '100%', marginTop: 16 }} disabled={requests.actionId === pending.id} onClick={() => void requests.cancel(pending.id)}>요청 보냄 · 취소하기</button> : null}</div></article>
        <div><div className="section-title"><h2>여행 성향 비교</h2><p>서버가 계산한 차이와 보완점을 그대로 표시합니다.</p></div><div className="axis-list">{candidate.differences.map((difference) => <div className="axis-row" key={difference}><b>{difference}</b><div className="axis-bar"><span style={{ width: `${candidate.recommendationScore}%` }} /></div><em>차이</em></div>)}</div><div className="detail-note"><h3>함께 여행하면</h3><p>{candidate.compatibility}</p>{candidate.complements.length ? <div className="feed-tags" style={{ marginTop: 12 }}>{candidate.complements.map((item) => <span className="tag" key={item}>{item}</span>)}</div> : null}</div>
          <form className="match-request-form" onSubmit={submit}><div className="section-title" style={{ marginTop: 18 }}><h2>동행 요청서</h2><p>현재 매칭 요청 API에 저장됩니다.</p></div><div className="form-grid"><label className="field full"><span>여행 지역</span><input required maxLength={100} value={region} onChange={(event) => setRegion(event.target.value)} /></label><label className="field"><span>시작일</span><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span>종료일</span><input required type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label className="field full"><span>인사 메시지 · 300자 이내</span><textarea required maxLength={300} value={greeting} onChange={(event) => setGreeting(event.target.value)} /></label></div>{sentMessage ? <p className="form-message success" role="status">{sentMessage}</p> : <p className="form-message">상대가 수락하면 매칭, 채팅방, 여행 공간이 동시에 생성됩니다.</p>}<button className="solid-btn" style={{ marginTop: 14, width: '100%' }} disabled={Boolean(pending) || requests.actionId === candidate.id} aria-busy={requests.actionId === candidate.id}>{pending ? '응답 대기 중' : requests.actionId === candidate.id ? '요청 전송 중…' : '동행 요청 보내기'}</button></form>
        </div>
      </section>
    </div></main>
  );
}

function defaultDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
