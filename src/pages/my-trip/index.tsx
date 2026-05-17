import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/tripStore';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { SectionTitle } from '../../shared/ui/SectionTitle';

export function MyTripPage() {
  const { user, result, attractions, itinerary, matches } = useTripStore();
  const saved = attractions.filter((item) => item.saved);

  return (
    <div className="space-y-5">
      <SectionTitle title="내 여행" description="유형, 저장한 여행지, 생성된 일정, 최근 매칭 기록을 모아봅니다." />
      <Card className="flex items-center gap-4">
        <img src={user?.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        <div><h2 className="text-xl font-bold">{user?.nickname ?? '여행자'}</h2><p className="text-sm text-slate-500">{user?.homeRegion ?? 'Seoul'} · {result?.code ?? user?.ttiCode ?? 'TTI 미완료'}</p></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-slate-500">저장한 여행지</p><p className="mt-2 text-3xl font-black">{saved.length}</p></Card>
        <Card><p className="text-sm text-slate-500">생성 일정</p><p className="mt-2 text-3xl font-black">{itinerary.length}</p></Card>
        <Card><p className="text-sm text-slate-500">최근 매칭</p><p className="mt-2 text-3xl font-black">{matches.length}</p></Card>
      </div>
      <Card><h2 className="mb-3 font-bold">저장한 여행지</h2>{saved.length ? <div className="flex flex-wrap gap-2">{saved.map((item) => <Badge key={item.id}>{item.name}</Badge>)}</div> : <p className="text-sm text-slate-500">아직 저장한 여행지가 없습니다.</p>}</Card>
      <Card><h2 className="mb-3 font-bold">설정</h2><div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary">알림 설정</Button><Button variant="secondary">동행 선호 수정</Button></div></Card>
      <Link to="/tti/start"><Button variant="secondary">TTI 다시 진단하기</Button></Link>
    </div>
  );
}
