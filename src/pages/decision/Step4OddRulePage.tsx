import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

const rules = [
  ['핵심 1개 보장', '각자 가장 중요한 한 가지를 일정에 반드시 남깁니다.'],
  ['하루씩 선택권', '날짜별 주도권을 번갈아 갖습니다.'],
  ['새로운 선택 우선', '둘 다 가보지 않은 장소를 우선합니다.'],
];

export function Step4OddRulePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);
  const showInfo = useUiNoticeStore((state) => state.showInfo);

  useEffect(() => {
    showDemoOnce(
      'coordination-demo',
      '공동 선호와 차이 분석은 현재 여행에 연결됩니다. 개인 양보 범위, Odd Rule, 세 가지 조율안은 화면 체험용이며 여기서 고른 값은 저장되지 않습니다.',
    );
  }, [showDemoOnce]);

  return (
    <main className="page form-page">
      <div className="form-toolbar"><button onClick={() => navigate('/trip/coordination')}>‹ 조율로 돌아가기</button><span>{selected ? '1 / 1 선택' : '0 / 1 선택'}</span><div className="form-progress"><i style={{ width: selected ? '100%' : '0%' }} /></div></div>
      <article className="paper">
        <header className="paper-head"><h1>Odd Rule 선택서</h1><p>ODDTRIP FORM 04 · SHARED RULE</p></header>
        <div className="paper-body">
          <p className="paper-note">둘의 의견이 다를 때 적용할 규칙을 비교하고, 가장 잘 맞는 방식을 골라봅니다.</p>
          <h2 className="form-section-title">1. 조율 규칙 비교</h2>
          <div className="proposal-grid">
            {rules.map(([title, copy]) => (
              <article className="proposal" style={selected === title ? { borderColor: 'var(--pink)', background: '#fff1f6' } : undefined} key={title}>
                <strong>{title}</strong><p>{copy}</p>
                <button className={selected === title ? 'solid-btn' : 'line-btn'} style={{ width: '100%' }} onClick={() => setSelected(title)}>{selected === title ? '선택됨' : '선택하기'}</button>
              </article>
            ))}
          </div>
          <div className="sign"><span>공동 규칙 선택서</span><span>합의 서명 __________</span></div>
        </div>
      </article>
      <div className="form-actions">
        <button onClick={() => navigate('/trip/coordination')}>나가기</button>
        <span className="hint">{selected ? selected + '을 선택했습니다.' : '규칙 하나를 선택해 보세요.'}</span>
        <button className={selected ? 'submit ready' : 'submit'} disabled={!selected} onClick={() => showInfo('저장하지 않았습니다.', '선택한 Odd Rule은 체험용입니다. 두 사람의 합의와 버전 저장 기능이 준비되면 현재 여행에 반영할 수 있습니다.')}>선택 내용 확인</button>
      </div>
    </main>
  );
}
