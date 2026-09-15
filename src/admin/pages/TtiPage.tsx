import { useEffect, useState } from 'react';
import { BookOpenCheck, Edit3, Eye, Plus, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { PageHeading, Panel, TableShell, tdClass, thClass } from '../ui';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

type AxisFilter = '전체' | 'PW' | 'NC' | 'FA' | 'HS';

export function TtiPage() {
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const questions = useTripStore((state) => state.questions);
  const status = useTripStore((state) => state.status.questions);
  const error = useTripStore((state) => state.error);
  const loadQuestions = useTripStore((state) => state.loadQuestions);
  const [axisFilter, setAxisFilter] = useState<AxisFilter>('전체');
  const visible = axisFilter === '전체' ? questions : questions.filter((item) => item.axis === axisFilter);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  return <><PageHeading eyebrow="Personality content" title="TTI 콘텐츠" description="서비스가 실제 진단에 사용하는 질문을 읽고 축별로 확인합니다. 문항 추가·편집·배포는 관리자 계약 연결 후 제공됩니다." action={<button type="button" onClick={() => showComingSoon('TTI 질문 추가')} className="flex h-11 items-center gap-2 rounded-2xl bg-[#17201f] px-4 text-xs font-black text-white"><Plus className="h-4 w-4" />질문 추가</button>} />
  <div className="mb-6 grid gap-4 sm:grid-cols-3"><TtiMini icon={<BookOpenCheck />} label="활성 질문" value={status === 'loading' && !questions.length ? '—' : String(questions.length)} /><TtiMini icon={<Sparkles />} label="여행 유형" value="16" /><TtiMini icon={<Eye />} label="현재 버전" value="v1.0" /></div>
  <Panel><div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-black">진단 질문</h2><p className="mt-1 text-xs text-slate-400">4개 성향 축 · 서버 등록 순서</p></div><div className="flex flex-wrap gap-2">{(['전체', 'PW', 'NC', 'FA', 'HS'] as const).map((axis) => <button type="button" aria-pressed={axisFilter === axis} onClick={() => setAxisFilter(axis)} key={axis} className={`rounded-xl px-3 py-2 text-xs font-black ${axisFilter === axis ? 'bg-[#17201f] text-white' : 'bg-slate-100 text-slate-500'}`}>{axis}</button>)}</div></div>
    {error && status === 'error' ? <div className="error-strip" role="alert"><span>{error}</span><button type="button" onClick={() => void loadQuestions()}>다시 시도</button></div> : null}
    {status === 'loading' && !questions.length ? <div className="skeleton-stack" role="status" aria-label="TTI 질문을 불러오는 중"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
    <TableShell><thead><tr>{['순서', '축', '질문', '상태', '수정'].map(x => <th key={x} className={thClass}>{x}</th>)}</tr></thead><tbody>{visible.map((item) => { const order = questions.findIndex((question) => question.id === item.id) + 1; return <tr key={item.id} className="hover:bg-slate-50/70"><td className={`${tdClass} font-black text-slate-400`}>{String(order).padStart(2, '0')}</td><td className={tdClass}><span className="rounded-lg bg-[#fff0ed] px-2.5 py-1.5 text-xs font-black text-[#ff5a47]">{item.axis}</span></td><td className={`${tdClass} font-bold`}>{item.prompt}</td><td className={tdClass}><span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><i className="h-2 w-2 rounded-full bg-emerald-500" />활성</span></td><td className={tdClass}><button type="button" aria-label={`${item.prompt} 수정`} onClick={() => showComingSoon('TTI 질문 편집')} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200"><Edit3 className="h-4 w-4" /></button></td></tr>; })}{status === 'success' && !visible.length ? <tr><td className={`${tdClass} py-10 text-center text-slate-400`} colSpan={5}>이 축에 등록된 질문이 없습니다.</td></tr> : null}</tbody></TableShell>
    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">현재 필터 {visible.length}개 · 전체 {questions.length}개</div>
  </Panel></>;
}
function TtiMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-4 rounded-2xl border border-black/[.06] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0ed] text-[#ff5a47]">{icon}</span><div><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div></div>; }
