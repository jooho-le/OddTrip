import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { safetyService } from '../../entities/chat/api/safetyService';
import { useTripStore } from '../../entities/trip/model/tripStore';
import type { BlockedUser } from '../../types';

export function AccountSettingsPage() {
  const { user, updateProfile, status, error } = useTripStore();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [homeRegion, setHomeRegion] = useState(user?.homeRegion ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blockError, setBlockError] = useState('');

  useEffect(() => {
    setNickname(user?.nickname ?? '');
    setHomeRegion(user?.homeRegion ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user]);

  useEffect(() => {
    void safetyService.getBlocks()
      .then((response) => setBlocks(response.data))
      .catch((reason) => setBlockError(reason instanceof Error ? reason.message : '차단 목록을 불러오지 못했습니다.'))
      .finally(() => setBlocksLoading(false));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await updateProfile({ nickname, homeRegion: homeRegion || undefined, avatarUrl: avatarUrl || undefined });
  };

  const unblock = async (block: BlockedUser) => {
    setBlockError('');
    try {
      await safetyService.unblock(block.blockedUserId);
      setBlocks((items) => items.filter((item) => item.id !== block.id));
    } catch (reason) {
      setBlockError(reason instanceof Error ? reason.message : '차단 해제에 실패했습니다.');
    }
  };

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div><Link className="text-btn" to="/my">‹ 내 여행</Link><h1 style={{ marginTop: 9 }}>계정 설정</h1></div>
          <p>프로필과 차단한 사용자를 관리합니다.</p>
        </header>
        <section className="match-detail">
          <aside className="match-profile">
            <div style={{ height: 240, display: 'grid', placeItems: 'center', background: '#242424' }}>
              {avatarUrl ? <img style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover' }} src={avatarUrl} alt="프로필 미리보기" /> : <span style={{ color: '#fff', fontSize: 64, fontWeight: 900 }}>{nickname.slice(0, 1) || '?'}</span>}
            </div>
            <div className="match-profile-body"><span className="status">{user?.role ?? 'user'}</span><h2>{user?.nickname ?? '여행자'}</h2><p>{user?.email ?? '이메일 미제공'}<br />TTI {user?.ttiCode ?? '미완료'}</p></div>
          </aside>
          <form className="match-request-form" style={{ marginTop: 0 }} onSubmit={submit}>
            <div className="section-title"><h2>프로필 정보</h2><p>닉네임, 지역, 이미지 URL</p></div>
            <div className="form-grid">
              <label className="field full"><span>닉네임</span><input required maxLength={50} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
              <label className="field full"><span>생활 지역</span><input maxLength={100} value={homeRegion} onChange={(event) => setHomeRegion(event.target.value)} /></label>
              <label className="field full"><span>프로필 이미지 URL</span><input type="url" maxLength={500} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></label>
            </div>
            {error ? <div className="error-strip">{error}</div> : null}
            <p className={status.profile === 'success' ? 'form-message success' : 'form-message'}>{status.profile === 'success' ? '서버에 저장되었습니다.' : '비밀번호·계정 삭제는 현재 프로필 API 범위에 없습니다.'}</p>
            <button className="solid-btn" style={{ marginTop: 14 }} disabled={status.profile === 'loading'}>{status.profile === 'loading' ? '저장 중…' : '프로필 저장'}</button>
          </form>
        </section>

        <section style={{ marginTop: 40 }}>
          <div className="section-title"><h2>차단한 사용자</h2><p>차단을 해제해도 종료된 매칭과 채팅방은 자동 복구되지 않습니다.</p></div>
          {blockError ? <div className="error-strip" role="alert">{blockError}</div> : null}
          {blocksLoading ? <div className="skeleton-stack"><div className="skeleton-row" /></div> : null}
          {!blocksLoading && !blocks.length ? <div className="empty-state"><strong>차단한 사용자가 없습니다.</strong><p>채팅에서 차단한 사용자가 이곳에 표시됩니다.</p></div> : null}
          <div className="request-list">
            {blocks.map((block) => <article className="request-row" key={block.id}><div className="request-person"><div>{block.user.avatarUrl ? <img className="avatar" src={block.user.avatarUrl} alt="" /> : <span className="avatar" style={{ display: 'grid', placeItems: 'center', background: '#202124', color: '#fff' }}>{block.user.nickname.slice(0, 1)}</span>}</div><div><h3>{block.user.nickname}</h3><p>TTI {block.user.ttiCode ?? '미제공'}</p><small>{new Date(block.createdAt).toLocaleDateString('ko-KR')} 차단</small></div></div><button type="button" className="line-btn" onClick={() => void unblock(block)}>차단 해제</button></article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
