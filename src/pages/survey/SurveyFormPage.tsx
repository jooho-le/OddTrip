import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import {
  SCALE_LABELS,
  SURVEY_DESIGNS,
  type SurveyDesignSpec,
  type SurveyKey,
} from '../../features/prototype/designContent';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { JointPreference, TtiQuestion } from '../../types';

const TTI_VALUES = [-2, -1, 0, 1, 2] as const;
const VALID_KEYS: SurveyKey[] = ['tti', 'preference', 'concession', 'rule', 'approval'];

export function SurveyFormPage() {
  const { key } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const formKey = VALID_KEYS.includes(key as SurveyKey) ? key as SurveyKey : undefined;
  const {
    user,
    questions,
    answers: ttiAnswers,
    preferences,
    approval,
    activeTripId,
    tripHistory,
    status,
    error,
    loadQuestions,
    setAnswer,
    calculateResult,
    ensureTrip,
    updatePreferences,
    savePreferences,
    loadApproval,
    respondApproval,
  } = useTripStore();
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  const spec = useMemo(() => {
    if (!formKey) return undefined;
    if (formKey === 'tti') return ttiDesign(questions);
    return SURVEY_DESIGNS[formKey];
  }, [formKey, questions]);
  const trip = tripHistory.find((item) => item.tripId === activeTripId)
    ?? tripHistory.find((item) => !['completed', 'cancelled'].includes(item.status));
  const fromHome = search.get('from') === 'home';
  const back = fromHome || formKey === 'tti'
    ? { label: '‹ 홈으로 돌아가기', to: '/home' }
    : { label: `‹ ${formKey === 'approval' ? '일정' : '조율'}로 돌아가기`, to: spec?.returnTo ?? '/home' };

  useEffect(() => {
    if (!formKey) navigate('/home', { replace: true });
  }, [formKey, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (formKey === 'tti') void loadQuestions();
    if (formKey && formKey !== 'tti' && formKey !== 'approval') void ensureTrip();
    if (formKey === 'approval') void loadApproval();
    if (formKey === 'concession' || formKey === 'rule') {
      showDemoOnce(
        `survey-${formKey}`,
        `${SURVEY_DESIGNS[formKey].title}의 정보 구조와 입력 경험을 확인할 수 있습니다. 현재 입력은 서버에 저장되거나 상대에게 전달되지 않습니다.`,
      );
    }
  }, [formKey, loadQuestions, ensureTrip, loadApproval, showDemoOnce]);

  useEffect(() => {
    if (formKey === 'preference' && status.preferences === 'success') {
      setAnswers(preferenceToAnswers(preferences));
    }
    if (formKey === 'approval' && approval && status.approval === 'success') {
      const requestedOption = SURVEY_DESIGNS.approval.options?.[0].findIndex((option) => option === approval.mine.comment) ?? -1;
      setAnswers(approval.mine.status === 'approved' ? { 0: '0' } : approval.mine.status === 'change_requested' ? { 0: String(requestedOption > 0 ? requestedOption : 1) } : {});
      setNote(approval.mine.comment ?? '');
    }
    if (formKey === 'concession' || formKey === 'rule') setAnswers({});
  }, [formKey, preferences, approval, status.preferences, status.approval]);

  if (!formKey || !spec) return null;

  const total = spec.questions.length;
  const ttiDone = questions.filter((question) => ttiAnswers.some((answer) => answer.questionId === question.id)).length;
  const done = formKey === 'tti' ? ttiDone : Object.keys(answers).length;
  const complete = total > 0 && done === total;
  const busy = status.tti === 'loading' || status.preferences === 'loading' || status.trip === 'loading' || status.approval === 'loading';

  const select = (questionIndex: number, optionIndex: number) => {
    if (formKey === 'tti') {
      const question = questions[questionIndex];
      if (!question) return;
      setAnswer({ questionId: question.id, axis: question.axis, value: TTI_VALUES[optionIndex] });
      return;
    }
    setAnswers((current) => ({ ...current, [questionIndex]: String(optionIndex) }));
  };

  const submit = async () => {
    if (!complete) {
      showInfo('아직 답하지 않은 항목이 있습니다.', `${total - done}개 항목을 더 작성해 주세요.`);
      return;
    }

    if (formKey === 'tti') {
      const result = await calculateResult();
      if (!result) return;
      showInfo('여행 성향 조사서를 제출했습니다.', `${result.code} · ${result.title} 결과가 계정에 저장되었습니다.`);
      navigate(back.to);
      return;
    }

    if (formKey === 'preference') {
      updatePreferences(answersToPreference(answers, preferences, SURVEY_DESIGNS.preference));
      await savePreferences();
      if (useTripStore.getState().status.preferences === 'success') {
        showInfo('독립 선택 조사서를 제출했습니다.', '내 답안으로 따로 저장되며, 조율 화면에서 상대방의 제출 여부와 차이를 확인할 수 있습니다.');
        navigate(back.to);
      }
      return;
    }

    if (formKey === 'approval') {
      const optionIndex = Number(answers[0]);
      const option = spec.options?.[0]?.[optionIndex] ?? '';
      const action = optionIndex === 0 ? 'approve' : 'change_request';
      const success = await respondApproval(action, action === 'change_request' ? note.trim() || option : note.trim() || undefined);
      if (!success) return;
      const current = useTripStore.getState().approval;
      showInfo(
        action === 'approve' ? '일정을 승인했습니다.' : '일정 수정 요청을 보냈습니다.',
        current?.allApproved ? '두 사람의 승인이 완료되어 여행 일정이 확정됐습니다.' : action === 'approve' ? '동행의 승인을 기다리고 있습니다.' : '동행이 요청 내용을 확인할 수 있습니다.',
      );
      navigate(back.to);
      return;
    }

    showInfo('저장하지 않았습니다.', `${spec.title}는 체험용 입력입니다. 백엔드 계약이 준비되기 전에는 제출 완료 상태로 변경하지 않습니다.`);
  };

  const leaveWithDraft = () => {
    if (done > 0) {
      showComingSoon('조사서 임시 저장', '서버 임시 저장 기능이 없어 현재 입력은 브라우저를 벗어나면 유지되지 않을 수 있습니다.');
    }
    navigate(back.to);
  };

  const questionLoadPending = formKey === 'tti' && (status.questions === 'loading' || status.questions === 'idle');
  const questionLoadFailed = formKey === 'tti' && status.questions === 'error';

  return (
    <main className="page form-page">
      <div className="form-toolbar">
        <button type="button" onClick={() => navigate(back.to)}>{back.label}</button>
        <span>{done} / {total} 작성</span>
        <div className="form-progress"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      </div>

      <article className="paper">
        <header className="paper-head">
          <h1>{spec.title}</h1>
          <p>{spec.code}</p>
        </header>
        <div className="paper-body">
          <p className="paper-note">{spec.note}</p>
          <div className="info-table">
            <span className="label">작성자</span><span>{user?.nickname ?? '여행자'}</span>
            <span className="label">대상 여행</span><span>{formKey === 'tti' ? '해당 없음' : trip?.title ?? trip?.region ?? '현재 여행'}</span>
            <span className="label">동행</span><span>{formKey === 'tti' ? '해당 없음' : trip?.partner?.nickname ?? '연결된 동행'}</span>
            <span className="label">작성 상태</span><span>{busy ? '처리 중' : formKey === 'approval' ? approvalStatusText(approval?.mine.status) : '제출 전'}</span>
          </div>

          <h2 className="form-section-title">1. 항목별 응답</h2>
          {questionLoadPending ? <DocumentState message="질문을 불러오고 있습니다." loading /> : null}
          {questionLoadFailed ? <DocumentState message={error ?? '질문을 불러오지 못했습니다.'} action={() => void loadQuestions()} /> : null}
          {!questionLoadPending && !questionLoadFailed && total === 0 ? <DocumentState message="표시할 질문이 없습니다." /> : null}
          <div>
            {!questionLoadPending && !questionLoadFailed ? spec.questions.map((question, questionIndex) => (
              <section className="question" key={formKey === 'tti' ? questions[questionIndex]?.id ?? question : question}>
                <div className="question-head"><b>{String(questionIndex + 1).padStart(2, '0')}</b><span>{question}</span></div>
                {spec.kind === 'scale' ? (
                  <div className="scale">
                    {SCALE_LABELS.map((label, optionIndex) => {
                      const selected = formKey === 'tti'
                        ? ttiAnswers.find((answer) => answer.questionId === questions[questionIndex]?.id)?.value === TTI_VALUES[optionIndex]
                        : answers[questionIndex] === String(optionIndex);
                      return (
                        <button type="button" key={label} className={selected ? 'on' : ''} onClick={() => select(questionIndex, optionIndex)}>
                          {formKey === 'tti' ? ttiOptionLabel(TTI_VALUES[optionIndex], questions[questionIndex]) : label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="option-list">
                    {(spec.options?.[questionIndex] ?? []).map((option, optionIndex) => (
                      <button type="button" key={option} className={answers[questionIndex] === String(optionIndex) ? 'on' : ''} onClick={() => select(questionIndex, optionIndex)}>
                        {answers[questionIndex] === String(optionIndex) ? '✓' : '□'} {option}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )) : null}
          </div>

          <h2 className="form-section-title">2. 동행에게 미리 전할 내용</h2>
          <textarea
            readOnly={formKey !== 'approval'}
            aria-label="동행에게 미리 전할 내용"
            maxLength={500}
            value={formKey === 'approval' ? note : ''}
            placeholder={formKey === 'approval' ? '수정 요청의 구체적인 내용을 적어주세요. 승인할 때는 비워도 됩니다.' : '현재 준비 중인 기능입니다.'}
            onChange={(event) => { if (formKey === 'approval') setNote(event.target.value); }}
            onFocus={() => { if (formKey !== 'approval') showComingSoon('동행에게 미리 전할 내용', '조사서별 메모를 저장하고 상대에게 공개하는 백엔드 기능이 아직 없습니다.'); }}
          />
          {error && !questionLoadFailed ? <div className="error-strip" role="alert">{error}</div> : null}
          <div className="sign"><span>작성일 {new Date().toLocaleDateString('ko-KR')}</span><span>작성자 서명 __________</span></div>
        </div>
      </article>

      <div className="form-actions">
        <button type="button" onClick={leaveWithDraft}>임시 저장하고 나가기</button>
        <span className="hint">{complete ? '모든 항목이 작성되었습니다.' : `${Math.max(0, total - done)}개 항목이 남았습니다.`}</span>
        <button type="button" className={complete ? 'submit ready' : 'submit'} disabled={busy || total === 0} onClick={() => void submit()}>{busy ? '처리 중…' : '제출하기'}</button>
      </div>
    </main>
  );
}

function ttiDesign(questions: TtiQuestion[]): SurveyDesignSpec {
  return {
    title: '여행 성향 조사서',
    code: 'ODDTRIP FORM 01 · TRAVEL TYPE INDICATOR',
    note: '평소 여행에서 실제로 하는 선택을 기준으로 답해 주세요. 결과는 매칭 후보를 계산할 때 사용됩니다.',
    kind: 'scale',
    questions: questions.map((question) => question.prompt),
    returnTo: '/home',
  };
}

function approvalStatusText(status?: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'change_requested') return '수정 요청 완료';
  return '제출 전';
}

function ttiOptionLabel(value: number, question?: TtiQuestion) {
  if (!question) return SCALE_LABELS[value + 2] ?? '보통';
  if (value === -2) return question.leftLabel;
  if (value === -1) return `조금 ${question.leftLabel}`;
  if (value === 1) return `조금 ${question.rightLabel}`;
  if (value === 2) return question.rightLabel;
  return '둘 다 괜찮음';
}

function preferenceToAnswers(preferences: JointPreference) {
  const spec = SURVEY_DESIGNS.preference;
  const values: Record<string, string> = {};
  const place = spec.options?.[0].indexOf(preferences.places[0]);
  const food = spec.options?.[2].indexOf(preferences.foods[0]);
  const activity = spec.options?.[3].indexOf(preferences.activities[0]);
  if (place !== undefined && place >= 0) values[0] = String(place);
  if (hasPreferenceInput(preferences)) values[1] = String(paceIndex(preferences.pace));
  if (food !== undefined && food >= 0) values[2] = String(food);
  if (activity !== undefined && activity >= 0) values[3] = String(activity);
  return values;
}

function answersToPreference(answers: Record<string, string>, current: JointPreference, spec: SurveyDesignSpec): JointPreference {
  const option = (question: number) => spec.options?.[question]?.[Number(answers[question])] ?? '';
  const paces = [25, 45, 65, 85];
  return {
    ...current,
    places: option(0) ? [option(0)] : current.places,
    pace: paces[Number(answers[1])] ?? current.pace,
    foods: option(2) ? [option(2)] : current.foods,
    activities: option(3) ? [option(3)] : current.activities,
  };
}

function paceIndex(pace: number) {
  if (pace < 35) return 0;
  if (pace < 55) return 1;
  if (pace < 75) return 2;
  return 3;
}

function hasPreferenceInput(preferences: JointPreference) {
  return Boolean(
    preferences.places.length
    || preferences.activities.length
    || preferences.foods.length
    || preferences.indoorPreferred
    || preferences.hiddenSpots
    || preferences.pace !== 50
    || preferences.budget !== 50
  );
}

function DocumentState({ message, loading = false, action }: { message: string; loading?: boolean; action?: () => void }) {
  return (
    <div className="empty-state" role={loading ? 'status' : 'alert'}>
      <strong>{message}</strong>
      {loading ? <div className="loading-line" /> : null}
      {action ? <button className="line-btn" style={{ marginTop: 14 }} onClick={action}>다시 시도</button> : null}
    </div>
  );
}
