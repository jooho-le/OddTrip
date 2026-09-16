import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '../../entities/chat/model/chatStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useApprovalRealtime, useCoordinationRealtime, useTripLifecycleRealtime } from '../../entities/trip/model/useCoordinationRealtime';
import {
  imageUrl,
  PLACE_IMAGE_FALLBACKS,
  PROFILE_FALLBACKS,
} from '../../features/prototype/designContent';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { Attraction, ItineraryItem, TripSummary, UserProfile } from '../../types';
import { filterAttractions, oppositeTtiCode, type PlaceFilter } from './placeFilters';

const TABS = [
  ['overview', '개요'],
  ['coordination', '조율'],
  ['places', '여행지'],
  ['schedule', '일정'],
] as const;

export function TripWorkspacePage() {
  const { tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const active = TABS.some(([key]) => key === tab) ? tab : 'overview';
  const { user, activeTripId, tripHistory, status, error, ensureTrip, openTrip, loadTripHistory } = useTripStore();

  useEffect(() => { void ensureTrip(); }, [ensureTrip]);
  useTripLifecycleRealtime(activeTripId, async () => {
    await loadTripHistory();
    if (activeTripId) await openTrip(activeTripId);
  });

  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));

  if (!trip && (status.trip === 'loading' || status.trip === undefined)) {
    return <WorkspaceState title="여행 공간을 불러오고 있습니다." loading />;
  }
  if (!trip) {
    return <WorkspaceState title="진행 중인 여행이 없습니다." message={error ?? '먼저 동행 요청을 주고받아 여행 공간을 만들어 주세요.'} action={() => navigate('/matches')} />;
  }

  return (
    <main className="page">
      <div className="container">
        <section className="trip-cover">
          <button type="button" className="trip-settings-link" onClick={() => navigate('/trip/settings')}>여행 설정</button>
          <div className="trip-cover-copy">
            <span className="eyebrow" style={{ color: '#ffb39f' }}>CURRENT TRIP · {(trip.region ?? 'ODDTRIP').toUpperCase()}</span>
            <h1>{tripTitle(trip, user?.nickname)}</h1>
            <p>{dateRange(trip.startDate, trip.endDate)} · {durationLabel(trip.startDate, trip.endDate)}</p>
          </div>
          <div className="trip-members">
            <Avatar src={user?.avatarUrl} name={user?.nickname ?? '나'} fallback={0} />
            <Avatar src={trip.partner?.avatarUrl} name={trip.partner?.nickname ?? '동행'} fallback={1} />
            <span>{user?.nickname ?? '나'} × {trip.partner?.nickname ?? '동행'}</span>
          </div>
        </section>
        <nav className="local-nav" aria-label="개별 여행 메뉴">
          {TABS.map(([key, label]) => (
            <button type="button" key={key} className={key === active ? 'active' : ''} onClick={() => navigate(`/trip/${key}`)}>{label}</button>
          ))}
        </nav>
        <div className="workspace">
          {active === 'overview' ? <OverviewTab trip={trip} user={user} /> : null}
          {active === 'coordination' ? <CoordinationTab trip={trip} user={user} /> : null}
          {active === 'places' ? <PlacesTab /> : null}
          {active === 'schedule' ? <ScheduleTab trip={trip} user={user} /> : null}
        </div>
      </div>
    </main>
  );
}

function OverviewTab({ trip, user }: { trip: TripSummary; user?: UserProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const preferences = useTripStore((state) => state.preferences);
  const matches = useTripStore((state) => state.matches);
  const loadMatches = useTripStore((state) => state.loadMatches);
  const rooms = useChatStore((state) => state.rooms);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const preferenceDone = hasPreferenceInput(preferences);
  const phase = trip.itineraryDayCount > 0 ? 'schedule' : trip.attractionCount > 0 || trip.savedCount > 0 ? 'places' : 'coordination';
  const finished = trip.status === 'completed';
  const coordClass = preferenceDone ? 'done' : 'current';
  const placesClass = phase === 'places' ? 'current' : phase === 'schedule' ? 'done' : '';
  const scheduleClass = phase === 'schedule' ? (finished ? 'done' : 'current') : '';
  const candidate = matches.find((item) => item.id === trip.partner?.id);

  useEffect(() => {
    if (user?.ttiCode && !matches.length) void loadMatches();
  }, [user?.ttiCode, matches.length, loadMatches]);

  const nextTask = !preferenceDone
    ? { title: '독립 선택을 작성해 주세요.', to: '/survey/preference' }
    : trip.itineraryDayCount > 0
      ? { title: '최종 일정을 확인해 주세요.', to: '/trip/schedule' }
      : { title: '추천 여행지를 선택해 주세요.', to: '/trip/places' };

  const openChat = () => {
    const room = rooms.find((item) => item.trip?.id === trip.tripId || item.matchId === trip.matchId);
    if (!room) {
      showInfo('연결된 채팅방을 찾지 못했습니다.', '채팅방 목록을 새로 불러온 뒤 헤더의 채팅 버튼에서 다시 확인해 주세요.');
      return;
    }
    navigate(`/chat/${encodeURIComponent(room.id)}`, { state: { backgroundLocation: location } });
  };

  return (
    <div className="overview-grid">
      <section>
        <div className="milestones">
          <div className="milestone done"><b>✓</b><strong>동행 성사</strong><span>{trip.partner?.nickname ?? '동행'}님과 연결</span></div>
          <div className={`milestone ${coordClass}`}><b>{coordClass === 'done' ? '✓' : '2'}</b><strong>조율</strong><span>{preferenceDone ? '공동 선호 저장' : '독립 선택'}</span></div>
          <div className={`milestone ${placesClass}`}><b>{placesClass === 'done' ? '✓' : '3'}</b><strong>여행지</strong><span>{placesClass === 'done' ? '선택 완료' : '후보 선택'}</span></div>
          <div className={`milestone ${scheduleClass}`}><b>{scheduleClass === 'done' ? '✓' : '4'}</b><strong>일정</strong><span>{finished ? '여행 완료' : '생성·확인'}</span></div>
        </div>
        <div className="task-panel">
          <div>
            <small>NEXT TASK</small>
            <h2>{nextTask.title}</h2>
            <p>조사서 원본은 홈의 작성할 조사서에서 한곳에 모아 관리합니다.</p>
          </div>
          <button type="button" className="solid-btn" onClick={() => navigate(nextTask.to)}>계속하기</button>
        </div>
        <div className="section-title" style={{ marginTop: 27 }}><h2>최근 진행 기록</h2></div>
        <div className="activity">
          {trip.itineraryDayCount > 0 ? <ActivityRow time="현재" title={`${trip.itineraryDayCount}일 공동 일정이 생성되었습니다.`} copy="일정 탭에서 장소 순서와 안전 정보를 확인할 수 있습니다." /> : null}
          {trip.attractionCount > 0 ? <ActivityRow time="현재" title={`${trip.attractionCount}곳의 여행지 후보를 확인했습니다.`} copy={`${trip.savedCount}곳이 현재 여행에 저장되어 있습니다.`} /> : null}
          <ActivityRow time={trip.createdAt ? formatDate(trip.createdAt) : '시작'} title="동행이 성사되었습니다." copy={`매칭 요청이 수락되어 ${trip.region ?? 'OddTrip'} 여행 공간이 생성되었습니다.`} />
        </div>
      </section>
      <aside>
        <div className="partner-card">
          <div className="partner-card-head">
            <Avatar src={trip.partner?.avatarUrl} name={trip.partner?.nickname ?? '동행'} fallback={1} />
            <div><b>{trip.partner?.nickname ?? '동행'} · {trip.partner?.ttiCode ?? 'TTI 미제공'}</b><p>{candidate?.summary ?? '현재 여행의 동행'}</p></div>
          </div>
          <div className="partner-body">
            <dl><dt>추천 점수</dt><dd>{candidate ? `${candidate.recommendationScore}%` : '—'}</dd><dt>가장 큰 차이</dt><dd>{candidate?.differences[0] ?? '정보 없음'}</dd><dt>현재 상태</dt><dd>{trip.status}</dd></dl>
            <button type="button" className="line-btn" onClick={openChat}>채팅 열기</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ActivityRow({ time, title, copy }: { time: string; title: string; copy: string }) {
  return <div className="activity-row"><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></div>;
}

function CoordinationTab({ trip, user }: { trip: TripSummary; user?: UserProfile }) {
  const navigate = useNavigate();
  const {
    activeTripId,
    preferences,
    pairPreferences,
    preferenceProposals,
    decisionSuggestion,
    status,
    error,
    loadCoordination,
    proposePreferences,
    respondPreferenceProposal,
    resolveDecisionConflict,
  } = useTripStore();
  const mineDone = Boolean(pairPreferences?.mine);
  const counterpartDone = Boolean(pairPreferences?.counterpart);
  const incomingProposal = preferenceProposals.find((proposal) => proposal.status === 'pending' && proposal.proposedBy !== user?.id);
  const myPendingProposal = preferenceProposals.find((proposal) => proposal.status === 'pending' && proposal.proposedBy === user?.id);

  useEffect(() => {
    void loadCoordination();
  }, [loadCoordination]);
  useCoordinationRealtime(activeTripId, loadCoordination);

  const comparison = pairPreferences?.comparison;
  const conflictLabels = comparison ? [
    comparison.paceDifference > 0 ? `일정 속도 차이 ${comparison.paceDifference}` : '',
    comparison.budgetDifference > 0 ? `예산 차이 ${comparison.budgetDifference}` : '',
    comparison.indoorPreferredConflict ? '실내·야외 선호' : '',
    comparison.hiddenSpotsConflict ? '유명·숨은 장소 선호' : '',
  ].filter(Boolean) : [];

  return (
    <>
      <div className="coord-layout">
        <section>
          <div className="section-title"><h2>조율 진행</h2><p>결정이 필요한 항목만 문서로 작성합니다.</p></div>
          <div className="coord-list">
            <article className={mineDone ? 'coord-item done' : 'coord-item'}>
              <span className="coord-no">{mineDone ? '✓' : '1'}</span>
              <div className="coord-copy"><h3>각자 독립 선택</h3><p>두 사용자의 답안을 따로 저장하고 제출 상태를 확인합니다.</p></div>
              <div className="coord-action"><small>{mineDone ? '내 선택 제출 완료' : `${user?.nickname ?? '나'} 작성 필요`}</small><button type="button" className={mineDone ? 'line-btn' : 'solid-btn'} onClick={() => navigate('/survey/preference')}>{mineDone ? '작성 내용 보기' : '조사서 작성'}</button></div>
            </article>
            <article className={pairPreferences?.bothSubmitted ? 'coord-item done' : 'coord-item'}>
              <span className="coord-no">{pairPreferences?.bothSubmitted ? '✓' : '2'}</span>
              <div className="coord-copy"><h3>차이 분석</h3><p>{comparison ? `공통 장소 ${comparison.places.common.length}개 · 공통 활동 ${comparison.activities.common.length}개` : '상대방의 독립 선택을 기다리고 있습니다.'}</p></div>
              <div className="coord-action"><small>{pairPreferences?.bothSubmitted ? '비교 완료' : '상대 제출 대기'}</small><button type="button" className="line-btn" disabled={!comparison || status.conflict === 'loading'} onClick={() => void resolveDecisionConflict(conflictLabels.length ? conflictLabels : ['두 사용자 선호 비교'])}>{status.conflict === 'loading' ? '분석 중…' : 'AI 조정안 만들기'}</button></div>
            </article>
            <article className="coord-item">
              <span className="coord-no">3</span>
              <div className="coord-copy"><h3>양보 범위</h3><p>중요도와 허용 범위를 비공개로 작성해 볼 수 있습니다.</p></div>
              <div className="coord-action"><small>저장 기능 준비 중</small><button type="button" className="solid-btn" onClick={() => navigate('/survey/concession')}>조사서 작성</button></div>
            </article>
            <article className="coord-item">
              <span className="coord-no">4</span>
              <div className="coord-copy"><h3>Odd Rule</h3><p>차이가 생겼을 때 적용할 둘만의 조율 규칙을 살펴봅니다.</p></div>
              <div className="coord-action"><small>합의 기능 준비 중</small><button type="button" className="line-btn" onClick={() => navigate('/survey/rule')}>규칙 선택</button></div>
            </article>
          </div>
        </section>
        <aside>
          <div className="section-title"><h2>제출 상태</h2></div>
          <div className="coord-side">
            <div className="person-state"><Avatar src={user?.avatarUrl} name={user?.nickname ?? '나'} fallback={0} /><div><b>{user?.nickname ?? '나'}</b><p>{mineDone ? '독립 선택 제출됨' : '독립 선택 작성 필요'}</p></div><em>{mineDone ? '완료' : '작성'}</em></div>
            <div className="person-state"><Avatar src={trip.partner?.avatarUrl} name={trip.partner?.nickname ?? '동행'} fallback={1} /><div><b>{trip.partner?.nickname ?? '동행'}</b><p>{counterpartDone ? '독립 선택 제출됨' : '상대 제출 대기'}</p></div><em>{counterpartDone ? '완료' : '대기'}</em></div>
          </div>
        </aside>
      </div>

      <section className="proposal-area">
        <div className="section-title"><h2>합의안</h2><p>현재 내 조건을 보내고 상대방의 제안에 응답합니다.</p></div>
        {error && (status.coordination === 'error' || status.proposal === 'error') ? <div className="error-strip" role="alert">{error}</div> : null}
        <div className="proposal-grid">
          <article className="proposal">
            <strong>내 합의안</strong>
            <p>{preferenceSummary(preferences)}</p>
            <dl><dt>일정 강도</dt><dd>{preferences.pace}</dd><dt>예산 기준</dt><dd>{preferences.budget}</dd><dt>상태</dt><dd>{myPendingProposal ? '응답 대기' : '작성 가능'}</dd></dl>
            <button type="button" className="solid-btn" style={{ width: '100%', marginTop: 14 }} disabled={!mineDone || Boolean(myPendingProposal) || status.proposal === 'loading'} onClick={() => void proposePreferences()}>{myPendingProposal ? '상대 응답 대기 중' : status.proposal === 'loading' ? '전송 중…' : '이 조건으로 제안'}</button>
          </article>
          {incomingProposal ? <article className="proposal"><strong>도착한 합의안</strong><p>{preferenceSummary(incomingProposal.preferences)}</p><dl><dt>일정 강도</dt><dd>{incomingProposal.preferences.pace}</dd><dt>예산 기준</dt><dd>{incomingProposal.preferences.budget}</dd><dt>상태</dt><dd>응답 필요</dd></dl><div className="button-row" style={{ marginTop: 14 }}><button type="button" className="line-btn" disabled={status.proposal === 'loading'} onClick={() => void respondPreferenceProposal(incomingProposal.id, 'reject')}>거절</button><button type="button" className="solid-btn" disabled={status.proposal === 'loading'} onClick={() => void respondPreferenceProposal(incomingProposal.id, 'accept')}>수락</button></div></article> : null}
          {pairPreferences?.agreed ? <article className="proposal"><strong>합의 완료</strong><p>{preferenceSummary(pairPreferences.agreed)}</p><dl><dt>일정 강도</dt><dd>{pairPreferences.agreed.pace}</dd><dt>예산 기준</dt><dd>{pairPreferences.agreed.budget}</dd><dt>상태</dt><dd>확정</dd></dl><button type="button" className="solid-btn" style={{ width: '100%', marginTop: 14 }} onClick={() => navigate('/trip/places')}>여행지 추천 보기</button></article> : null}
        </div>
        {decisionSuggestion ? <div className="detail-note"><h3>AI 조정 제안</h3><p>{decisionSuggestion}</p><button type="button" className="line-btn" style={{ marginTop: 12 }} onClick={() => useUiNoticeStore.getState().showComingSoon('AI 조정 제안 확정', '제안을 두 사람의 합의안으로 확정하는 API가 준비되기 전까지 현재 합의 상태는 변경하지 않습니다.')}>이 제안 반영</button></div> : null}
      </section>
    </>
  );
}

function preferenceSummary(preferences: ReturnType<typeof useTripStore.getState>['preferences']) {
  return [preferences.places.join(', '), preferences.activities.join(', '), preferences.foods.join(', ')].filter(Boolean).join(' · ') || '선택한 항목 없음';
}

function PlacesTab() {
  const {
    user,
    activeTripId,
    tripHistory,
    preferences,
    pairPreferences,
    attractions,
    status,
    error,
    loadAttractions,
    toggleAttraction,
    regenerateItinerary,
  } = useTripStore();
  const navigate = useNavigate();
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [votePlace, setVotePlace] = useState<Attraction | null>(null);

  useEffect(() => { void loadAttractions(); }, [loadAttractions]);
  useEffect(() => {
    if (attractions.some((item) => isDemoSource(item.source))) {
      showDemoOnce('static-attractions', '일부 여행지 카드는 외부 출처가 확인되지 않은 정적 대체 데이터입니다. 저장 가능한 실제 여행지와 섞이지 않도록 출처가 없는 항목은 별도로 표시합니다.');
    }
  }, [attractions, showDemoOnce]);

  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));
  const counterpartPreferences = pairPreferences?.counterpart?.preferences;
  const visible = filterAttractions({
    attractions,
    filter,
    mine: preferences,
    counterpart: counterpartPreferences,
    mineTtiCode: user?.ttiCode,
    counterpartTtiCode: trip?.partner?.ttiCode,
  });
  const filterDescription = {
    all: '현재 여행의 실제 추천 결과와 저장 상태를 확인합니다.',
    saved: '두 사람이 함께 저장한 실제 장소만 모아봅니다.',
    mine: `${user?.ttiCode ?? '내 선호'}와 내가 제출한 선택에 가까운 장소를 골라 보여줍니다.`,
    partner: `${trip?.partner?.nickname ?? '동행'}의 ${trip?.partner?.ttiCode ?? '제출 선호'}에 가까운 장소를 골라 보여줍니다.`,
    opposite: `${oppositeTtiCode(user?.ttiCode) ?? '반대 성향'}에 가까운 장소를 골라 평소와 다른 여행을 살펴봅니다.`,
  }[filter];

  const buildItinerary = async () => {
    await regenerateItinerary();
    if (useTripStore.getState().status.itinerary === 'success') navigate('/trip/schedule');
  };

  return (
    <>
      <div className="section-title"><h2>추천 여행지</h2><p>{filterDescription}</p></div>
      <div className="place-tabs" role="tablist" aria-label="추천 여행지 필터">
        {([
          ['all', '전체'],
          ['saved', '공통 선호'],
          ['mine', '내 성향'],
          ['partner', '동행 성향'],
          ['opposite', '반대 성향 체험'],
        ] as const).map(([key, label]) => (
          <button type="button" role="tab" aria-selected={filter === key} className={filter === key ? 'on' : ''} onClick={() => setFilter(key)} key={key}>{label}</button>
        ))}
      </div>
      {error && status.attractions === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadAttractions()}>다시 시도</button></div> : null}
      {status.attractions === 'loading' && !attractions.length ? <LoadingCards /> : null}
      <section className="place-grid">
        {visible.map((place) => <PlaceCard place={place} onToggle={() => void toggleAttraction(place.id, 'saved')} onVote={() => setVotePlace(place)} key={place.id} />)}
      </section>
      {status.attractions === 'success' && !visible.length ? <PlaceFilterEmpty filter={filter} partnerName={trip?.partner?.nickname} /> : null}
      <div className="workflow-cta">
        <p><b>장소 선택을 마쳤나요?</b>저장된 장소와 현재 추천 결과를 바탕으로 공동 일정을 만듭니다.</p>
        <button type="button" className="solid-btn" disabled={!attractions.length || status.itinerary === 'loading'} onClick={() => void buildItinerary()}>{status.itinerary === 'loading' ? '일정 만드는 중…' : '선택한 장소로 일정 만들기'}</button>
      </div>
      {votePlace ? <PlaceVoteDialog place={votePlace} onClose={() => setVotePlace(null)} /> : null}
    </>
  );
}

function PlaceFilterEmpty({ filter, partnerName }: { filter: PlaceFilter; partnerName?: string }) {
  const content: Record<PlaceFilter, [string, string]> = {
    all: ['추천 여행지가 없습니다.', '공동 선호를 작성한 뒤 다시 시도해 주세요.'],
    saved: ['함께 저장한 여행지가 없습니다.', '전체 탭에서 두 사람이 원하는 장소를 저장해 주세요.'],
    mine: ['내 성향에 맞는 장소를 찾지 못했습니다.', 'TTI 또는 독립 선택을 작성하면 현재 추천 결과 안에서 다시 찾아봅니다.'],
    partner: [`${partnerName ?? '동행'}의 성향 정보가 아직 부족합니다.`, '상대가 독립 선택을 제출하면 현재 추천 결과 안에서 가까운 장소를 보여줍니다.'],
    opposite: ['반대 성향으로 분류할 장소가 없습니다.', 'TTI 작성 후 추천 장소가 늘어나면 평소와 다른 후보를 보여줍니다.'],
  };
  return <div className="empty-state"><strong>{content[filter][0]}</strong><p>{content[filter][1]}</p></div>;
}

function PlaceCard({ place, onToggle, onVote }: { place: Attraction; onToggle: () => void; onVote: () => void }) {
  const demoSource = isDemoSource(place.source);
  const source = place.source && !isDemoSource(place.source) ? `출처 · ${place.source}` : '출처 미제공';
  const reason = demoSource ? `${place.category} 추천 후보` : place.reason ?? place.category;
  const description = demoSource
    ? '현재 여행에서 두 사람이 함께 검토할 장소 후보입니다.'
    : place.description ?? place.addr1 ?? '상세 설명이 제공되지 않았습니다.';
  return (
    <article className="place-card">
      <img src={place.imageUrl ?? imageUrl(PLACE_IMAGE_FALLBACKS[stablePlaceImageIndex(place.id)], 600)} alt="" />
      <div className="place-card-body">
        <small>{reason}</small>
        <h3>{place.name}</h3>
        <p>{description}<br />{source}</p>
        <div className="score-row">
          <div><b>{score(place.hiddenScore)}</b><span>숨은곳</span></div>
          <div><b>{score(place.congestionScore)}</b><span>혼잡도</span></div>
          <div><b>{place.relatedRank ?? '—'}</b><span>연관순위</span></div>
        </div>
        <div className="card-actions"><button type="button" className="line-btn" onClick={onToggle}>{place.saved ? '저장됨' : '저장'}</button><button type="button" className="line-btn accent" onClick={onVote}>일정 투표</button></div>
      </div>
    </article>
  );
}

function PlaceVoteDialog({ place, onClose }: { place: Attraction; onClose: () => void }) {
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const [vote, setVote] = useState<'want' | 'neutral' | 'skip' | ''>('');

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const submit = () => {
    if (!vote) return;
    onClose();
    showComingSoon('장소 개인 투표', '선택한 의견은 서버에 전송하거나 여행의 저장 상태를 변경하지 않았습니다. 사용자별 투표 API가 연결되면 이 화면에서 제출할 수 있습니다.');
  };

  return (
    <div className="ui-notice-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="place-vote-dialog" role="dialog" aria-modal="true" aria-labelledby="place-vote-title">
        <div className="place-vote-head"><span className="eyebrow">PRIVATE PLACE VOTE</span><button type="button" aria-label="닫기" onClick={onClose}>×</button></div>
        <h2 id="place-vote-title">{place.name}</h2>
        <p>이 장소를 공동 일정에 넣는 것에 대한 내 의견을 선택합니다. 상대의 응답과 합산되기 전까지 비공개로 처리되는 화면입니다.</p>
        <div className="place-vote-options">
          {([
            ['want', '꼭 가고 싶어요', '내 핵심 선호로 표시'],
            ['neutral', '함께 가도 좋아요', '상대 선택을 수용'],
            ['skip', '이번에는 제외하고 싶어요', '다른 후보를 요청'],
          ] as const).map(([value, label, detail]) => (
            <button type="button" className={vote === value ? 'selected' : ''} onClick={() => setVote(value)} key={value}><b>{vote === value ? '✓' : '□'} {label}</b><span>{detail}</span></button>
          ))}
        </div>
        <div className="planning-actions"><button type="button" className="line-btn" onClick={onClose}>취소</button><button type="button" className="solid-btn" disabled={!vote} onClick={submit}>내 의견 제출</button></div>
      </section>
    </div>
  );
}

function ScheduleTab({ trip, user }: { trip: TripSummary; user?: UserProfile }) {
  const { activeTripId, itinerary, approval, alerts, status, error, loadItinerary, loadApproval, loadAlerts } = useTripStore();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);

  useEffect(() => {
    void loadItinerary();
    void loadAlerts();
  }, [loadItinerary, loadAlerts]);
  useApprovalRealtime(activeTripId, loadApproval);
  useEffect(() => {
    if (itinerary.length && !itinerary.some((day) => day.day === selectedDay)) setSelectedDay(itinerary[0].day);
  }, [itinerary, selectedDay]);

  const day = itinerary.find((item) => item.day === selectedDay) ?? itinerary[0];

  return (
    <>
    <div className="schedule-grid">
      <section>
        <div className="section-title"><h2>공동 일정</h2><p>{itinerary.length ? '승인과 안전 정보도 일정 안에서 확인합니다.' : '장소 선택을 마치면 이 미리보기로 공동 일정이 생성됩니다.'}</p></div>
        <div className="day-tabs">
          {itinerary.map((item) => <button type="button" className={item.day === selectedDay ? 'on' : ''} onClick={() => setSelectedDay(item.day)} key={item.day}>{item.day}일차</button>)}
          <button type="button" onClick={() => navigate('/trip/schedule/map')}>지도·동선</button>
        </div>
        {error && status.itinerary === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadItinerary()}>다시 시도</button></div> : null}
        {status.itinerary === 'loading' && !itinerary.length ? <LoadingSchedule /> : null}
        <div className="day-list">
          {day?.items.map((item) => (
            <div className="schedule-row" key={item.id}><time>{item.time}</time><span className="route-dot" /><div className="schedule-copy"><h3>{item.title}</h3><p>{item.description || item.location}</p><small>{[item.duration, item.moveTime ? `이동 ${item.moveTime}` : '', item.aiReason].filter(Boolean).join(' · ')}</small><button type="button" className="text-btn accent schedule-detail-link" onClick={() => setSelectedItem(item)}>항목 검토 →</button></div></div>
          ))}
        </div>
        {status.itinerary === 'success' && !itinerary.length ? <div className="empty-state"><strong>생성된 일정이 없습니다.</strong><p>여행지 탭에서 장소를 확인한 뒤 일정을 만들어 주세요.</p><button className="solid-btn" onClick={() => navigate('/trip/places')}>여행지로 이동</button></div> : null}
      </section>
      <aside>
        <div className="approval-box">
          <div className="side-head">일정 승인 <span>{approval?.allApproved ? '승인 완료' : itinerary.length ? '확인 대기' : '생성 전'}</span></div>
          <div className="approval-body">
            <div className="approval-person"><Avatar src={approval?.mine.avatarUrl ?? user?.avatarUrl} name={approval?.mine.nickname ?? user?.nickname ?? '나'} fallback={0} /><b>{approval?.mine.nickname ?? user?.nickname ?? '나'}</b><span style={{ color: approval?.mine.status === 'approved' ? 'var(--orange)' : '#999' }}>{approvalStatusLabel(approval?.mine.status)}</span></div>
            <div className="approval-person"><Avatar src={approval?.counterpart.avatarUrl ?? trip.partner?.avatarUrl} name={approval?.counterpart.nickname ?? trip.partner?.nickname ?? '동행'} fallback={1} /><b>{approval?.counterpart.nickname ?? trip.partner?.nickname ?? '동행'}</b><span style={{ color: approval?.counterpart.status === 'approved' ? 'var(--orange)' : '#999' }}>{approvalStatusLabel(approval?.counterpart.status)}</span></div>
            <button type="button" className={itinerary.length ? 'solid-btn' : 'line-btn'} style={{ width: '100%', marginTop: 13 }} disabled={!itinerary.length} onClick={() => navigate('/survey/approval')}>{itinerary.length ? '일정 확인·승인' : '일정 생성 후 작성'}</button>
          </div>
        </div>
        <div className="weather-card">
          <h3>{day ? `${day.day}일차 · ${trip.region ?? '여행지'}` : trip.region ?? '여행 안전 정보'}</h3>
          <p>{day?.weather ?? alerts[0]?.message ?? '날씨 정보 없음'} · 출처 미제공</p>
          <div className="safety-list">
            {alerts.slice(0, 2).map((alert) => <div className="safety-item" key={alert.id}><b>{alert.title}</b><span>{alert.message}</span></div>)}
            {!alerts.length ? <div className="safety-item"><b>표시할 안전 알림 없음</b><span>서버에 등록된 현재 여행 관련 안전 정보가 없습니다.</span></div> : null}
          </div>
        </div>
      </aside>
    </div>
    {selectedItem ? <ScheduleItemDrawer item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </>
  );
}

function approvalStatusLabel(status?: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'change_requested') return '수정 요청';
  return '검토 전';
}

function ScheduleItemDrawer({ item, onClose }: { item: ItineraryItem; onClose: () => void }) {
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const [request, setRequest] = useState('');

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const submit = () => {
    onClose();
    showComingSoon('일정 항목 수정 요청', '시간·장소 수정 요청 API가 준비되기 전까지 작성한 요청은 서버에 저장되지 않고 일정도 변경되지 않습니다.');
  };

  return (
    <>
      <button type="button" className="scrim" aria-label="일정 항목 닫기" onClick={onClose} />
      <aside className="drawer schedule-item-drawer" role="dialog" aria-modal="true" aria-labelledby="schedule-item-title">
        <div className="drawer-head"><h2 id="schedule-item-title">일정 항목 검토</h2><button type="button" aria-label="닫기" onClick={onClose}>×</button></div>
        <div className="schedule-item-cover"><span className="eyebrow">SCHEDULE ITEM</span><strong>{item.time}</strong><p>{item.type.toUpperCase()}</p></div>
        <div className="schedule-item-body">
          <h3>{item.title}</h3>
          <p>{item.description || '설명 미제공'}</p>
          <dl><div><dt>장소</dt><dd>{item.location || '위치 미제공'}</dd></div><div><dt>소요시간</dt><dd>{item.duration || '미제공'}</dd></div><div><dt>이동</dt><dd>{item.moveTime || '미제공'}</dd></div><div><dt>추천 근거</dt><dd>{item.aiReason || '미제공'}</dd></div></dl>
          <label className="document-field"><span>수정 요청 메모</span><textarea value={request} onChange={(event) => setRequest(event.target.value)} maxLength={1000} placeholder="바꾸고 싶은 시간·장소와 이유를 적어주세요." /></label>
          <button type="button" className="solid-btn" onClick={submit}>수정 요청 보내기</button>
        </div>
      </aside>
    </>
  );
}

function Avatar({ src, name, fallback }: { src?: string | null; name: string; fallback: number }) {
  return <img className="avatar" src={src ?? imageUrl(PROFILE_FALLBACKS[fallback % PROFILE_FALLBACKS.length], 120)} alt={`${name} 프로필`} />;
}

function WorkspaceState({ title, message, loading = false, action }: { title: string; message?: string; loading?: boolean; action?: () => void }) {
  return <main className="page"><div className="container"><div className="empty-state" role={loading ? 'status' : 'alert'}><strong>{title}</strong>{message ? <p>{message}</p> : null}{loading ? <div className="loading-line" /> : null}{action ? <button className="solid-btn" onClick={action}>동행 찾기</button> : null}</div></div></main>;
}

function LoadingCards() {
  return <div className="skeleton-stack" role="status" aria-label="여행지를 불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function LoadingSchedule() {
  return <div className="skeleton-stack" role="status" aria-label="일정을 불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function tripTitle(trip: TripSummary, nickname?: string) {
  return trip.title || `${nickname ?? '나'}과 ${trip.partner?.nickname ?? '동행'}의 ${trip.region ?? 'OddTrip'} 여행`;
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}

function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return '기간 미정';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  return Number.isFinite(days) && days > 0 ? `${Math.max(0, days - 1)}박 ${days}일` : '기간 미정';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function score(value?: number | null) {
  return value == null ? '—' : Math.round(value);
}

function stablePlaceImageIndex(id: string) {
  const hash = [...id].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) >>> 0, 0);
  return hash % PLACE_IMAGE_FALLBACKS.length;
}

function isDemoSource(source?: string | null) {
  return Boolean(source && /(?:^|[-_\s])(demo|mock|fallback|fixture|static)(?:$|[-_\s])/i.test(source));
}

function hasPreferenceInput(preferences: ReturnType<typeof useTripStore.getState>['preferences']) {
  return Boolean(
    preferences.places.length
    || preferences.activities.length
    || preferences.foods.length
    || preferences.indoorPreferred
    || preferences.hiddenSpots
    || preferences.pace !== 50
    || preferences.budget !== 50
  );
}
