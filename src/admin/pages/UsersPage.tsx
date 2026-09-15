import { Search, ShieldAlert, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  REPORT_REASON_LABELS,
  SANCTION_LABELS,
  TIMED_SANCTIONS,
  adminService,
  type AdminSanction,
  type SanctionType,
} from '../api/adminService';
import { LoadState, PageHeading, Pagination, Panel, StatusPill, TableShell, formatDate, formatDateTime, tdClass, thClass } from '../ui';
import { useAsync } from '../useAsync';

const CONSENT_LABELS: Record<string, string> = {
  terms: '서비스 이용약관',
  community: '커뮤니티 운영정책',
  adult: '만 19세 이상',
  privacy_notice: '개인정보 처리 안내',
  marketing: '이벤트·혜택 수신',
  matching_profile: '매칭 프로필 공개',
  safety_guide: '안전 이용수칙',
};

export function UsersPage() {
  const pageSize = 20;
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const users = useAsync(
    () => adminService.users({
      q: applied || undefined,
      status: status === 'all' ? undefined : status,
      limit: pageSize,
      offset,
    }),
    [applied, status, offset],
  );

  return (
    <>
      <PageHeading eyebrow="Members" title="회원 관리" description="가입 회원을 조회하고 약관 위반에 대한 제재를 부과합니다." />
      <Panel>
        <form
          className="mb-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event: FormEvent) => { event.preventDefault(); setOffset(0); setApplied(query); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-[#ff5a47]"
              placeholder="닉네임, 이메일, TTI 검색"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value); setOffset(0); }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold"
            >
              <option value="all">전체 상태</option>
              <option value="active">정상</option>
              <option value="suspended">정지</option>
              <option value="withdrawn">탈퇴</option>
            </select>
          </div>
          <button className="h-12 rounded-2xl bg-[#17201f] px-6 text-xs font-black text-white">검색</button>
        </form>

        <LoadState
          loading={users.loading}
          error={users.error}
          onRetry={users.reload}
          empty={!users.data?.items.length}
          emptyText="조건에 맞는 회원이 없습니다."
        />

        {users.data?.items.length ? (
          <>
            <p className="mb-3 text-xs font-bold text-slate-400">총 {users.data.total}명</p>
            <TableShell>
              <thead><tr>{['회원', '지역', 'TTI', '가입일', '매칭', '여행', '상태', ''].map((x) => <th key={x} className={thClass}>{x}</th>)}</tr></thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className={tdClass}>
                      <p className="font-black">{user.nickname} {user.role === 'admin' ? <span className="ml-1 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] text-white">ADMIN</span> : null}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{user.email ?? '이메일 없음'}</p>
                    </td>
                    <td className={`${tdClass} text-slate-500`}>{user.region ?? '-'}</td>
                    <td className={`${tdClass} font-black`}>{user.ttiCode ?? '-'}</td>
                    <td className={`${tdClass} text-slate-500`}>{formatDate(user.joinedAt)}</td>
                    <td className={`${tdClass} font-black`}>{user.matches}</td>
                    <td className={`${tdClass} font-black`}>{user.trips}</td>
                    <td className={tdClass}><StatusPill value={user.status} /></td>
                    <td className={tdClass}>
                      <button
                        onClick={() => setSelected(user.id)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination offset={offset} limit={pageSize} total={users.data.total} onChange={setOffset} />
          </>
        ) : null}
      </Panel>

      {selected ? (
        <UserDetailDrawer
          userId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => users.reload()}
        />
      ) : null}
    </>
  );
}

function UserDetailDrawer({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const user = useAsync(() => adminService.user(userId), [userId]);
  const sanctions = useAsync(() => adminService.sanctions(userId), [userId]);

  const refresh = () => { user.reload(); sanctions.reload(); onChanged(); };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff2d78]">Member</p>
            <h2 className="mt-1 text-2xl font-black">{user.data?.nickname ?? '회원 상세'}</h2>
            <p className="mt-1 text-xs text-slate-400">{user.data?.email ?? '이메일 없음'}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200"><X className="h-4 w-4" /></button>
        </div>

        <LoadState loading={user.loading} error={user.error} onRetry={user.reload} />

        {user.data ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['상태', <StatusPill key="s" value={user.data.status} />],
                ['가입일', formatDate(user.data.joinedAt)],
                ['지역', user.data.region ?? '-'],
                ['TTI', user.data.ttiCode ?? '미완료'],
                ['매칭', `${user.data.matches}건`],
                ['여행', `${user.data.trips}건`],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-slate-100 p-3">
                  <p className="text-[11px] font-bold text-slate-400">{label}</p>
                  <p className="mt-1 font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black">동의 현황</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(user.data.consents).map(([key, accepted]) => (
                  <span key={key} className={`px-2.5 py-1 text-[10px] font-black ${accepted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {CONSENT_LABELS[key] ?? key}
                  </span>
                ))}
              </div>
            </div>

            {user.data.role === 'admin' ? (
              <p className="mt-6 border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500">
                관리자 계정은 제재할 수 없습니다.
              </p>
            ) : user.data.status === 'withdrawn' ? (
              <p className="mt-6 border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500">
                탈퇴한 계정입니다. {formatDateTime(user.data.withdrawnAt)}
              </p>
            ) : (
              <SanctionForm userId={userId} onDone={refresh} />
            )}

            <div className="mt-8">
              <h3 className="text-sm font-black">제재 이력</h3>
              <LoadState
                loading={sanctions.loading}
                error={sanctions.error}
                onRetry={sanctions.reload}
                empty={!sanctions.data?.items.length}
                emptyText="제재 이력이 없습니다."
              />
              <div className="mt-3 space-y-3">
                {sanctions.data?.items.map((row) => (
                  <SanctionRow key={row.id} sanction={row} onReleased={refresh} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SanctionRow({ sanction, onReleased }: { sanction: AdminSanction; onReleased: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // 탈퇴는 복구 경로가 없고, 경고는 막고 있는 것이 없어 해제 대상이 아니다.
  const releasable = sanction.active && sanction.type !== 'withdrawal';

  const release = async () => {
    if (!window.confirm(`${SANCTION_LABELS[sanction.type]} 제재를 해제할까요? 당사자의 이용 제한이 즉시 변경됩니다.`)) return;
    setBusy(true);
    setError('');
    try {
      await adminService.releaseSanction(sanction.id);
      onReleased();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '해제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">
            {SANCTION_LABELS[sanction.type]}
            {sanction.active ? <span className="ml-2 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">적용 중</span> : null}
            {sanction.releasedAt ? <span className="ml-2 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">해제됨</span> : null}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {REPORT_REASON_LABELS[sanction.reason] ?? sanction.reason} · {formatDateTime(sanction.createdAt)}
            {sanction.expiresAt ? ` · ${formatDate(sanction.expiresAt)}까지` : ''}
          </p>
          {sanction.note ? <p className="mt-2 text-xs text-slate-600">{sanction.note}</p> : null}
        </div>
        {releasable ? (
          <button onClick={() => void release()} disabled={busy} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black disabled:opacity-50">
            {busy ? '해제 중…' : '해제'}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[11px] font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}

function SanctionForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [type, setType] = useState<SanctionType>('warning');
  const [reason, setReason] = useState('harassment');
  const [note, setNote] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const needsDays = TIMED_SANCTIONS.includes(type);
  const irreversible = type === 'withdrawal';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    setError('');
    try {
      await adminService.issueSanction(userId, {
        type,
        reason,
        note: note.trim() || undefined,
        days: needsDays ? days : undefined,
      });
      setNote('');
      setConfirming(false);
      onDone();
    } catch (reason_) {
      setError(reason_ instanceof Error ? reason_.message : '제재를 부과하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 border border-slate-200 p-4">
      <h3 className="flex items-center gap-2 text-sm font-black"><ShieldAlert className="h-4 w-4 text-[#ff5a47]" />제재 부과</h3>
      <p className="mt-1 text-[11px] text-slate-400">부과하면 당사자에게 사유와 기간, 이의제기 방법이 통지됩니다.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold text-slate-400">조치</span>
          <select
            value={type}
            onChange={(event) => { setType(event.target.value as SanctionType); setConfirming(false); }}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
          >
            {Object.entries(SANCTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold text-slate-400">사유</span>
          <select
            value={reason}
            onChange={(event) => { setReason(event.target.value); setConfirming(false); }}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
          >
            {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {needsDays ? (
          <label className="block">
            <span className="text-[11px] font-bold text-slate-400">기간(일)</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(event) => { setDays(Number(event.target.value)); setConfirming(false); }}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
            />
          </label>
        ) : null}
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold text-slate-400">사유 상세 (당사자에게 전달됩니다)</span>
          <textarea
            value={note}
            onChange={(event) => { setNote(event.target.value); setConfirming(false); }}
            maxLength={2000}
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-[11px] font-bold text-rose-600">{error}</p> : null}
      {confirming ? (
        <p className="mt-3 bg-rose-50 p-3 text-[11px] font-bold text-rose-700">
          {irreversible
            ? '강제 탈퇴는 되돌릴 수 없습니다. 계정의 식별정보가 즉시 삭제됩니다. 한 번 더 누르면 실행됩니다.'
            : `${SANCTION_LABELS[type]} 제재가 당사자 계정에 즉시 적용됩니다. 선택한 조치와 사유를 확인한 뒤 한 번 더 눌러주세요.`}
        </p>
      ) : null}

      <button
        disabled={busy}
        className={`mt-4 h-11 w-full rounded-xl text-xs font-black text-white disabled:opacity-50 ${confirming ? 'bg-rose-600' : 'bg-[#17201f]'}`}
      >
        {busy ? '처리 중…' : confirming ? (irreversible ? '강제 탈퇴 실행' : '제재 적용 확인') : '제재 부과'}
      </button>
    </form>
  );
}
