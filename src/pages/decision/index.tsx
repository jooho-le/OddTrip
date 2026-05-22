import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';

const options = {
  places: ['골목', '전시', '전망', '시장', '바다', '야경'],
  activities: ['산책', '공방 체험', '자전거', '사진', '공연'],
  foods: ['한식', '카페', '해산물', '비건', '디저트']
};

export function DecisionPage() {
  const navigate = useNavigate();
  const { preferences, updatePreferences, savePreferences, resolveDecisionConflict, decisionSuggestion, status } = useTripStore();

  const conflicts = useMemo(() => detectConflicts(preferences), [preferences]);

  const toggle = (key: 'places' | 'activities' | 'foods', value: string) => {
    const current = preferences[key];
    updatePreferences({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  const movePriority = (key: 'places' | 'activities' | 'foods', index: number, direction: -1 | 1) => {
    const current = preferences[key];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updatePreferences({ [key]: next });
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="공동 의사결정" description="두 사람의 선호를 일정 생성 조건으로 정리합니다." />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="space-y-5">
          {Object.entries(options).map(([key, values]) => (
            <div key={key}>
              <h2 className="mb-2 font-bold">{key === 'places' ? '장소' : key === 'activities' ? '활동' : '음식'}</h2>
              <div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} onClick={() => toggle(key as 'places' | 'activities' | 'foods', value)} className={`rounded-full px-3 py-2 text-sm font-semibold ${preferences[key as 'places'].includes(value) ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{value}</button>)}</div>
            </div>
          ))}
          <div className="space-y-3 rounded-lg bg-white/70 p-3">
            <h2 className="font-bold">우선순위</h2>
            <PriorityList label="장소" items={preferences.places} onMove={(index, direction) => movePriority('places', index, direction)} />
            <PriorityList label="활동" items={preferences.activities} onMove={(index, direction) => movePriority('activities', index, direction)} />
            <PriorityList label="음식" items={preferences.foods} onMove={(index, direction) => movePriority('foods', index, direction)} />
          </div>
          <Slider label="일정 강도" value={preferences.pace} onChange={(pace) => updatePreferences({ pace })} />
          <Slider label="예산 느낌" value={preferences.budget} onChange={(budget) => updatePreferences({ budget })} />
          <label className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold"><span>비 예보 시 실내 우선</span><input type="checkbox" checked={preferences.indoorPreferred} onChange={(event) => updatePreferences({ indoorPreferred: event.target.checked })} /></label>
          <label className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold"><span>숨은 명소 포함</span><input type="checkbox" checked={preferences.hiddenSpots} onChange={(event) => updatePreferences({ hiddenSpots: event.target.checked })} /></label>
        </Card>
        <div className="space-y-4">
          <Card><h2 className="mb-3 font-bold">충돌 요소</h2><div className="flex flex-wrap gap-2">{conflicts.map((item) => <Badge key={item} className="bg-red-50 text-red-700">{item}</Badge>)}</div></Card>
          <Card className="border-brand-100 bg-brand-50">
            <Sparkles className="mb-3 h-6 w-6 text-brand-800" />
            <h2 className="font-bold text-brand-950">AI 조정 제안</h2>
            <p className="mt-2 text-sm leading-6 text-brand-900">
              {status.conflict === 'loading' ? '두 사람의 선호 충돌을 분석하는 중입니다.' : decisionSuggestion ?? '우선순위를 정리한 뒤 AI 조정안을 받아보세요.'}
            </p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              disabled={status.conflict === 'loading'}
              onClick={() => void resolveDecisionConflict(conflicts)}
            >
              {status.conflict === 'loading' ? '조정안 생성 중' : 'AI 조정안 받기'}
            </Button>
          </Card>
          <Button
            className="w-full"
            disabled={status.preferences === 'loading'}
            onClick={async () => {
              await savePreferences();
              navigate('/attractions');
            }}
          >
            {status.preferences === 'loading' ? '저장 중' : '이 조건으로 일정 생성'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PriorityList({ label, items, onMove }: { label: string; items: string[]; onMove: (index: number, direction: -1 | 1) => void }) {
  if (!items.length) {
    return <p className="text-xs font-semibold text-slate-400">{label}: 선택 없음</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold">
            <span>{index + 1}. {item}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => onMove(index, -1)} className="rounded-md bg-white px-2 py-1 text-xs text-slate-700 disabled:text-slate-300" disabled={index === 0}>위</button>
              <button type="button" onClick={() => onMove(index, 1)} className="rounded-md bg-white px-2 py-1 text-xs text-slate-700 disabled:text-slate-300" disabled={index === items.length - 1}>아래</button>
            </div>
          </div>
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
