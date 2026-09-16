import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { TripSummary } from '../../types';

export type TripDraft = {
  matchId?: string;
  title: string;
  region: string;
  startDate: string;
  endDate: string;
};

const EMPTY_DRAFT: TripDraft = { matchId: '', title: '', region: '', startDate: '', endDate: '' };

export function NewTripPage() {
  const navigate = useNavigate();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const { tripHistory, status, error, loadTripHistory, createTrip } = useTripStore();
  const [draft, setDraft] = useState<TripDraft>(EMPTY_DRAFT);

  useEffect(() => { void loadTripHistory(); }, [loadTripHistory]);
  const reusableTrips = useMemo(() => {
    const activeMatchIds = new Set(tripHistory.filter((trip) => !['completed', 'cancelled'].includes(trip.status)).map((trip) => trip.matchId));
    const seen = new Set<string>();
    return tripHistory.filter((trip) => {
      if (!['completed', 'cancelled'].includes(trip.status) || activeMatchIds.has(trip.matchId) || seen.has(trip.matchId)) return false;
      seen.add(trip.matchId);
      return true;
    });
  }, [tripHistory]);

  useEffect(() => {
    if (draft.matchId || !reusableTrips.length) return;
    const source = reusableTrips[0];
    setDraft((value) => ({ ...value, matchId: source.matchId, region: source.region ?? value.region }));
  }, [draft.matchId, reusableTrips]);

  if (status.tripHistory === 'loading' && !tripHistory.length) {
    return <DocumentState title="새 여행을 만들 수 있는 동행을 확인하고 있습니다." loading />;
  }
  if (status.tripHistory === 'success' && !reusableTrips.length) {
    return <DocumentState title="새 여행을 만들 수 있는 동행이 없습니다." copy="완료되거나 취소된 여행의 동행과 다시 여행을 만들 수 있습니다. 먼저 동행을 찾아주세요." action={() => navigate('/matches')} />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateTripDraft(draft);
    if (validation) {
      showInfo('여행 정보를 확인해 주세요.', validation);
      return;
    }
    if (!draft.matchId) {
      showInfo('동행을 선택해 주세요.', '새 여행을 함께할 기존 동행이 필요합니다.');
      return;
    }
    const created = await createTrip({
      matchId: draft.matchId,
      title: draft.title.trim() || undefined,
      region: draft.region.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
    if (created) navigate('/trip/overview');
  };

  return (
    <TripDraftShell
      eyebrow="NEW TRIP · PLANNING DOCUMENT"
      title="새 여행 설계"
      description="여행의 이름과 범위를 먼저 정리합니다. 동행을 정하지 않은 상태에서도 사용할 수 있도록 준비한 화면입니다."
      draft={draft}
      onChange={setDraft}
      onSubmit={submit}
      primaryLabel="여행 만들기"
      secondary={<button type="button" className="line-btn" onClick={() => navigate('/my')}>취소</button>}
      note="완료되거나 취소된 여행의 동행과 새 여행 공간을 만듭니다."
      matchOptions={reusableTrips}
      busy={status.tripMutation === 'loading'}
      error={status.tripMutation === 'error' ? error : undefined}
    />
  );
}

export function TripSettingsPage() {
  const navigate = useNavigate();
  const { activeTripId, tripHistory, ensureTrip, status, error, updateTrip, cancelTrip } = useTripStore();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));
  const [draft, setDraft] = useState<TripDraft>(EMPTY_DRAFT);

  useEffect(() => { void ensureTrip(); }, [ensureTrip]);
  useEffect(() => {
    if (!trip) return;
    setDraft({
      title: trip.title ?? '',
      region: trip.region ?? '',
      startDate: trip.startDate ?? '',
      endDate: trip.endDate ?? '',
    });
  }, [trip]);

  if (!trip && status.trip === 'loading') {
    return <DocumentState title="여행 정보를 불러오고 있습니다." loading />;
  }
  if (!trip) {
    return <DocumentState title="관리할 여행이 없습니다." copy="동행과 매칭되면 여행 설정을 사용할 수 있습니다." action={() => navigate('/matches')} />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateTripDraft(draft);
    if (validation) {
      showInfo('여행 정보를 확인해 주세요.', validation);
      return;
    }
    const saved = await updateTrip(trip.tripId, {
      title: draft.title.trim() || null,
      region: draft.region.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
    if (saved) showInfo('여행 정보를 저장했습니다.', '지역이나 날짜가 변경된 경우 기존 일정과 일정 승인 상태는 초기화됩니다.');
  };

  const requestDelete = async () => {
    if (!window.confirm('이 여행을 취소할까요? 동행에게도 취소 알림이 전송되며 지금까지의 기록은 남습니다.')) return;
    const cancelled = await cancelTrip(trip.tripId);
    if (cancelled) navigate('/my');
  };

  return (
    <TripDraftShell
      eyebrow="TRIP FILE · SETTINGS"
      title="여행 정보 관리"
      description={`${trip.partner?.nickname ?? '동행'}님과 연결된 여행의 제목, 지역, 기간을 검토합니다.`}
      draft={draft}
      onChange={setDraft}
      onSubmit={submit}
      primaryLabel="변경 내용 저장"
      secondary={<button type="button" className="line-btn" onClick={() => navigate('/trip/overview')}>여행으로 돌아가기</button>}
      note="변경 내용은 동행과 공유됩니다. 지역이나 날짜를 바꾸면 기존 일정과 승인 상태가 초기화됩니다."
      trip={trip}
      destructiveAction={<button type="button" className="line-btn danger" onClick={() => void requestDelete()}>여행 취소</button>}
      busy={status.tripMutation === 'loading'}
      error={status.tripMutation === 'error' ? error : undefined}
    />
  );
}

function TripDraftShell({
  eyebrow,
  title,
  description,
  draft,
  onChange,
  onSubmit,
  primaryLabel,
  secondary,
  note,
  trip,
  destructiveAction,
  matchOptions,
  busy = false,
  error,
}: {
  eyebrow: string;
  title: string;
  description: string;
  draft: TripDraft;
  onChange: (draft: TripDraft) => void;
  onSubmit: (event: FormEvent) => void;
  primaryLabel: string;
  secondary: ReactNode;
  note: string;
  trip?: TripSummary;
  destructiveAction?: ReactNode;
  matchOptions?: TripSummary[];
  busy?: boolean;
  error?: string;
}) {
  const duration = useMemo(() => durationLabel(draft.startDate, draft.endDate), [draft.startDate, draft.endDate]);
  const update = (key: keyof TripDraft, value: string) => onChange({ ...draft, [key]: value });

  return (
    <main className="page planning-page">
      <div className="container">
        <header className="page-heading">
          <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>
          <p>{description}</p>
        </header>

        <div className="planning-grid">
          <form className="planning-document" onSubmit={onSubmit}>
            <div className="planning-document-head">
              <span>ODDTRIP · TRIP RECORD</span>
              <strong>{trip ? shortId(trip.tripId) : 'NEW'}</strong>
            </div>
            <p className="paper-note">{note}</p>

            {matchOptions ? <label className="document-field">
              <span>함께할 동행</span>
              <select required value={draft.matchId} onChange={(event) => {
                const source = matchOptions.find((item) => item.matchId === event.target.value);
                onChange({ ...draft, matchId: event.target.value, region: source?.region ?? draft.region });
              }}>
                {matchOptions.map((item) => <option key={item.matchId} value={item.matchId}>{item.partner?.nickname ?? '동행'} · {item.region ?? '지역 미정'}</option>)}
              </select>
            </label> : null}

            <label className="document-field">
              <span>여행 제목</span>
              <input required maxLength={100} value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="예: 은진과 지우의 부산 산책" />
            </label>
            <label className="document-field">
              <span>여행 지역</span>
              <input required maxLength={100} value={draft.region} onChange={(event) => update('region', event.target.value)} placeholder="예: 부산광역시" />
            </label>
            <div className="document-field-row">
              <label className="document-field">
                <span>시작일</span>
                <input required type="date" value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} />
              </label>
              <label className="document-field">
                <span>종료일</span>
                <input required type="date" min={draft.startDate || undefined} max={latestEndDate(draft.startDate)} value={draft.endDate} onChange={(event) => update('endDate', event.target.value)} />
              </label>
            </div>

            <div className="document-summary">
              <span>기간</span><b>{duration}</b>
              <span>참여자</span><b>{trip?.partner?.nickname ? `나 · ${trip.partner.nickname}` : matchOptions?.find((item) => item.matchId === draft.matchId)?.partner?.nickname ?? '동행 선택 필요'}</b>
              <span>저장 상태</span><b>{busy ? '저장 중' : '서버 연결'}</b>
            </div>

            {error ? <p className="form-message" role="alert" style={{ color: '#b42318' }}>{error}</p> : null}

            <div className="planning-actions">
              {secondary}
              <button type="submit" className="solid-btn" disabled={busy}>{busy ? '저장 중…' : primaryLabel}</button>
            </div>
          </form>

          <aside className="planning-aside">
            <span className="eyebrow">BEFORE DEPARTURE</span>
            <h2>여행을 만들 때<br />함께 결정할 것</h2>
            <ol>
              <li><b>01</b><span>동행과 공유할 여행 이름</span></li>
              <li><b>02</b><span>추천 장소의 기준이 되는 지역</span></li>
              <li><b>03</b><span>30일 이내의 여행 기간</span></li>
              <li><b>04</b><span>수정과 삭제에 대한 두 사람의 권한</span></li>
            </ol>
            {destructiveAction ? <div className="planning-danger"><p>여행 취소는 일정과 채팅에 영향을 줍니다.</p>{destructiveAction}</div> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function DocumentState({ title, copy, loading = false, action }: { title: string; copy?: string; loading?: boolean; action?: () => void }) {
  return <main className="page"><div className="container"><div className="empty-state" role={loading ? 'status' : 'alert'}><strong>{title}</strong>{copy ? <p>{copy}</p> : null}{loading ? <div className="loading-line" /> : null}{action ? <button className="solid-btn" onClick={action}>동행 찾기</button> : null}</div></div></main>;
}

export function validateTripDraft(draft: TripDraft) {
  if (!draft.title.trim() || !draft.region.trim() || !draft.startDate || !draft.endDate) return '제목, 지역, 시작일과 종료일을 모두 입력해 주세요.';
  const start = new Date(`${draft.startDate}T00:00:00`);
  const end = new Date(`${draft.endDate}T00:00:00`);
  if (end < start) return '종료일은 시작일보다 빠를 수 없습니다.';
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > 30) return '여행 기간은 최대 30일까지 입력할 수 있습니다.';
  return '';
}

export function durationLabel(start: string, end: string) {
  if (!start || !end) return '날짜를 선택해 주세요';
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (to < from) return '날짜 확인 필요';
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return `${days}일 · ${Math.max(0, days - 1)}박`;
}

function latestEndDate(start: string) {
  if (!start) return undefined;
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 29);
  return date.toISOString().slice(0, 10);
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}
