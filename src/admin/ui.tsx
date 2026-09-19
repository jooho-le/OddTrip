import type { ReactNode } from 'react';
import { cn } from '../shared/lib/classNames';
import { parseServerDate } from '../shared/lib/formatDate';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 border-b-2 border-[#202124] pb-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-[#ff2d78]">{eyebrow}</p><h1 className="text-3xl font-black tracking-[-.04em]">{title}</h1><p className="mt-2 max-w-2xl text-xs font-medium leading-6 text-slate-500">{description}</p></div>{action}</div>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={cn('border border-[#e1e1e1] bg-white p-5 sm:p-6', className)}>{children}</section>;
}

export function StatusPill({ value }: { value: string }) {
  const style: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700', suspended: 'bg-amber-50 text-amber-700', withdrawn: 'bg-slate-100 text-slate-500',
    planning: 'bg-blue-50 text-blue-700', confirmed: 'bg-violet-50 text-violet-700', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-rose-50 text-rose-700',
    pending: 'bg-rose-50 text-rose-700', reviewing: 'bg-amber-50 text-amber-700', resolved: 'bg-emerald-50 text-emerald-700', dismissed: 'bg-slate-100 text-slate-500',
  };
  const label: Record<string, string> = { active: '정상', suspended: '정지', withdrawn: '탈퇴', planning: '계획 중', confirmed: '확정', completed: '완료', cancelled: '취소', pending: '미처리', reviewing: '검토 중', resolved: '조치함', dismissed: '조치 없음', unknown: '알 수 없음' };
  return <span className={cn('inline-flex px-2.5 py-1 text-[10px] font-black', style[value] ?? 'bg-slate-100 text-slate-600')}>{label[value] ?? value}</span>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">{children}</table></div>;
}

export const thClass = 'border-b border-slate-100 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400';
export const tdClass = 'border-b border-slate-50 px-3 py-4 align-middle';

export function Pagination({ offset, limit, total, onChange }: {
  offset: number;
  limit: number;
  total: number;
  onChange: (nextOffset: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pageCount - 1, Math.floor(offset / limit));
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-5 flex items-center justify-end gap-3" aria-label="목록 페이지">
      <button
        type="button"
        className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-40"
        disabled={page === 0}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        이전
      </button>
      <span className="min-w-20 text-center text-[11px] font-bold text-slate-500">{page + 1} / {pageCount}</span>
      <button
        type="button"
        className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-40"
        disabled={page >= pageCount - 1}
        onClick={() => onChange(offset + limit)}
      >
        다음
      </button>
    </nav>
  );
}


/** 조회 실패와 빈 목록은 다르게 보여야 한다. 운영 화면에서 둘을 섞으면
 *  "아무 일도 없음"으로 읽힌다. */
export function LoadState({ loading, error, empty, onRetry, emptyText }: {
  loading: boolean;
  error: string;
  empty?: boolean;
  onRetry?: () => void;
  emptyText?: string;
}) {
  if (loading) return <p className="px-3 py-10 text-center text-xs font-bold text-slate-400">불러오는 중…</p>;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-3 py-10">
        <p className="text-xs font-bold text-rose-600">{error}</p>
        {onRetry ? <button onClick={onRetry} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black">다시 시도</button> : null}
      </div>
    );
  }
  if (empty) return <p className="px-3 py-10 text-center text-xs font-bold text-slate-400">{emptyText ?? '표시할 항목이 없습니다.'}</p>;
  return null;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = parseServerDate(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}
