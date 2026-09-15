import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/classNames';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ className, variant = 'primary', icon, children, ...props }: ButtonProps) {
  const variants: Record<Variant, string> = {
    primary: 'bg-accent text-white shadow-[0_14px_34px_rgba(255,90,54,0.22)] hover:bg-[#ef4c2a]',
    secondary: 'bg-white text-ink border border-line hover:border-accent',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return (
    <button className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
