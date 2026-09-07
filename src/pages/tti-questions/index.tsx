import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';

const values = [-2, -1, 0, 1, 2];

export function TtiQuestionsPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const { questions, answers, setAnswer, calculateResult, loadQuestions, status, error } = useTripStore();

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  if (status.questions === 'loading' || status.questions === 'idle') return <StateDocument title="여행 성향 조사서" message="질문을 불러오고 있습니다." loading />;
  if (status.questions === 'error') return <StateDocument title="여행 성향 조사서" message={error ?? '질문을 불러오지 못했습니다.'} action={() => void loadQuestions()} />;
  if (!questions.length) return <StateDocument title="여행 성향 조사서" message="표시할 질문이 없습니다." />;

  const question = questions[index];
  const answer = answers.find((item) => item.questionId === question.id);
  const progress = Math.round(((index + 1) / questions.length) * 100);
  const complete = async () => {
    const result = await calculateResult();
    if (result) navigate('/tti/result');
  };

  return (
    <main className="page form-page">
      <div className="form-toolbar"><button onClick={() => navigate('/tti/start')}>‹ 조사 안내로 돌아가기</button><span>{index + 1} / {questions.length} 문항</span><div className="form-progress"><i style={{ width: `${progress}%` }} /></div></div>
      <article className="paper">
        <header className="paper-head"><h1>여행 성향 조사서</h1><p>ODDTRIP FORM 01 · TRAVEL TYPE INDICATOR</p></header>
        <div className="paper-body">
          <p className="paper-note">가장 가까운 선택을 고르세요. 응답은 마지막 문항에서 서버에 저장됩니다.</p>
          <div className="info-table"><span className="label">문항</span><span>{index + 1} / {questions.length}</span><span className="label">분류</span><span>{question.axis}</span><span className="label">저장 상태</span><span>제출 전</span><span className="label">결과</span><span>4글자 TTI</span></div>
          <h2 className="form-section-title">{String(index + 1).padStart(2, '0')}. 아래 문항에 답해주세요.</h2>
          <section className="question"><div className="question-head"><b>Q</b><span>{question.prompt}</span></div><div className="scale">{values.map((value) => <button key={value} className={answer?.value === value ? 'on' : ''} onClick={() => setAnswer({ questionId: question.id, axis: question.axis, value })}>{optionLabel(value, question.leftLabel, question.rightLabel)}</button>)}</div></section>
          {error ? <div className="error-strip" role="alert">{error}</div> : null}
          <div className="sign"><span>응답자 {new Date().toLocaleDateString('ko-KR')}</span><span>온라인 서명 __________</span></div>
        </div>
      </article>
      <div className="form-actions"><button disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>이전</button><span className="hint">{answer ? '응답이 선택되었습니다.' : '한 항목을 선택해주세요.'}</span>{index < questions.length - 1 ? <button className={answer ? 'submit ready' : 'submit'} disabled={!answer} onClick={() => setIndex((value) => value + 1)}>다음 문항</button> : <button className={answer ? 'submit ready' : 'submit'} disabled={!answer || status.tti === 'loading'} aria-busy={status.tti === 'loading'} onClick={() => void complete()}>{status.tti === 'loading' ? '계산 중…' : '제출하고 결과 보기'}</button>}</div>
    </main>
  );
}

function optionLabel(value: number, left: string, right: string) {
  if (value === -2) return left;
  if (value === -1) return `조금 ${left}`;
  if (value === 1) return `조금 ${right}`;
  if (value === 2) return right;
  return '둘 다 괜찮음';
}

function StateDocument({ title, message, loading = false, action }: { title: string; message: string; loading?: boolean; action?: () => void }) {
  return <main className="page form-page"><article className="paper"><header className="paper-head"><h1>{title}</h1><p>ODDTRIP DOCUMENT</p></header><div className="paper-body"><div className="empty-state" role={loading ? 'status' : 'alert'}><strong>{message}</strong>{loading ? <div className="loading-line" /> : null}{action ? <button className="solid-btn" style={{ marginTop: 18 }} onClick={action}>다시 시도</button> : null}</div></div></article></main>;
}
