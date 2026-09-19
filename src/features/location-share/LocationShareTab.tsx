import { useEffect, useRef, useState } from 'react';
import { Copy, Eye, Link2, MapPin, Share2, ShieldCheck } from 'lucide-react';
import { shareUrl } from '../../entities/location-share/api/locationShareService';
import { useLocationShareStore } from '../../entities/location-share/model/locationShareStore';
import { parseServerDate } from '../../shared/lib/formatDate';
import { useToast } from '../../shared/ui/Toast';
import type { TripSummary } from '../../types';

const HOUR_LABELS: Record<number, string> = { 6: '6시간', 24: '24시간', 72: '3일' };

export function LocationShareTab({ trip }: { trip: TripSummary }) {
  const { share, durationChoices, loading, busy, error, permission, lastSentAt, load, start, extend, stop } = useLocationShareStore();
  const [hours, setHours] = useState(durationChoices[0] ?? 6);
  const [asking, setAsking] = useState(false);
  const [stopping, setStopping] = useState(false);
  const show = useToast((state) => state.show);

  useEffect(() => { void load(); }, [load]);

  const begin = async (durationHours: number) => {
    setAsking(false);
    if (await start(durationHours, trip.tripId)) show('위치 공유를 시작했어요. 링크를 보내 주세요.', 'info');
  };

  if (loading && !share) return <p className="location-share-status" role="status">위치 공유 상태를 불러오고 있어요.</p>;

  return (
    <div className="location-share">
      {error ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void load()}>다시 시도</button></div> : null}
      {share
        ? <ActiveShare
            token={share.token}
            expiresAt={share.expiresAt}
            viewCount={share.viewCount}
            lastSentAt={lastSentAt ?? share.lastPositionAt}
            permission={permission}
            busy={busy}
            onExtend={(value) => void extend(value).then((done) => { if (done) show('공유 시간을 연장했어요.', 'info'); })}
            onStop={() => setStopping(true)}
            durationChoices={durationChoices}
          />
        : <IdleShare
            hours={hours}
            durationChoices={durationChoices}
            busy={busy}
            onPick={setHours}
            onStart={() => setAsking(true)}
          />}

      {asking ? <ConsentDialog hours={hours} onClose={() => setAsking(false)} onConfirm={() => void begin(hours)} /> : null}
      {stopping ? (
        <ConfirmDialog
          title="위치 공유를 끌까요?"
          description="지금 바로 링크가 닫히고, 링크를 받은 사람은 더 이상 내 위치를 볼 수 없어요."
          confirmLabel="공유 끄기"
          onClose={() => setStopping(false)}
          onConfirm={() => { setStopping(false); void stop().then(() => show('위치 공유를 껐어요.', 'info')); }}
        />
      ) : null}
    </div>
  );
}

function IdleShare({ hours, durationChoices, busy, onPick, onStart }: {
  hours: number; durationChoices: number[]; busy: boolean; onPick: (value: number) => void; onStart: () => void;
}) {
  return (
    <section className="location-share-card">
      <header>
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <h2>가족·친구에게 내 위치 알리기</h2>
          <p>혼자 이동하거나 낯선 곳에 있을 때, 믿을 만한 사람이 내 위치를 볼 수 있어요.</p>
        </div>
      </header>

      <ul className="location-share-points">
        <li><Link2 size={17} aria-hidden="true" /><div><b>링크를 받은 사람만 볼 수 있어요</b><span>앱 설치도 로그인도 필요 없어요.</span></div></li>
        <li><ShieldCheck size={17} aria-hidden="true" /><div><b>동행에게는 공유되지 않아요</b><span>내가 링크를 보낸 사람만 봅니다.</span></div></li>
        <li><MapPin size={17} aria-hidden="true" /><div><b>보이는 건 현재 위치뿐이에요</b><span>일정·동행 정보는 보이지 않아요.</span></div></li>
      </ul>

      {/* 켜는 사람도 계속 갱신된다고 믿는다. 길게 설명하기보다 무엇을 하면
          되는지 한 줄로 알린다. */}
      <div className="location-share-tip">
        <b>화면을 켜둔 동안 위치를 공유할 수 있어요</b>
        <span>닫으면 위치가 멈춰요. 가끔 이 화면으로 돌아와 위치를 갱신해 주세요.</span>
      </div>

      <div className="location-share-duration">
        <b>얼마 동안 공유할까요?</b>
        <div role="radiogroup" aria-label="공유 시간">
          {durationChoices.map((value) => (
            <button type="button" key={value} role="radio" aria-checked={hours === value} className={hours === value ? 'active' : ''} onClick={() => onPick(value)}>
              {HOUR_LABELS[value] ?? `${value}시간`}
            </button>
          ))}
        </div>
        <small>정한 시간이 지나면 자동으로 꺼져요. 중간에 언제든 직접 끌 수 있어요.</small>
      </div>

      <button type="button" className="solid-btn location-share-start" disabled={busy} onClick={onStart}>위치 공유 켜기</button>
    </section>
  );
}

function ActiveShare({ token, expiresAt, viewCount, lastSentAt, permission, busy, durationChoices, onExtend, onStop }: {
  token: string; expiresAt: string; viewCount: number; lastSentAt: string | null;
  permission: string; busy: boolean; durationChoices: number[];
  onExtend: (hours: number) => void; onStop: () => void;
}) {
  const url = shareUrl(token);
  const remaining = useCountdown(expiresAt);
  // 받는 사람 화면과 같은 기준(1분)으로 본다. 권한이 거부됐거나 전송이 끊기면
  // 보내는 쪽에도 같은 사실이 보여야 한다.
  const stalled = permission === 'denied' || !lastSentAt
    || Date.now() - parseServerDate(lastSentAt).getTime() > 60_000;
  const show = useToast((state) => state.show);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      show('링크를 복사했어요.', 'info');
    } catch {
      show('복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.', 'info');
    }
  };
  const sendLink = async () => {
    // 모바일에서는 카카오톡·문자 등 기기의 공유 시트를 그대로 쓴다.
    if (navigator.share) {
      try { await navigator.share({ title: '내 위치', text: '지금 내 위치를 보내요.', url }); return; } catch { /* 취소는 오류가 아니다 */ }
    }
    void copy();
  };

  return (
    <section className="location-share-card is-live">
      <header>
        <span className="location-share-dot" aria-hidden="true" />
        <div>
          <h2>위치 공유 중</h2>
          <p>{permission === 'denied'
            ? '브라우저에서 위치 권한이 거부되어 위치가 전송되지 않고 있어요.'
            : lastSentAt ? `${freshness(lastSentAt)} 업데이트` : '첫 위치를 찾고 있어요.'}</p>
        </div>
      </header>

      <div className="location-share-link">
        <code>{url}</code>
        <div>
          <button type="button" className="line-btn" onClick={() => void copy()}><Copy size={15} />링크 복사</button>
          <button type="button" className="solid-btn" onClick={() => void sendLink()}><Share2 size={15} />공유하기</button>
        </div>
      </div>
      <div className={stalled ? 'location-share-tip is-stalled' : 'location-share-tip'}>
        <b>{stalled ? '위치가 멈춰 있어요' : '화면을 켜둔 동안 위치를 공유할 수 있어요'}</b>
        <span>{stalled ? '이 화면으로 돌아와 위치를 갱신해 주세요.' : '닫으면 위치가 멈춰요. 가끔 이 화면으로 돌아와 위치를 갱신해 주세요.'}</span>
      </div>

      <dl className="location-share-meta">
        <div><dt>남은 시간</dt><dd>{remaining}</dd></div>
        <div><dt><Eye size={14} aria-hidden="true" />열람</dt><dd>{viewCount}번</dd></div>
      </dl>

      <div className="location-share-actions">
        <label>
          <span className="sr-only">공유 시간 연장</span>
          <select defaultValue="" disabled={busy} onChange={(event) => { if (event.target.value) onExtend(Number(event.target.value)); event.target.value = ''; }}>
            <option value="">시간 연장</option>
            {durationChoices.map((value) => <option key={value} value={value}>{HOUR_LABELS[value] ?? `${value}시간`} 더</option>)}
          </select>
        </label>
        <button type="button" className="line-btn" disabled={busy} onClick={onStop}>공유 끄기</button>
      </div>
    </section>
  );
}

/** 남은 시간은 30초마다 다시 센다. 초 단위로 떨어뜨릴 만큼 급한 값은 아니다. */
function useCountdown(expiresAt: string) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const left = parseServerDate(expiresAt).getTime() - Date.now();
  if (Number.isNaN(left) || left <= 0) return '곧 종료';
  const minutes = Math.floor(left / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}시간 ${minutes % 60}분 남음` : `${minutes}분 남음`;
}

function freshness(at: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - parseServerDate(at).getTime()) / 1000));
  if (seconds < 30) return '방금 전';
  if (seconds < 60) return '30초 전';
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}분 전` : `${Math.floor(minutes / 60)}시간 전`;
}

function ConsentDialog({ hours, onClose, onConfirm }: { hours: number; onClose: () => void; onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <DialogShell titleId="location-consent-title" onClose={onClose}>
      <span className="community-overline">ODDTRIP NOTICE</span>
      <h2 id="location-consent-title">위치정보 제공에 동의해 주세요</h2>
      <ul className="location-consent-list">
        <li><b>무엇을</b> 현재 위치 좌표</li>
        <li><b>누구에게</b> 내가 링크를 보낸 사람</li>
        <li><b>언제까지</b> {HOUR_LABELS[hours] ?? `${hours}시간`} 뒤까지, 또는 내가 끌 때까지</li>
        <li><b>보관</b> 서버에 최신 위치만 잠시 두고 이동 기록으로 남기지 않아요</li>
        <li><b>갱신</b> 이 화면을 열어 둔 동안 위치가 갱신돼요</li>
      </ul>
      <label className="location-consent-check">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        위치정보 수집·제공에 동의합니다 (필수)
      </label>
      <div>
        <button type="button" className="line-btn" onClick={onClose}>취소</button>
        <button type="button" className="solid-btn" disabled={!agreed} onClick={onConfirm}>동의하고 시작하기</button>
      </div>
    </DialogShell>
  );
}

function ConfirmDialog({ title, description, confirmLabel, onClose, onConfirm }: {
  title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <DialogShell titleId="location-confirm-title" onClose={onClose}>
      <span className="community-overline">ODDTRIP NOTICE</span>
      <h2 id="location-confirm-title">{title}</h2>
      <p>{description}</p>
      <div>
        <button type="button" className="line-btn" onClick={onClose} autoFocus>취소</button>
        <button type="button" className="solid-btn" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </DialogShell>
  );
}

function DialogShell({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog className="community-dialog" ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby={titleId}>
      {children}
    </dialog>
  );
}
