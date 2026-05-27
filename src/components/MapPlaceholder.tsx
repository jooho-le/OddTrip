import { MapPin } from 'lucide-react';

export function MapPlaceholder({ label = '지도 연결 준비 중' }: { label?: string }) {
  return (
    <div className="flex aspect-[4/3] min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-[#eefaf4] text-center">
      <div className="rounded-lg bg-white/90 p-4 shadow-soft">
        <MapPin className="mx-auto mb-2 h-7 w-7 text-brand-700" />
        <p className="text-sm font-semibold text-slate-700">{label}</p>
      </div>
    </div>
  );
}
