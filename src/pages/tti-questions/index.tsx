import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';
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
    <div className="space-y-5">
      <SectionTitle title="나의 여행 선택 방식" description={`${index + 1} / ${questions.length} 문항`} />
      <div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-700 transition-all" style={{ width: `${progress}%` }} /></div>
      <Card className="space-y-6">
        <div>
          <BadgeLabel text={question.axis} />
          <h2 className="mt-3 text-xl font-bold leading-8">{question.prompt}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {values.map((value) => (
            <button key={value} onClick={() => setAnswer({ questionId: question.id, axis: question.axis, value })} className={cn('rounded-lg border p-4 text-left transition hover:border-brand-500 hover:bg-brand-50', answer?.value === value ? 'border-brand-700 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white')}>
              <p className="text-xs font-bold text-slate-500">{value < 0 ? question.leftLetter : value > 0 ? question.rightLetter : '중간'}</p>
              <p className="mt-2 text-sm font-semibold">{value < 0 ? question.leftLabel : value > 0 ? question.rightLabel : '둘 다 비슷함'}</p>
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
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{text}</span>;
}
