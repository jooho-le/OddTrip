import { create } from 'zustand';
import { CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'info';
type ToastItem = { id: number; message: string; tone: ToastTone };
type ToastState = { items: ToastItem[]; show: (message: string, tone?: ToastTone) => void; dismiss: (id: number) => void };

export const useToast = create<ToastState>((set) => ({
  items: [],
  show: (message, tone = 'success') => {
    const id = Date.now();
    set((state) => ({ items: [...state.items, { id, message, tone }] }));
    window.setTimeout(() => set((state) => ({ items: state.items.filter((item) => item.id !== id) })), 3200);
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
}));

export function ToastViewport() {
  const { items, dismiss } = useToast();
  return <div className="fixed bottom-24 right-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 md:bottom-6" aria-live="polite">{items.map((item) => {
    const Icon = item.tone === 'success' ? CheckCircle2 : Info;
    return <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-modal"><Icon className="h-5 w-5 text-accent"/><span className="flex-1">{item.message}</span><button onClick={() => dismiss(item.id)} aria-label="알림 닫기"><X className="h-4 w-4"/></button></div>;
  })}</div>;
}
