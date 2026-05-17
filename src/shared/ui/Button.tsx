import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/classNames';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ className, variant = 'primary', icon, children, ...props }: ButtonProps) {
  const variants: Record<Variant, string> = {
    primary: 'bg-brand-700 text-white shadow-soft hover:bg-brand-900',
    secondary: 'bg-white text-ink border border-slate-200 hover:border-brand-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return (
    <button className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
