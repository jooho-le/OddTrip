import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
  const { preferences, updatePreferences, savePreferences, status } = useTripStore();

  const toggle = (key: 'places' | 'activities' | 'foods', value: string) => {
    const current = preferences[key];
    updatePreferences({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
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
          <Slider label="일정 강도" value={preferences.pace} onChange={(pace) => updatePreferences({ pace })} />
          <Slider label="예산 느낌" value={preferences.budget} onChange={(budget) => updatePreferences({ budget })} />
          <label className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold"><span>비 예보 시 실내 우선</span><input type="checkbox" checked={preferences.indoorPreferred} onChange={(event) => updatePreferences({ indoorPreferred: event.target.checked })} /></label>
          <label className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold"><span>숨은 명소 포함</span><input type="checkbox" checked={preferences.hiddenSpots} onChange={(event) => updatePreferences({ hiddenSpots: event.target.checked })} /></label>
        </Card>
        <div className="space-y-4">
          <Card><h2 className="mb-3 font-bold">충돌 요소</h2><div className="flex flex-wrap gap-2"><Badge className="bg-red-50 text-red-700">일정 강도 차이</Badge><Badge className="bg-red-50 text-red-700">유명 명소 선호 차이</Badge><Badge className="bg-red-50 text-red-700">비 오는 날 야외 코스</Badge></div></Card>
          <Card className="border-brand-100 bg-brand-50"><Sparkles className="mb-3 h-6 w-6 text-brand-800" /><h2 className="font-bold text-brand-950">AI 조정 제안</h2><p className="mt-2 text-sm leading-6 text-brand-900">오전에는 대표 명소를 짧게 방문하고, 오후에는 실내 전시와 카페를 배치하세요. 활동 체험은 2일차 오전 1회로 제한하면 피로도가 낮아집니다.</p></Card>
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

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-sm font-bold"><span>{label}</span><span>{value}%</span></span>
      <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-teal-700" />
    </label>
  );
}
