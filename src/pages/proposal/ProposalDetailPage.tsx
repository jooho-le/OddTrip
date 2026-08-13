import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Sparkles } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyView } from '../../shared/ui/StateView';
import { useToast } from '../../shared/ui/Toast';
import { PROPOSAL_VARIANTS, buildProposalItems, summarizeProposal, type ProposalVariantId } from './proposalVariants';

export function ProposalDetailPage() {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();
  const showToast = useToast((state) => state.show);
  const { attractions, activeTripId, loadAttractions, regenerateItinerary } = useTripStore();

  useEffect(() => {
    if (!attractions.length && activeTripId) void loadAttractions();
  }, [attractions.length, activeTripId, loadAttractions]);

  const variant = PROPOSAL_VARIANTS.find((item) => item.id === variantId);
  if (!variant) return <Navigate to="/proposal" replace />;

  const items = buildProposalItems(attractions, variant.id as ProposalVariantId, 10);
  const summary = summarizeProposal(items);

  const proceed = async () => {
    await regenerateItinerary();
    showToast(`'${variant.title}' 안을 참고해서 일정을 새로 만들었어요.`);
    navigate('/itinerary');
  };

  return (
    <div className="page-canvas space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-ink p-7 text-white md:p-10">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-4 w-4 text-accent" />
          {variant.title}
        </p>
        <h1 className="relative mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] md:text-6xl">{variant.description}</h1>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Badge className="bg-white/14 text-white">{summary.count}곳</Badge>
          <Badge className="bg-white/14 text-white">실내 {summary.indoorRatio}%</Badge>
          {summary.avgHidden != null ? <Badge className="bg-white/14 text-white">숨은명소 평균 {summary.avgHidden}점</Badge> : null}
        </div>
      </section>

      {!items.length ? <EmptyView label="아직 추천 관광지가 없어요. 관광지 페이지에서 먼저 추천을 받아보세요." /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Link key={item.id} to={`/attractions/${item.id}`}>
            <Card className="hover-lift flex gap-3">
              <img src={item.imageUrl ?? 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=300&q=80'} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-accent">{item.category}</p>
                <h2 className="truncate text-lg font-black text-ink">{item.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted">{item.reason ?? item.addr1 ?? item.category}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-black text-ink">이 안 공유하기</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="ghost" disabled className="cursor-not-allowed opacity-50" title="채팅 연동 준비 중">채팅으로 공유 (준비 중)</Button>
          <Button variant="ghost" disabled className="cursor-not-allowed opacity-50" title="투표 기능 준비 중">투표하기 (준비 중)</Button>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/proposal"><Button variant="secondary">다른 안 보기</Button></Link>
        <Button icon={<CalendarDays className="h-4 w-4" />} onClick={() => void proceed()}>이 안 참고해서 일정 만들기</Button>
      </div>
    </div>
  );
}
