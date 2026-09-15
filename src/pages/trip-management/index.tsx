import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { TripSummary } from '../../types';

export type TripDraft = {
  title: string;
  region: string;
  startDate: string;
  endDate: string;
};

const EMPTY_DRAFT: TripDraft = { title: '', region: '', startDate: '', endDate: '' };

export function NewTripPage() {
  const navigate = useNavigate();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [draft, setDraft] = useState<TripDraft>(EMPTY_DRAFT);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateTripDraft(draft);
    if (validation) {
      showInfo('여행 정보를 확인해 주세요.', validation);
      return;
    }
    showComingSoon(
      '새 여행 만들기',
      '여행 생성 API가 준비되기 전까지 입력한 제목·지역·기간은 저장되지 않습니다. 현재는 동행 요청이 수락될 때 여행이 자동 생성됩니다.',
    );
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
      note="직접 여행 만들기는 준비 중입니다. 지금은 동행 요청이 수락되면 두 사람의 여행 공간이 자동으로 열립니다."
    />
  );
}

export function TripSettingsPage() {
  const navigate = useNavigate();
  const { activeTripId, tripHistory, ensureTrip, status } = useTripStore();
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateTripDraft(draft);
    if (validation) {
      showInfo('여행 정보를 확인해 주세요.', validation);
      return;
    }
    showComingSoon(
      '여행 정보 수정',
      'Trip 수정 API가 준비되기 전까지 변경 내용은 서버에 저장되지 않습니다. 화면을 벗어나면 기존 여행 정보가 그대로 유지됩니다.',
    );
  };

  const requestDelete = () => {
    showComingSoon(
      '여행 삭제',
      '두 참여자의 권한과 진행 중인 채팅·일정 처리 규칙이 포함된 Trip 삭제 API를 준비하고 있습니다. 현재 여행은 삭제되거나 종료되지 않았습니다.',
    );
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
      note="여행 정보 편집은 준비 중입니다. 변경 내용을 확인할 수 있지만 아직 기존 여행 기록에는 반영되지 않습니다."
      trip={trip}
      destructiveAction={<button type="button" className="line-btn danger" onClick={requestDelete}>여행 삭제</button>}
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
                <input required type="date" min={draft.startDate || undefined} value={draft.endDate} onChange={(event) => update('endDate', event.target.value)} />
              </label>
            </div>

            <div className="document-summary">
              <span>기간</span><b>{duration}</b>
              <span>참여자</span><b>{trip?.partner?.nickname ? `나 · ${trip.partner.nickname}` : '동행 연결 전'}</b>
              <span>저장 상태</span><b>준비 중</b>
            </div>

            <div className="planning-actions">
              {secondary}
              <button type="submit" className="solid-btn">{primaryLabel}</button>
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
            {destructiveAction ? <div className="planning-danger"><p>여행 삭제는 일정과 채팅에 영향을 줍니다.</p>{destructiveAction}</div> : null}
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

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}
