import type { HTMLAttributes } from 'react';
import { cn } from '../lib/classNames';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-line bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-modal', className)} {...props} />;
}
