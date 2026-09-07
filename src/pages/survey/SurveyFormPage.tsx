import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { forms, SCALE_LABELS, type FormKey } from '../../features/prototype/protoData';
import { useProtoStore } from '../../features/prototype/protoStore';

export function SurveyFormPage() {
  const { key } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const formKey = (key ?? 'concession') as FormKey;
  const spec = forms[formKey];

  const responses = useProtoStore((s) => s.responses);
  const completed = useProtoStore((s) => s.completed);
  const currentTask = useProtoStore((s) => s.currentTask);
  const submitFormAction = useProtoStore((s) => s.submitForm);
  const toast = useProtoStore((s) => s.toast);

  const fromHome = search.get('from') === 'home';
  const back = useMemo(() => {
    if (fromHome || spec?.return.page === 'home') return { label: '‹ 홈으로 돌아가기', to: '/home' };
    const tab = spec?.return.tab ?? 'overview';
    return { label: `‹ ${tab === 'schedule' ? '일정' : '조율'}로 돌아가기`, to: `/trip/${tab}` };
  }, [fromHome, spec]);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setAnswers({ ...(responses[formKey] ?? {}) });
    window.scrollTo(0, 0);
  }, [formKey, responses]);

  // 접근 조건 — HTML openForm 가드와 동일
  useEffect(() => {
    if (!spec) { navigate('/home', { replace: true }); return; }
    if (formKey === 'rule' && !completed.includes('concession')) {
      toast('양보 범위를 먼저 제출해 주세요.');
      navigate('/trip/coordination', { replace: true });
    }
    if (formKey === 'approval' && !['approval', 'done'].includes(currentTask)) {
      toast('일정이 생성된 뒤 작성할 수 있습니다.');
      navigate('/trip/schedule', { replace: true });
    }
  }, [formKey, spec, completed, currentTask, navigate, toast]);

  if (!spec) return null;

  const total = spec.questions.length;
  const done = Object.keys(answers).length;

  const select = (question: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [question]: String(value) }));
  };

  const submit = () => {
    if (done !== total) { toast('아직 답하지 않은 항목이 있습니다.'); return; }
    submitFormAction(formKey, answers);
    toast(`${spec.title}를 제출했습니다.`);
    window.setTimeout(() => navigate(back.to), 500);
  };

  return (
    <main className="page form-page">
      <div className="form-toolbar">
        <button type="button" onClick={() => navigate(back.to)}>{back.label}</button>
        <span>{done} / {total} 작성</span>
        <div className="form-progress"><i style={{ width: `${(done / total) * 100}%` }}></i></div>
      </div>

      <article className="paper">
        <header className="paper-head">
          <h1>{spec.title}</h1>
          <p>{spec.code}</p>
        </header>
        <div className="paper-body">
          <p className="paper-note">{spec.note}</p>
          <div className="info-table">
            <span className="label">작성자</span><span>은진</span>
            <span className="label">대상 여행</span><span>{formKey === 'tti' ? '해당 없음' : '부산 2박 3일'}</span>
            <span className="label">동행</span><span>{formKey === 'tti' ? '해당 없음' : '지우'}</span>
            <span className="label">작성 상태</span><span>임시 저장</span>
          </div>

          <h2 className="form-section-title">1. 항목별 응답</h2>
          <div>
            {spec.questions.map((question, qi) => (
              <section className="question" key={question}>
                <div className="question-head"><b>{String(qi + 1).padStart(2, '0')}</b><span>{question}</span></div>
                {spec.kind === 'scale' ? (
                  <div className="scale">
                    {SCALE_LABELS.map((label, xi) => (
                      <button type="button" key={label} className={answers[qi] === String(xi) ? 'on' : ''} onClick={() => select(qi, xi)}>{label}</button>
                    ))}
                  </div>
                ) : (
                  <div className="option-list">
                    {(spec.options ?? []).map((option, xi) => (
                      <button type="button" key={option} className={answers[qi] === String(xi) ? 'on' : ''} onClick={() => select(qi, xi)}>
                        {answers[qi] === String(xi) ? '✓' : '□'} {option}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <h2 className="form-section-title">2. 동행에게 미리 전할 내용</h2>
          <textarea placeholder="제출 전까지 상대에게 공개되지 않습니다."></textarea>
          <div className="sign"><span>작성일 2026. 08. 15</span><span>작성자 서명 __________</span></div>
        </div>
      </article>

      <div className="form-actions">
        <button type="button" onClick={() => { toast('임시 저장했습니다.'); window.setTimeout(() => navigate(back.to), 300); }}>임시 저장하고 나가기</button>
        <span className="hint">{done === total ? '모든 항목이 작성되었습니다.' : `${total - done}개 항목이 남았습니다.`}</span>
        <button type="button" className={done === total ? 'submit ready' : 'submit'} onClick={submit}>제출하기</button>
      </div>
    </main>
  );
}
