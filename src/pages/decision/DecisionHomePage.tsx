import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useDecisionStore } from '../../entities/decision/model/decisionStore';
import { Avatar } from '../../shared/ui/Avatar';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ProgressBar } from '../../shared/ui/ProgressBar';
import { cn } from '../../shared/lib/classNames';

const STEPS = [
  { no: '01', title: '각자 독립 선택' },
  { no: '02', title: '차이 분석' },
  { no: '03', title: '양보 범위 설정' },
  { no: '04', title: 'Odd Rule 선택' },
];

export function DecisionHomePage() {
  const { selectedMatch, matches, user, result } = useTripStore();
  const { submittedAt, concessions, oddRule, oddRuleConfirmedAt } = useDecisionStore();

  const partner = selectedMatch ?? matches[0];
  const hasConcessions = Object.keys(concessions).length > 0;

  const progress = oddRuleConfirmedAt ? 100 : oddRule ? 80 : hasConcessions ? 60 : submittedAt ? 40 : 10;
  const currentStepIndex = oddRuleConfirmedAt ? 4 : oddRule || hasConcessions ? 3 : submittedAt ? 2 : 1;

  const task = oddRuleConfirmedAt
    ? { label: 'Odd Rule까지 확정했어요. 이제 AI 조율안을 확인해볼 차례예요.', to: '/proposal', cta: 'AI 조율안 보기' }
    : oddRule
      ? { label: '고른 Odd Rule을 확정해주세요.', to: '/decision/odd-rule', cta: 'Odd Rule 확정하기' }
      : hasConcessions
        ? { label: '충돌 항목의 양보 범위를 마저 정리하고 Odd Rule을 골라주세요.', to: '/decision/odd-rule', cta: 'Odd Rule 고르기' }
        : submittedAt
          ? { label: '내 선호는 제출했어요. 차이를 확인해볼까요?', to: '/decision/analysis', cta: '차이 분석 보기' }
          : { label: '아직 내 여행 선호를 선택하지 않았어요.', to: '/decision/select', cta: '선호 선택하러 가기' };

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="eyebrow">공동 조율 홈</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-[-0.03em] md:text-4xl">둘의 취향을 하나의 여행으로 조율해요.</h1>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const done = stepNumber < currentStepIndex || (stepNumber === currentStepIndex && Boolean(oddRuleConfirmedAt));
            const active = stepNumber === currentStepIndex && !done;
            return (
              <div key={step.no} className={cn('rounded-2xl border p-3', done ? 'border-accent/40 bg-accent/10' : active ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5')}>
                <span className={cn('text-xs font-black', done || active ? 'text-accent' : 'text-white/55')}>{step.no}</span>
                <p className={cn('mt-3 text-xs font-bold leading-4', done || active ? 'text-white' : 'text-white/60')}>{step.title}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-black text-ink">함께 조율할 상대</h2>
          {partner ? (
            <div className="flex items-center gap-3">
              <Avatar src={partner.avatarUrl} fallback={partner.nickname} className="h-14 w-14" />
              <div>
                <p className="text-base font-black text-ink">{partner.nickname}</p>
                <Badge>{partner.ttiCode}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-muted">아직 선택한 매칭 상대가 없어요.</p>
          )}

          <div>
            <p className="mb-2 text-xs font-black text-muted">TTI 차이 요약</p>
            {partner?.differences?.length ? (
              <div className="flex flex-wrap gap-2">
                {partner.differences.map((item) => <Badge key={item}>{item}</Badge>)}
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted">매칭 상세에서 확인한 차이가 여기 표시돼요.</p>
            )}
          </div>

          {result ? (
            <p className="text-xs font-semibold text-muted">내 유형 {result.code} · 상대 유형 {partner?.ttiCode ?? user?.ttiCode ?? '-'}</p>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <ProgressBar value={progress} label="조율 진행률" />
          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-xs font-black text-muted">현재 해야 할 일</p>
            <p className="mt-2 text-sm font-bold leading-6 text-ink">{task.label}</p>
            <Link to={task.to}>
              <Button icon={<ArrowRight className="h-4 w-4" />} className="mt-4 w-full">{task.cta}</Button>
            </Link>
          </div>
          <Link to="/chat">
            <Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full">채팅방으로 이동</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
