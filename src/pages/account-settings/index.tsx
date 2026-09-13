import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { safetyService } from '../../entities/chat/api/safetyService';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useConsentStore } from '../../entities/consent/model/consentStore';
import { decision, type ConsentType } from '../../entities/consent/api/consentService';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';
import type { BlockedUser } from '../../types';

const CONSENT_LABELS: Record<ConsentType, string> = {
  terms: '서비스 이용약관',
  community: '커뮤니티 운영정책',
  adult: '만 19세 이상 및 본인 명의 확인',
  privacy_notice: '개인정보 처리 안내 확인',
  marketing: '이벤트 및 혜택 정보 수신',
  matching_profile: '매칭 프로필 공개',
  safety_guide: '안전 이용수칙 확인',
};

const CONSENT_DOCUMENTS: Partial<Record<ConsentType, string>> = {
  terms: '/legal/terms',
  community: '/legal/community',
  privacy_notice: '/legal/privacy',
  marketing: '/legal/marketing',
  matching_profile: '/legal/matching-profile',
  safety_guide: '/legal/safety',
};

function formatMoment(value: string | null) {
  if (!value) return '기록 없음';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '기록 없음';
  return parsed.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

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
          <p>프로필, 동의 설정, 차단한 사용자를 관리합니다.</p>
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
            <p className={status.profile === 'success' ? 'form-message success' : 'form-message'}>{status.profile === 'success' ? '서버에 저장되었습니다.' : '비밀번호 변경은 아직 제공되지 않습니다.'}</p>
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

        <ConsentSettings />

        <WithdrawAccount />
      </div>
    </main>
  );
}

function ConsentSettings() {
  const status = useConsentStore((state) => state.status);
  const loadStatus = useConsentStore((state) => state.loadStatus);
  const submitStatus = useConsentStore((state) => state.submitStatus);
  const error = useConsentStore((state) => state.error);
  const load = useConsentStore((state) => state.load);
  const submit = useConsentStore((state) => state.submit);

  useEffect(() => { void load(); }, [load]);

  const marketing = status?.items.find((item) => item.type === 'marketing');
  const revocable = status?.revocable ?? [];

  const toggleMarketing = async () => {
    if (!marketing) return;
    await submit([decision('marketing', !marketing.accepted)], 'settings');
  };

  return (
    <section className="consent-settings">
      <div className="section-title">
        <h2>동의 및 수신 설정</h2>
        <p>동의한 문서와 버전, 동의 시각이 계정에 기록됩니다.</p>
      </div>

      {loadStatus === 'loading' ? <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div> : null}
      {loadStatus === 'error' ? (
        <div className="error-strip" role="alert"><span>{error ?? '동의 상태를 불러오지 못했습니다.'}</span><button onClick={() => void load()}>다시 시도</button></div>
      ) : null}

      {status ? (
        <>
          <div className="consent-toggle-row">
            <div>
              <strong>이벤트 및 혜택 정보 수신</strong>
              <p>
                {marketing?.accepted
                  ? '수신에 동의한 상태입니다. 언제든지 철회할 수 있습니다.'
                  : '수신하지 않는 상태입니다. 동의하지 않아도 기본 서비스는 그대로 이용할 수 있습니다.'}
              </p>
              {/* 계정·보안·약관 안내는 수신 동의와 무관하게 발송되므로 미리 알립니다. */}
              <small>계정 보안, 매칭 상태, 약관 변경 안내는 수신 동의와 관계없이 발송됩니다.</small>
            </div>
            <button
              type="button"
              className={marketing?.accepted ? 'line-btn' : 'solid-btn'}
              disabled={submitStatus === 'loading' || !marketing}
              onClick={() => void toggleMarketing()}
            >
              {submitStatus === 'loading' ? '처리 중…' : marketing?.accepted ? '수신 철회' : '수신 동의'}
            </button>
          </div>
          {submitStatus === 'error' && error ? <div className="error-strip" role="alert">{error}</div> : null}

          <table className="consent-record-table">
            <thead>
              <tr><th scope="col">항목</th><th scope="col">상태</th><th scope="col">버전</th><th scope="col">기록 시각</th></tr>
            </thead>
            <tbody>
              {status.items.map((item) => {
                const documentPath = CONSENT_DOCUMENTS[item.type];
                return (
                  <tr key={item.type}>
                    <th scope="row">
                      {documentPath ? <Link to={documentPath}>{CONSENT_LABELS[item.type]}</Link> : CONSENT_LABELS[item.type]}
                    </th>
                    <td>
                      {item.accepted ? '동의함' : item.stale ? '재동의 필요' : '동의 안 함'}
                    </td>
                    <td>{item.version ?? '—'}</td>
                    <td>{formatMoment(item.acceptedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="form-message">
            {/* 철회 가능한 항목을 명시합니다. 나머지는 서비스 이용의 전제라 탈퇴로만 회수됩니다. */}
            철회할 수 있는 항목: {revocable.length ? revocable.map((type) => CONSENT_LABELS[type]).join(', ') : '없음'}.
            나머지 항목은 서비스 이용의 전제라 개별 철회 대신 회원 탈퇴로 회수됩니다.
          </p>
        </>
      ) : null}
    </section>
  );
}


function WithdrawAccount() {
  const navigate = useNavigate();
  const withdraw = useTripStore((state) => state.withdraw);
  const error = useTripStore((state) => state.error);
  const status = useTripStore((state) => state.status);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await withdraw(password);
    if (!ok) {
      // 실패는 대부분 비밀번호 오류입니다. 입력만 비우고 화면은 유지합니다.
      setPassword('');
      return;
    }
    showInfo('계정이 삭제되었습니다.', '이용해 주셔서 감사합니다. 같은 이메일로 다시 가입할 수 있습니다.');
    navigate('/auth', { replace: true });
  };

  return (
    <section className="withdraw-panel">
      <div className="section-title">
        <h2>계정 삭제</h2>
        <p>삭제하면 되돌릴 수 없습니다.</p>
      </div>

      <ul className="withdraw-effects">
        <li>닉네임, 프로필 이미지, 지역, 여행 성향 결과가 삭제됩니다.</li>
        <li>진행 중인 매칭이 종료되고 상대방에게 알림이 갑니다.</li>
        <li>주고받은 매칭 요청이 모두 정리됩니다.</li>
        {/* 남는 것을 숨기지 않고 먼저 밝힙니다. 삭제라고 해놓고 남기면 그게 문제입니다. */}
        <li>신고·분쟁 처리와 관련 법령상 보존이 필요한 기록은 별도로 보관됩니다.</li>
        <li>모든 기기에서 로그아웃되며 계정은 복구할 수 없습니다.</li>
      </ul>

      {open ? (
        <form className="withdraw-form" onSubmit={submit}>
          <label className="field full">
            <span>확인을 위해 비밀번호를 입력해주세요</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && status.auth === 'error' ? <div className="error-strip" role="alert">{error}</div> : null}
          <div className="button-row">
            <button type="button" className="line-btn" onClick={() => { setOpen(false); setPassword(''); }}>취소</button>
            <button type="submit" className="danger-btn" disabled={!password || status.auth === 'loading'}>
              {status.auth === 'loading' ? '삭제하는 중…' : '계정 영구 삭제'}
            </button>
          </div>
        </form>
      ) : (
        <div className="button-row" style={{ justifyContent: 'flex-start', gap: 14 }}>
          <button type="button" className="line-btn danger" onClick={() => setOpen(true)}>계정 삭제</button>
          <Link className="text-btn" to="/legal/account-deletion">삭제 안내 전문 보기</Link>
        </div>
      )}
    </section>
  );
}
