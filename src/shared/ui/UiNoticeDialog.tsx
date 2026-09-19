import { useEffect, useRef } from 'react';
import { useUiNoticeStore } from '../model/uiNoticeStore';

export function UiNoticeDialog() {
  const notice = useUiNoticeStore((state) => state.notice);
  const close = useUiNoticeStore((state) => state.close);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!notice) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.body.classList.add('notice-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.classList.remove('notice-open');
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [notice, close]);

  if (!notice) return null;

  return (
    <div className="ui-notice-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className={`ui-notice-dialog ${notice.kind}`} role="dialog" aria-modal="true" aria-labelledby="ui-notice-title" aria-describedby="ui-notice-message">
        <div className="ui-notice-kicker">ODDTRIP NOTICE</div>
        <h2 id="ui-notice-title">{notice.title}</h2>
        <p id="ui-notice-message">{notice.message}</p>
        <button ref={closeButtonRef} type="button" className="solid-btn" onClick={close}>확인</button>
      </section>
    </div>
  );
}
