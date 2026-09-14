import { ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../api/adminService';
import { LoadState, PageHeading, Panel, StatusPill, TableShell, formatDate, tdClass, thClass } from '../ui';
import { useAsync } from '../useAsync';

export function TripsPage() {
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('all');

  const trips = useAsync(
    () => adminService.trips({
      q: applied || undefined,
      status: status === 'all' ? undefined : status,
      limit: 50,
    }),
    [applied, status],
  );

  return (
    <>
      <PageHeading eyebrow="Trips" title="여행 관리" description="생성된 공동 여행을 조회합니다. 여행 내용의 수정과 삭제는 이 화면에서 제공하지 않습니다." />
      <Panel>
        <form
          className="mb-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => { event.preventDefault(); setApplied(query); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-[#ff5a47]"
              placeholder="여행명, 여행 ID, 지역 검색"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold"
          >
            <option value="all">전체 상태</option>
            <option value="planning">계획 중</option>
            <option value="confirmed">확정</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소</option>
          </select>
          <button className="h-12 rounded-2xl bg-[#17201f] px-6 text-xs font-black text-white">검색</button>
        </form>

        <LoadState
          loading={trips.loading}
          error={trips.error}
          onRetry={trips.reload}
          empty={!trips.data?.items.length}
          emptyText="조건에 맞는 여행이 없습니다."
        />

        {trips.data?.items.length ? (
          <>
            <p className="mb-3 text-xs font-bold text-slate-400">총 {trips.data.total}건</p>
            <TableShell>
              <thead><tr>{['여행', '참여자', '기간', '추천지', '일정', '상태', ''].map((x) => <th key={x} className={thClass}>{x}</th>)}</tr></thead>
              <tbody>
                {trips.data.items.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50/70">
                    <td className={tdClass}>
                      <p className="font-black">{trip.title ?? '제목 미정'}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{trip.id.slice(0, 8)} · {trip.region ?? '지역 미정'}</p>
                    </td>
                    <td className={tdClass}>
                      <div className="flex -space-x-2">
                        {trip.travelers.map((name, index) => (
                          <span key={`${name}-${index}`} title={name} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-black">{name.slice(0, 1)}</span>
                        ))}
                      </div>
                    </td>
                    <td className={`${tdClass} text-slate-500`}>{formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}</td>
                    <td className={`${tdClass} font-black`}>{trip.attractions}곳</td>
                    <td className={`${tdClass} font-black`}>{trip.itineraryItems ? `${trip.itineraryItems}개` : '-'}</td>
                    <td className={tdClass}><StatusPill value={trip.status} /></td>
                    <td className={tdClass}>
                      <Link to={`/admin/trips/${trip.id}`} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200"><ChevronRight className="h-4 w-4" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </>
        ) : null}
      </Panel>
    </>
  );
}
