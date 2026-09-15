import { Users } from 'lucide-react';
import { Badge } from '../../shared/ui/Badge';
import { Card } from '../../shared/ui/Card';

export function DecisionCard({
  myChoices,
  common,
  conflicts,
  agreed = false,
}: {
  myChoices: string[];
  common: string[];
  conflicts: string[];
  agreed?: boolean;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-ink">조율 카드</h2>
        {agreed ? <Badge className="bg-accent text-white">합의 완료</Badge> : null}
      </div>

      <div>
        <p className="text-xs font-black text-muted">내 선택</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {myChoices.length ? myChoices.map((item) => <Badge key={item}>{item}</Badge>) : <span className="text-sm font-semibold text-muted">아직 선택하지 않았어요.</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-line bg-canvas p-4">
        <p className="flex items-center gap-2 text-xs font-black text-muted">
          <Users className="h-3.5 w-3.5" />
          상대 선택
        </p>
        <p className="mt-2 text-sm font-semibold text-muted">상대방 선택은 백엔드 연동 후 여기에 표시됩니다.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-black text-muted">공통 선호</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {common.length ? common.map((item) => <Badge key={item} className="bg-accent-soft text-accent">{item}</Badge>) : <span className="text-sm font-semibold text-muted">-</span>}
          </div>
        </div>
        <div>
          <p className="text-xs font-black text-muted">주요 충돌</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {conflicts.length ? conflicts.map((item) => <Badge key={item} className="bg-ink text-white">{item}</Badge>) : <span className="text-sm font-semibold text-muted">없음</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
