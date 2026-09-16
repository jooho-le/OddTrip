import { Link } from 'react-router-dom';

const GUIDES = [
  ['동행을 찾고 싶어요', '여행 성향을 작성한 뒤 동행 찾기에서 후보의 차이와 추천 이유를 확인하세요.', '/matches', '동행 찾기'],
  ['둘의 취향을 조율하고 싶어요', '각자 독립 선택을 제출하면 공통점과 차이를 비교하고 합의안을 주고받을 수 있습니다.', '/trip/coordination', '조율 열기'],
  ['일정과 안전 정보를 보고 싶어요', '저장한 장소로 일정을 만든 뒤 일자별 동선과 현재 제공된 안전 정보를 확인하세요.', '/trip/schedule', '일정 열기'],
  ['알림과 차단을 관리하고 싶어요', '알림 수신 상태, 마케팅 동의와 차단한 사용자를 계정 설정에서 관리합니다.', '/settings', '설정 열기'],
] as const;

const FAQ = [
  ['동행 요청을 바로 수락할 수 있나요?', '후보 상세에서 요청을 보내고 상대가 수락해야 매칭과 여행 공간이 생성됩니다. 요청 상태는 동행 찾기에서 확인할 수 있습니다.'],
  ['입력했는데 저장되지 않는 항목이 있어요.', '양보 범위, Odd Rule, 장소 개인 투표와 일정 항목 개별 수정은 백엔드 연결 전입니다. 일정 전체 승인과 수정 요청은 서버에 저장됩니다.'],
  ['채팅 연결이 끊기면 어떻게 되나요?', '화면에 재연결 상태가 표시됩니다. 연결이 복구되면 서버의 메시지와 읽음 상태를 다시 불러옵니다.'],
  ['탈퇴하면 어떤 정보가 남나요?', '프로필과 서비스 데이터는 삭제되며, 신고·분쟁이나 법령상 보존이 필요한 일부 기록은 정해진 기간 동안 분리 보관될 수 있습니다.'],
] as const;

export function HelpPage() {
  return (
    <main className="page help-page">
      <div className="container">
        <header className="help-hero">
          <span className="eyebrow">ODDTRIP FIELD GUIDE</span>
          <h1>낯선 취향 사이에서<br />길을 잃지 않도록.</h1>
          <p>지금 하려는 일에 맞는 화면과 저장 범위를 빠르게 확인하세요.</p>
        </header>

        <section className="help-guide-grid" aria-label="주요 작업 안내">
          {GUIDES.map(([title, copy, to, label], index) => (
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
