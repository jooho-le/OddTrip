import { ArrowUpRight, BrainCircuit, HeartHandshake, MapPinned, Plane, ShieldAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService } from '../api/adminService';
import { LoadState, Panel, StatusPill, formatDate } from '../ui';
import { useAsync } from '../useAsync';
import type { ReactNode } from 'react';

function Metric({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: 'dark' | 'coral' }) {
  const skin = tone === 'dark' ? 'bg-[#17201f] text-white' : tone === 'coral' ? 'bg-[#ff5a47] text-white' : 'bg-white';
  return (
    <div className={`border border-[#e1e1e1] p-5 ${skin}`}>
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-black/10">{icon}</div>
      <p className={`text-[11px] font-black ${tone ? 'text-white/70' : 'text-slate-400'}`}>{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
      {sub ? <p className={`mt-1 text-[11px] font-bold ${tone ? 'text-white/60' : 'text-slate-400'}`}>{sub}</p> : null}
    </div>
  );
}

export function DashboardPage() {
  const stats = useAsync(() => adminService.stats(), []);
  const users = useAsync(() => adminService.users({ limit: 4 }), []);
  const trips = useAsync(() => adminService.trips({ limit: 4 }), []);
  const reports = useAsync(() => adminService.reports({ status: 'pending', limit: 1 }), []);

  const s = stats.data;
  // 분포는 상위 4개만 보여주고 비율은 진단 완료자 기준으로 낸다.
  const distribution = s?.ttiDistribution.slice(0, 4) ?? [];
  const distributionTotal = s?.ttiDistribution.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const colors = ['#ff5a47', '#17201f', '#4f46e5', '#0d9488'];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users />} label="전체 회원" value={s ? s.totalUsers.toLocaleString() : '—'} sub={s ? `정상 ${s.activeUsers} · 탈퇴 ${s.withdrawnUsers}` : undefined} tone="dark" />
        <Metric icon={<HeartHandshake />} label="매칭 성사율" value={s ? `${s.matchAcceptanceRate}%` : '—'} sub={s ? `누적 매칭 ${s.totalMatches}건` : undefined} tone="coral" />
        <Metric icon={<Plane />} label="진행 중 여행" value={s ? String(s.activeTrips) : '—'} sub={s ? `전체 ${s.totalTrips}건` : undefined} />
        <Metric icon={<BrainCircuit />} label="TTI 완료율" value={s ? `${s.ttiCompletionRate}%` : '—'} sub="정상 회원 기준" />
      </div>
      <LoadState loading={stats.loading} error={stats.error} onRetry={stats.reload} />

      {reports.data && reports.data.pending > 0 ? (
        <Link to="/admin/reports" className="mt-6 flex items-center justify-between border border-rose-200 bg-rose-50 p-5 hover:bg-rose-100">
          <span className="flex items-center gap-3 text-sm font-black text-rose-700">
            <ShieldAlert className="h-5 w-5" />
            처리하지 않은 신고가 {reports.data.pending}건 있습니다.
          </span>
          <ArrowUpRight className="h-4 w-4 text-rose-700" />
        </Link>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-black">최근 가입 회원</p>
              <p className="mt-1 text-xs text-slate-400">가입 역순</p>
            </div>
            <Link to="/admin/users" className="text-xs font-black text-[#ff5a47]">전체 보기 →</Link>
          </div>
          <div className="mt-4">
            <LoadState loading={users.loading} error={users.error} onRetry={users.reload} empty={!users.data?.items.length} emptyText="가입한 회원이 없습니다." />
            {users.data?.items.map((user) => (
              <div key={user.id} className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-xs font-black">{user.nickname.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-black">{user.nickname} {user.ttiCode ? <span className="ml-1 text-[10px] text-[#ff5a47]">{user.ttiCode}</span> : null}</p>
                  <p className="truncate text-xs text-slate-400">{user.email ?? '이메일 없음'} · {formatDate(user.joinedAt)}</p>
                </div>
                <StatusPill value={user.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-black">TTI 유형 분포</p>
              <p className="mt-1 text-xs text-slate-400">상위 4개 유형</p>
            </div>
            <BrainCircuit className="h-5 w-5 text-[#ff5a47]" />
          </div>
          <div className="mt-8 space-y-5">
            <LoadState loading={stats.loading} error="" empty={!distribution.length} emptyText="진단을 완료한 회원이 없습니다." />
            {distribution.map((row, index) => {
              const percent = distributionTotal ? Math.round((row.count / distributionTotal) * 100) : 0;
              return (
                <div key={row.code}>
                  <div className="mb-2 flex justify-between text-xs font-black"><span>{row.code}</span><span>{percent}% · {row.count}명</span></div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, background: colors[index] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/admin/tti" className="mt-7 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-xs font-black hover:bg-slate-100">전체 유형 보기 <ArrowUpRight className="h-4 w-4" /></Link>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-black">최근 생성 여행</p>
              <p className="mt-1 text-xs text-slate-400">생성 역순</p>
            </div>
            <Link to="/admin/trips" className="text-xs font-black text-[#ff5a47]">전체 보기 →</Link>
          </div>
          <div className="mt-4">
            <LoadState loading={trips.loading} error={trips.error} onRetry={trips.reload} empty={!trips.data?.items.length} emptyText="생성된 여행이 없습니다." />
            {trips.data?.items.map((trip) => (
              <Link to={`/admin/trips/${trip.id}`} key={trip.id} className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-orange-600"><MapPinned className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{trip.title ?? '제목 미정'}</p>
                  <p className="text-xs text-slate-400">{trip.travelers.join(' · ') || '참여자 없음'} · {formatDate(trip.startDate)}</p>
                </div>
                <StatusPill value={trip.status} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
