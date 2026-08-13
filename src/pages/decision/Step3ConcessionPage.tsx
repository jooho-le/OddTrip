import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useDecisionStore } from '../../entities/decision/model/decisionStore';
import type { ConcessionFlexibility, ConcessionImportance } from '../../entities/decision/types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView } from '../../shared/ui/StateView';

const IMPORTANCE_OPTIONS: { value: ConcessionImportance; label: string }[] = [
  { value: 'low', label: '없어도 괜찮음' },
  { value: 'medium', label: '가능하면 포함' },
  { value: 'high', label: '우선순위 높음' },
];

const FLEXIBILITY_OPTIONS: { value: ConcessionFlexibility; label: string }[] = [
  { value: 'skip', label: '일정에 포함하지 않기' },
  { value: 'limited', label: '짧게라면 가능' },
  { value: 'open', label: '상대가 원하면 참여 가능' },
];

export function Step3ConcessionPage() {
  const navigate = useNavigate();
  const { selections, concessions, setConcession } = useDecisionStore();

  const negotiableItems = useMemo(() => {
    const items = [...selections.exclude, ...selections.mustInclude];
    if (selections.pace >= 70 || selections.pace <= 35) items.push('일정 강도');
    if (selections.budget >= 70 || selections.budget <= 35) items.push('예산 사용 수준');
    return Array.from(new Set(items));
  }, [selections]);

  return (
    <div className="page-canvas space-y-5">
      <header>
        <p className="eyebrow">Step 03 · 양보 범위 설정</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-black leading-snug tracking-[-0.02em] text-ink md:text-3xl">항목별로 얼마나 양보할 수 있는지 정해봐요.</h1>
      </header>

      {!negotiableItems.length ? (
        <EmptyView label="지금은 조율이 필요한 항목이 없어요. Step 1에서 제외 항목이나 극단적인 일정 강도를 선택하면 여기에 나타나요." />
      ) : (
        <div className="space-y-4">
          {negotiableItems.map((item) => {
            const entry = concessions[item] ?? { importance: 'medium', flexibility: 'limited' };
            return (
              <Card key={item} className="space-y-4">
                <h2 className="text-lg font-black text-ink">{item}</h2>
                <div>
                  <p className="mb-2 text-xs font-black text-muted">이 항목은 나에게 얼마나 중요한가요?</p>
                  <div className="flex flex-wrap gap-2">
                    {IMPORTANCE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={entry.importance === option.value}
                        onClick={() => setConcession(item, { importance: option.value })}
                        className={`rounded-full px-4 py-2 text-sm font-black transition ${entry.importance === option.value ? 'bg-accent text-white' : 'bg-canvas text-ink'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-black text-muted">상대에게 어디까지 양보할 수 있나요?</p>
                  <div className="flex flex-wrap gap-2">
                    {FLEXIBILITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={entry.flexibility === option.value}
                        onClick={() => setConcession(item, { flexibility: option.value })}
                        className={`rounded-full px-4 py-2 text-sm font-black transition ${entry.flexibility === option.value ? 'bg-ink text-white' : 'bg-canvas text-ink'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/chat"><Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full">채팅에서 의견 나누기</Button></Link>
        <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full" onClick={() => navigate('/decision/odd-rule')}>합의 확정하고 다음으로</Button>
      </div>
    </div>
  );
}
