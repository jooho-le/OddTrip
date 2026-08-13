import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, MessageCircle, Pencil } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useDecisionStore } from '../../entities/decision/model/decisionStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

export function WaitingPage() {
  const navigate = useNavigate();
  const { selectedMatch, matches } = useTripStore();
  const { submittedAt, editSelections } = useDecisionStore();
  const partner = selectedMatch ?? matches[0];

  if (!submittedAt) return <Navigate to="/decision/select" replace />;

  return (
    <div className="page-canvas space-y-5">
      <section className="rounded-[38px] bg-ink p-7 text-white md:p-10">
        <h1 className="text-4xl font-black leading-tight tracking-[-0.03em] md:text-5xl">상대 선택을 기다리는 중이에요.</h1>
      </section>

      <Card className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-black text-ink">내 제출 상태 · 완료</p>
            <p className="text-xs font-bold text-muted">{new Date(submittedAt).toLocaleString('ko-KR')}에 제출했어요.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-canvas p-4">
          <Clock3 className="h-6 w-6 shrink-0 text-muted" />
          <div>
            <p className="text-sm font-black text-ink">{partner?.nickname ?? '상대방'}의 제출 상태 · 알 수 없음</p>
            <p className="text-xs font-bold text-muted">상대방 제출 여부는 백엔드에 사용자별 저장 기능이 추가되면 실시간으로 표시돼요. 지금은 채팅으로 직접 확인해주세요.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/chat"><Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} className="w-full">채팅으로 확인하기</Button></Link>
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => { editSelections(); navigate('/decision/select'); }} className="w-full">내 선택 수정하기</Button>
        </div>

        <Button className="w-full" onClick={() => navigate('/decision/analysis')}>다음 단계로 이동 (차이 분석 보기)</Button>
      </Card>
    </div>
  );
}
