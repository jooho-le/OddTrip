import type { HTMLAttributes } from 'react';
import { cn } from '../lib/classNames';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-black/5 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lg', className)} {...props} />;
}
