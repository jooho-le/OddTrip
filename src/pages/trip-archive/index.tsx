import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, HeartHandshake } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import type { TripSummary } from '../../types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

type Mode = 'itinerary' | 'match';

const copy: Record<Mode, { title: string; empty: string; action: string; to: string }> = {
  itinerary: { title: '생성 일정', empty: '아직 만든 일정이 없습니다.', action: '일정 보기', to: '/itinerary' },
  match: { title: '최근 매칭', empty: '아직 매칭 기록이 없습니다.', action: '이어서 계획', to: '/attractions' },
};

export function TripArchivePage({ mode }: { mode: Mode }) {
  const { tripHistory, loadTripHistory, openTrip } = useTripStore();
  const navigate = useNavigate();
  const { title, empty, action, to } = copy[mode];

  useEffect(() => {
    void loadTripHistory();
  }, [loadTripHistory]);

  const trips = mode === 'itinerary' ? tripHistory.filter((trip) => trip.itineraryDayCount > 0) : tripHistory;

  async function open(tripId: string) {
    // Point the working state at this trip before navigating, so the target
    // page shows it instead of re-deriving a trip from the match list.
    await openTrip(tripId);
    navigate(to);
  }

  return (
    <div className="page-canvas space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/my" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-black tracking-[-0.04em]">{title}</h1>
      </div>

      {trips.length ? (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripRow key={trip.tripId} trip={trip} action={action} onOpen={() => void open(trip.tripId)} />
          ))}
        </div>
      ) : (
        <Card>
          {mode === 'itinerary' ? <CalendarDays className="h-6 w-6 text-[#fd267a]" /> : <HeartHandshake className="h-6 w-6 text-[#fd267a]" />}
          <p className="mt-4 text-sm font-bold text-slate-500">{empty}</p>
          <Link to="/matches"><Button className="mt-4">매칭 보러가기</Button></Link>
        </Card>
      )}
    </div>
  );
}

function TripRow({ trip, action, onOpen }: { trip: TripSummary; action: string; onOpen: () => void }) {
  const period = trip.startDate && trip.endDate ? `${trip.startDate} ~ ${trip.endDate}` : '기간 미정';
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 bg-white">
      <div className="flex min-w-0 items-center gap-4">
        <img
          src={trip.partner?.avatarUrl ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'}
          alt=""
          className="h-14 w-14 shrink-0 rounded-[20px] object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{trip.title ?? `${trip.partner?.nickname ?? '동행자'}님과의 여행`}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {trip.partner?.nickname ?? '동행자 미정'}
            {trip.partner?.ttiCode ? ` · ${trip.partner.ttiCode}` : ''} · {trip.region ?? '지역 미정'} · {period}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            추천 {trip.attractionCount}곳 · 저장 {trip.savedCount}곳 · 일정 {trip.itineraryDayCount}일
          </p>
        </div>
      </div>
      <Button variant="secondary" onClick={onOpen}>{action}</Button>
    </Card>
  );
}
