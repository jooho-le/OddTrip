import type { HTMLAttributes } from 'react';
import { cn } from '../lib/classNames';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(16,17,20,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(16,17,20,0.14)]', className)} {...props} />;
}
