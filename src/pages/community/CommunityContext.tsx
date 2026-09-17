import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { createCommunityRepository, type Author, type CommunityData } from '../../features/community/communityModel';
import { COMMUNITY_SAMPLES } from '../../features/community/communitySamples';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import './community.css';

type CommunityContextValue = {
  data: CommunityData; author: Author;
  repository: ReturnType<typeof createCommunityRepository>;
  commit: (operation: () => CommunityData) => boolean;
};
const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityLayout() {
  const user = useTripStore((state) => state.user)!;
  return <CommunityProvider key={user.id} author={{ id: user.id, nickname: user.nickname }}><Outlet /></CommunityProvider>;
}

function CommunityProvider({ author, children }: { author: Author; children: ReactNode }) {
  const repository = useMemo(() => createCommunityRepository(window.localStorage, author, COMMUNITY_SAMPLES), [author.id, author.nickname]);
  const [data, setData] = useState<CommunityData>();
  const [loadError, setLoadError] = useState('');
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const load = () => {
    try { setData(repository.load()); setLoadError(''); }
    catch (error) { setLoadError(error instanceof Error ? error.message : '저장된 자료를 불러오지 못했어요.'); }
  };
  useEffect(() => {
    load();
    const onStorage = (event: StorageEvent) => { if (event.key === repository.key || event.key === null) load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [repository]);

  if (loadError) return <main className="container community"><div className="community-empty" role="alert"><h1>기록을 불러오지 못했어요</h1><p>{loadError}</p><button className="line-btn" onClick={load}>다시 불러오기</button></div></main>;
  if (!data) return <main className="container community" aria-busy="true"><p role="status">여행 이야기를 불러오고 있어요.</p></main>;
  const commit = (operation: () => CommunityData) => {
    try { setData(operation()); return true; }
    catch (error) { showInfo('변경을 저장하지 못했어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'); return false; }
  };
  return <CommunityContext.Provider value={{ data, author, repository, commit }}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('CommunityLayout is required');
  return context;
}
