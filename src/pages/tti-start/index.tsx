import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';

export function TtiStartPage() {
  const code = useTripStore((state) => state.result?.code ?? state.user?.ttiCode);
  return (
    <main className="page"><div className="container">
      <section className="tti-start">
        <div className="tti-copy"><span className="eyebrow">TRAVEL TYPE INDICATOR</span><h1>내 여행 방식을<br />4글자로 기록합니다.</h1><p>계획 방식, 탐색 방식, 활동 취향, 여행 속도 네 축을 묻습니다. 결과는 동행 후보 추천과 장소·일정 생성의 입력으로 실제 저장됩니다.</p><div className="button-row">{code ? <Link className="line-btn" to="/tti/result">현재 결과 {code} 보기</Link> : null}<Link className="solid-btn" to="/tti/questions">{code ? '다시 진단하기' : '조사서 작성하기'} →</Link></div></div>
        <aside className="tti-document"><span className="eyebrow" style={{ color: '#ffb39f' }}>ODDTRIP FORM 01</span><h2>여행 성향 조사서</h2><div className="tti-facts"><div className="tti-fact"><b>문항</b><span>서버에서 제공되는 12개 질문</span></div><div className="tti-fact"><b>예상 시간</b><span>약 2분</span></div><div className="tti-fact"><b>저장 범위</b><span>계정의 TTI 코드와 축별 점수</span></div><div className="tti-fact"><b>현재 상태</b><span>{code ? `${code} 저장됨` : '작성 전'}</span></div></div><p className="data-note" style={{ color: '#aaa', marginTop: 18 }}>현재 백엔드 TTI 질문·계산 API 연결</p></aside>
      </section>
    </div></main>
  );
}
