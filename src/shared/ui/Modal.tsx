import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-3xl bg-surface p-6 shadow-modal">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id="modal-title" className="text-xl font-extrabold">{title}</h2><button onClick={onClose} aria-label="닫기" className="icon-button"><X className="h-5 w-5" /></button></div>
        {children}
      </section>
    </div>, document.body
  );
}
