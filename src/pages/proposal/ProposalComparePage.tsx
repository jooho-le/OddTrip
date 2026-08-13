import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal } from './proposalVariants';

export function ProposalComparePage() {
  const { attractions, preferences } = useTripStore();

  const rows = PROPOSAL_VARIANTS.map((variant) => ({
    variant,
    summary: summarizeProposal(buildProposalItems(attractions, variant.id)),
  }));

  return (
    <div className="page-canvas space-y-5">
      <header>
        <p className="eyebrow">조율안 비교</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-black leading-snug tracking-[-0.02em] text-ink md:text-3xl">세 가지 안을 나란히 비교해보세요.</h1>
      </header>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-black uppercase tracking-wide text-muted">
              <th className="p-4">조율안</th>
              <th className="p-4">장소 수</th>
              <th className="p-4">실내 비중</th>
              <th className="p-4">평균 숨은명소 점수</th>
              <th className="p-4">평균 혼잡도</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ variant, summary }) => (
              <tr key={variant.id} className="border-b border-line last:border-0">
                <td className="p-4 font-black text-ink">{variant.title}</td>
                <td className="p-4 font-bold text-ink">{summary.count}곳</td>
                <td className="p-4 font-bold text-ink">{summary.indoorRatio}%</td>
                <td className="p-4 font-bold text-ink">{summary.avgHidden ?? '-'}</td>
                <td className="p-4 font-bold text-ink">{summary.avgCongestion ?? '-'}</td>
                <td className="p-4">
                  <Link to={`/proposal/${variant.id}`}><Button variant="secondary">보기</Button></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-2 text-sm font-semibold text-ink">
        <p className="text-xs font-black text-muted">현재 공동 선호 기준 (Step 1에서 저장된 값)</p>
        <p>일정 강도 {preferences.pace}% · 예산 사용 {preferences.budget}%</p>
      </Card>

      <Link to="/proposal"><Button icon={<ArrowRight className="h-4 w-4 rotate-180" />} variant="secondary">목록으로 돌아가기</Button></Link>
    </div>
  );
}
