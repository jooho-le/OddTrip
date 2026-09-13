import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useConsentStore } from '../../entities/consent/model/consentStore';
import { decision, type ConsentType } from '../../entities/consent/api/consentService';

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
  useEffect(() => { setNickname(user?.nickname ?? ''); setHomeRegion(user?.homeRegion ?? ''); setAvatarUrl(user?.avatarUrl ?? ''); }, [user]);
  const submit = async (event: FormEvent) => { event.preventDefault(); await updateProfile({ nickname, homeRegion: homeRegion || undefined, avatarUrl: avatarUrl || undefined }); };
  return <main className="page"><div className="container"><header className="page-heading"><div><Link className="text-btn" to="/my">‹ 내 여행</Link><h1 style={{ marginTop: 9 }}>계정 설정</h1></div><p>현재 사용자 프로필 API에 저장됩니다.</p></header><section className="match-detail"><aside className="match-profile"><div style={{ height: 240, display: 'grid', placeItems: 'center', background: '#242424' }}>{avatarUrl ? <img style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover' }} src={avatarUrl} alt="프로필 미리보기" /> : <span style={{ color: '#fff', fontSize: 64, fontWeight: 900 }}>{nickname.slice(0, 1) || '?'}</span>}</div><div className="match-profile-body"><span className="status">{user?.role ?? 'user'}</span><h2>{user?.nickname ?? '여행자'}</h2><p>{user?.email ?? '이메일 미제공'}<br />TTI {user?.ttiCode ?? '미완료'}</p></div></aside><form className="match-request-form" style={{ marginTop: 0 }} onSubmit={submit}><div className="section-title"><h2>프로필 정보</h2><p>닉네임, 지역, 이미지 URL</p></div><div className="form-grid"><label className="field full"><span>닉네임</span><input required maxLength={50} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><label className="field full"><span>생활 지역</span><input maxLength={100} value={homeRegion} onChange={(event) => setHomeRegion(event.target.value)} /></label><label className="field full"><span>프로필 이미지 URL</span><input type="url" maxLength={500} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></label></div>{error ? <div className="error-strip">{error}</div> : null}<p className={status.profile === 'success' ? 'form-message success' : 'form-message'}>{status.profile === 'success' ? '서버에 저장되었습니다.' : '비밀번호·계정 삭제는 현재 프로필 API 범위에 없습니다.'}</p><button className="solid-btn" style={{ marginTop: 14 }} disabled={status.profile === 'loading'}>{status.profile === 'loading' ? '저장 중…' : '프로필 저장'}</button></form></section><ConsentSettings /></div></main>;
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
