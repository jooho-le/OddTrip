import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';

const choices = {
  places: ['바다와 해안', '도시 골목', '전시와 문화', '시장과 로컬'],
  activities: ['천천히 산책', '카페와 휴식', '체험 활동', '야경 감상'],
  foods: ['시장 음식', '지역 식당', '디저트', '채식 선택'],
} as const;

export function Step1SelectPage() {
  const navigate = useNavigate();
  const { user, preferences, ensureTrip, updatePreferences, savePreferences, status, error } = useTripStore();
  const selectedCount = preferences.places.length + preferences.activities.length + preferences.foods.length;

  useEffect(() => { void ensureTrip(); }, [ensureTrip]);

  const toggle = (key: 'places' | 'activities' | 'foods', value: string) => {
    const current = preferences[key];
    updatePreferences({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };
  const save = async () => {
    await savePreferences();
    if (useTripStore.getState().status.preferences === 'success') navigate('/decision/analysis');
  };

  return (
    <main className="page form-page">
      <div className="form-toolbar"><button onClick={() => navigate('/decision')}>‹ 여행 개요로 돌아가기</button><span>{selectedCount}개 선택</span><div className="form-progress"><i style={{ width: String(Math.min(100, selectedCount * 10 + 20)) + '%' }} /></div></div>
      <article className="paper">
        <header className="paper-head"><h1>공동 선호 조사서</h1><p>ODDTRIP FORM 02 · SHARED PREFERENCE</p></header>
        <div className="paper-body">
          <p className="paper-note">둘이 함께 원하는 장소와 활동, 음식 취향을 한 문서로 정리합니다. 아래 응답은 현재 여행의 <b>공동 선호</b>로 저장됩니다.</p>
          <div className="info-table"><span className="label">작성자</span><span>{user?.nickname ?? '여행자'}</span><span className="label">문서 범위</span><span>공동 선호</span><span className="label">저장 위치</span><span>현재 여행</span><span className="label">작성 상태</span><span>{status.preferences === 'success' ? '저장됨' : '작성 중'}</span></div>
          <h2 className="form-section-title">1. 장소 분위기</h2><ChoiceList values={choices.places} selected={preferences.places} busy={status.trip === 'loading'} onToggle={(value) => toggle('places', value)} />
          <h2 className="form-section-title">2. 활동 방식</h2><ChoiceList values={choices.activities} selected={preferences.activities} busy={status.trip === 'loading'} onToggle={(value) => toggle('activities', value)} />
          <h2 className="form-section-title">3. 음식 취향</h2><ChoiceList values={choices.foods} selected={preferences.foods} busy={status.trip === 'loading'} onToggle={(value) => toggle('foods', value)} />
          <h2 className="form-section-title">4. 여행 강도와 예산</h2>
          <section className="question"><div className="question-head"><b>04</b><span>여유로운 일정 ↔ 촘촘한 일정 · {preferences.pace}</span></div><input style={{ width: '100%', marginTop: 16, accentColor: 'var(--orange)' }} type="range" min="0" max="100" value={preferences.pace} disabled={status.trip === 'loading'} onChange={(event) => updatePreferences({ pace: Number(event.target.value) })} /></section>
          <section className="question"><div className="question-head"><b>05</b><span>절약 중심 ↔ 경험 중심 · {preferences.budget}</span></div><input style={{ width: '100%', marginTop: 16, accentColor: 'var(--pink)' }} type="range" min="0" max="100" value={preferences.budget} disabled={status.trip === 'loading'} onChange={(event) => updatePreferences({ budget: Number(event.target.value) })} /></section>
          <div className="option-list"><button className={preferences.indoorPreferred ? 'on' : ''} disabled={status.trip === 'loading'} onClick={() => updatePreferences({ indoorPreferred: !preferences.indoorPreferred })}>{preferences.indoorPreferred ? '✓' : '□'} 실내 장소 우선</button><button className={preferences.hiddenSpots ? 'on' : ''} disabled={status.trip === 'loading'} onClick={() => updatePreferences({ hiddenSpots: !preferences.hiddenSpots })}>{preferences.hiddenSpots ? '✓' : '□'} 숨은 장소 우선</button></div>
          {error ? <div className="error-strip" role="alert">{error}</div> : null}
          <div className="sign"><span>작성일 {new Date().toLocaleDateString('ko-KR')}</span><span>공동 선호 문서</span></div>
        </div>
      </article>
      <div className="form-actions"><button onClick={() => navigate('/trip/overview')}>나가기</button><span className="hint">{status.trip === 'loading' ? '기존 공동 선호를 불러오는 중입니다.' : status.preferences === 'success' ? '현재 여행에 저장되었습니다.' : '작성한 내용은 현재 여행에 저장됩니다.'}</span><button className="submit ready" disabled={status.trip === 'loading' || status.preferences === 'loading'} aria-busy={status.trip === 'loading' || status.preferences === 'loading'} onClick={() => void save()}>{status.trip === 'loading' ? '불러오는 중…' : status.preferences === 'loading' ? '저장 중…' : '저장하고 분석 보기'}</button></div>
    </main>
  );
}

function ChoiceList({ values, selected, busy, onToggle }: { values: readonly string[]; selected: string[]; busy: boolean; onToggle: (value: string) => void }) {
  return <section className="question"><div className="option-list">{values.map((value) => <button key={value} className={selected.includes(value) ? 'on' : ''} disabled={busy} onClick={() => onToggle(value)}>{selected.includes(value) ? '✓' : '□'} {value}</button>)}</div></section>;
}
