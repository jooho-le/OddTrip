import { Clock, ListChecks, Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { CardNewsRail } from '../../components/CardNewsRail';

export function TtiStartPage() {
  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Travel Type Indicator" title="12문항으로 여행 성향을 확인하세요" description="P/W, N/C, F/A, H/S 네 축을 기반으로 16개 유형 중 하나를 계산합니다." />
      <CardNewsRail
        items={[
          { kicker: 'Axis 01', title: '즉흥과 계획', description: '현장에서 결정하는지, 먼저 구조를 잡는지 확인합니다.', tone: 'bg-brand-900 text-white' },
          { kicker: 'Axis 02', title: '새로움과 안정', description: '낯선 선택을 즐기는지, 검증된 선택을 선호하는지 봅니다.', tone: 'bg-coral text-white' },
          { kicker: 'Axis 03', title: '휴식과 활동', description: '천천히 머무는 여행과 꽉 찬 체험 중 균형을 찾습니다.', tone: 'bg-[#f4b942] text-ink' }
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><ListChecks className="mb-3 h-6 w-6 text-brand-700" /><h2 className="font-bold">12문항</h2><p className="mt-1 text-sm leading-6 text-slate-600">한 문항씩 선택하며 이전 답변도 수정할 수 있습니다.</p></Card>
        <Card><Clock className="mb-3 h-6 w-6 text-coral" /><h2 className="font-bold">약 2분</h2><p className="mt-1 text-sm leading-6 text-slate-600">시연에서도 흐름이 끊기지 않는 짧은 진단입니다.</p></Card>
        <Card><Route className="mb-3 h-6 w-6 text-amber-600" /><h2 className="font-bold">매칭 연결</h2><p className="mt-1 text-sm leading-6 text-slate-600">결과는 반대 성향 매칭과 일정 추천에 사용됩니다.</p></Card>
      </div>
      <Link to="/tti/questions"><Button className="w-full md:w-auto">진단 시작</Button></Link>
    </div>
  );
}
