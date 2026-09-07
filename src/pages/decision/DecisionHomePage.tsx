import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function DecisionHomePage() {
  const { user, activeTripId, tripHistory, attractions, itinerary, status } = useTripStore();
  const trip = tripHistory.find((item) => item.tripId === activeTripId);
  const partner = trip?.partner;
  const preferenceSaved = status.preferences === 'success';
  const savedCount = attractions.length ? attractions.filter((item) => item.saved).length : (trip?.savedCount ?? 0);
  const itineraryDays = itinerary.length || trip?.itineraryDayCount || 0;

  return (
    <TripWorkspaceShell active="overview">
      <div className="overview-grid">
        <section>
          <div className="milestones">
            <Milestone number="✓" title="동행 성사" detail={trip ? (partner?.nickname ?? '동행') + '님과 연결' : '매칭 요청 필요'} state={trip ? 'done' : ''} />
            <Milestone number={preferenceSaved ? '✓' : '2'} title="조율" detail={preferenceSaved ? '공동 선호 저장' : '공동 선호 작성'} state={preferenceSaved ? 'done' : trip ? 'current' : ''} />
            <Milestone number={savedCount ? '✓' : '3'} title="여행지" detail={String(savedCount) + '곳 저장'} state={savedCount ? 'done' : ''} />
            <Milestone number={itineraryDays ? '✓' : '4'} title="일정" detail={itineraryDays ? String(itineraryDays) + '일 생성' : '생성 전'} state={itineraryDays ? 'done' : ''} />
          </div>
          <div className="task-panel"><div><small>NEXT TASK</small><h2>{trip ? '두 사람의 공동 선호를 정리해 주세요.' : '먼저 동행을 연결해 주세요.'}</h2><p>{trip ? '현재 백엔드는 여행 단위의 공동 선호 저장을 지원합니다.' : '매칭 요청 수락 후 여행과 채팅방이 함께 생성됩니다.'}</p></div><Link className="solid-btn" to={trip ? '/decision/select' : '/matches'}>{trip ? '공동 선호 작성' : '동행 찾기'}</Link></div>
          <div className="section-title" style={{ marginTop: 27 }}><h2>진행 상태</h2><p>현재 API 데이터만 표시합니다.</p></div>
          <div className="activity">
            <StatusRow label="여행 공간" title={trip ? '여행이 연결되어 있습니다.' : '여행 공간이 아직 없습니다.'} copy={trip ? (trip.region ?? '지역 미정') + ' · ' + trip.status : '동행 요청 수락이 필요합니다.'} />
            <StatusRow label="공동 선호" title={preferenceSaved ? '이 세션에서 저장되었습니다.' : '작성 또는 불러오기 전입니다.'} copy="개인별 제출 상태는 백엔드 계약이 없어 판단하지 않습니다." />
            <StatusRow label="여행 데이터" title={'저장 장소 ' + String(savedCount) + '곳 · 일정 ' + String(itineraryDays) + '일'} copy="장소와 일정은 여행 API에서 가져옵니다." />
          </div>
        </section>
        <aside>
          <div className="partner-card"><div className="partner-card-head">{partner?.avatarUrl ? <img className="avatar" src={partner.avatarUrl} alt="" /> : <span className="avatar" style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#202124', color: '#fff', fontWeight: 800 }}>{partner?.nickname?.slice(0, 1) ?? '?'}</span>}<div><b>{partner?.nickname ?? '동행 미연결'} · {partner?.ttiCode ?? 'TTI 미제공'}</b><p>{partner ? '현재 여행의 동행' : '매칭 요청을 먼저 완료하세요.'}</p></div></div><div className="partner-body"><dl><dt>나의 TTI</dt><dd>{user?.ttiCode ?? '미완료'}</dd><dt>여행 상태</dt><dd>{trip?.status ?? '없음'}</dd><dt>일정 일수</dt><dd>{trip?.itineraryDayCount ?? 0}일</dd></dl><Link className="line-btn" style={{ display: 'block', textAlign: 'center' }} to="/chat">채팅 열기</Link></div></div>
          <div className="backend-wait" style={{ marginTop: 15 }}><h3>완료로 표시하지 않는 단계</h3><p>개인 양보안, Odd Rule 합의, AI 조율안 확정, 양쪽 일정 승인은 저장 API가 준비될 때까지 연결 대기로 남습니다.</p></div>
        </aside>
      </div>
    </TripWorkspaceShell>
  );
}

function Milestone({ number, title, detail, state }: { number: string; title: string; detail: string; state: string }) {
  return <div className={'milestone ' + state}><b>{number}</b><strong>{title}</strong><span>{detail}</span></div>;
}

function StatusRow({ label, title, copy }: { label: string; title: string; copy: string }) {
  return <div className="activity-row"><time>{label}</time><div><h3>{title}</h3><p>{copy}</p></div></div>;
}
