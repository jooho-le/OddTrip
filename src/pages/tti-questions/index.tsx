import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { cn } from '../../shared/lib/classNames';
import { ErrorView, LoadingView } from '../../shared/ui/StateView';

const values = [-2, -1, 0, 1, 2];

export function TtiQuestionsPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const { questions, answers, setAnswer, calculateResult, loadQuestions, status } = useTripStore();

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  if (status.questions === 'loading') return <LoadingView label="TTI 질문을 불러오는 중입니다" />;
  if (status.questions === 'error') return <ErrorView label="TTI 질문을 불러오지 못했습니다. 백엔드와 DB seed를 확인해주세요." />;
  if (!questions.length) return <Card>표시할 TTI 질문이 없습니다.</Card>;

  const question = questions[index];
  const answer = answers.find((item) => item.questionId === question.id);
  const progress = Math.round(((index + 1) / questions.length) * 100);

  const complete = async () => {
    const result = await calculateResult();
    if (result) navigate('/tti/result');
  };

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-[#101114] p-6 text-white shadow-[0_26px_90px_rgba(16,17,20,0.18)] md:p-8">
        <img src="https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=86" alt="" className="absolute inset-0 h-full w-full object-cover opacity-28" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_22%,rgba(245,208,76,0.46),transparent_26%),linear-gradient(90deg,rgba(16,17,20,0.96),rgba(16,17,20,0.58))]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
              <Sparkles className="h-4 w-4 text-[#f5d04c]" />
              question {index + 1}
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.05em] md:text-7xl">나의 여행 선택 방식</h1>
          </div>
          <div className="rounded-[28px] bg-white p-4 text-[#111111] md:w-72">
            <p className="text-sm font-black">{index + 1} / {questions.length} 문항</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full gradient-panel transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </section>

      <Card className="space-y-5 rounded-[24px] p-5 md:p-6">
        <div>
          <BadgeLabel text={question.axis} />
          <h2 className="mt-4 max-w-4xl text-2xl font-black leading-tight md:text-4xl">{question.prompt}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {values.map((value) => (
            <button key={value} onClick={() => setAnswer({ questionId: question.id, axis: question.axis, value })} className={cn('motion-card min-h-28 rounded-[18px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(16,17,20,0.10)]', answer?.value === value ? 'border-transparent gradient-panel text-white ring-4 ring-[#fd267a]/15' : 'border-black/5 bg-[#fbf5ee] text-[#111111]')}>
              <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">{value < 0 ? question.leftLetter : value > 0 ? question.rightLetter : 'middle'}</p>
              <p className="mt-6 text-sm font-black leading-5 md:text-base">{value < 0 ? question.leftLabel : value > 0 ? question.rightLabel : '둘 다 비슷함'}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>이전</Button>
          {index < questions.length - 1 ? (
            <Button className="flex-1" disabled={!answer} onClick={() => setIndex((current) => current + 1)}>다음</Button>
          ) : (
            <Button className="flex-1" disabled={!answer || status.tti === 'loading'} onClick={complete}>{status.tti === 'loading' ? '계산 중' : '결과 보기'}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function BadgeLabel({ text }: { text: string }) {
  return <span className="rounded-full bg-[#101114] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">{text}</span>;
}
