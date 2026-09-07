import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { sourceLabel } from '../../shared/lib/sourceLabel';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function AttractionDetailPage() {
  const { id = '' } = useParams();
  const { attractions, loadAttractions, toggleAttraction, status, error } = useTripStore();

  useEffect(() => { if (!attractions.length) void loadAttractions(); }, [attractions.length, loadAttractions]);

  const item = attractions.find((attraction) => attraction.id === id);
  if (!item) {
    return (
      <TripWorkspaceShell active="places">
        <div className="empty-state">
          <strong>{status.attractions === 'loading' ? '장소를 불러오고 있습니다.' : '장소를 찾을 수 없습니다.'}</strong>
          <p>{error ?? '추천 목록으로 돌아가 다시 선택해주세요.'}</p>
          <Link className="solid-btn" to="/attractions">여행지 목록</Link>
        </div>
      </TripWorkspaceShell>
    );
  }

  const homepage = safeExternalUrl(item.homepage);

  return (
    <TripWorkspaceShell active="places">
      <header className="page-heading">
        <div><Link className="text-btn" to="/attractions">‹ 여행지 목록</Link><h1 style={{ marginTop: 9 }}>{item.name}</h1></div>
        <p>{item.category}</p>
      </header>
      <section className="match-detail">
        <article className="match-profile">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="place-card-image place-card-placeholder" style={{ height: 300 }}>이미지 미제공</div>}
          <div className="match-profile-body">
            <span className="source-label">{sourceLabel(item.source)}</span>
            <h2>{item.name}</h2>
            <p>{item.addr1 ?? '주소 미제공'} {item.addr2 ?? ''}<br />{item.tel ?? '전화번호 미제공'}</p>
            <div className="button-row" style={{ marginTop: 16 }}>
              <button className="line-btn" onClick={() => void toggleAttraction(item.id, 'excluded')}>{item.excluded ? '제외 취소' : '제외'}</button>
              <button className="solid-btn" onClick={() => void toggleAttraction(item.id, 'saved')}>{item.saved ? '저장 취소' : '여행에 저장'}</button>
            </div>
          </div>
        </article>
        <div>
          <div className="section-title"><h2>장소 정보</h2><p>제공된 값만 표시합니다.</p></div>
          <div className="axis-list">
            <Info label="소개" value={item.description ?? item.reason ?? '설명 미제공'} />
            <Info label="운영 시간" value={item.openingHours ? JSON.stringify(item.openingHours) : '정보 미제공'} />
            <Info label="휴무일" value={item.closedDays?.join(', ') || '정보 미제공'} />
            <Info label="위치 좌표" value={item.mapY && item.mapX ? item.mapY + ', ' + item.mapX : '정보 미제공'} />
          </div>
          {homepage ? <a className="line-btn accent" style={{ display: 'inline-block', marginTop: 18 }} href={homepage} target="_blank" rel="noreferrer">제공된 홈페이지 열기</a> : null}
          <div className="backend-wait" style={{ marginTop: 18 }}><h3>장소 개인 투표</h3><p>여행 단위 저장·제외는 지원하지만 사용자별 찬반 투표 데이터는 저장할 수 없습니다.</p></div>
        </div>
      </section>
    </TripWorkspaceShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="axis-row"><b>{label}</b><div style={{ color: '#666', fontSize: 11, lineHeight: 1.6 }}>{value}</div><em>API</em></div>;
}

function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
