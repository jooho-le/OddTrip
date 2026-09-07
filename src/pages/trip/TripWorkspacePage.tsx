import { useNavigate, useParams } from 'react-router-dom';
import { img, places, proposals, type TaskKey } from '../../features/prototype/protoData';
import { useProtoStore } from '../../features/prototype/protoStore';

const TABS: [string, string][] = [
  ['overview', '개요'],
  ['coordination', '조율'],
  ['places', '여행지'],
  ['schedule', '일정']
];

export function TripWorkspacePage() {
  const { tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const active = TABS.some(([key]) => key === tab) ? tab : 'overview';

  return (
    <main className="page">
      <div className="container">
        <section className="trip-cover">
          <div className="trip-cover-copy">
            <span className="eyebrow" style={{ color: '#ffb39f' }}>CURRENT TRIP · BUSAN</span>
            <h1>은진과 지우의 부산 여행</h1>
            <p>2026. 08. 28 — 08. 30 · 2박 3일</p>
          </div>
          <div className="trip-members">
            <img className="avatar" src={img('photo-1494790108377-be9c29b29330', 120, 80)} alt="은진" />
            <img className="avatar" src={img('photo-1500648767791-00dcc994a43e', 120, 80)} alt="지우" />
            <span>은진 × 지우</span>
          </div>
        </section>
        <nav className="local-nav" aria-label="개별 여행 메뉴">
          {TABS.map(([key, label]) => (
            <button type="button" key={key} className={key === active ? 'active' : ''} onClick={() => navigate(`/trip/${key}`)}>{label}</button>
          ))}
        </nav>
        <div className="workspace">
          {active === 'overview' ? <OverviewTab /> : null}
          {active === 'coordination' ? <CoordinationTab /> : null}
          {active === 'places' ? <PlacesTab /> : null}
          {active === 'schedule' ? <ScheduleTab /> : null}
        </div>
      </div>
    </main>
  );
}

function OverviewTab() {
  const navigate = useNavigate();
  const currentTask = useProtoStore((s) => s.currentTask);
  const setChatOpen = useProtoStore((s) => s.setChatOpen);

  const task: [string, string] =
    currentTask === 'concession' ? ['양보 범위를 작성해 주세요.', 'concession']
      : currentTask === 'rule' ? ['Odd Rule을 선택해 주세요.', 'rule']
      : currentTask === 'proposal' ? ['AI 조율안을 비교해 주세요.', 'coordination']
      : currentTask === 'places' ? ['추천 여행지를 선택해 주세요.', 'places']
      : ['최종 일정을 확인해 주세요.', 'schedule'];

  const phase = ['concession', 'rule', 'proposal'].includes(currentTask) ? 'coordination' : currentTask === 'places' ? 'places' : 'schedule';
  const finished = currentTask === 'done';
  const coordClass = phase === 'coordination' ? 'current' : 'done';
  const placesClass = phase === 'places' ? 'current' : phase === 'schedule' ? 'done' : '';
  const scheduleClass = phase === 'schedule' ? (finished ? 'done' : 'current') : '';
  const isForm = task[1] === 'concession' || task[1] === 'rule';

  return (
    <div className="overview-grid">
      <section>
        <div className="milestones">
          <div className="milestone done"><b>✓</b><strong>동행 성사</strong><span>지우님과 연결</span></div>
          <div className={`milestone ${coordClass}`}>
            <b>{coordClass === 'done' ? '✓' : '2'}</b><strong>조율</strong>
            <span>{phase === 'coordination' ? (currentTask === 'concession' ? '양보 범위' : currentTask === 'rule' ? 'Odd Rule' : '조율안 확인') : '조율 완료'}</span>
          </div>
          <div className={`milestone ${placesClass}`}>
            <b>{placesClass === 'done' ? '✓' : '3'}</b><strong>여행지</strong>
            <span>{placesClass === 'done' ? '선택 완료' : '후보 선택'}</span>
          </div>
          <div className={`milestone ${scheduleClass}`}>
            <b>{scheduleClass === 'done' ? '✓' : '4'}</b><strong>일정</strong>
            <span>{finished ? '승인 완료' : '생성·승인'}</span>
          </div>
        </div>
        <div className="task-panel">
          <div>
            <small>NEXT TASK</small>
            <h2>{task[0]}</h2>
            <p>조사서 원본은 홈의 작성할 조사서에서 한곳에 모아 관리합니다.</p>
          </div>
          <button type="button" className="solid-btn" onClick={() => navigate(isForm ? `/survey/${task[1]}` : `/trip/${task[1]}`)}>계속하기</button>
        </div>
        <div className="section-title" style={{ marginTop: 27 }}><h2>최근 진행 기록</h2></div>
        <div className="activity">
          <div className="activity-row"><time>오늘 20:14</time><div><h3>두 사람의 독립 선택이 모두 도착했습니다.</h3><p>공통 선호 4개와 주요 차이 3개가 확인되었습니다.</p></div></div>
          <div className="activity-row"><time>어제 22:03</time><div><h3>지우님이 영도 장소 카드를 공유했습니다.</h3><p>채팅에서 장소를 확인하고 여행지 후보에 저장했습니다.</p></div></div>
          <div className="activity-row"><time>08. 13</time><div><h3>동행이 성사되었습니다.</h3><p>매칭 요청이 수락되어 부산 여행 공간이 생성되었습니다.</p></div></div>
        </div>
      </section>
      <aside>
        <div className="partner-card">
          <div className="partner-card-head">
            <img className="avatar" src={img('photo-1500648767791-00dcc994a43e', 120, 80)} alt="지우" />
            <div><b>지우 · WCAS</b><p>즉흥적인 도시 탐험가</p></div>
          </div>
          <div className="partner-body">
            <dl><dt>전체 반대도</dt><dd>96%</dd><dt>가장 큰 차이</dt><dd>장소 분위기</dd><dt>최근 활동</dt><dd>오늘 20:14</dd></dl>
            <button type="button" className="line-btn" onClick={() => setChatOpen(true)}>채팅 열기</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CoordinationTab() {
  const navigate = useNavigate();
  const completed = useProtoStore((s) => s.completed);
  const setTask = useProtoStore((s) => s.setTask);
  const toast = useProtoStore((s) => s.toast);
  const c = completed.includes('concession');
  const r = completed.includes('rule');

  return (
    <>
      <div className="coord-layout">
        <section>
          <div className="section-title"><h2>조율 진행</h2><p>결정이 필요한 항목만 문서로 작성합니다.</p></div>
          <div className="coord-list">
            <article className="coord-item done">
              <span className="coord-no">✓</span>
              <div className="coord-copy"><h3>각자 독립 선택</h3><p>상대의 답을 보기 전에 원하는 여행을 각자 제출했습니다.</p></div>
              <div className="coord-action"><small>양쪽 제출 완료</small><button type="button" className="line-btn">결과 보기</button></div>
            </article>
            <article className="coord-item done">
              <span className="coord-no">✓</span>
              <div className="coord-copy"><h3>차이 분석</h3><p>공통 선호 4개 · 조율 가능 2개 · 주요 충돌 1개</p></div>
              <div className="coord-action"><small>분석 완료</small><button type="button" className="line-btn">분석 보기</button></div>
            </article>
            <article className={c ? 'coord-item done' : 'coord-item'}>
              <span className="coord-no">{c ? '✓' : '3'}</span>
              <div className="coord-copy"><h3>양보 범위</h3><p>중요도와 허용 범위를 비공개로 제출합니다.</p></div>
              <div className="coord-action">
                <small>{c ? '양쪽 제출 완료' : '은진 작성 필요'}</small>
                <button type="button" className={c ? 'line-btn' : 'solid-btn'} onClick={() => navigate('/survey/concession')}>{c ? '작성 내용 보기' : '조사서 작성'}</button>
              </div>
            </article>
            <article className={r ? 'coord-item done' : 'coord-item'}>
              <span className="coord-no">{r ? '✓' : '4'}</span>
              <div className="coord-copy"><h3>Odd Rule</h3><p>차이가 생겼을 때 적용할 둘만의 조율 규칙을 정합니다.</p></div>
              <div className="coord-action">
                <small>{r ? '핵심 1개 보장' : '양보 범위 후 작성'}</small>
                <button type="button" className={c && !r ? 'solid-btn' : 'line-btn'} disabled={!c} onClick={() => navigate('/survey/rule')}>{r ? '선택 내용 보기' : '규칙 선택'}</button>
              </div>
            </article>
          </div>
        </section>
        <aside>
          <div className="section-title"><h2>제출 상태</h2></div>
          <div className="coord-side">
            <div className="person-state">
              <img className="avatar" src={img('photo-1494790108377-be9c29b29330', 100, 80)} alt="은진" />
              <div><b>은진</b><p>{c ? 'Odd Rule 단계' : '양보 범위 작성 필요'}</p></div>
              <em>{c ? '완료' : '작성'}</em>
            </div>
            <div className="person-state">
              <img className="avatar" src={img('photo-1500648767791-00dcc994a43e', 100, 80)} alt="지우" />
              <div><b>지우</b><p>{c ? 'Odd Rule 단계' : '양보 범위 제출 완료'}</p></div>
              <em>완료</em>
            </div>
          </div>
        </aside>
      </div>

      <section className="proposal-area">
        <div className="section-title">
          <h2>AI 조율안</h2>
          <p>{r ? '두 사람의 응답과 Odd Rule이 반영되었습니다.' : 'Odd Rule까지 정하면 세 가지 조율안이 열립니다.'}</p>
        </div>
        <div className="proposal-grid">
          {proposals.map(([name, desc, a, b, cc]) => (
            <article className={r ? 'proposal' : 'proposal locked'} key={name}>
              <strong>{r ? '' : '🔒 '}{name}</strong>
              <p>{desc}</p>
              <dl>
                <dt>공통 반영</dt><dd>{r ? `${a}%` : '—'}</dd>
                <dt>은진 반영</dt><dd>{r ? `${b}%` : '—'}</dd>
                <dt>지우 반영</dt><dd>{r ? `${cc}%` : '—'}</dd>
              </dl>
              <button
                type="button"
                className="line-btn"
                style={{ width: '100%', marginTop: 14 }}
                disabled={!r}
                onClick={() => {
                  setTask('places' as TaskKey);
                  navigate('/trip/places');
                  toast(`${name} 조율안을 선택했습니다.`);
                }}
              >
                {r ? '이 안으로 선택' : 'Odd Rule 완료 후 열림'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function PlacesTab() {
  const navigate = useNavigate();
  const currentTask = useProtoStore((s) => s.currentTask);
  const savedPlaces = useProtoStore((s) => s.savedPlaces);
  const togglePlace = useProtoStore((s) => s.togglePlace);
  const setTask = useProtoStore((s) => s.setTask);
  const toast = useProtoStore((s) => s.toast);
  const ready = currentTask === 'places';
  const built = ['approval', 'done'].includes(currentTask);

  return (
    <>
      <div className="section-title"><h2>추천 여행지</h2><p>두 사람 각각의 반영 점수를 함께 확인합니다.</p></div>
      <div className="place-tabs">
        <button type="button" className="on">전체</button>
        <button type="button">공통 선호</button>
        <button type="button">은진 성향</button>
        <button type="button">지우 성향</button>
        <button type="button">반대 성향 체험</button>
      </div>
      <section className="place-grid">
        {places.map(([name, label, photo, a, b, c]) => (
          <article className="place-card" key={name}>
            <img src={img(photo, 600, 80)} alt={name} />
            <div className="place-card-body">
              <small>{label}</small>
              <h3>{name}</h3>
              <p>부산 여행의 조율 결과를 바탕으로 추천된 장소입니다.</p>
              <div className="score-row">
                <div><b>{a}</b><span>은진</span></div>
                <div><b>{b}</b><span>지우</span></div>
                <div><b>{c}</b><span>공통</span></div>
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="line-btn"
                  onClick={() => {
                    togglePlace(name);
                    toast(savedPlaces.includes(name) ? '저장을 취소했습니다.' : '여행지를 저장했습니다.');
                  }}
                >
                  {savedPlaces.includes(name) ? '저장됨' : '저장'}
                </button>
                <button type="button" className="line-btn accent">일정 투표</button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <div className="workflow-cta">
        <p>
          <b>{built ? '공동 일정이 생성되었습니다.' : ready ? '장소 선택을 마쳤나요?' : '먼저 AI 조율안을 선택해 주세요.'}</b>
          {built ? '일정 화면에서 최종 확인과 승인을 이어가세요.' : ready ? '저장·투표 결과를 바탕으로 공동 일정을 만듭니다.' : '조율안이 정해지면 일정 생성 단계가 열립니다.'}
        </p>
        <button
          type="button"
          className={ready ? 'solid-btn' : 'line-btn'}
          disabled={!ready && !built}
          onClick={() => {
            if (ready) { setTask('approval' as TaskKey); toast('공동 일정을 생성했습니다.'); }
            navigate('/trip/schedule');
          }}
        >
          {built ? '생성된 일정 확인' : ready ? '선택한 장소로 일정 만들기' : '조율안 선택 후 열림'}
        </button>
      </div>
    </>
  );
}

function ScheduleTab() {
  const navigate = useNavigate();
  const currentTask = useProtoStore((s) => s.currentTask);
  const approved = useProtoStore((s) => s.approved);
  const ready = ['approval', 'done'].includes(currentTask);

  return (
    <div className="schedule-grid">
      <section>
        <div className="section-title">
          <h2>공동 일정</h2>
          <p>{ready ? '승인과 안전 정보도 일정 안에서 확인합니다.' : '장소 선택을 마치면 이 미리보기로 공동 일정이 생성됩니다.'}</p>
        </div>
        <div className="day-tabs">
          <button type="button" className="on">1일차</button>
          <button type="button">2일차</button>
          <button type="button">3일차</button>
          <button type="button">지도·동선</button>
        </div>
        <div className="day-list">
          <div className="schedule-row"><time>10:30</time><span className="route-dot"></span><div className="schedule-copy"><h3>부산역 도착</h3><p>짐 보관 후 지하철로 이동</p><small>이동 22분 · 예약 불필요</small></div></div>
          <div className="schedule-row"><time>11:30</time><span className="route-dot"></span><div className="schedule-copy"><h3>감천문화마을</h3><p>은진 78점 · 지우 86점</p><small>체류 1시간 30분 · 도보 이동</small></div></div>
          <div className="schedule-row"><time>14:20</time><span className="route-dot"></span><div className="schedule-copy"><h3>부평깡통시장</h3><p>공통 미식 선호가 가장 높게 반영된 장소</p><small>체류 2시간 · 예약 불필요</small></div></div>
          <div className="schedule-row"><time>18:30</time><span className="route-dot"></span><div className="schedule-copy"><h3>광안리 저녁 산책</h3><p>강수 확률에 따라 실내 대체 일정 사용 가능</p><small>체류 1시간 · 날씨 확인 필요</small></div></div>
        </div>
      </section>
      <aside>
        <div className="approval-box">
          <div className="side-head">일정 승인 <span>{approved ? '완료' : ready ? '1 / 2' : '생성 전'}</span></div>
          <div className="approval-body">
            <div className="approval-person">
              <img className="avatar" src={img('photo-1494790108377-be9c29b29330', 90, 80)} alt="은진" />
              <b>은진</b>
              <span style={{ color: approved ? 'var(--orange)' : ready ? 'var(--pink)' : '#999' }}>{approved ? '승인 완료' : ready ? '확인 필요' : '대기'}</span>
            </div>
            <div className="approval-person">
              <img className="avatar" src={img('photo-1500648767791-00dcc994a43e', 90, 80)} alt="지우" />
              <b>지우</b>
              <span style={{ color: ready ? 'var(--orange)' : '#999' }}>{ready ? '승인 완료' : '대기'}</span>
            </div>
            <button
              type="button"
              className={approved ? 'line-btn' : ready ? 'solid-btn' : 'line-btn'}
              style={{ width: '100%', marginTop: 13 }}
              disabled={!ready}
              onClick={() => navigate('/survey/approval')}
            >
              {approved ? '승인 내용 보기' : ready ? '일정 확인·승인' : '일정 생성 후 작성'}
            </button>
          </div>
        </div>
        <div className="weather-card">
          <h3>8월 28일 · 부산</h3>
          <p>오후 소나기 가능성 70% · 최고 29°C</p>
          <div className="safety-list">
            <div className="safety-item"><b>우천 대체 일정 준비됨</b><span>광안리 산책을 F1963 전시 일정으로 변경할 수 있습니다.</span></div>
            <div className="safety-item"><b>현재 재난 특보 없음</b><span>일정과 관련된 안전 정보만 표시합니다.</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
