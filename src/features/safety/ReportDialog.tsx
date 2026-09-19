import { useEffect, useRef, useState } from 'react';
import type { ChatReportReason } from '../../types';

const REPORT_REASONS: { value: ChatReportReason; label: string; hint: string }[] = [
  { value: 'harassment', label: '괴롭힘·욕설', hint: '비하, 위협, 반복적인 불쾌한 연락' },
  { value: 'sexual_content', label: '성적 대화·이미지', hint: '원하지 않는 성적 표현이나 사진' },
  { value: 'fraud', label: '사기·금전 요구', hint: '송금, 예약금, 투자 권유' },
  { value: 'personal_information', label: '개인정보 요구·유포', hint: '신분증, 계좌번호, 주소 요구' },
  { value: 'hate', label: '혐오·차별', hint: '특정 집단에 대한 차별 표현' },
  { value: 'spam', label: '스팸·광고', hint: '반복 광고, 외부 링크 유도' },
  { value: 'other', label: '기타', hint: '위에 해당하지 않는 경우' },
];

export function ReportDialog({ title, description, onClose, onSubmit }: {
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: (reason: ChatReportReason, details?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<ChatReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.classList.add('notice-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusFirst);
      document.body.classList.remove('notice-open');
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, []);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(reason, details.trim() || undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '신고를 접수하지 못했습니다.');
      setBusy(false);
    }
  };

  return (
    <div className="ui-notice-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialogRef} className="ui-notice-dialog report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title" tabIndex={-1}>
        <div className="ui-notice-kicker">REPORT</div>
        <h2 id="report-title">{title}</h2>
        <p>{description ?? '접수한 신고는 취소할 수 없습니다. 어떤 점이 문제였는지 골라주세요.'}</p>

        <div className="report-reasons">
          {REPORT_REASONS.map((item) => (
            <label key={item.value} className={reason === item.value ? 'report-reason selected' : 'report-reason'}>
              <input type="radio" name="report-reason" checked={reason === item.value} onChange={() => setReason(item.value)} />
              <span><b>{item.label}</b><small>{item.hint}</small></span>
            </label>
          ))}
        </div>

        <label className="field full" style={{ marginTop: 12 }}>
          <span>추가 설명 (선택)</span>
          <textarea rows={2} maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="운영자가 확인할 때 참고할 내용을 적어주세요." />
        </label>
        {error ? <div className="error-strip" role="alert">{error}</div> : null}
        <p className="report-guard">신체적 위험이 있다면 신고와 별도로 112에 즉시 연락해주세요. 허위·보복 신고를 반복하면 이용이 제한될 수 있습니다.</p>

        <div className="button-row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="line-btn" disabled={busy} onClick={onClose}>취소</button>
          <button type="button" className="solid-btn" disabled={!reason || busy} onClick={() => void submit()}>{busy ? '접수 중…' : '신고하기'}</button>
        </div>
      </section>
    </div>
  );
}
