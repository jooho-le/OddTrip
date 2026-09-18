import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, ChevronLeft, ChevronRight, Heart, ImagePlus, MapPin, MessageCircle, PenLine, Search, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { communityService } from '../../entities/community/api/communityService';
import { oddtripService } from '../../entities/trip/api/oddtripService';
import { CATEGORIES, emptyInput, parseTags, toPostInput, validatePost, type Category, type CommunityPost, type Draft, type PostInput } from '../../features/community/communityModel';
import { isTripWritingSeed, toTripWritingSeed, tripSeedDate, tripSeedInput, type TripWritingSeed } from '../../features/community/tripSeed';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import { useToast } from '../../shared/ui/Toast';
import { useCommunity, useCommunityResource } from './CommunityContext';

const dateLabel = (date: string) => new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
const PAGE_SIZE = 4;

function CommunityImage({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed
    ? <img className={className} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} onError={() => setFailed(true)} />
    : <div className={`community-image-empty ${className}`} role="img" aria-label={alt || '여행 기록'}><MapPin size={28} /><span>{failed ? '사진을 불러오지 못했어요' : '나만의 여행 기록'}</span></div>;
}

function AuthorLine({ post }: { post: CommunityPost }) {
  return <div className="community-author"><span className="community-avatar" aria-hidden="true">{post.author.nickname.slice(0, 1)}</span><div><strong>{post.author.nickname}</strong><time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time></div></div>;
}

function CommunityStatus({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (error) return <div className="community-empty" role="alert"><h2>여행 이야기를 불러오지 못했어요</h2><p>{error}</p><button className="line-btn" onClick={onRetry}>다시 불러오기</button></div>;
  if (loading) return <p className="community-muted" role="status">여행 이야기를 불러오고 있어요.</p>;
  return null;
}

function PostActions({ post, onChanged, commentsLink = true }: { post: CommunityPost; onChanged: () => void; commentsLink?: boolean }) {
  const { commit, reloadSummary } = useCommunity();
  const [pending, setPending] = useState(false);
  // 공감·저장은 누른 결과 상태를 보낸다. 같은 요청이 두 번 닿아도 뒤집히지 않는다.
  const react = async (field: 'like' | 'save', value: boolean) => {
    if (pending) return;
    setPending(true);
    if (await commit(() => communityService.setReaction(post.id, field, value))) {
      onChanged();
      reloadSummary();
    }
    setPending(false);
  };
  return <div className="community-reactions">
    <button type="button" aria-pressed={post.liked} disabled={pending} onClick={() => void react('like', !post.liked)}><Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />공감 {post.likeCount}</button>
    {commentsLink ? <Link to={`/community/${post.id}#comments`}><MessageCircle size={16} />댓글 {post.commentCount}</Link> : <a href="#comments"><MessageCircle size={16} />댓글 {post.commentCount}</a>}
    <button type="button" className="community-save" aria-pressed={post.saved} disabled={pending} aria-label={post.saved ? '글 저장 취소' : '글 저장'} onClick={() => void react('save', !post.saved)}><Bookmark size={16} fill={post.saved ? 'currentColor' : 'none'} /><span>{post.saved ? '저장됨' : '저장'}</span></button>
  </div>;
}

function CommunitySidebar() {
  const { author, summary } = useCommunity();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  return <aside className="community-sidebar">
    <section className="community-myspace"><span className="community-overline">MY TRAVEL NOTE</span><h2>{author.nickname}의 기록</h2><p>돌아온 뒤에도 계속되는 여행.</p><div className="community-counts"><Link to="/community?view=mine"><b>{summary.myPosts}</b>내 글</Link><Link to="/community?view=saved"><b>{summary.savedPosts}</b>저장한 글</Link><Link to="/community/drafts"><b>{summary.drafts}</b>임시저장</Link></div><Link className="solid-btn" to="/community/write"><PenLine size={15} />여행 이야기 쓰기</Link></section>
    <section className="community-side-section"><h2>이런 이야기를 기다려요</h2><p>처음 발견한 골목, 취향이 다른 동행과의 하루, 다음 여행자를 위한 작은 팁.</p><p>잘 쓴 글보다 당신만의 경험이면 충분해요.</p></section>
    <section className="community-side-section"><h2>함께 지키는 약속</h2><p>서로의 취향을 존중해 주세요.<br />다른 사람의 사진과 개인정보는 동의 없이 올리지 않아요.</p><Link to="/legal/community" target="_blank" rel="noreferrer">커뮤니티 운영정책 <ArrowRight size={14} /></Link></section>
    <button type="button" className="community-help" onClick={() => showInfo('커뮤니티 이용 안내', '작성한 글과 댓글은 서버에 저장되어 다른 회원에게도 보입니다. 차단한 회원의 글과 댓글은 서로 보이지 않습니다. 게시글 공유와 신고 접수는 아직 준비 중입니다.')}>이용 안내</button>
  </aside>;
}

function CommunitySpotlight({ posts, returnState }: { posts: CommunityPost[]; returnState: { communityReturn: string } }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const currentIndex = activeIndex % Math.max(posts.length, 1);
  const featuredPost = posts[currentIndex];
  const move = (nextDirection: 'next' | 'prev') => {
    if (posts.length < 2) return;
    setDirection(nextDirection);
    setActiveIndex((current) => nextDirection === 'next'
      ? (current + 1) % posts.length
      : (current - 1 + posts.length) % posts.length);
  };

  if (!featuredPost) return <section className="community-spotlight community-spotlight-empty"><div><span className="community-overline">ODDTRIP JOURNAL</span><h2>첫 여행 이야기를 기다리고 있어요</h2><p>서로 다른 취향이 만난 순간을 기록해 주세요.</p></div><Link className="solid-btn" to="/community/write">이야기 쓰기</Link></section>;

  return <section className="community-spotlight" aria-roledescription="carousel" aria-label="커뮤니티 추천 이야기">
    <Link className={`community-hot-topic is-${direction}`} key={featuredPost.id} to={`/community/${featuredPost.id}`} state={returnState}>
      <CommunityImage className="community-feature-cover" src={featuredPost.image} alt="" eager />
      <span className="community-feature-overlay" aria-hidden="true" />
      <div className="community-feature-copy">
        <span className="community-overline">BEST STORY</span>
        <span className="community-feature-meta">{featuredPost.category}{featuredPost.region ? ` · ${featuredPost.region}` : ''}</span>
        <h2 id="community-spotlight-title">{featuredPost.title}</h2>
        <span className="community-feature-link">이야기 읽기 <ArrowRight size={16} /></span>
      </div>
    </Link>
    <div className="community-spotlight-controls"><span>{String(currentIndex + 1).padStart(2, '0')} / {String(posts.length).padStart(2, '0')}</span><button type="button" aria-label="이전 추천 이야기" disabled={posts.length < 2} onClick={() => move('prev')}><ChevronLeft size={16} /></button><button type="button" aria-label="다음 추천 이야기" disabled={posts.length < 2} onClick={() => move('next')}><ChevronRight size={16} /></button></div>
  </section>;
}

export function CommunityListPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const query = params.get('q') ?? '';
  const category = CATEGORIES.includes(params.get('category') as Category) ? params.get('category')! : '전체';
  const view = (['saved', 'mine'].includes(params.get('view') ?? '') ? params.get('view')! : 'all') as 'all' | 'mine' | 'saved';
  const sort = params.get('sort') === 'popular' ? 'popular' : 'latest';
  const requestedPage = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  const [search, setSearch] = useState(query);
  useEffect(() => setSearch(query), [query]);

  // 검색·카테고리·정렬·페이지는 서버가 처리한다. 화면은 조건만 넘긴다.
  const list = useCommunityResource(
    () => communityService.listPosts({ category, q: query, view, sort, page: requestedPage, size: PAGE_SIZE }),
    [category, query, view, sort, requestedPage],
  );
  const best = useCommunityResource(() => communityService.listPosts({ sort: 'popular', size: 3 }), []);

  const posts = list.value?.items ?? [];
  const page = list.value?.page ?? requestedPage;
  const pages = list.value?.totalPages ?? 1;
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next);
  };
  const returnState = { communityReturn: location.pathname + location.search };
  const refresh = () => { list.reload(); best.reload(); };
  return <main className="page"><div className="container community">
    <header className="community-heading"><div><span className="community-overline">ODDTRIP COMMUNITY</span><h1>여행 이야기</h1><p>다른 취향이 만나, 더 넓어지는 여행.</p></div><Link className="solid-btn" to="/community/write"><PenLine size={16} />글쓰기</Link></header>
    <CommunitySpotlight posts={best.value?.items ?? []} returnState={returnState} />
    <div className="community-layout"><div className="community-main">
      <div className="community-toolbar"><nav aria-label="여행 이야기 보기" className="community-views">{[['all', '전체 글'], ['saved', '저장한 글'], ['mine', '내 글']].map(([key, label]) => <button type="button" key={key} aria-pressed={view === key} onClick={() => update({ view: key === 'all' ? '' : key })}>{label}</button>)}</nav><form role="search" className="community-search" onSubmit={(event) => { event.preventDefault(); update({ q: search.trim() }); }}><input aria-label="여행 이야기 검색" placeholder="지역, 제목, 태그 검색" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} /><button aria-label="검색"><Search size={18} /></button></form></div>
      <nav className="community-categories" aria-label="글 카테고리">{['전체', ...CATEGORIES].map((item) => <button type="button" key={item} aria-pressed={item === category} onClick={() => update({ category: item === '전체' ? '' : item })}>{item}</button>)}</nav>
      <div className="community-list-meta"><p aria-live="polite">{query && <><b>“{query}”</b> 검색 결과 · </>}{list.value?.total ?? 0}개의 이야기</p><label><span className="sr-only">글 정렬</span><select value={sort} onChange={(event) => update({ sort: event.target.value })}><option value="latest">최신순</option><option value="popular">공감순</option></select></label></div>
      <CommunityStatus loading={list.loading} error={list.error} onRetry={list.reload} />
      {!list.loading && !list.error && posts.length === 0 ? <div className="community-empty"><Bookmark size={28} /><h2>{view === 'saved' ? '다시 읽고 싶은 이야기를 저장해 보세요' : view === 'mine' && !query && category === '전체' ? '첫 여행 이야기를 남겨 보세요' : '아직 이야기를 찾지 못했어요'}</h2><p>{view === 'saved' ? '글의 저장 버튼을 누르면 이곳에서 모아볼 수 있어요.' : '검색어나 카테고리를 바꾸거나 나만의 이야기를 시작해 보세요.'}</p><button className="line-btn" onClick={() => setParams({})}>전체 글 보기</button></div> : posts.map((post) => <article className="community-post-row" key={post.id}>
        <div className="community-row-copy"><AuthorLine post={post} /><Link className="community-story-link" to={`/community/${post.id}`} state={returnState}><div className="community-post-meta"><span>{post.category}</span>{post.region && <span><MapPin size={12} />{post.region}</span>}</div><h2>{post.title}</h2><p>{post.body}</p></Link><PostActions post={post} onChanged={refresh} /></div>
        {post.image && <Link to={`/community/${post.id}`} state={returnState} className="community-thumbnail" aria-label={`${post.title} 읽기`}><CommunityImage src={post.image} alt="" /></Link>}
      </article>)}
      {posts.length > 0 && <nav className="community-pagination" aria-label="게시글 페이지"><button aria-label="이전 페이지" disabled={page === 1} onClick={() => update({ page: String(page - 1) })}><ChevronLeft size={16} /></button><span>{page} / {pages}</span><button aria-label="다음 페이지" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}><ChevronRight size={16} /></button></nav>}
    </div><CommunitySidebar /></div>
  </div></main>;
}

export function CommunityDetailPage() {
  const { postId } = useParams();
  const detail = useCommunityResource(() => communityService.getPost(postId!), [postId]);

  if (detail.loading) return <main className="container community" aria-busy="true"><p role="status">여행 이야기를 불러오고 있어요.</p></main>;
  if (!detail.value) return <main className="container community"><div className="community-empty"><h1>{detail.status === 404 ? '이 글을 찾을 수 없어요' : '글을 불러오지 못했어요'}</h1><p>{detail.error || '삭제되었거나 볼 수 없는 글입니다.'}</p>{detail.status === 404 ? null : <button className="line-btn" onClick={detail.reload}>다시 불러오기</button>}<Link className="line-btn" to="/community">여행 이야기로 돌아가기</Link></div></main>;
  return <CommunityArticle key={detail.value.id} post={detail.value} reload={detail.reload} />;
}

function CommunityArticle({ post, reload }: { post: CommunityPost; reload: () => void }) {
  const { author, commit, reloadSummary } = useCommunity();
  const location = useLocation();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; action: () => void }>();
  const commentsRef = useRef<HTMLElement>(null);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const show = useToast((state) => state.show);
  const back = (location.state as { communityReturn?: string } | null)?.communityReturn;
  const returnTo = back === '/home' || back?.startsWith('/community?') ? back : '/community';
  const comments = post.comments ?? [];
  useEffect(() => { if (location.hash === '#comments') commentsRef.current?.scrollIntoView(); }, [location.hash]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    if (await commit(() => communityService.createComment(post.id, comment))) {
      setComment('');
      reload();
      show('댓글을 남겼어요.', 'info');
    }
    setSending(false);
  };

  return <main className="page"><div className="container community"><Link className="community-back" to={returnTo}><ArrowLeft size={16} />여행 이야기 목록</Link><div className="community-layout community-detail-layout"><article className="community-article">
    <header className="community-article-head"><div className="community-post-meta"><Link to={`/community?category=${encodeURIComponent(post.category)}`}>{post.category}</Link>{post.region && <span><MapPin size={13} />{post.region}</span>}</div><h1>{post.title}</h1><div className="community-article-byline"><AuthorLine post={post} />{post.mine && <div className="community-inline-actions"><Link to={`/community/${post.id}/edit`}>수정</Link><button onClick={() => setConfirm({ title: '이 글을 삭제할까요? 글과 댓글을 되돌릴 수 없어요.', action: () => { void commit(() => communityService.deletePost(post.id)).then((done) => { if (done) { reloadSummary(); navigate('/community?view=mine'); } }); } })}>삭제</button></div>}</div></header>
    {post.image && <figure className="community-cover"><CommunityImage src={post.image} alt={post.imageCaption || `${post.title} 첨부 사진`} eager />{post.imageCaption && <figcaption>{post.imageCaption}</figcaption>}</figure>}
    <div className="community-prose">{post.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    <div className="community-tags">{post.tags.map((tag) => <Link key={tag} to={`/community?q=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>
    <div className="community-article-actions"><PostActions post={post} onChanged={reload} commentsLink={false} /><div className="community-inline-actions"><button onClick={() => showComingSoon('게시글 공유', '글을 링크로 공유하는 기능을 준비하고 있습니다.')}>공유</button>{!post.mine && <button onClick={() => showComingSoon('게시글 신고', '게시글 신고 접수와 운영자 검토 기능을 준비하고 있습니다. 이 화면에서 실제 신고가 접수되지는 않습니다.')}>신고</button>}</div></div>
    <section className="community-comments" id="comments" ref={commentsRef}><h2>댓글 <span>{comments.length}</span></h2>{comments.length === 0 && <p className="community-muted">{post.allowComments ? '이 이야기에 첫 번째 마음을 남겨 주세요.' : '작성자가 댓글을 받지 않는 글입니다.'}</p>}
      {comments.map((item) => <div className="community-comment" key={item.id}><span className="community-avatar" aria-hidden="true">{item.author.nickname.slice(0, 1)}</span><div><strong>{item.author.nickname}</strong><p>{item.body}</p><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></div>{item.mine && <button className="community-help" onClick={() => setConfirm({ title: '이 댓글을 삭제할까요?', action: () => { void commit(() => communityService.deleteComment(post.id, item.id)).then((done) => { if (done) reload(); }); } })}>삭제</button>}</div>)}
      {post.allowComments && <form className="community-comment-form" onSubmit={submitComment}><label htmlFor="community-comment">{author.nickname}의 댓글</label><textarea id="community-comment" placeholder="서로의 여행과 취향을 존중하는 댓글을 남겨 주세요." value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} required /><div><span>{comment.length} / 1,000</span><button className="solid-btn" disabled={!comment.trim() || sending}>댓글 등록</button></div></form>}
    </section><Link className="community-back" to={returnTo}><ArrowLeft size={16} />목록으로</Link>
  </article><CommunitySidebar /></div></div>{confirm && <ConfirmDialog title={confirm.title} confirmLabel="삭제" onClose={() => setConfirm(undefined)} onConfirm={() => { confirm.action(); setConfirm(undefined); }} />}</main>;
}

export function CommunityDraftsPage() {
  const { commit, reloadSummary } = useCommunity();
  const drafts = useCommunityResource(() => communityService.listDrafts(), []);
  const [removeKey, setRemoveKey] = useState<string>();
  const items = [...(drafts.value ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <main className="page"><div className="container community"><Link className="community-back" to="/community"><ArrowLeft size={16} />여행 이야기 목록</Link><header className="community-heading"><div><span className="community-overline">MY TRAVEL NOTE</span><h1>임시저장한 이야기</h1><p>아직 마무리하지 못한 여행을 이어서 기록해 보세요.</p></div></header><div className="community-layout"><div>
    <CommunityStatus loading={drafts.loading} error={drafts.error} onRetry={drafts.reload} />
    {!drafts.loading && !drafts.error && items.length === 0 ? <div className="community-empty"><h2>임시저장한 글이 없어요</h2><p>글쓰기 화면에서 임시저장한 이야기가 여기에 모입니다.</p><Link className="line-btn" to="/community/write">글쓰기</Link></div> : items.map((draft) => <article className="community-draft-row" key={draft.draftKey}><Link to={draftPath(draft.draftKey)}><span className="community-overline">{draft.input.category}</span><h2>{draft.input.title || '제목 없는 글'}</h2><time dateTime={draft.updatedAt}>{dateLabel(draft.updatedAt)} 저장</time></Link><button className="line-btn" onClick={() => setRemoveKey(draft.draftKey)}>삭제</button></article>)}
  </div><CommunitySidebar /></div></div>{removeKey && <ConfirmDialog title="임시저장한 글을 삭제할까요?" description="저장된 초안만 삭제됩니다. 이미 작성 완료한 원본 글은 유지됩니다." confirmLabel="삭제" onClose={() => setRemoveKey(undefined)} onConfirm={() => { const key = removeKey; setRemoveKey(undefined); void commit(() => communityService.deleteDraft(key)).then((done) => { if (done) { drafts.reload(); reloadSummary(); } }); }} />}</main>;
}

export function CommunityWritePage() {
  const { postId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  // 수정 화면은 원본 글을, 새 글 화면은 이어 쓸 초안을 먼저 읽어야 편집기를 연다.
  const post = useCommunityResource(() => postId ? communityService.getPost(postId) : Promise.resolve(undefined), [postId]);
  const drafts = useCommunityResource(() => communityService.listDrafts(), []);

  const draftKey = postId ?? validDraftKey(params.get('draft'));
  const statedSeed = isTripWritingSeed((location.state as { tripSeed?: unknown } | null)?.tripSeed)
    ? (location.state as { tripSeed: TripWritingSeed }).tripSeed
    : undefined;
  // 후기 리마인더 알림은 링크만 들고 온다. `/my`에서 들어올 때와 달리 라우터
  // state가 없으므로 여행 정보를 서버에서 읽어 같은 화면을 만든다.
  const tripId = !postId && !statedSeed && draftKey.startsWith('trip:') ? draftKey.slice('trip:'.length) : undefined;
  const trip = useCommunityResource(
    // 여행을 못 읽어도 글쓰기는 막지 않는다. 빈 편집기로 시작할 뿐이다.
    () => tripId ? oddtripService.getTrip(tripId).then((response) => response.data).catch(() => undefined) : Promise.resolve(undefined),
    [tripId],
  );

  if (post.loading || drafts.loading || trip.loading) return <main className="container community" aria-busy="true"><p role="status">작성 화면을 준비하고 있어요.</p></main>;
  if (postId && (!post.value || !post.value.mine)) return <main className="container community"><div className="community-empty"><h1>수정할 수 없는 글입니다</h1><p>{post.error || '현재 계정에서 작성한 글만 수정할 수 있어요.'}</p><Link to="/community" className="line-btn">목록으로</Link></div></main>;

  return <CommunityEditor
    key={`${postId ?? 'new'}:${draftKey}`}
    post={post.value}
    requestedDraftKey={draftKey}
    drafts={drafts.value ?? []}
    onDraftsChanged={drafts.reload}
    tripSeed={statedSeed ?? (trip.value ? toTripWritingSeed(trip.value) : undefined)}
  />;
}


function CommunityEditor({ post, requestedDraftKey, drafts, onDraftsChanged, tripSeed: seed }: { post?: CommunityPost; requestedDraftKey: string; drafts: Draft[]; onDraftsChanged: () => void; tripSeed?: TripWritingSeed }) {
  const { commit, reloadSummary, author } = useCommunity();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as { communityReturn?: string } | null;
  const tripSeed = post ? undefined : seed;
  const returnTo = navigationState?.communityReturn === '/my' ? '/my' : post ? `/community/${post.id}` : '/community';
  const draftKey = post?.id ?? (tripSeed ? `trip:${tripSeed.tripId}` : requestedDraftKey);
  const draft = drafts.find((item) => item.draftKey === draftKey);
  const [input, setInput] = useState<PostInput>(() => post ? toPostInput(post) : draft ? toPostInput(draft.input) : tripSeed ? tripSeedInput(tripSeed) : emptyInput());
  const [tags, setTags] = useState(input.tags.join(', '));
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState<'publish' | 'leave'>();
  const [saved, setSaved] = useState(JSON.stringify(input));
  const prepared = { ...input, tags: parseTags(tags) };
  const dirty = JSON.stringify(prepared) !== saved;
  const show = useToast((state) => state.show);
  const formRef = useRef<HTMLFormElement>(null);
  const imageVersion = useRef(0);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    // Protect normal app link navigation as well as browser refresh/close.
    const leaveLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (dirty && link && link.target !== '_blank' && !link.hasAttribute('download') && !window.confirm('임시저장하지 않은 변경 내용이 있어요. 페이지를 나갈까요?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', leaveLink, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', leaveLink, true); };
  }, [dirty]);
  const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) => setInput((current) => ({ ...current, [key]: value }));
  const saveDraft = async () => {
    if (sending) return;
    setSending(true);
    if (await commit(() => communityService.saveDraft(draftKey, prepared))) {
      setSaved(JSON.stringify(prepared));
      onDraftsChanged();
      reloadSummary();
      show('임시저장했어요. 다른 기기에서도 이어 쓸 수 있어요.', 'info');
    }
    setSending(false);
  };
  const publish = async () => {
    setConfirmation(undefined);
    if (sending) return;
    setSending(true);
    let published: CommunityPost | undefined;
    const done = await commit(async () => {
      published = post
        ? await communityService.updatePost(post.id, prepared, { draftKey })
        : await communityService.createPost(prepared, { draftKey, tripId: tripSeed?.tripId });
    });
    setSending(false);
    if (done && published) {
      setSaved(JSON.stringify(prepared));
      onDraftsChanged();
      reloadSummary();
      show(post ? '여행 이야기를 수정했어요.' : '여행 이야기를 올렸어요.', 'info');
      navigate(`/community/${published.id}`, { replace: true });
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = validatePost(prepared);
    setError(issue ?? '');
    if (!issue) setConfirmation('publish');
  };
  const attachImage = async (file?: File) => {
    const version = ++imageVersion.current;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 800 * 1024) { setError('사진은 JPG·PNG·WebP 형식, 800KB 이하로 첨부해 주세요.'); return; }
    setImageLoading(true); setError('');
    try {
      const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('사진을 읽지 못했어요.')); reader.readAsDataURL(file); });
      await new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('열 수 없는 사진입니다. 다른 파일을 골라 주세요.')); image.src = url; });
      if (version === imageVersion.current) setInput((current) => ({ ...current, image: url, imageCaption: '' }));
    } catch (error) { setError(error instanceof Error ? error.message : '사진을 읽지 못했어요.'); }
    finally { if (version === imageVersion.current) setImageLoading(false); }
  };
  return <main className="page community-editor-bg"><div className="container community">
    <div className="community-editor-toolbar"><button className="community-back" onClick={() => dirty ? setConfirmation('leave') : navigate(returnTo)}><ArrowLeft size={16} />돌아가기</button><Link className="community-back" to="/community/drafts">임시저장 목록 ({drafts.length})</Link><span role="status">{dirty ? '저장하지 않은 변경 내용' : tripSeed ? '내 여행에서 가져온 정보로 시작했어요' : draft ? '임시저장한 글을 불러왔어요' : '나의 여행을 기록하는 시간'}</span></div>
    <div className="community-editor-layout"><form className="community-editor-paper" onSubmit={submit} ref={formRef}>
      <header className="community-editor-head"><span className="community-overline">ODDTRIP TRAVEL NOTE</span><h1>{post ? '여행 이야기 수정' : '여행 이야기 쓰기'}</h1><p>당신에게 남은 여행의 한 장면을 들려주세요.</p></header>
      {tripSeed ? <aside className="community-trip-source"><MapPin size={18} aria-hidden="true" /><div><span>MY TRIP에서 가져온 여행</span><strong>{tripSeed.title}</strong><small>{tripSeedDate(tripSeed)}{tripSeed.partner ? ` · 동행 ${tripSeed.partner}` : ''}</small></div><Link to="/my">다른 여행 선택</Link></aside> : null}
      {preview ? <article className="community-preview"><span className="community-overline">미리보기 · {input.category}</span><h2>{input.title || '제목을 입력해 주세요'}</h2><p className="community-muted">{author.nickname}{input.region && ` · ${input.region}`}</p>{input.image && <figure className="community-cover"><CommunityImage src={input.image} alt={input.imageCaption || '첨부 사진'} />{input.imageCaption && <figcaption>{input.imageCaption}</figcaption>}</figure>}<div className="community-prose">{input.body.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div><div className="community-tags">{prepared.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></article> : <div className="community-editor-fields">
        <div className="community-field-row"><label>카테고리<select value={input.category} onChange={(event) => set('category', event.target.value as Category)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>여행 지역 <span>(선택)</span><input value={input.region} maxLength={30} placeholder="예: 강릉, 제주" onChange={(event) => set('region', event.target.value)} /></label></div>
        <label className="community-title-input">제목<input value={input.title} onChange={(event) => set('title', event.target.value)} maxLength={80} placeholder="여행의 한 장면을 제목으로 남겨 주세요" required /></label>
        <div className="community-image-tools"><label className="line-btn community-upload"><ImagePlus size={16} />대표 사진 첨부<input type="file" accept="image/jpeg,image/png,image/webp" disabled={imageLoading} onChange={(event) => { void attachImage(event.target.files?.[0]); event.target.value = ''; }} /></label><span>{imageLoading ? '사진을 읽고 있어요…' : 'JPG·PNG·WebP · 800KB 이하 · 1장'}</span></div>
        {input.image && <div className="community-attached"><CommunityImage src={input.image} alt="첨부한 대표 사진" /><button type="button" aria-label="첨부 사진 제거" onClick={() => { imageVersion.current++; setImageLoading(false); setInput((current) => ({ ...current, image: '', imageCaption: '' })); }}><X size={18} /></button><label>사진 설명<input value={input.imageCaption} onChange={(event) => set('imageCaption', event.target.value)} placeholder="사진에 대한 설명이나 출처를 남겨 주세요" maxLength={150} /></label></div>}
        <label className="community-body-input">본문<textarea value={input.body} onChange={(event) => set('body', event.target.value)} minLength={10} maxLength={10000} placeholder={'어디로 떠났나요? 어떤 순간이 기억에 남았나요?\n\n함께한 사람, 발견한 장소, 다음 여행자를 위한 팁을 자유롭게 적어 주세요.'} required /></label><div className="community-character-count">{input.body.length.toLocaleString()} / 10,000자</div>
        <label>태그 <span>(선택)</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분해 주세요. 예: 강릉, 바다, 느린여행" maxLength={120} /><small>각 20자, 최대 5개</small></label>
        <label className="community-checkbox"><input type="checkbox" checked={input.allowComments} onChange={(event) => set('allowComments', event.target.checked)} />댓글 허용</label>
      </div>}
      {error && <p className="community-form-error" role="alert">{error}</p>}
      <div className="community-editor-actions"><button type="button" className="line-btn" onClick={() => setPreview(!preview)}>{preview ? '이어서 작성' : '미리보기'}</button><button type="button" className="line-btn" onClick={() => void saveDraft()} disabled={imageLoading || sending}>임시저장</button><button type="submit" className="solid-btn" disabled={imageLoading || sending}>{post ? '수정 완료' : '작성 완료'}</button></div>
    </form><aside className="community-writing-aside"><span className="community-overline">WRITE YOUR JOURNEY</span><h2>완벽한 여행보다,<br />나다운 이야기.</h2><p>꼭 멀리 떠나지 않아도 괜찮아요. 익숙한 동네에서 발견한 작은 장면도 누군가의 다음 여행이 됩니다.</p><ol><li><b>어떤 여행이었나요?</b><span>장소와 함께한 사람을 떠올려 보세요.</span></li><li><b>무엇이 기억에 남았나요?</b><span>나만의 시선과 솔직한 경험을 담아보세요.</span></li><li><b>사진 한 장을 더해 보세요.</b><span>직접 찍은 사진으로 이야기를 시작해도 좋아요.</span></li></ol>{drafts.length > 0 && <div className="community-draft-links"><h3>이어서 쓸 글</h3>{drafts.map((item) => <Link key={item.draftKey} to={draftPath(item.draftKey)}>{item.input.title || '제목 없는 글'}<small>{dateLabel(item.updatedAt)}</small></Link>)}</div>}<Link to="/legal/community" target="_blank" rel="noreferrer">커뮤니티 운영정책 확인 <ArrowRight size={14} /></Link></aside></div>
  </div>{confirmation && <ConfirmDialog title={confirmation === 'publish' ? (post ? '수정한 내용을 올릴까요?' : '이 이야기를 올릴까요?') : '작성 중인 페이지를 나갈까요?'} description={confirmation === 'publish' ? '올린 글은 다른 회원에게도 보입니다. 올린 뒤에도 수정하거나 삭제할 수 있어요.' : '임시저장하지 않은 변경 내용은 사라집니다.'} confirmLabel={confirmation === 'publish' ? '올리기' : '나가기'} onClose={() => setConfirmation(undefined)} onConfirm={confirmation === 'publish' ? () => void publish() : () => navigate(returnTo)} />}</main>;
}

function validDraftKey(value: string | null) {
  return value?.startsWith('trip:') && value.length <= 80 ? value : 'new';
}

function draftPath(id: string) {
  if (id === 'new') return '/community/write';
  if (id.startsWith('trip:')) return `/community/write?draft=${encodeURIComponent(id)}`;
  return `/community/${id}/edit`;
}

function ConfirmDialog({ title, description, confirmLabel, onClose, onConfirm }: { title: string; description?: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog className="community-dialog" ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="community-confirm-title"><span className="community-overline">ODDTRIP NOTICE</span><h2 id="community-confirm-title">{title}</h2>{description && <p>{description}</p>}<div><button className="line-btn" onClick={onClose} autoFocus>취소</button><button className="solid-btn" onClick={onConfirm}>{confirmLabel}</button></div></dialog>;
}
