import type { ReactNode } from 'react';
import { cn } from '../shared/lib/classNames';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-black uppercase tracking-[.18em] text-[#ff5a47]">{eyebrow}</p><h1 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{description}</p></div>{action}</div>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-[24px] border border-black/[.06] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,.04)] sm:p-6', className)}>{children}</section>;
}

export function StatusPill({ value }: { value: string }) {
  const style: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700', suspended: 'bg-amber-50 text-amber-700', withdrawn: 'bg-slate-100 text-slate-500',
    planning: 'bg-blue-50 text-blue-700', confirmed: 'bg-violet-50 text-violet-700', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-rose-50 text-rose-700',
  };
  const label: Record<string, string> = { active: '정상', suspended: '정지', withdrawn: '탈퇴', planning: '계획 중', confirmed: '확정', completed: '완료', cancelled: '취소' };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-black', style[value] ?? 'bg-slate-100 text-slate-600')}>{label[value] ?? value}</span>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">{children}</table></div>;
}

export const thClass = 'border-b border-slate-100 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400';
export const tdClass = 'border-b border-slate-50 px-3 py-4 align-middle';
