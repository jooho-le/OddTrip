import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useDecisionStore } from '../../entities/decision/model/decisionStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import type { DecisionSelections } from '../../entities/decision/types';

export function Step2AnalysisPage() {
  const navigate = useNavigate();
  const { selectedMatch, matches } = useTripStore();
  const { selections } = useDecisionStore();
  const partner = selectedMatch ?? matches[0];

  const common = useMemo(() => [...selections.places, ...selections.activities, ...selections.foods], [selections]);
  const balanced = selections.pace >= 40 && selections.pace <= 60 && selections.budget >= 40 && selections.budget <= 60;
  const conflicts = useMemo(() => detectConflicts(selections), [selections]);

  const startConcession = () => navigate('/decision/concession');

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-4 w-4 text-accent" />
          Step 2 · 차이 분석
        </p>
        <h1 className="relative mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] md:text-6xl">내 선택과 상대 성향 차이를 살펴봐요.</h1>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-xl font-black text-ink">공통 선호 후보</h2>
          <p className="text-xs font-bold text-muted">상대방의 실제 선택은 아직 백엔드에서 받아올 수 없어서, 내가 고른 항목을 공통 후보로 보여줘요.</p>
          <div className="flex flex-wrap gap-2">
            {common.length ? common.map((item) => <Badge key={item}>{item}</Badge>) : <span className="text-sm font-semibold text-muted">아직 선택한 항목이 없어요.</span>}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-black text-ink">균형 가능 여부</h2>
          <p className={`text-sm font-black ${balanced ? 'text-accent' : 'text-danger'}`}>{balanced ? '일정 강도·예산이 무난한 범위예요.' : '일정 강도 또는 예산이 한쪽으로 치우쳐 있어요.'}</p>
          <p className="text-xs font-bold text-muted">일정 강도 {selections.pace}% · 예산 {selections.budget}%</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-xl font-black text-ink">주요 충돌 요소</h2>
        <div className="flex flex-wrap gap-2">
          {conflicts.map((item) => <Badge key={item} className="bg-ink text-white">{item}</Badge>)}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-black text-ink">TTI 기반 예상 차이</h2>
        {partner?.differences?.length ? (
          <div className="flex flex-wrap gap-2">{partner.differences.map((item) => <Badge key={item}>{item}</Badge>)}</div>
        ) : (
          <p className="text-sm font-semibold text-muted">매칭 상세에서 확인한 성향 차이가 없어요.</p>
        )}
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/chat"><Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full">채팅에서 이야기하기</Button></Link>
        <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full" onClick={startConcession}>조율 시작하기</Button>
      </div>
    </div>
  );
}

function detectConflicts(selections: DecisionSelections) {
  const conflicts: string[] = [];
  if (selections.pace >= 70) conflicts.push('높은 일정 강도');
  if (selections.pace <= 35) conflicts.push('느린 일정 선호');
  if (selections.budget >= 70) conflicts.push('예산 상향 가능');
  if (selections.budget <= 35) conflicts.push('예산 절약 우선');
  if (selections.indoorPreferred && selections.activities.some((item) => ['자전거', '사진'].includes(item))) conflicts.push('실내 우선과 야외 활동 충돌');
  if (selections.hiddenSpots && selections.places.some((item) => ['전망', '시장', '야경'].includes(item))) conflicts.push('숨은 명소와 대표 코스 균형');
  if (selections.exclude.length) conflicts.push(`제외 항목 ${selections.exclude.length}건 확인 필요`);
  return conflicts.length ? conflicts : ['현재 조건은 큰 충돌 없이 균형적이에요.'];
}
