import type { HTMLAttributes } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '../lib/classNames';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

export function Avatar({ src, alt = '', fallback, className, ...props }: AvatarProps) {
  return (
    <div className={cn('grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eee9e3] text-sm font-extrabold text-[#55514d]', className)} {...props}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : fallback ? fallback.slice(0, 1).toUpperCase() : <UserRound className="h-1/2 w-1/2" />}
    </div>
  );
}
