import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/classNames';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ className, variant = 'primary', icon, children, ...props }: ButtonProps) {
  const variants: Record<Variant, string> = {
    primary: 'bg-[#006bff] text-white shadow-[0_14px_28px_rgba(0,107,255,0.22)] hover:bg-[#0054c8]',
    secondary: 'bg-white text-ink border border-black/10 hover:border-[#006bff]',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return (
    <button className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
