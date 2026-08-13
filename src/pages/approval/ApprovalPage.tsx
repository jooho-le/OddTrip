import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, Info, RefreshCw } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { useToast } from '../../shared/ui/Toast';

const REVISION_OPTIONS = ['활동량 조정', '이동량 조정', '예산 조정', '내 선택 더 반영', '상대 선택 더 반영', '특정 장소 변경'];

interface RevisionRequest {
  id: string;
  items: string[];
  note: string;
  createdAt: string;
}

export function ApprovalPage() {
  const { itinerary, regenerateItinerary, status } = useTripStore();
  const showToast = useToast((state) => state.show);

  const [myApproved, setMyApproved] = useState(false);
  const [selectedRevisions, setSelectedRevisions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [requests, setRequests] = useState<RevisionRequest[]>([]);

  const hasItinerary = itinerary.length > 0;

  const toggleRevision = (value: string) => {
    setSelectedRevisions((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const submitRevision = () => {
    if (!selectedRevisions.length) {
      showToast('수정할 항목을 하나 이상 선택해주세요.', 'info');
      return;
    }
    setRequests((current) => [{ id: crypto.randomUUID(), items: selectedRevisions, note, createdAt: new Date().toISOString() }, ...current]);
    setSelectedRevisions([]);
    setNote('');
    setMyApproved(false);
    showToast('수정 요청을 저장했어요. (이 브라우저에만 저장됩니다)');
  };

  const handleRegenerate = async () => {
    await regenerateItinerary();
    showToast('일정을 다시 만들었어요.');
  };

  return (
    <div className="page-canvas space-y-5">
      <header>
        <p className="eyebrow">Approval</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-black leading-snug tracking-[-0.02em] text-ink md:text-3xl">완성된 일정을 검토하고 승인해요.</h1>
      </header>

      <Card className="flex items-start gap-3 border-accent/20 bg-accent-soft text-sm font-bold text-accent">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        승인 상태를 두 사람 사이에 저장하는 백엔드 기능이 아직 없어서, 이 화면의 승인·수정요청은 지금은 이 브라우저에만 남아요.
      </Card>

      {!hasItinerary ? (
        <Card className="space-y-3">
          <p className="text-sm font-bold text-muted">먼저 일정을 만들어야 검토할 수 있어요.</p>
          <Link to="/itinerary"><Button>일정 만들러 가기</Button></Link>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3">
              <p className="text-xs font-black text-muted">내 검토 상태</p>
              <div className="flex items-center gap-3 rounded-2xl bg-canvas p-4">
                {myApproved ? <CheckCircle2 className="h-6 w-6 text-accent" /> : <Clock3 className="h-6 w-6 text-muted" />}
                <p className="text-sm font-black text-ink">{myApproved ? '승인 완료' : '검토 중'}</p>
              </div>
              <Button variant={myApproved ? 'secondary' : 'primary'} onClick={() => setMyApproved((value) => !value)} className="w-full">
                {myApproved ? '승인 취소' : '일정 승인하기'}
              </Button>
            </Card>

            <Card className="space-y-3">
              <p className="text-xs font-black text-muted">상대 검토 상태</p>
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-4">
                <Clock3 className="h-6 w-6 text-muted" />
                <p className="text-sm font-bold text-muted">아직 확인할 수 없어요 (백엔드 연동 예정)</p>
              </div>
              <Link to="/chat"><Button variant="secondary" className="w-full">채팅으로 물어보기</Button></Link>
            </Card>
          </div>

          {myApproved ? (
            <Card className="border-accent/30 bg-accent-soft">
              <p className="text-sm font-black text-accent">내 승인이 끝났어요. 상대방도 승인하면 여행이 확정돼요.</p>
            </Card>
          ) : null}

          <Card className="space-y-4">
            <h2 className="text-lg font-black text-ink">수정 요청</h2>
            <div className="flex flex-wrap gap-2">
              {REVISION_OPTIONS.map((option) => {
                const selected = selectedRevisions.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleRevision(option)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${selected ? 'bg-accent text-white' : 'bg-canvas text-ink'}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="구체적으로 어떤 점을 바꾸고 싶은지 적어주세요."
              rows={3}
              className="w-full resize-none rounded-xl border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={submitRevision}>수정 요청 저장</Button>
              <Button icon={<RefreshCw className="h-4 w-4" />} disabled={status.itinerary === 'loading'} onClick={() => void handleRegenerate()}>
                {status.itinerary === 'loading' ? '재생성 중' : '수정안 재생성'}
              </Button>
            </div>
          </Card>

          {requests.length ? (
            <Card className="space-y-3">
              <h2 className="text-lg font-black text-ink">지난 수정 요청</h2>
              {requests.map((request) => (
                <div key={request.id} className="rounded-2xl bg-canvas p-4">
                  <div className="flex flex-wrap gap-2">{request.items.map((item) => <Badge key={item}>{item}</Badge>)}</div>
                  {request.note ? <p className="mt-2 text-sm font-semibold text-ink">{request.note}</p> : null}
                  <p className="mt-2 text-xs font-bold text-muted">{new Date(request.createdAt).toLocaleString('ko-KR')}</p>
                </div>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
