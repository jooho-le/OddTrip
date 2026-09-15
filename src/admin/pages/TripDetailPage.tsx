import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, MapPinned, Route, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { adminService } from '../api/adminService';
import { LoadState, Panel, StatusPill, formatDate, formatDateTime } from '../ui';
import { useAsync } from '../useAsync';

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[.06] bg-white p-5">
      <span className="text-[#ff5a47]">{icon}</span>
      <p className="mt-5 text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

export function TripDetailPage() {
  const { id = '' } = useParams();
  const trip = useAsync(() => adminService.trip(id), [id]);

  return (
    <>
      <Link to="/admin/trips" className="mb-5 inline-flex items-center gap-2 text-xs font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" />여행 목록
      </Link>

      <LoadState loading={trip.loading} error={trip.error} onRetry={trip.reload} />

      {trip.data ? (
        <>
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <StatusPill value={trip.data.status} />
                <span className="text-xs font-bold text-slate-400">{trip.data.id}</span>
              </div>
              <h1 className="text-3xl font-black tracking-[-.04em]">{trip.data.title ?? '제목 미정'}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {trip.data.travelers.length ? `${trip.data.travelers.join('님 · ')}님이 함께 만드는 여행입니다.` : '참여자 정보가 없습니다.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Info icon={<Users />} label="참여자" value={trip.data.travelers.join(', ') || '-'} />
            <Info icon={<MapPin />} label="지역" value={trip.data.region ?? '미정'} />
            <Info icon={<CalendarDays />} label="기간" value={`${formatDate(trip.data.startDate)} ~ ${formatDate(trip.data.endDate)}`} />
            <Info icon={<Route />} label="일정 항목" value={`${trip.data.itineraryItems}개`} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel>
              <h2 className="text-lg font-black">추천 관광지</h2>
              <p className="mt-4 flex items-center gap-2 text-sm">
                <MapPinned className="h-4 w-4 text-[#ff5a47]" />
                <span className="font-black">{trip.data.attractions}곳</span>
                <span className="text-slate-400">이 이 여행에 추천되어 있습니다.</span>
              </p>
            </Panel>
            <Panel>
              <h2 className="text-lg font-black">생성 정보</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400">생성 시각</span>
                  <span className="font-black">{formatDateTime(trip.data.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">상태</span>
                  <StatusPill value={trip.data.status} />
                </div>
              </div>
            </Panel>
          </div>

          {/* 공동 선호 상세와 생성 이력은 조회 API가 없다. 그럴듯한 값을 채워 넣으면
              운영 화면에서 실제 기록으로 읽히므로 없다고 밝힌다. */}
          <p className="mt-6 border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500">
            공동 선호 상세와 AI 생성 이력은 조회 API가 아직 없어 표시하지 않습니다.
          </p>
        </>
      ) : null}
    </>
  );
}
