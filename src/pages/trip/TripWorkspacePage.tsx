import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '../../entities/chat/model/chatStore';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useCoordinationRealtime, useTripLifecycleRealtime } from '../../entities/trip/model/useCoordinationRealtime';
import {
  imageUrl,
  PROFILE_FALLBACKS,
} from '../../features/prototype/designContent';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { ItineraryItem, TripSummary, UserProfile } from '../../types';
import { TripFlowGuide } from '../../widgets/trip/TripFlowGuide';
import { coordinationFlowState, isTripPlanningReadOnly } from '../../widgets/trip/coordinationFlow';

const TABS = [
  ['overview', '개요'],
  ['coordination', '조율'],
  ['schedule', '일정'],
] as const;

export function TripWorkspacePage() {
  const { tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const active = TABS.some(([key]) => key === tab) ? tab : 'overview';
  const { user, activeTripId, tripHistory, itinerary, status, error, ensureTrip, openTrip, loadTripHistory } = useTripStore();

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
  const planningReadOnly = isTripPlanningReadOnly(trip.status, Boolean(itinerary.length || trip.itineraryDayCount));

  return (
    <main className="page">
      <div className="container">
        <section className="trip-cover">
          <button type="button" className="trip-settings-link" onClick={() => navigate('/trip/settings')}>
            <Settings2 aria-hidden="true" size={15} />
            <span>여행 설정</span>
          </button>
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
          {active === 'coordination' ? <CoordinationTab trip={trip} user={user} readOnly={planningReadOnly} /> : null}
          {active === 'schedule' ? <ScheduleTab trip={trip} /> : null}
        </div>
      </div>
    </main>
  );
}

function OverviewTab({ trip, user }: { trip: TripSummary; user?: UserProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const preferences = useTripStore((state) => state.preferences);
  const pairPreferences = useTripStore((state) => state.pairPreferences);
  const itinerary = useTripStore((state) => state.itinerary);
  const aiStatus = useTripStore((state) => state.status.aiItinerary);
  const matches = useTripStore((state) => state.matches);
  const loadMatches = useTripStore((state) => state.loadMatches);
  const rooms = useChatStore((state) => state.rooms);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const preferenceDone = hasPreferenceInput(preferences);
  const itineraryReady = Boolean(itinerary.length || trip.itineraryDayCount);
  const flow = coordinationFlowState({
    mineSubmitted: Boolean(pairPreferences?.mine) || preferenceDone,
    counterpartSubmitted: Boolean(pairPreferences?.counterpart),
    itineraryReady,
    generating: aiStatus === 'loading',
  });
  const candidate = matches.find((item) => item.id === trip.partner?.id);

  useEffect(() => {
    if (user?.ttiCode && !matches.length) void loadMatches();
  }, [user?.ttiCode, matches.length, loadMatches]);

  const nextTask = !preferenceDone
    ? { title: '공동 선호를 작성해 주세요.', to: '/survey/preference' }
    : itineraryReady
      ? { title: 'AI가 완성한 일정을 확인해 주세요.', to: '/trip/schedule' }
      : { title: '동행의 선호 제출을 기다리고 있습니다.', to: '/trip/coordination' };

  const openChat = () => {
    const room = rooms.find((item) => item.trip?.id === trip.tripId || item.matchId === trip.matchId);
    if (!room) {
      showInfo('연결된 채팅방을 찾지 못했습니다.', '채팅방 목록을 새로 불러온 뒤 헤더의 채팅 버튼에서 다시 확인해 주세요.');
      return;
    }
    navigate(`/chat/${encodeURIComponent(room.id)}`, { state: { backgroundLocation: location } });
  };

  return (
    <>
      <TripFlowGuide
        currentIndex={flow.currentIndex}
        current={flow.current}
        next={flow.next}
        partnerStatus={itineraryReady ? '공동 일정 생성 완료' : pairPreferences?.counterpart ? '동행 선호 제출 완료' : '동행 선호 제출 대기'}
        finalized={itineraryReady}
      />
    <div className="overview-grid">
      <section>
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
          {trip.attractionCount > 0 ? <ActivityRow time="현재" title={`AI가 ${trip.attractionCount}곳을 일정 후보로 검토했습니다.`} copy="두 사람의 선호와 여행 지역을 함께 반영했습니다." /> : null}
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
    </>
  );
}

function ActivityRow({ time, title, copy }: { time: string; title: string; copy: string }) {
  return <div className="activity-row"><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></div>;
}

function CoordinationTab({ trip, user, readOnly }: { trip: TripSummary; user?: UserProfile; readOnly: boolean }) {
  const navigate = useNavigate();
  const {
    activeTripId,
    pairPreferences,
    itinerary,
    status,
    error,
    loadCoordination,
    generateAiItinerary,
  } = useTripStore();
  const mineDone = Boolean(pairPreferences?.mine);
  const counterpartDone = Boolean(pairPreferences?.counterpart);
  const itineraryReady = Boolean(itinerary.length || trip.itineraryDayCount);

  useEffect(() => {
    void loadCoordination();
  }, [loadCoordination]);
  useCoordinationRealtime(activeTripId, loadCoordination);

  const comparison = pairPreferences?.comparison;
  const flow = coordinationFlowState({
    mineSubmitted: mineDone,
    counterpartSubmitted: counterpartDone,
    itineraryReady,
    generating: status.aiItinerary === 'loading',
  });
  const partnerStatus = itineraryReady ? '공동 일정 생성 완료' : counterpartDone ? '선호 제출 완료' : '선호 제출 대기';

  return (
    <>
      <TripFlowGuide
        currentIndex={flow.currentIndex}
        current={flow.current}
        next={flow.next}
        partnerStatus={partnerStatus}
        finalized={readOnly}
      />
      {readOnly ? <div className="planning-lock" role="status"><b>AI 일정이 완성됐습니다.</b><span>일정 생성에 사용된 선호는 기록으로 보존되며, 이후 의견은 채팅에서 나눕니다.</span></div> : null}
      <div className="coord-layout">
        <section>
          <div className="section-title"><h2>선호 제출</h2><p>두 사람의 답안이 모이면 AI가 여행지와 동선을 골라 일정표를 바로 만듭니다.</p></div>
          <div className="coord-list">
            <article className={mineDone ? 'coord-item done' : 'coord-item'}>
              <span className="coord-no">{mineDone ? '✓' : '1'}</span>
              <div className="coord-copy"><h3>각자 공동 선호 제출</h3><p>상대의 답을 보기 전에 각자의 여행 기준을 별도로 저장합니다.</p></div>
              <div className="coord-action"><small>{mineDone ? '내 선호 제출 완료' : `${user?.nickname ?? '나'} 작성 필요`}</small><button type="button" className={mineDone ? 'line-btn' : 'solid-btn'} onClick={() => navigate('/survey/preference')}>{readOnly ? '제출 내용 보기' : mineDone ? '작성 내용 확인' : '선호 제출'}</button></div>
            </article>
            <article className={itineraryReady ? 'coord-item done' : 'coord-item'}>
              <span className="coord-no">{itineraryReady ? '✓' : '2'}</span>
              <div className="coord-copy"><h3>AI 여행 생성</h3><p>{comparison ? `공통 장소 선호 ${comparison.places.common.length}개 · 공통 활동 ${comparison.activities.common.length}개` : '동행의 선호 제출을 기다리고 있습니다.'} 별도 합의안과 장소 투표 없이 두 답안을 함께 반영합니다.</p></div>
              <div className="coord-action"><small>{itineraryReady ? '일정 생성 완료' : status.aiItinerary === 'loading' ? '장소·동선 분석 중' : pairPreferences?.bothSubmitted ? '생성 준비 완료' : '양쪽 제출 대기'}</small>{itineraryReady ? <button type="button" className="solid-btn" onClick={() => navigate('/trip/schedule')}>일정표 보기</button> : pairPreferences?.bothSubmitted && status.aiItinerary !== 'loading' ? <button type="button" className="solid-btn" onClick={() => void generateAiItinerary()}>{status.aiItinerary === 'error' ? '다시 만들기' : 'AI 일정 만들기'}</button> : <span className="record-label">자동 시작</span>}</div>
            </article>
          </div>
        </section>
        <aside>
          <div className="section-title"><h2>제출 상태</h2></div>
          <div className="coord-side">
            <div className="person-state"><Avatar src={user?.avatarUrl} name={user?.nickname ?? '나'} fallback={0} /><div><b>{user?.nickname ?? '나'}</b><p>{mineDone ? '공동 선호 제출됨' : '공동 선호 작성 필요'}</p></div><em>{mineDone ? '완료' : '작성'}</em></div>
            <div className="person-state"><Avatar src={trip.partner?.avatarUrl} name={trip.partner?.nickname ?? '동행'} fallback={1} /><div><b>{trip.partner?.nickname ?? '동행'}</b><p>{counterpartDone ? '공동 선호 제출됨' : '상대 제출 대기'}</p></div><em>{counterpartDone ? '완료' : '대기'}</em></div>
          </div>
        </aside>
      </div>

      {status.aiItinerary === 'loading' ? <section className="ai-journey-panel" role="status"><span className="eyebrow">AI JOURNEY BUILD</span><h2>두 사람의 여행을 만들고 있습니다.</h2><p>제출한 선호를 합치고, 여행지와 이동 순서를 검토해 일정표로 정리합니다.</p><div className="loading-line" /></section> : null}
      {error && (status.coordination === 'error' || status.aiItinerary === 'error') ? <div className="error-strip" role="alert"><span>{error}</span>{pairPreferences?.bothSubmitted ? <button type="button" onClick={() => void generateAiItinerary()}>다시 시도</button> : null}</div> : null}
    </>
  );
}

function ScheduleTab({ trip }: { trip: TripSummary }) {
  const { itinerary, pairPreferences, alerts, status, error, loadItinerary, loadAlerts, generateAiItinerary } = useTripStore();
  const navigate = useNavigate();
  const location = useLocation();
  const rooms = useChatStore((state) => state.rooms);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);

  useEffect(() => {
    void loadItinerary();
    void loadAlerts();
  }, [loadItinerary, loadAlerts]);
  useEffect(() => {
    if (itinerary.length && !itinerary.some((day) => day.day === selectedDay)) setSelectedDay(itinerary[0].day);
  }, [itinerary, selectedDay]);

  const day = itinerary.find((item) => item.day === selectedDay) ?? itinerary[0];
  const flow = coordinationFlowState({
    mineSubmitted: Boolean(pairPreferences?.mine),
    counterpartSubmitted: Boolean(pairPreferences?.counterpart),
    itineraryReady: Boolean(itinerary.length),
    generating: status.aiItinerary === 'loading' || status.itinerary === 'loading',
  });
  const openChat = () => {
    const room = rooms.find((item) => item.trip?.id === trip.tripId || item.matchId === trip.matchId);
    if (!room) {
      showInfo('연결된 채팅방을 찾지 못했습니다.', '채팅방 목록을 새로 불러온 뒤 헤더의 채팅 버튼에서 다시 확인해 주세요.');
      return;
    }
    navigate(`/chat/${encodeURIComponent(room.id)}`, { state: { backgroundLocation: location } });
  };

  return (
    <>
    <TripFlowGuide
      currentIndex={flow.currentIndex}
      current={flow.current}
      next={flow.next}
      partnerStatus={itinerary.length ? '같은 일정표 공유 중' : pairPreferences?.counterpart ? '동행 선호 제출 완료' : '동행 선호 제출 대기'}
      finalized={Boolean(itinerary.length)}
    />
    <div className="schedule-grid">
      <section>
        <div className="section-title"><h2>공동 일정표</h2><p>{itinerary.length ? 'AI가 두 사람의 선호와 여행 지역을 바탕으로 만든 최종 계획입니다.' : '양쪽 선호가 제출되면 AI가 장소와 동선을 한 번에 정리합니다.'}</p></div>
        <div className="day-tabs">
          {itinerary.map((item) => <button type="button" className={item.day === selectedDay ? 'on' : ''} onClick={() => setSelectedDay(item.day)} key={item.day}>{item.day}일차</button>)}
          <button type="button" onClick={() => navigate('/trip/schedule/map')}>지도·동선</button>
        </div>
        {error && status.itinerary === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadItinerary()}>다시 시도</button></div> : null}
        {status.itinerary === 'loading' && !itinerary.length ? <LoadingSchedule /> : null}
        <div className="day-list">
          {day?.items.map((item) => (
            <div className="schedule-row" key={item.id}><time>{item.time}</time><span className="route-dot" /><div className="schedule-copy"><h3>{item.title}</h3><p>{item.description || item.location}</p><small>{[item.duration, item.moveTime ? `이동 ${item.moveTime}` : '', item.aiReason].filter(Boolean).join(' · ')}</small><button type="button" className="text-btn accent schedule-detail-link" onClick={() => setSelectedItem(item)}>항목 자세히 보기 →</button></div></div>
          ))}
        </div>
        {status.itinerary === 'success' && !itinerary.length ? <div className="empty-state"><strong>아직 생성된 일정이 없습니다.</strong><p>{pairPreferences?.bothSubmitted ? 'AI 일정 생성이 중단됐다면 다시 시도해 주세요.' : '두 사람의 선호 제출이 모두 끝나면 AI 일정 생성이 자동으로 시작됩니다.'}</p><button className="solid-btn" onClick={() => pairPreferences?.bothSubmitted ? void generateAiItinerary() : navigate('/trip/coordination')}>{pairPreferences?.bothSubmitted ? 'AI 일정 다시 만들기' : '선호 제출 상태 보기'}</button></div> : null}
      </section>
      <aside>
        <div className="approval-box">
          <div className="side-head">일정 확인 <span>{itinerary.length ? '마지막 단계' : '생성 전'}</span></div>
          <div className="approval-body schedule-chat-card">
            <b>일정에 관해 바꾸고 싶은 점이 있나요?</b>
            <p>별도 승인이나 수정 요청은 받지 않습니다. 동행과 채팅에서 이야기하고 함께 참고해 주세요.</p>
            <button type="button" className="solid-btn" style={{ width: '100%', marginTop: 13 }} disabled={!itinerary.length} onClick={openChat}>동행과 채팅하기</button>
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

function ScheduleItemDrawer({ item, onClose }: { item: ItineraryItem; onClose: () => void }) {

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <>
      <button type="button" className="scrim" aria-label="일정 항목 닫기" onClick={onClose} />
      <aside className="drawer schedule-item-drawer" role="dialog" aria-modal="true" aria-labelledby="schedule-item-title">
        <div className="drawer-head"><h2 id="schedule-item-title">일정 항목 자세히 보기</h2><button type="button" aria-label="닫기" onClick={onClose}>×</button></div>
        <div className="schedule-item-cover"><span className="eyebrow">SCHEDULE ITEM</span><strong>{item.time}</strong><p>{item.type.toUpperCase()}</p></div>
        <div className="schedule-item-body">
          <h3>{item.title}</h3>
          <p>{item.description || '설명 미제공'}</p>
          <dl><div><dt>장소</dt><dd>{item.location || '위치 미제공'}</dd></div><div><dt>소요시간</dt><dd>{item.duration || '미제공'}</dd></div><div><dt>이동</dt><dd>{item.moveTime || '미제공'}</dd></div><div><dt>추천 근거</dt><dd>{item.aiReason || '미제공'}</dd></div></dl>
          <div className="planning-lock compact"><b>일정표의 상세 정보</b><span>이 화면은 읽기 전용입니다. 조정이 필요하면 동행과 채팅에서 이야기해 주세요.</span></div>
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
