import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const rules = [
  ['핵심 1개 보장', '각자 가장 중요한 한 가지를 일정에 반드시 남깁니다.'],
  ['하루씩 선택권', '날짜별 주도권을 번갈아 갖습니다.'],
  ['새로운 선택 우선', '둘 다 가보지 않은 장소를 우선합니다.'],
];

export function Step4OddRulePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  return <main className="page form-page"><div className="form-toolbar"><button onClick={() => navigate('/proposal')}>‹ 조율로 돌아가기</button><span>{selected ? '1 / 1 임시 선택' : '0 / 1 선택'}</span><div className="form-progress"><i style={{ width: selected ? '100%' : '0%' }} /></div></div><article className="paper"><header className="paper-head"><h1>Odd Rule 선택서</h1><p>ODDTRIP FORM 04 · SHARED RULE</p></header><div className="paper-body"><p className="paper-note">차이가 생겼을 때 두 사람이 적용할 규칙을 비교하는 화면입니다. 합의·확정 API가 없으므로 선택은 미리보기일 뿐 저장되지 않습니다.</p><div className="document-lock"><b>합의 상태를 만들지 않습니다.</b><br />양쪽 선택, 충돌 처리, 최종 규칙 버전을 저장하는 계약이 필요합니다.</div><h2 className="form-section-title">1. 조율 규칙 비교</h2><div className="proposal-grid">{rules.map(([title, copy]) => <article className={selected === title ? 'proposal' : 'proposal'} style={selected === title ? { borderColor: 'var(--pink)', background: '#fff1f6' } : undefined} key={title}><strong>{title}</strong><p>{copy}</p><button className={selected === title ? 'solid-btn' : 'line-btn'} style={{ width: '100%' }} onClick={() => setSelected(title)}>{selected === title ? '미리보기 선택됨' : '미리보기'}</button></article>)}</div><div className="sign"><span>저장되지 않는 미리보기</span><span>합의 서명 __________</span></div></div></article><div className="form-actions"><button onClick={() => navigate('/proposal')}>나가기</button><span className="hint">{selected ? selected + ' · 미저장' : '규칙을 비교해볼 수 있습니다.'}</span><button className="submit unsupported-button" disabled>합의 API 연결 대기</button></div></main>;
}
