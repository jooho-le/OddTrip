import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { oddtripService } from '../../entities/trip/api/oddtripService';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { subscribeRealtime } from '../../shared/realtime/socketBus';
import { tripWorkspacePath } from '../../shared/lib/tripRoutes';
import { useToast } from '../../shared/ui/Toast';
import type { ConcessionAnswers, ConcessionChoice, ConcessionState, OddRuleProposal, OddRuleState } from '../../types';

const CONCESSION_QUESTIONS = [
  { key: 'pace', title: '하루 일정의 속도', copy: '방문 장소 수와 쉬는 시간을 어느 정도까지 조정할 수 있나요?' },
  { key: 'budget', title: '여행 예산', copy: '숙소·식사·체험 비용에서 어느 정도까지 상대 기준을 따를 수 있나요?' },
  { key: 'food', title: '식사 선택', copy: '메뉴와 식당을 고를 때 내 취향을 얼마나 양보할 수 있나요?' },
  { key: 'activities', title: '활동과 장소', copy: '꼭 하고 싶은 활동과 방문지를 어느 정도까지 바꿀 수 있나요?' },
] as const;

const CONCESSION_CHOICES: Array<{ value: ConcessionChoice; label: string; copy: string }> = [
  { value: 'keep', label: '지키고 싶어요', copy: '이번 여행에서 중요한 기준입니다.' },
  { value: 'flexible', label: '조율할 수 있어요', copy: '상황에 따라 중간점을 찾을 수 있습니다.' },
  { value: 'yield', label: '상대에게 맞출게요', copy: '동행의 선택을 우선해도 괜찮습니다.' },
];

const RULES = [
  { ruleKey: 'alternate-lead', title: '하루씩 주도권 바꾸기', description: '여행 날짜별로 한 사람씩 선택권을 맡고 다음 날에는 역할을 바꿉니다.' },
  { ruleKey: 'one-must-each', title: '서로의 필수 한 가지 보장', description: '각자 반드시 하고 싶은 한 가지는 그대로 일정에 포함합니다.' },
  { ruleKey: 'one-veto-each', title: '각자 거절권 한 번', description: '서로 한 번씩 이유를 설명하지 않고도 선택을 제외할 수 있습니다.' },
  { ruleKey: 'budget-first', title: '공동 예산 상한 우선', description: '의견이 다르면 두 사람이 정한 예산 상한을 넘지 않는 선택을 우선합니다.' },
] as const;

export function ConcessionSurveyPage() {
  const { tripId = '' } = useParams();
  const navigate = useNavigate();
  const show = useToast((item) => item.show);
  const trip = useTripStore((store) => store.tripHistory.find((item) => item.tripId === tripId));
  const [state, setState] = useState<ConcessionState>();
  const [answers, setAnswers] = useState<ConcessionAnswers>({});
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tripId) return;
    try {
      const response = await oddtripService.getConcessions(tripId);
      setState(response.data);
      setAnswers(response.data.mine?.answers ?? {});
      setNote(response.data.mine?.note ?? '');
      setStatus('ready');
      setError('');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : '양보 범위를 불러오지 못했습니다.');
    }
  }, [tripId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeRealtime((event) => {
    const data = event.data as { tripId?: string } | undefined;
    if (event.event === 'concession.updated' && data?.tripId === tripId) void load();
  }), [tripId, load]);

  const locked = Boolean(state?.revealedAt);
  const complete = CONCESSION_QUESTIONS.every(({ key }) => answers[key]);
  const save = async (submit: boolean) => {
    if (submit && !complete) {
      setError('제출하려면 네 항목에 모두 답해주세요.');
      return;
    }
    setStatus('saving'); setError('');
    try {
      const response = await oddtripService.saveConcessions(tripId, answers, note, submit);
      setState(response.data);
      setStatus('ready');
      show(submit ? '양보 범위를 제출했습니다.' : '양보 범위 초안을 저장했습니다.');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : '양보 범위를 저장하지 못했습니다.');
    }
  };

  return <main className="page agreement-page"><div className="container">
    <header className="page-heading"><div><Link className="text-btn" to={tripWorkspacePath(tripId, 'coordination')}>‹ 조율로 돌아가기</Link><span className="eyebrow">PRIVATE CONCESSION</span><h1>양보 범위 조사서</h1></div><p>두 사람의 답은 모두 제출되기 전까지 서로에게 공개되지 않습니다.</p></header>
    <section className="agreement-status" aria-live="polite"><div><b>내 상태</b><span>{state?.mineSubmitted ? '제출 완료' : state?.mine ? '초안 저장' : '작성 전'}</span></div><div><b>{trip?.partner?.nickname ?? '동행'} 상태</b><span>{state?.counterpartSubmitted ? '제출 완료' : '제출 대기'}</span></div><div><b>공개 시점</b><span>{state?.revealedAt ? formatMoment(state.revealedAt) : '두 사람 제출 후'}</span></div></section>
    {status === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
    {error ? <div className="error-strip" role="alert"><span>{error}</span>{status === 'error' ? <button onClick={() => void load()}>다시 시도</button> : null}</div> : null}
    {status !== 'loading' ? <section className="agreement-sheet">
      {CONCESSION_QUESTIONS.map(({ key, title, copy }, index) => <article className="concession-question" key={key}><header><b>{String(index + 1).padStart(2, '0')}</b><div><h2>{title}</h2><p>{copy}</p></div></header><div className="concession-options">{CONCESSION_CHOICES.map((choice) => <button type="button" key={choice.value} className={answers[key] === choice.value ? 'selected' : ''} disabled={locked || status === 'saving'} onClick={() => setAnswers((current) => ({ ...current, [key]: choice.value }))}><b>{choice.label}</b><small>{choice.copy}</small></button>)}</div></article>)}
      <label className="agreement-note"><span>비공개 메모 · 함께 공개됩니다</span><textarea maxLength={500} disabled={locked || status === 'saving'} value={note} onChange={(event) => setNote(event.target.value)} placeholder="상대가 이해하면 좋을 이유나 조건을 적어주세요." /><small>{note.length} / 500</small></label>
      {state?.counterpart ? <CounterpartConcessions state={state} name={trip?.partner?.nickname ?? '동행'} /> : <div className="planning-lock compact"><b>상대 답안은 아직 비공개입니다.</b><span>두 사람 모두 제출하면 같은 시각에 서로의 답과 메모가 공개됩니다.</span></div>}
      <div className="agreement-actions"><button className="line-btn" disabled={locked || state?.mineSubmitted || status === 'saving'} onClick={() => void save(false)}>{state?.mineSubmitted ? '제출 완료' : '초안 저장'}</button><button className="solid-btn" disabled={locked || status === 'saving' || !complete} onClick={() => void save(true)}>{locked ? '함께 공개됨' : status === 'saving' ? '저장 중…' : state?.mineSubmitted ? '수정하여 다시 제출' : '제출하기'}</button><button className="text-btn" onClick={() => navigate(tripWorkspacePath(tripId, 'coordination'))}>조율로 돌아가기</button></div>
    </section> : null}
  </div></main>;
}

function CounterpartConcessions({ state, name }: { state: ConcessionState; name: string }) {
  return <section className="counterpart-reveal"><span className="eyebrow">REVEALED TOGETHER</span><h2>{name}님의 양보 범위</h2><div>{CONCESSION_QUESTIONS.map(({ key, title }) => <p key={key}><b>{title}</b><span>{choiceLabel(state.counterpart?.answers[key])}</span></p>)}</div>{state.counterpart?.note ? <blockquote>{state.counterpart.note}</blockquote> : null}</section>;
}

export function OddRulePage() {
  const { tripId = '' } = useParams();
  const user = useTripStore((store) => store.user);
  const trip = useTripStore((store) => store.tripHistory.find((item) => item.tripId === tripId));
  const show = useToast((item) => item.show);
  const [state, setState] = useState<OddRuleState>();
  const [selectedKey, setSelectedKey] = useState<string>(RULES[0].ruleKey);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tripId) return;
    try { setState((await oddtripService.getOddRules(tripId)).data); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Odd Rule을 불러오지 못했습니다.'); }
  }, [tripId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeRealtime((event) => {
    const data = event.data as { tripId?: string } | undefined;
    if ((event.event === 'odd_rule.proposed' || event.event === 'odd_rule.responded') && data?.tripId === tripId) void load();
  }), [tripId, load]);

  const selected = useMemo(() => RULES.find((rule) => rule.ruleKey === selectedKey), [selectedKey]);
  const propose = async (event: FormEvent) => {
    event.preventDefault();
    const input = selectedKey === 'custom'
      ? { ruleKey: 'custom', title: customTitle.trim(), description: customDescription.trim() }
      : selected;
    if (!input?.title || !input.description) { setError('규칙 이름과 설명을 입력해주세요.'); return; }
    setBusy('propose'); setError('');
    try { setState((await oddtripService.proposeOddRule(tripId, input)).data); show('Odd Rule을 동행에게 제안했습니다.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '규칙을 제안하지 못했습니다.'); }
    finally { setBusy(''); }
  };
  const respond = async (proposal: OddRuleProposal, action: 'accept' | 'reject') => {
    setBusy(proposal.id); setError('');
    try { setState((await oddtripService.respondOddRule(tripId, proposal.id, action)).data); show(action === 'accept' ? '새 Odd Rule을 함께 확정했습니다.' : '제안을 거절했습니다.', 'info'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '제안에 응답하지 못했습니다.'); }
    finally { setBusy(''); }
  };

  return <main className="page agreement-page"><div className="container">
    <header className="page-heading"><div><Link className="text-btn" to={tripWorkspacePath(tripId, 'coordination')}>‹ 조율로 돌아가기</Link><span className="eyebrow">ODD RULE AGREEMENT</span><h1>Odd Rule</h1></div><p>한 사람이 제안하고 상대가 동의해야 최종 규칙의 새 버전이 됩니다.</p></header>
    {error ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void load()}>다시 시도</button></div> : null}
    <section className="current-rule"><span className="eyebrow">CURRENT RULE</span>{state?.current ? <><em>VERSION {state.current.version}</em><h2>{state.current.title}</h2><p>{state.current.description}</p><small>{formatMoment(state.current.finalizedAt)} 확정</small></> : <><h2>아직 확정한 규칙이 없습니다.</h2><p>아래에서 이번 여행에 맞는 규칙을 골라 동행에게 제안해 보세요.</p></>}</section>
    <div className="agreement-columns"><form className="rule-proposal-form" onSubmit={propose}><div className="section-title"><h2>새 규칙 제안</h2><p>내가 보낸 기존 대기 제안은 새 제안으로 교체됩니다.</p></div><div className="rule-preset-grid">{RULES.map((rule) => <button type="button" key={rule.ruleKey} className={selectedKey === rule.ruleKey ? 'selected' : ''} onClick={() => setSelectedKey(rule.ruleKey)}><b>{rule.title}</b><span>{rule.description}</span></button>)}<button type="button" className={selectedKey === 'custom' ? 'selected' : ''} onClick={() => setSelectedKey('custom')}><b>직접 정하기</b><span>두 사람만의 규칙 이름과 내용을 작성합니다.</span></button></div>{selectedKey === 'custom' ? <div className="custom-rule-fields"><label>규칙 이름<input maxLength={80} required value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} /></label><label>규칙 설명<textarea maxLength={500} required value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} /></label></div> : null}<button className="solid-btn" disabled={Boolean(busy)}>{busy === 'propose' ? '제안 중…' : `${trip?.partner?.nickname ?? '동행'}에게 제안하기`}</button></form>
      <section><div className="section-title"><h2>응답 대기 제안</h2><p>제안자 본인은 자기 제안에 응답할 수 없습니다.</p></div><div className="pending-rule-list">{state?.pending.length ? state.pending.map((proposal) => { const mine = proposal.proposedBy === user?.id; return <article key={proposal.id}><span className="status">{mine ? '내 제안' : `${trip?.partner?.nickname ?? '동행'} 제안`}</span><h3>{proposal.title}</h3><p>{proposal.description}</p><small>{formatMoment(proposal.createdAt)}</small>{mine ? <b className="record-label proposal-record-label">상대 응답 대기</b> : <div className="button-row"><button className="line-btn" disabled={Boolean(busy)} onClick={() => void respond(proposal, 'reject')}>거절</button><button className="solid-btn" disabled={Boolean(busy)} onClick={() => void respond(proposal, 'accept')}>동의하고 확정</button></div>}</article>; }) : <div className="empty-state"><strong>응답을 기다리는 제안이 없습니다.</strong></div>}</div></section>
    </div>
    <section className="rule-history"><div className="section-title"><h2>최종 규칙 버전 이력</h2><p>상대가 동의해 확정된 규칙만 버전으로 기록됩니다.</p></div>{state?.history.length ? <ol>{state.history.map((rule) => <li key={rule.id}><b>v{rule.version}</b><div><strong>{rule.title}</strong><p>{rule.description}</p></div><time>{formatMoment(rule.finalizedAt)}</time></li>)}</ol> : <div className="empty-state"><strong>아직 확정 이력이 없습니다.</strong></div>}</section>
  </div></main>;
}

function choiceLabel(value?: ConcessionChoice) {
  return CONCESSION_CHOICES.find((choice) => choice.value === value)?.label ?? '응답 없음';
}

function formatMoment(value?: string | null) {
  if (!value) return '기록 없음';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '기록 없음' : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}
