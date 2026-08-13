import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import { useDecisionStore } from '../../entities/decision/model/decisionStore';
import { ODD_RULES } from '../../entities/decision/types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { useToast } from '../../shared/ui/Toast';

export function Step4OddRulePage() {
  const navigate = useNavigate();
  const showToast = useToast((state) => state.show);
  const { oddRule, oddRuleConfirmedAt, setOddRule, confirmOddRule } = useDecisionStore();

  const handleConfirm = () => {
    if (!oddRule) return;
    confirmOddRule();
    showToast('Odd Rule을 확정했어요. 이제 AI 조율안을 확인해보세요.');
    navigate('/proposal');
  };

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-4 w-4 text-accent" />
          Step 4 · Odd Rule 선택
        </p>
        <h1 className="relative mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] md:text-6xl">둘의 취향을 어떤 방식으로 섞을지 정해요.</h1>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {ODD_RULES.map((rule) => {
          const selected = oddRule === rule.id;
          return (
            <Card
              key={rule.id}
              role="button"
              tabIndex={0}
              onClick={() => setOddRule(rule.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setOddRule(rule.id); }}
              className={`cursor-pointer space-y-2 ${selected ? 'border-accent ring-2 ring-accent/20' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-ink">{rule.title}</h2>
                {selected ? <CheckCircle2 className="h-5 w-5 text-accent" /> : null}
              </div>
              <p className="text-sm font-semibold leading-6 text-muted">{rule.description}</p>
            </Card>
          );
        })}
      </div>

      {oddRuleConfirmedAt ? (
        <Card className="border-accent/20 bg-accent-soft text-sm font-bold text-accent">
          {new Date(oddRuleConfirmedAt).toLocaleString('ko-KR')}에 확정했어요.
        </Card>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/chat"><Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full">채팅으로 투표하기</Button></Link>
        <Button disabled={!oddRule} onClick={handleConfirm} className="w-full">
          Odd Rule 확정하고 조율안 보기
        </Button>
      </div>
    </div>
  );
}
