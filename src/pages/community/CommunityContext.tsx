import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { communityService } from '../../entities/community/api/communityService';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { ApiError } from '../../shared/api/client';
import type { Author } from '../../features/community/communityModel';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import './community.css';

/** 사이드바가 모든 화면에 붙어 있어서, 개수는 화면마다 세지 않고 한 번만 읽는다. */
type CommunitySummary = { myPosts: number; savedPosts: number; drafts: number };

type CommunityContextValue = {
  author: Author;
  summary: CommunitySummary;
  reloadSummary: () => void;
  /** 서버 변경을 실행한다. 실패하면 이유를 알리고 false를 돌려준다. */
  commit: (operation: () => Promise<unknown>) => Promise<boolean>;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);
const EMPTY_SUMMARY: CommunitySummary = { myPosts: 0, savedPosts: 0, drafts: 0 };

export function errorMessage(error: unknown, fallback = '잠시 후 다시 시도해 주세요.') {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 화면이 서버에서 읽는 자료 한 덩어리. 로딩·오류·다시 읽기를 같은 방식으로 다룬다. */
export function useCommunityResource<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ value?: T; error: string; status?: number; loading: boolean }>({ error: '', loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, error: '', status: undefined, loading: true }));
    load()
      .then((next) => { if (alive) setState({ value: next, error: '', loading: false }); })
      .catch((loadError) => {
        // 상태 코드를 남겨 두면 "없는 글"과 "서버에 못 닿음"을 화면에서 구분할 수 있다.
        if (alive) setState({ error: errorMessage(loadError, '여행 이야기를 불러오지 못했어요.'), status: loadError instanceof ApiError ? loadError.status : undefined, loading: false });
      });
    return () => { alive = false; };
    // load는 렌더마다 새로 만들어지므로 의존성에서 뺀다. 갱신 조건은 deps와 reload다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { ...state, reload: useCallback(() => setVersion((current) => current + 1), []) };
}

export function CommunityLayout() {
  const user = useTripStore((state) => state.user)!;
  return <CommunityProvider key={user.id} author={{ id: user.id, nickname: user.nickname }}><Outlet /></CommunityProvider>;
}

function CommunityProvider({ author, children }: { author: Author; children: ReactNode }) {
  const [summary, setSummary] = useState<CommunitySummary>(EMPTY_SUMMARY);
  const showInfo = useUiNoticeStore((state) => state.showInfo);

  const reloadSummary = useCallback(() => {
    // 개수만 필요하므로 목록은 한 건씩만 받아 total을 읽는다.
    Promise.all([
      communityService.listPosts({ view: 'mine', size: 1 }),
      communityService.listPosts({ view: 'saved', size: 1 }),
      communityService.listDrafts(),
    ])
      .then(([mine, saved, drafts]) => setSummary({ myPosts: mine.total, savedPosts: saved.total, drafts: drafts.length }))
      // 개수는 곁가지 정보다. 못 읽었다고 글 목록까지 막지 않는다.
      .catch(() => setSummary(EMPTY_SUMMARY));
  }, []);

  useEffect(reloadSummary, [reloadSummary]);

  const commit = useCallback(async (operation: () => Promise<unknown>) => {
    try {
      await operation();
      return true;
    } catch (error) {
      showInfo('변경을 저장하지 못했어요', errorMessage(error));
      return false;
    }
  }, [showInfo]);

  return <CommunityContext.Provider value={{ author, summary, reloadSummary, commit }}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('CommunityLayout is required');
  return context;
}
