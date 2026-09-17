import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { tripWorkspacePath } from '../../shared/lib/tripRoutes';

const FAQ = [
  ['동행 요청을 바로 수락할 수 있나요?', '후보 상세에서 요청을 보내고 상대가 수락해야 매칭과 여행 공간이 생성됩니다. 요청 상태는 동행 찾기에서 확인할 수 있습니다.'],
  ['AI가 언제 일정표를 만드나요?', '두 사람의 공동 선호가 모두 제출되면 자동으로 시작합니다. 장소와 이동 순서를 포함한 일정표가 완성되면 일정 탭에서 함께 확인할 수 있습니다.'],
  ['채팅 연결이 끊기면 어떻게 되나요?', '화면에 재연결 상태가 표시됩니다. 연결이 복구되면 서버의 메시지와 읽음 상태를 다시 불러옵니다.'],
  ['탈퇴하면 어떤 정보가 남나요?', '프로필과 서비스 데이터는 삭제되며, 신고·분쟁이나 법령상 보존이 필요한 일부 기록은 정해진 기간 동안 분리 보관될 수 있습니다.'],
] as const;

export function HelpPage() {
  const activeTripId = useTripStore((state) => state.activeTripId);
  const tripFallback = '/my';
  const guides = [
    ['동행을 찾고 싶어요', '여행 성향을 작성한 뒤 동행 찾기에서 후보의 차이와 추천 이유를 확인하세요.', '/matches', '동행 찾기'],
    ['둘의 취향을 조율하고 싶어요', '각자 공동 선호를 제출하면 AI가 두 답안을 함께 반영해 여행 장소와 일정표를 자동으로 만듭니다.', activeTripId ? tripWorkspacePath(activeTripId, 'coordination') : tripFallback, '조율 열기'],
    ['일정과 안전 정보를 보고 싶어요', 'AI가 만든 일정표에서 일자별 동선과 현재 제공된 안전 정보를 확인하세요.', activeTripId ? tripWorkspacePath(activeTripId, 'schedule') : tripFallback, '일정 열기'],
    ['알림과 차단을 관리하고 싶어요', '알림 수신 상태, 마케팅 동의와 차단한 사용자를 계정 설정에서 관리합니다.', '/settings', '설정 열기'],
  ] as const;

  return (
    <main className="page help-page">
      <div className="container">
        <header className="help-hero">
          <span className="eyebrow">ODDTRIP FIELD GUIDE</span>
          <h1>낯선 취향 사이에서<br />길을 잃지 않도록.</h1>
          <p>지금 하려는 일에 맞는 화면과 저장 범위를 빠르게 확인하세요.</p>
        </header>

        <section className="help-guide-grid" aria-label="주요 작업 안내">
          {guides.map(([title, copy, to, label], index) => (
            <article className="help-guide" key={title}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <h2>{title}</h2>
              <p>{copy}</p>
              <Link className="text-btn accent" to={to}>{label} →</Link>
            </article>
          ))}
        </section>

        <section className="help-faq">
          <div className="section-title"><h2>자주 묻는 질문</h2><p>현재 구현 범위를 기준으로 안내합니다.</p></div>
          {FAQ.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </section>

        <section className="help-contact">
          <div><span className="eyebrow">STILL LOST?</span><h2>답을 찾지 못했나요?</h2><p>계정 이메일과 문제가 발생한 화면 주소를 함께 알려주시면 확인하기 쉽습니다.</p></div>
          <a className="solid-btn" href="mailto:hello@oddtrip.example">문의 메일 작성</a>
        </section>
      </div>
    </main>
  );
}
