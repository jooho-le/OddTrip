import { AlertTriangle, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  adminService,
  type ReportStatus,
} from '../api/adminService';
import { LoadState, PageHeading, Panel, StatusPill, TableShell, formatDateTime, tdClass, thClass } from '../ui';
import { useAsync } from '../useAsync';

export function ReportsPage() {
  const [status, setStatus] = useState('pending');
  const [reason, setReason] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);

  const reports = useAsync(
    () => adminService.reports({
      status: status === 'all' ? undefined : status,
      reason: reason === 'all' ? undefined : reason,
      limit: 50,
    }),
    [status, reason],
  );

  return (
    <>
      <PageHeading
        eyebrow="Reports"
        title="신고 처리"
        description="접수된 신고를 검토하고 처리 결과를 기록합니다. 제재 부과는 회원 관리 화면에서 진행합니다."
      />

      {reports.data && reports.data.pending > 0 ? (
        <div className="mb-6 flex items-center gap-3 border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
          <AlertTriangle className="h-5 w-5" />
          처리하지 않은 신고 {reports.data.pending}건
        </div>
      ) : null}

      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold"
          >
            <option value="all">전체 상태</option>
            {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold"
          >
            <option value="all">전체 사유</option>
            {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <LoadState
          loading={reports.loading}
          error={reports.error}
          onRetry={reports.reload}
          empty={!reports.data?.items.length}
          emptyText="조건에 맞는 신고가 없습니다."
        />

        {reports.data?.items.length ? (
          <>
            <p className="mb-3 text-xs font-bold text-slate-400">총 {reports.data.total}건</p>
            <TableShell>
              <thead><tr>{['접수', '사유', '피신고자', '신고자', '누적', '상태', ''].map((x) => <th key={x} className={thClass}>{x}</th>)}</tr></thead>
              <tbody>
                {reports.data.items.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/70">
                    <td className={`${tdClass} text-slate-500`}>{formatDateTime(report.createdAt)}</td>
                    <td className={tdClass}>
                      <p className="font-black">{REPORT_REASON_LABELS[report.reason] ?? report.reason}</p>
                      {report.details ? <p className="mt-1 max-w-xs truncate text-[11px] text-slate-400">{report.details}</p> : null}
                    </td>
                    <td className={tdClass}>
                      <p className="font-black">{report.reportedUser.nickname}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{report.reportedUser.email ?? '-'}</p>
                    </td>
                    <td className={`${tdClass} text-slate-500`}>{report.reporter.nickname}</td>
                    <td className={tdClass}>
                      {/* 반복성은 제재 수위 판단에 바로 필요하므로 목록에서 눈에 띄게 둔다. */}
                      <span className={`px-2 py-1 text-[11px] font-black ${report.reportedUserReportCount > 1 ? 'bg-rose-50 text-rose-700' : 'text-slate-400'}`}>
                        {report.reportedUserReportCount}건
                      </span>
                    </td>
                    <td className={tdClass}><StatusPill value={report.status} /></td>
                    <td className={tdClass}>
                      <button onClick={() => setSelected(report.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black">검토</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </>
        ) : null}
      </Panel>

      {selected ? (
        <ReportDrawer reportId={selected} onClose={() => setSelected(null)} onChanged={() => reports.reload()} />
      ) : null}
    </>
  );
}

function ReportDrawer({ reportId, onClose, onChanged }: { reportId: string; onClose: () => void; onChanged: () => void }) {
  const report = useAsync(() => adminService.report(reportId), [reportId]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const review = async (next: ReportStatus) => {
    if (next === 'pending') return;
    setBusy(true);
    setError('');
    try {
      await adminService.reviewReport(reportId, { status: next, note: note.trim() || undefined });
      report.reload();
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '처리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const data = report.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff2d78]">Report</p>
            <h2 className="mt-1 text-2xl font-black">{data ? REPORT_REASON_LABELS[data.reason] ?? data.reason : '신고 검토'}</h2>
            {data ? <p className="mt-1 text-xs text-slate-400">{formatDateTime(data.createdAt)}</p> : null}
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200"><X className="h-4 w-4" /></button>
        </div>

        <LoadState loading={report.loading} error={report.error} onRetry={report.reload} />

        {data ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-100 p-3">
                <p className="text-[11px] font-bold text-slate-400">피신고자</p>
                <p className="mt-1 font-black">{data.reportedUser.nickname}</p>
                <p className="mt-1 text-[11px] text-slate-400">누적 신고 {data.reportedUserReportCount}건</p>
              </div>
              <div className="border border-slate-100 p-3">
                <p className="text-[11px] font-bold text-slate-400">신고자</p>
                <p className="mt-1 font-black">{data.reporter.nickname}</p>
                <p className="mt-1 text-[11px] text-slate-400">{data.reporter.email ?? '-'}</p>
              </div>
            </div>

            {data.details ? (
              <div className="mt-4 border border-slate-100 p-4">
                <p className="text-[11px] font-bold text-slate-400">신고 내용</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{data.details}</p>
              </div>
            ) : null}

            {data.messageId ? (
              <div className="mt-4 border border-slate-100 p-4">
                <p className="text-[11px] font-bold text-slate-400">신고된 메시지</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {data.messageContent ?? <span className="text-slate-400">삭제된 메시지입니다.</span>}
                </p>
              </div>
            ) : null}

            {data.relatedReports.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-black">같은 회원에 대한 다른 신고 {data.relatedReports.length}건</h3>
                <div className="mt-3 space-y-2">
                  {data.relatedReports.map((row) => (
                    <div key={row.id} className="flex items-center justify-between border border-slate-100 px-3 py-2">
                      <span className="text-xs font-bold">{REPORT_REASON_LABELS[row.reason] ?? row.reason}</span>
                      <span className="flex items-center gap-2 text-[11px] text-slate-400">
                        {formatDateTime(row.createdAt)}
                        <StatusPill value={row.status} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 border border-slate-200 p-4">
              <h3 className="text-sm font-black">검토 결과</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                처리를 마치면 신고자에게 완료 알림이 갑니다. 제재 내용은 신고자에게 전달되지 않습니다.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-400">현재 상태</span>
                <StatusPill value={data.status} />
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder={data.reviewNote ?? '판단 근거를 남겨주세요. 다음 신고를 처리할 때 기준이 됩니다.'}
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
              {data.reviewNote ? <p className="mt-2 text-[11px] text-slate-500">기존 메모: {data.reviewNote}</p> : null}
              {error ? <p className="mt-2 text-[11px] font-bold text-rose-600">{error}</p> : null}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button disabled={busy} onClick={() => void review('reviewing')} className="h-11 rounded-xl border border-slate-200 text-xs font-black disabled:opacity-50">검토 중</button>
                <button disabled={busy} onClick={() => void review('dismissed')} className="h-11 rounded-xl border border-slate-200 text-xs font-black disabled:opacity-50">조치 없음</button>
                <button disabled={busy} onClick={() => void review('resolved')} className="h-11 rounded-xl bg-[#17201f] text-xs font-black text-white disabled:opacity-50">조치함</button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
