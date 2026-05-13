import type { HTMLAttributes } from 'react';
import { cn } from '../lib/classNames';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-white/65 bg-[#fffaf0]/85 p-4 shadow-soft backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-lg', className)} {...props} />;
}
