import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useMemo } from 'react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

const options = {
  places: ['골목', '전시', '전망', '시장', '바다', '야경'],
  activities: ['산책', '공방 체험', '자전거', '사진', '공연'],
  foods: ['한식', '카페', '해산물', '비건', '디저트']
};

const preferenceGroups = [
  { key: 'places', title: '장소' },
  { key: 'activities', title: '활동' },
  { key: 'foods', title: '음식' },
] as const;

type PreferenceKey = typeof preferenceGroups[number]['key'];

export function DecisionPage() {
  const navigate = useNavigate();
  const { preferences, updatePreferences, savePreferences, resolveDecisionConflict, decisionSuggestion, status } = useTripStore();

  const conflicts = useMemo(() => detectConflicts(preferences), [preferences]);

  const toggle = (key: PreferenceKey, value: string) => {
    const current = preferences[key];
    updatePreferences({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-4 w-4 text-accent" />
          Together Decision
        </p>
        <h1 className="relative mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-8xl">
          둘의 취향을
          <br />
          조정하여 함께 어울릴 여행 방식을 찾아보세요.
        </h1>
        <p className="relative mt-5 max-w-2xl text-sm font-bold leading-6 text-white/68">장소, 활동, 음식, 예산과 속도를 고르고 AI가 여행방식을 추천합니다.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="space-y-5 rounded-[24px] p-5 md:p-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {['1. 취향 선택', '2. 우선순위 정리', '3. 추천 생성'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm font-black text-ink">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {item}
              </div>
            ))}
          </div>
          {preferenceGroups.map(({ key, title }) => (
            <div key={key}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="text-xl font-black text-ink">{title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {options[key].map((value) => {
                  const selectedIndex = preferences[key].indexOf(value);
                  const selected = selectedIndex >= 0;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggle(key, value)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${selected ? 'bg-accent text-white shadow-[0_14px_34px_rgba(255,90,54,0.22)]' : 'bg-canvas text-ink'}`}
                    >
                      {selected ? <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-xs">{selectedIndex + 1}</span> : null}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="space-y-4 rounded-[20px] bg-ink p-4 text-white">
            <div>
              <h2 className="text-xl font-black">선택한 우선순위</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-white/52">선택한 순서 그대로 관광지 추천과 일정 생성에 반영합니다.</p>
            </div>
            {preferenceGroups.map(({ key, title }) => (
              <SelectedOrder key={key} label={title} items={preferences[key]} onRemove={(value) => toggle(key, value)} />
            ))}
          </div>
          <Slider label="일정 강도" value={preferences.pace} onChange={(pace) => updatePreferences({ pace })} />
          <Slider label="예산 사용 한도" value={preferences.budget} onChange={(budget) => updatePreferences({ budget })} />
          <label className="flex items-center justify-between rounded-lg bg-canvas p-3 text-sm font-semibold text-ink"><span>비 예보 시 실내 우선</span><input type="checkbox" checked={preferences.indoorPreferred} onChange={(event) => updatePreferences({ indoorPreferred: event.target.checked })} /></label>
          <label className="flex items-center justify-between rounded-lg bg-canvas p-3 text-sm font-semibold text-ink"><span>숨은 명소 포함</span><input type="checkbox" checked={preferences.hiddenSpots} onChange={(event) => updatePreferences({ hiddenSpots: event.target.checked })} /></label>
        </Card>
        <div className="space-y-4">
          <Card><h2 className="mb-4 text-2xl font-black text-ink">반대 성향 요소</h2><div className="flex flex-wrap gap-2">{conflicts.map((item) => <Badge key={item}>{item}</Badge>)}</div></Card>
          <div className="rounded-[30px] bg-ink p-5 text-white">
            <Sparkles className="mb-5 h-7 w-7 text-accent" />
            <h2 className="text-3xl font-black tracking-[-0.03em]">AI 제안 생성</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-white/72">
              {status.conflict === 'loading' ? '두 사람의 선호를 분석하는 중입니다.' : decisionSuggestion ?? '우선순위를 정리한 뒤 AI추천을 받아보세요.'}
            </p>
            <Button
              variant="secondary"
              className="mt-5 w-full bg-white text-accent hover:bg-white/92"
              disabled={status.conflict === 'loading'}
              onClick={() => void resolveDecisionConflict(conflicts)}
            >
              {status.conflict === 'loading' ? '조정안 생성 중' : 'AI 추천 받기'}
            </Button>
          </div>
          <Button
            icon={<ArrowRight className="h-4 w-4" />}
            className="w-full"
            disabled={status.preferences === 'loading'}
            onClick={async () => {
              await savePreferences();
              navigate('/attractions');
            }}
          >
            {status.preferences === 'loading' ? '저장 중' : '이 조건으로 관광지 추천'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectedOrder({ label, items, onRemove }: { label: string; items: string[]; onRemove: (value: string) => void }) {
  if (!items.length) {
    return <p className="rounded-[16px] bg-white/8 px-3 py-3 text-xs font-bold text-white/44">{label}: 아직 선택한 항목이 없습니다</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-black text-white/50">{label} 우선순위</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button key={item} type="button" onClick={() => onRemove(item)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-ink">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-white">{index + 1}</span>
            {item}
            <X className="h-4 w-4 text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-sm font-bold"><span>{label}</span><span>{value}%</span></span>
      <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-teal-700" />
    </label>
  );
}

function detectConflicts(preferences: {
  places: string[];
  activities: string[];
  foods: string[];
  pace: number;
  budget: number;
  indoorPreferred: boolean;
  hiddenSpots: boolean;
}) {
  const conflicts = [];

  if (preferences.pace >= 70) conflicts.push('높은 일정 강도');
  if (preferences.pace <= 35) conflicts.push('느린 일정 선호');
  if (preferences.budget >= 70) conflicts.push('예산 상향 가능');
  if (preferences.budget <= 35) conflicts.push('예산 절약 우선');
  if (preferences.indoorPreferred && preferences.activities.some((item) => ['자전거', '사진'].includes(item))) conflicts.push('실내 우선과 야외 활동 충돌');
  if (preferences.hiddenSpots && preferences.places.some((item) => ['전망', '시장', '야경'].includes(item))) conflicts.push('숨은 명소와 대표 코스 균형');
  if (preferences.foods.length >= 4) conflicts.push('음식 선택지가 많아 동선 분산 가능');

  return conflicts.length ? conflicts : ['현재 조건은 큰 충돌 없이 균형적입니다'];
}
