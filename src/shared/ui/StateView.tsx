import { AlertCircle, Loader2 } from 'lucide-react';
import { Card } from './Card';

export function LoadingView({ label = '불러오는 중입니다' }: { label?: string }) {
  return <Card className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-brand-700" />{label}</Card>;
}

export function EmptyView({ label }: { label: string }) {
  return <Card className="text-center text-sm text-slate-500">{label}</Card>;
}

export function ErrorView({ label }: { label: string }) {
  return <Card className="flex items-center gap-3 border-red-200 bg-red-50 text-sm text-red-700"><AlertCircle className="h-5 w-5" />{label}</Card>;
}
