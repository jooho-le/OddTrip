import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Save, Sparkles, X } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useDecisionStore } from '../../entities/decision/model/decisionStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { useToast } from '../../shared/ui/Toast';

const options = {
  places: ['골목', '전시', '전망', '시장', '바다', '야경'],
  activities: ['산책', '공방 체험', '자전거', '사진', '공연'],
  foods: ['한식', '카페', '해산물', '비건', '디저트'],
};

const preferenceGroups = [
  { key: 'places', title: '장소 분위기' },
  { key: 'activities', title: '활동' },
  { key: 'foods', title: '음식' },
] as const;

type PreferenceKey = typeof preferenceGroups[number]['key'];

export function Step1SelectPage() {
  const navigate = useNavigate();
  const showToast = useToast((state) => state.show);
  const { savePreferences, status } = useTripStore();
  const { selections, toggleListItem, updateSelections, submit, submittedAt } = useDecisionStore();
  const [mustDraft, setMustDraft] = useState('');
  const [excludeDraft, setExcludeDraft] = useState('');

  const toggle = (key: PreferenceKey, value: string) => toggleListItem(key, value);

  const addTag = (key: 'mustInclude' | 'exclude', draft: string, resetDraft: () => void) => {
    const value = draft.trim();
    if (!value || selections[key].includes(value)) return;
    updateSelections({ [key]: [...selections[key], value] });
    resetDraft();
  };

  const handleSaveDraft = () => showToast('임시저장했어요. 이 브라우저에 남아있어요.');

  const handleSubmit = async () => {
    await savePreferences();
    submit();
    showToast('선호를 제출했어요.');
    navigate('/decision/waiting');
  };

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-4 w-4 text-accent" />
          Step 1 · 각자 독립 선택
        </p>
        <h1 className="relative mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] md:text-6xl">
          다른 사람 눈치 보지 말고, 내가 원하는 여행을 먼저 골라보세요.
        </h1>
      </section>

      {submittedAt ? (
        <Card className="border-accent/20 bg-accent-soft text-sm font-bold text-accent">
          이미 제출된 선택이에요. 아래에서 수정하고 다시 제출할 수 있어요. (제출 시각 {new Date(submittedAt).toLocaleString('ko-KR')})
        </Card>
      ) : null}

      <Card className="space-y-6">
        {preferenceGroups.map(({ key, title }) => (
          <div key={key}>
            <h2 className="mb-3 text-xl font-black text-ink">{title}</h2>
            <div className="flex flex-wrap gap-2">
              {options[key].map((value) => {
                const selected = selections[key].includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(key, value)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${selected ? 'bg-accent text-white' : 'bg-canvas text-ink'}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <h2 className="mb-3 text-xl font-black text-ink">여행 운영</h2>
          <Slider label="일정 강도" value={selections.pace} onChange={(pace) => updateSelections({ pace })} />
          <Slider label="예산 사용 한도" value={selections.budget} onChange={(budget) => updateSelections({ budget })} />
          <label className="mt-3 flex items-center justify-between rounded-lg bg-canvas p-3 text-sm font-semibold text-ink"><span>비 예보 시 실내 우선</span><input type="checkbox" checked={selections.indoorPreferred} onChange={(event) => updateSelections({ indoorPreferred: event.target.checked })} /></label>
          <label className="mt-2 flex items-center justify-between rounded-lg bg-canvas p-3 text-sm font-semibold text-ink"><span>숨은 명소 포함</span><input type="checkbox" checked={selections.hiddenSpots} onChange={(event) => updateSelections({ hiddenSpots: event.target.checked })} /></label>
        </div>

        <TagField
          title="반드시 포함"
          items={selections.mustInclude}
          draft={mustDraft}
          onDraftChange={setMustDraft}
          onAdd={() => addTag('mustInclude', mustDraft, () => setMustDraft(''))}
          onRemove={(value) => updateSelections({ mustInclude: selections.mustInclude.filter((item) => item !== value) })}
          placeholder="예: 해운대 야경"
        />
        <TagField
          title="제외 항목"
          items={selections.exclude}
          draft={excludeDraft}
          onDraftChange={setExcludeDraft}
          onAdd={() => addTag('exclude', excludeDraft, () => setExcludeDraft(''))}
          onRemove={(value) => updateSelections({ exclude: selections.exclude.filter((item) => item !== value) })}
          placeholder="예: 놀이공원"
        />
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" icon={<Save className="h-4 w-4" />} onClick={handleSaveDraft}>임시저장</Button>
        <Button icon={<ArrowRight className="h-4 w-4" />} disabled={status.preferences === 'loading'} onClick={() => void handleSubmit()}>
          {status.preferences === 'loading' ? '제출 중' : '제출하기'}
        </Button>
      </div>
    </div>
  );
}

function TagField({
  title,
  items,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  items: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-ink"><CheckCircle2 className="h-5 w-5 text-accent" />{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-sm font-black text-white">
            {item}
            <button type="button" aria-label={`${item} 삭제`} onClick={() => onRemove(item)}><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-xl border border-line bg-canvas px-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
        <Button type="button" variant="secondary" onClick={onAdd}>추가</Button>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mt-3 block space-y-2">
      <span className="flex justify-between text-sm font-bold text-ink"><span>{label}</span><span>{value}%</span></span>
      <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-accent" />
    </label>
  );
}
