import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useTripListRealtime } from '../../entities/trip/model/useCoordinationRealtime';
import { imageUrl, TRIP_IMAGE_FALLBACKS } from '../../features/prototype/designContent';
import { Modal } from '../../shared/ui/Modal';
import type { TripSummary } from '../../types';

interface TripEditorState {
  title: string;
  region: string;
  startDate: string;
  endDate: string;
  matchId: string;
}

const EMPTY_EDITOR: TripEditorState = { title: '', region: '', startDate: '', endDate: '', matchId: '' };

export function MyTripsPage() {
  const navigate = useNavigate();
  const {
    tripHistory,
    status,
    error,
    loadTripHistory,
    openTrip,
    createTrip,
    updateTrip,
    cancelTrip,
  } = useTripStore();
  const [editor, setEditor] = useState<TripEditorState>(EMPTY_EDITOR);
  const [editingTrip, setEditingTrip] = useState<TripSummary>();
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => { void loadTripHistory(); }, [loadTripHistory]);
  useTripListRealtime(loadTripHistory);

  const reusableTrips = useMemo(() => {
    const activeMatchIds = new Set(
      tripHistory.filter((trip) => !['completed', 'cancelled'].includes(trip.status)).map((trip) => trip.matchId),
    );
    const seen = new Set<string>();
    return tripHistory.filter((trip) => {
      if (!['completed', 'cancelled'].includes(trip.status) || activeMatchIds.has(trip.matchId) || seen.has(trip.matchId)) return false;
      seen.add(trip.matchId);
      return true;
    });
  }, [tripHistory]);

  const open = async (trip: TripSummary) => {
    await openTrip(trip.tripId);
    navigate('/trip/overview');
  };

  const openCreate = () => {
    if (!reusableTrips.length) {
      navigate('/matches');
      return;
    }
    const source = reusableTrips[0];
    setEditingTrip(undefined);
    setEditor({ ...EMPTY_EDITOR, matchId: source.matchId, region: source.region ?? '' });
    setEditorOpen(true);
  };

  const openEdit = (trip: TripSummary) => {
    setEditingTrip(trip);
    setEditor({
      title: trip.title ?? '',
      region: trip.region ?? '',
      startDate: trip.startDate ?? '',
      endDate: trip.endDate ?? '',
      matchId: trip.matchId,
    });
    setEditorOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingTrip) {
      const saved = await updateTrip(editingTrip.tripId, {
        title: editor.title.trim() || null,
        region: editor.region.trim(),
        startDate: editor.startDate,
        endDate: editor.endDate,
      });
      if (saved) setEditorOpen(false);
      return;
    }
    const created = await createTrip({
      matchId: editor.matchId,
      title: editor.title.trim() || undefined,
      region: editor.region.trim(),
      startDate: editor.startDate,
      endDate: editor.endDate,
    });
    if (created) {
      setEditorOpen(false);
      navigate('/trip/overview');
    }
  };

  const cancel = async (trip: TripSummary) => {
    const confirmed = window.confirm('이 여행을 취소할까요? 동행에게도 취소 알림이 전송되며, 지금까지의 기록은 남습니다.');
    if (confirmed) await cancelTrip(trip.tripId);
  };

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div><h1>내 여행</h1><p>진행 중인 여행과 지난 여행만 모아봅니다.</p></div>
          <button type="button" className="solid-btn" style={{ marginLeft: 'auto' }} onClick={openCreate}>
            {reusableTrips.length ? '새 여행 만들기' : '새 동행 찾기'}
          </button>
        </header>
        {error && status.tripHistory === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div> : null}
        <section className="trip-list">
          {status.tripHistory === 'loading' && !tripHistory.length ? <LoadingTrips /> : null}
          {tripHistory.map((trip, index) => {
            const archived = ['completed', 'cancelled'].includes(trip.status);
            return (
              <article className="trip-list-item" key={trip.tripId}>
                <img src={imageUrl(TRIP_IMAGE_FALLBACKS[index % TRIP_IMAGE_FALLBACKS.length], 400)} alt="" />
                <div>
                  <span className={archived ? 'status gray' : 'status'}>{tripStatus(trip)}</span>
                  <h2>{tripTitle(trip)}</h2>
                  <p>{dateRange(trip.startDate, trip.endDate)} · {tripSummary(trip)}</p>
                </div>
                <div className="trip-list-action">
                  <small>{trip.updatedAt ? `업데이트 ${formatDate(trip.updatedAt)}` : trip.createdAt ? `생성 ${formatDate(trip.createdAt)}` : '업데이트 정보 없음'}</small>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    {!archived ? <button type="button" className="line-btn" onClick={() => openEdit(trip)}>정보 수정</button> : null}
                    {!archived ? <button type="button" className="line-btn" onClick={() => void cancel(trip)}>여행 취소</button> : null}
                    <button type="button" className={archived ? 'line-btn' : 'solid-btn'} onClick={() => void open(trip)}>{archived ? '기록 보기' : '계속하기'}</button>
                  </div>
                </div>
              </article>
            );
          })}
          {status.tripHistory === 'success' && !tripHistory.length ? (
            <div className="empty-state"><strong>아직 여행 기록이 없습니다.</strong><p>동행 요청이 수락되면 첫 여행 공간이 여기에 생성됩니다.</p><button className="solid-btn" onClick={() => navigate('/matches')}>동행 찾기</button></div>
          ) : null}
        </section>
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={editingTrip ? '여행 정보 수정' : '새 여행 만들기'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            {!editingTrip ? (
              <label className="field full"><span>함께할 동행</span><select required value={editor.matchId} onChange={(event) => {
                const source = reusableTrips.find((trip) => trip.matchId === event.target.value);
                setEditor((value) => ({ ...value, matchId: event.target.value, region: source?.region ?? value.region }));
              }}>{reusableTrips.map((trip) => <option key={trip.matchId} value={trip.matchId}>{trip.partner?.nickname ?? '동행'} · {trip.region ?? '지역 미정'}</option>)}</select></label>
            ) : null}
            <label className="field full"><span>여행 이름 · 선택</span><input maxLength={100} value={editor.title} placeholder="예: 가을 부산 미식 여행" onChange={(event) => setEditor((value) => ({ ...value, title: event.target.value }))} /></label>
            <label className="field full"><span>여행 지역</span><input required maxLength={100} value={editor.region} onChange={(event) => setEditor((value) => ({ ...value, region: event.target.value }))} /></label>
            <label className="field"><span>시작일</span><input required type="date" value={editor.startDate} onChange={(event) => setEditor((value) => ({ ...value, startDate: event.target.value }))} /></label>
            <label className="field"><span>종료일 · 최대 30일</span><input required type="date" min={editor.startDate} max={latestEndDate(editor.startDate)} value={editor.endDate} onChange={(event) => setEditor((value) => ({ ...value, endDate: event.target.value }))} /></label>
          </div>
          {editingTrip ? <p className="form-message">지역이나 날짜를 바꾸면 기존 일정과 일정 승인은 초기화됩니다.</p> : <p className="form-message">취소되거나 완료된 여행의 동행과 새 여행 공간을 만들 수 있습니다.</p>}
          {error && status.tripMutation === 'error' ? <p className="form-message" role="alert" style={{ color: '#b42318' }}>{error}</p> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button type="button" className="line-btn" onClick={() => setEditorOpen(false)}>닫기</button>
            <button type="submit" className="solid-btn" disabled={status.tripMutation === 'loading'}>{status.tripMutation === 'loading' ? '저장 중…' : '저장'}</button>
          </div>
        </form>
      </Modal>
    </main>
  );
}

function LoadingTrips() {
  return <div className="skeleton-stack" role="status" aria-label="여행 기록을 불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function tripStatus(trip: TripSummary) {
  if (trip.status === 'completed') return '여행 완료';
  if (trip.status === 'cancelled') return '취소됨';
  if (trip.itineraryDayCount > 0) return '일정 확인';
  if (trip.attractionCount > 0 || trip.savedCount > 0) return '여행지 선택';
  return '조율 중';
}

function tripTitle(trip: TripSummary) {
  return trip.title || `${trip.partner?.nickname ?? '동행'}과 함께하는 ${trip.region ?? 'OddTrip'} 여행`;
}

function tripSummary(trip: TripSummary) {
  if (trip.status === 'cancelled') return `저장한 장소 ${trip.savedCount}곳 · 취소된 여행`;
  if (trip.status === 'completed') return `저장한 장소 ${trip.savedCount}곳 · 일정 ${trip.itineraryDayCount}일`;
  if (trip.itineraryDayCount > 0) return '현재 해야 할 일: 공동 일정 확인';
  if (trip.attractionCount > 0) return '현재 해야 할 일: 여행지 선택';
  return '현재 해야 할 일: 함께 정하기';
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}

function latestEndDate(start: string) {
  if (!start) return undefined;
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 29);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
}
