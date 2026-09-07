import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';

const axisNames: Record<string, string> = { PW: '계획 방식', NC: '탐색 방식', FA: '활동 취향', HS: '여행 속도' };

export function TtiResultPage() {
  const { result, user, loadResult } = useTripStore();
  useEffect(() => { if (!result && user?.ttiCode) void loadResult(); }, [result, user?.ttiCode, loadResult]);
  if (!result) return <main className="page"><div className="container"><div className="empty-state"><strong>{user?.ttiCode ? '결과를 불러오고 있습니다.' : '아직 진단 결과가 없습니다.'}</strong><p>TTI 조사서를 제출하면 이곳에 결과가 표시됩니다.</p>{!user?.ttiCode ? <Link className="solid-btn" to="/tti/start">진단 시작</Link> : <div className="loading-line" />}</div></div></main>;

  return (
    <main className="page"><div className="container">
      <section className="tti-result-cover"><div><span className="eyebrow" style={{ color: '#fff' }}>TTI RESULT</span><div className="tti-code">{result.code}</div><h1>{result.title}</h1><p>{result.description}</p></div><div className="tti-result-note"><b>반대 성향 · {result.oppositeCode}</b><br />서로 다른 축은 매칭 후보 추천과 공동 일정 조율의 입력으로 사용됩니다.</div></section>
      <div className="tti-axis-grid">{result.axisScores.map((axis) => { const percent = Math.max(0, Math.min(100, Math.round(((axis.score + 2) / 4) * 100))); return <article className="tti-axis" key={axis.axis}><div className="tti-axis-head"><span>{axisNames[axis.axis] ?? axis.axis}</span><span>{axis.leftLetter} ↔ {axis.rightLetter}</span></div><div className="tti-axis-track"><i style={{ width: `${percent}%` }} /></div></article>; })}</div>
      <section style={{ marginTop: 27 }}><div className="section-title"><h2>이 유형의 강점</h2><p>서버 계산 결과</p></div><div className="proposal-grid">{result.strengths.map((strength, index) => <article className="proposal" key={strength}><strong>{String(index + 1).padStart(2, '0')}</strong><p>{strength}</p></article>)}</div></section>
      <div className="workflow-cta"><p><b>이제 다른 여행자를 만나보세요.</b>추천 후보는 저장된 TTI 결과를 기준으로 불러옵니다.</p><div className="button-row"><Link className="line-btn" to="/tti/questions">다시 진단</Link><Link className="solid-btn" to="/matches">동행 찾기 →</Link></div></div>
    </div></main>
  );
}
