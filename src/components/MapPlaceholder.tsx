import { MapPin } from 'lucide-react';

export function MapPlaceholder({ label = '지도 API 연결 예정' }: { label?: string }) {
  return (
    <div className="flex aspect-[4/3] min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-[linear-gradient(135deg,#eefaf4_25%,#ffffff_25%,#ffffff_50%,#eefaf4_50%,#eefaf4_75%,#ffffff_75%,#ffffff_100%)] bg-[length:28px_28px] text-center">
      <div className="rounded-lg bg-white/90 p-4 shadow-soft">
        <MapPin className="mx-auto mb-2 h-7 w-7 text-brand-700" />
        <p className="text-sm font-semibold text-slate-700">{label}</p>
      </div>
    </div>
  );
}
