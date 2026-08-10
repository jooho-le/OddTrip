import { cn } from '../lib/classNames';

export function ProgressBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('space-y-2', className)}>
      {label ? <div className="flex justify-between text-xs font-bold text-muted"><span>{label}</span><span>{safeValue}%</span></div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-[#e8e3dd]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
