import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Heart, MapPin, MessageCircle, Route, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { createCommunityRepository, type CommunityData, type CommunityPost } from '../../features/community/communityModel';
import { COMMUNITY_SAMPLES } from '../../features/community/communitySamples';
import { imageUrl, TRIP_IMAGE_FALLBACKS } from '../../features/prototype/designContent';
import { formatRelativeTime } from '../../shared/lib/formatDate';
import { tripPreferencePath, tripWorkspacePath, type TripWorkspaceTab } from '../../shared/lib/tripRoutes';
import type { TripSummary } from '../../types';
import { selectCommunityHomePosts } from './homeFeed';

const coverImage = imageUrl('photo-1507525428034-b723cf961d3e', 1600, 90);

export function HomePage() {
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroDirection, setHeroDirection] = useState<'next' | 'prev'>('next');
  const {
    user,
    activeTripId,
    tripHistory,
    preferences,
    status,
    error,
    loadTripHistory,
    openTrip,
  } = useTripStore();
  const communityRepository = useMemo(() => user
    ? createCommunityRepository(window.localStorage, { id: user.id, nickname: user.nickname }, COMMUNITY_SAMPLES)
    : undefined, [user?.id, user?.nickname]);
  const [communityData, setCommunityData] = useState<CommunityData>();
  const [communityError, setCommunityError] = useState('');

  const loadCommunity = useCallback(() => {
    if (!communityRepository) return;
    try {
      setCommunityData(communityRepository.load());
      setCommunityError('');
    } catch (communityLoadError) {
      setCommunityError(communityLoadError instanceof Error ? communityLoadError.message : '여행 이야기를 불러오지 못했습니다.');
    }
  }, [communityRepository]);

  useEffect(() => {
    void loadTripHistory();
  }, [loadTripHistory]);

  useEffect(() => {
    loadCommunity();
    if (!communityRepository) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === communityRepository.key || event.key === null) loadCommunity();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [communityRepository, loadCommunity]);

  const activeTrip = tripHistory.find((trip) => !['completed', 'cancelled'].includes(trip.status));

  useEffect(() => {
    if (activeTrip && activeTripId !== activeTrip.tripId) void openTrip(activeTrip.tripId);
  }, [activeTrip, activeTripId, openTrip]);

  const completedTrips = tripHistory.filter((trip) => trip.status === 'completed').length;
  const savedPlaces = tripHistory.reduce((sum, trip) => sum + trip.savedCount, 0);
  const preferenceDone = hasPreferenceInput(preferences);
  const stage = activeTrip ? tripStage(activeTrip) : '동행 찾는 중';
  const communityPosts = selectCommunityHomePosts(communityData?.posts ?? [], 'recommended').slice(0, 2);

  const openActiveTrip = async () => {
    if (!activeTrip) {
      navigate(user?.ttiCode ? '/matches' : '/survey/tti');
      return;
    }
    if (await openTrip(activeTrip.tripId)) navigate(tripWorkspacePath(activeTrip.tripId));
  };

  const openTripStep = async (tab: TripWorkspaceTab) => {
    if (!activeTrip) {
      navigate(user?.ttiCode ? '/matches' : '/survey/tti?from=home');
      return;
    }
    if (await openTrip(activeTrip.tripId)) navigate(tripWorkspacePath(activeTrip.tripId, tab));
  };

  const nextStep = !user?.ttiCode
    ? {
        status: '첫 단계',
        title: '내 여행 성향부터 기록해 볼까요?',
        detail: 'TTI를 작성하면 나와 잘 맞는 동행 후보와 여행 방식을 추천받을 수 있어요.',
        actionLabel: '여행 성향 작성하기',
        action: () => navigate('/survey/tti?from=home'),
      }
    : activeTrip && !preferenceDone
      ? {
          status: '다음 할 일',
          title: `${activeTrip.partner?.nickname ?? '동행'}님과 맞출 여행 기준이 남아 있어요`,
          detail: '두 사람이 각자 공동 선호를 제출하면 AI가 장소와 이동 순서를 포함한 일정을 만듭니다.',
          actionLabel: '공동 선호 작성하기',
          action: () => navigate(tripPreferencePath(activeTrip.tripId, true)),
        }
      : activeTrip?.itineraryDayCount
        ? {
            status: '일정 준비 완료',
            title: 'AI가 정리한 여행 일정을 확인해 보세요',
            detail: '불편하거나 바꾸고 싶은 내용은 동행과 채팅으로 이야기할 수 있어요.',
            actionLabel: '일정표 확인하기',
            action: () => void openTripStep('schedule'),
          }
        : activeTrip
          ? {
              status: '함께 준비 중',
              title: '두 사람의 선호가 모이면 일정이 시작됩니다',
              detail: '상대의 제출 상태와 AI 일정 생성 과정을 조율 화면에서 확인하세요.',
              actionLabel: '조율 상태 확인하기',
              action: () => void openTripStep('coordination'),
            }
          : {
              status: '새로운 출발',
              title: '다음 여행을 함께할 동행을 만나보세요',
              detail: '여행 성향과 시기를 비교하고, 서로 잘 맞는 여행 메이트에게 동행을 요청할 수 있어요.',
              actionLabel: '동행 찾기',
              action: () => navigate('/matches'),
            };

  const heroSlides = [
    {
      key: 'trip',
      overline: 'MY TRIP BRIEFING',
      status: stage,
      title: activeTrip ? tripTitle(activeTrip, user?.nickname) : `${user?.nickname ?? '여행자'}님의 다음 OddTrip`,
      detail: activeTrip ? `${dateRange(activeTrip.startDate, activeTrip.endDate)} · ${activeTrip.region ?? '지역 미정'}` : '여행 성향을 기록하고 새로운 동행을 찾아보세요.',
      actionLabel: activeTrip ? '현재 여행 바로 가기' : user?.ttiCode ? '동행 찾기' : '여행 성향 작성하기',
      action: () => void openActiveTrip(),
      image: coverImage,
    },
    {
      key: 'archive',
      overline: 'TRIP ARCHIVE',
      status: `${completedTrips}개의 지난 여행`,
      title: activeTrip ? `${activeTrip.region ?? '이번'} 여행이 하나의 기록으로 쌓이고 있어요` : '나의 모든 OddTrip을 한곳에서 이어보세요',
      detail: activeTrip
        ? `${activeTrip.itineraryDayCount || 0}일 일정 · 저장한 장소 ${activeTrip.savedCount}곳 · 동행 ${activeTrip.partner?.nickname ?? '미정'}`
        : `완료 여행 ${completedTrips}개 · 저장한 장소 ${savedPlaces}곳`,
      actionLabel: '내 여행 모아보기',
      action: () => navigate('/my'),
      image: imageUrl(TRIP_IMAGE_FALLBACKS[1], 1600, 88),
    },
  ];
  const destinations = [
    { number: '01', overline: 'MATCH', title: '동행 찾기', description: '나와 다른 취향까지 비교하고 함께 떠날 여행자를 만나보세요.', to: '/matches', action: '여행자 둘러보기', Icon: Users },
    { number: '02', overline: 'MY TRIP', title: '내 여행', description: '진행 중인 여행과 완성된 일정, 지난 여행 기록을 이어서 봅니다.', to: '/my', action: '여행 이어가기', Icon: Route },
    { number: '03', overline: 'JOURNAL', title: '커뮤니티', description: '서로 다른 여행 방식과 다음 여행에 도움이 될 이야기를 읽어보세요.', to: '/community', action: '이야기 둘러보기', Icon: BookOpen },
  ];
  const activeHero = heroSlides[heroIndex];
  const moveHero = (direction: 'next' | 'prev') => {
    setHeroDirection(direction);
    setHeroIndex((current) => direction === 'next'
      ? (current + 1) % heroSlides.length
      : (current - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <main className="page">
      <div className="container">
        {error && status.tripHistory === 'error' ? (
          <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void loadTripHistory()}>다시 시도</button></div>
        ) : null}

        <section className="home-hero" aria-roledescription="carousel" aria-label="내 여행 브리핑">
          <article className={`home-hero-slide is-${heroDirection}`} key={activeHero.key} aria-live="polite">
            <img className="home-hero-image" src={activeHero.image} alt="" fetchPriority={heroIndex === 0 ? 'high' : 'auto'} />
            <div className="home-hero-copy">
              <span className="home-hero-overline">{activeHero.overline}</span>
              <span className="home-hero-status">{activeHero.status}</span>
              <h1>{activeHero.title}</h1>
              <p>{activeHero.detail}</p>
              <button type="button" onClick={activeHero.action}>{activeHero.actionLabel} <i>→</i></button>
            </div>
          </article>
          <div className="home-hero-controls" aria-label="내 여행 브리핑 이동">
            <span>{String(heroIndex + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}</span>
            <button type="button" aria-label="이전 브리핑" onClick={() => moveHero('prev')}><ChevronLeft size={18} /></button>
            <button type="button" aria-label="다음 브리핑" onClick={() => moveHero('next')}><ChevronRight size={18} /></button>
          </div>
          <div className="home-hero-dots" aria-label="브리핑 선택">
            {heroSlides.map((slide, index) => <button type="button" key={slide.key} aria-label={`${index + 1}번 브리핑`} aria-current={index === heroIndex ? 'true' : undefined} onClick={() => { setHeroDirection(index >= heroIndex ? 'next' : 'prev'); setHeroIndex(index); }} />)}
          </div>
        </section>

        <section className="home-resume" aria-labelledby="home-resume-title">
          <div className="home-section-heading"><div><span className="eyebrow">CONTINUE YOUR TRIP</span><h2 id="home-resume-title">이어서 하기</h2></div><p>지금 필요한 한 단계만 보여드립니다.</p></div>
          <div className="home-resume-card">
            <span className="home-resume-step">{nextStep.status}</span>
            <div><h3>{nextStep.title}</h3><p>{nextStep.detail}</p></div>
            <button type="button" className="solid-btn" onClick={nextStep.action}>{nextStep.actionLabel} →</button>
          </div>
        </section>

        <section className="home-destinations" aria-labelledby="home-destinations-title">
          <div className="home-section-heading"><div><span className="eyebrow">ODDTRIP ENTRANCES</span><h2 id="home-destinations-title">어디로 갈까요?</h2></div><p>목적에 맞는 공간으로 바로 이동하세요.</p></div>
          <div className="home-destination-grid">
            {destinations.map(({ number, overline, title, description, to, action, Icon }) => <Link className="home-destination-card" to={to} key={to}><span className="home-destination-number">{number}</span><Icon size={21} aria-hidden="true" /><span className="eyebrow">{overline}</span><h3>{title}</h3><p>{description}</p><strong>{action} →</strong></Link>)}
          </div>
        </section>

        <section className="home-stories" aria-labelledby="home-stories-title">
          <div className="home-section-heading"><div><span className="eyebrow">WEEKLY STORIES</span><h2 id="home-stories-title">이번 주 여행 이야기</h2></div><Link className="text-btn" to="/community?sort=popular">커뮤니티 전체 보기 →</Link></div>
          {!communityData && !communityError ? <LoadingFeed label="여행 이야기를 불러오는 중" /> : null}
          {communityError ? <div className="error-strip" role="alert"><span>{communityError}</span><button onClick={loadCommunity}>다시 시도</button></div> : null}
          {communityData && communityPosts.length ? <div className="home-story-grid">{communityPosts.map((post) => <HomeStoryCard post={post} key={post.id} />)}</div> : null}
          {communityData && !communityPosts.length ? <div className="empty-state"><strong>아직 소개할 여행 이야기가 없습니다.</strong><p>커뮤니티에서 첫 여행 이야기를 남겨보세요.</p><Link className="solid-btn" to="/community/write">이야기 쓰기</Link></div> : null}
        </section>
      </div>
    </main>
  );
}

function HomeStoryCard({ post }: { post: CommunityPost }) {
  const [imageFailed, setImageFailed] = useState(false);
  const reactionCount = post.likes + Number(post.liked);
  return (
    <Link className="home-story-card" to={`/community/${post.id}`} state={{ communityReturn: '/home' }}>
      <div className="home-story-image">
        {post.image && !imageFailed
          ? <img src={post.image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          : <span><small>{post.category}</small>여행 이야기</span>}
      </div>
      <div className="home-story-copy">
        <small><b>{post.category}</b>{post.region ? <><MapPin size={11} />{post.region}</> : null}</small>
        <h3><span>{post.title}</span><i aria-hidden="true">→</i></h3>
        <p>{post.body}</p>
        <footer><span>{post.author.nickname} · {formatRelativeTime(post.createdAt)}</span><span><Heart size={13} />{reactionCount}<MessageCircle size={13} />{post.comments.length}</span></footer>
      </div>
    </Link>
  );
}

function LoadingFeed({ label }: { label: string }) {
  return <div className="skeleton-stack" role="status" aria-label={label}>{[0, 1].map((item) => <div className="skeleton-row" key={item} />)}</div>;
}

function tripStage(trip: TripSummary) {
  if (trip.status === 'completed') return '여행 완료';
  if (trip.itineraryDayCount > 0) return '일정표 완성';
  if (trip.attractionCount > 0 || trip.savedCount > 0) return 'AI 일정 생성 중';
  return '선호 제출';
}

function tripTitle(trip: TripSummary, nickname?: string) {
  return trip.title || `${nickname ?? '나'} × ${trip.partner?.nickname ?? '동행'}의 ${trip.region ?? 'OddTrip'} 여행`;
}

function dateRange(start?: string | null, end?: string | null) {
  return start || end ? [start, end].filter(Boolean).join(' — ') : '날짜 미정';
}

function hasPreferenceInput(preferences: ReturnType<typeof useTripStore.getState>['preferences']) {
  return Boolean(
    preferences.places.length
    || preferences.activities.length
    || preferences.foods.length
    || preferences.indoorPreferred
    || preferences.hiddenSpots
    || preferences.pace !== 50
    || preferences.budget !== 50
  );
}
