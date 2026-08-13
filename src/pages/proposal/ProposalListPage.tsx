import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { LoadingView } from '../../shared/ui/StateView';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal } from './proposalVariants';

export function ProposalListPage() {
  const { attractions, loadAttractions, activeTripId, status } = useTripStore();

  useEffect(() => {
    if (!attractions.length && activeTripId) void loadAttractions();
  }, [attractions.length, activeTripId, loadAttractions]);

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-4 w-4 text-accent" />
          AI Proposal
        </p>
        <h1 className="relative mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] md:text-6xl">세 가지 방식으로 다시 짜본 여행이에요.</h1>
      </section>

      <Card className="flex items-start gap-3 border-accent/20 bg-accent-soft text-sm font-bold text-accent">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        지금은 추천 관광지 목록을 기준으로 세 가지 방식으로 다시 정렬한 미리보기예요. 사용자별 반영률을 정확히 계산하는 AI 생성 API는 아직 백엔드에 없어요.
      </Card>

      {status.attractions === 'loading' ? <LoadingView label="추천 관광지를 불러오는 중입니다" /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {PROPOSAL_VARIANTS.map((variant) => {
          const items = buildProposalItems(attractions, variant.id);
          const summary = summarizeProposal(items);
          return (
            <Card key={variant.id} className="flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-black text-ink">{variant.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">{variant.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{summary.count}곳</Badge>
                <Badge>실내 {summary.indoorRatio}%</Badge>
              </div>
              <Link to={`/proposal/${variant.id}`} className="mt-auto">
                <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full">자세히 보기</Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <Link to="/proposal/compare"><Button variant="secondary" className="w-full sm:w-auto">세 가지 안 비교하기</Button></Link>
    </div>
  );
}
