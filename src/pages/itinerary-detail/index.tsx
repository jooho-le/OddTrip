import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { TripWorkspaceShell } from '../../widgets/trip/TripWorkspaceShell';

export function ItineraryDetailPage() {
  const { id = '' } = useParams();
  const { itinerary, loadItinerary, status } = useTripStore();
  useEffect(() => { if (!itinerary.length) void loadItinerary(); }, [itinerary.length, loadItinerary]);
  const item = itinerary.flatMap((entry) => entry.items).find((entry) => entry.id === id);
  if (!item) return <TripWorkspaceShell active="schedule"><div className="empty-state"><strong>{status.itinerary === 'loading' ? '일정을 불러오고 있습니다.' : '일정 항목을 찾을 수 없습니다.'}</strong><p>공동 일정으로 돌아가 다시 선택해주세요.</p><Link className="solid-btn" to="/itinerary">일정으로</Link></div></TripWorkspaceShell>;
  return <TripWorkspaceShell active="schedule"><header className="page-heading"><div><Link className="text-btn" to="/itinerary">‹ 공동 일정</Link><h1 style={{ marginTop: 9 }}>{item.title}</h1></div><p>{item.time} · {item.type}</p></header><div className="match-detail"><article className="match-profile"><div style={{ height: 250, display: 'grid', placeItems: 'center', background: '#242424', color: '#fff' }}><div style={{ textAlign: 'center' }}><span className="eyebrow" style={{ color: '#ffb39f' }}>SCHEDULE ITEM</span><h2 style={{ margin: '12px 0 0', fontSize: 48 }}>{item.time}</h2></div></div><div className="match-profile-body"><span className="status">{item.type}</span><h2>{item.location || '위치 미제공'}</h2><p>{item.address ?? '주소 미제공'}<br />{item.duration}{item.moveTime ? ' · 이동 ' + item.moveTime : ''}</p></div></article><div><div className="section-title"><h2>일정 설명</h2><p>일정 API 제공 값</p></div><div className="detail-note"><h3>{item.description || '설명 미제공'}</h3><p>{item.aiReason || '추천 근거 미제공'}</p><span className="source-label" style={{ marginTop: 12 }}>ODDTRIP 일정 API</span></div><div className="backend-wait" style={{ marginTop: 18 }}><h3>개별 항목 수정</h3><p>일정 항목의 시간·장소를 수정하거나 동행에게 변경 요청하는 API는 아직 없습니다.</p></div></div></div></TripWorkspaceShell>;
}
