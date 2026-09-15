import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

const questions = ['여행 일정의 시작 시간', '하루 이동량', '대표 관광지 비중', '식사 예산'];

export function Step3ConcessionPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const count = Object.keys(answers).length;

  useEffect(() => {
    showDemoOnce(
      'coordination-demo',
      '공동 선호와 차이 분석은 현재 여행에 연결됩니다. 개인 양보 범위, Odd Rule, 세 가지 조율안은 화면 체험용이며 여기서 고른 값은 저장되지 않습니다.',
    );
  }, [showDemoOnce]);

  return (
    <main className="page form-page">
      <div className="form-toolbar"><button onClick={() => navigate('/trip/coordination')}>‹ 조율로 돌아가기</button><span>{count} / {questions.length} 작성</span><div className="form-progress"><i style={{ width: String((count / questions.length) * 100) + '%' }} /></div></div>
      <article className="paper">
        <header className="paper-head"><h1>양보 범위 조사서</h1><p>ODDTRIP FORM 03 · PRIVATE CONCESSION</p></header>
        <div className="paper-body">
          <p className="paper-note">상대의 답을 보기 전에, 이번 여행에서 내가 지키고 싶은 것과 조율 가능한 것을 정리합니다.</p>
          <div className="info-table"><span className="label">문서</span><span>개인 양보안</span><span className="label">공개 범위</span><span>나만 보기</span><span className="label">대상</span><span>현재 여행</span><span className="label">작성 상태</span><span>{count === questions.length ? '작성 완료' : '작성 중'}</span></div>
          <h2 className="form-section-title">1. 항목별 응답</h2>
          {questions.map((question, index) => (
            <section className="question" key={question}>
              <div className="question-head"><b>{String(index + 1).padStart(2, '0')}</b><span>{question}</span></div>
              <div className="option-list">
                {['지키고 싶어요', '조율 가능해요', '상대에게 맡길게요'].map((option) => (
                  <button className={answers[index] === option ? 'on' : ''} key={option} onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}>{answers[index] === option ? '✓' : '□'} {option}</button>
                ))}
              </div>
            </section>
          ))}
          <h2 className="form-section-title">2. 동행에게 미리 전할 내용</h2>
          <textarea placeholder="이번 여행에서 중요하게 생각하는 점을 적어보세요." />
          <div className="sign"><span>개인 작성 문서</span><span>작성자 서명 __________</span></div>
        </div>
      </article>
      <div className="form-actions">
        <button onClick={() => navigate('/trip/coordination')}>작성 취소</button>
        <span className="hint">{count === questions.length ? '모든 항목을 작성했습니다.' : questions.length - count + '개 항목이 남았습니다.'}</span>
        <button className={count === questions.length ? 'submit ready' : 'submit'} disabled={count !== questions.length} onClick={() => showInfo('저장하지 않았습니다.', '이 양보 범위는 체험용 입력입니다. 개인별 제출 기능이 준비되면 계정과 현재 여행에 안전하게 저장됩니다.')}>작성 내용 확인</button>
      </div>
    </main>
  );
}
