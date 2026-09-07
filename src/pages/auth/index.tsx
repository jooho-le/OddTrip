import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { saveRegistrationConsent } from '../../shared/legal/consentStorage';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

type Mode = 'login' | 'register';
type ConsentKey = 'terms' | 'community' | 'adult' | 'privacy' | 'marketing';

const EMPTY_CONSENTS: Record<ConsentKey, boolean> = {
  terms: false,
  community: false,
  adult: false,
  privacy: false,
  marketing: false,
};

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, login, register, status, user } = useTripStore();
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [homeRegion, setHomeRegion] = useState('');
  const [consents, setConsents] = useState(EMPTY_CONSENTS);
  const [draftNoticeShown, setDraftNoticeShown] = useState(false);
  const requiredAccepted = consents.terms && consents.community && consents.adult && consents.privacy;
  const registrationFieldsComplete = Boolean(email.trim() && password.length >= 8 && nickname.trim());
  const registrationReady = requiredAccepted && registrationFieldsComplete;
  const allAccepted = Object.values(consents).every(Boolean);

  useEffect(() => {
    sessionStorage.removeItem('oddtrip.sessionExpired');
  }, []);

  if (user && localStorage.getItem('oddtrip.authToken')) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && !requiredAccepted) return;
    const ok = mode === 'login'
      ? await login(email, password)
      : await register({ email, password, nickname, homeRegion: homeRegion || undefined });
    if (!ok) return;
    if (mode === 'register') {
      try {
        saveRegistrationConsent({
          accountEmail: email,
          userId: useTripStore.getState().user?.id,
          marketingAccepted: consents.marketing,
        });
      } catch {
        // 가입 성공을 브라우저 저장소 오류 때문에 되돌릴 수는 없습니다.
      }
      showInfo(
        '가입 동의를 확인했습니다.',
        '필수 동의와 선택한 수신 동의는 현재 이 브라우저에 기록됩니다. 서버 동의 이력 저장과 철회 설정은 준비 중입니다.',
      );
    }
    navigate(mode === 'register' ? '/tti/start' : '/');
  };

  const setConsent = (key: ConsentKey, checked: boolean) => {
    setConsents((current) => ({ ...current, [key]: checked }));
  };

  const setModeSafely = (nextMode: Mode) => {
    setMode(nextMode);
    if (nextMode === 'register' && !draftNoticeShown) {
      setDraftNoticeShown(true);
      showInfo(
        '가입 약관은 현재 공개 전 초안입니다.',
        '제공된 원문에 시행일과 운영주체 자리표시자가 남아 있습니다. 실제 서비스 가입에 사용하기 전에 최종 문서와 개인정보 처리방침을 확정해야 합니다.',
      );
    }
  };

  return (
    <main className={mode === 'register' ? 'auth-page register-mode' : 'auth-page'}>
      <section className="auth-image" aria-label="OddTrip 여행 이미지">
        <div className="auth-image-copy"><span className="eyebrow" style={{ color: '#ffb39f' }}>DIFFERENT TASTES, ONE TRIP</span><h1>다른 취향 그대로,<br />하나의 여행으로.</h1><p>계정은 TTI 결과, 동행 요청, 채팅과 공동 여행을 한 흐름으로 연결합니다.</p></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <span className="eyebrow">ODDTRIP ACCOUNT</span>
          <h2>{mode === 'login' ? '다시 만났네요.' : '여행을 시작합니다.'}</h2>
          <p>{mode === 'login' ? '저장된 여행 공간으로 돌아가세요.' : '계정을 만들고 여행 성향 조사서를 작성하세요.'}</p>
          <div className="auth-tabs" role="tablist"><button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setModeSafely('login')} role="tab" aria-selected={mode === 'login'}>로그인</button><button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setModeSafely('register')} role="tab" aria-selected={mode === 'register'}>회원가입</button></div>
          {searchParams.get('expired') ? <div className="error-strip" role="alert">세션이 만료되었습니다. 다시 로그인해주세요.</div> : null}
          <form className="auth-form" onSubmit={submit}>
            <label className="field"><span>이메일</span><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
            <label className="field"><span>비밀번호</span><input type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" /></label>
            {mode === 'register' ? <><label className="field"><span>닉네임</span><input required maxLength={50} autoComplete="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><label className="field"><span>생활 지역 · 선택</span><input maxLength={100} value={homeRegion} onChange={(event) => setHomeRegion(event.target.value)} placeholder="예: 서울" /></label></> : null}
            {mode === 'register' ? (
              <section className="signup-consents" aria-labelledby="signup-consent-title">
                <div className="signup-consent-heading">
                  <div><span className="eyebrow">AGREEMENT</span><h3 id="signup-consent-title">가입 동의</h3></div>
                  <small>필수 4 · 선택 1</small>
                </div>
                <label className="consent-all">
                  <input
                    type="checkbox"
                    checked={allAccepted}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setConsents({ terms: checked, community: checked, adult: checked, privacy: checked, marketing: checked });
                    }}
                  />
                  <span><b>{allAccepted ? '전체 동의 해제' : '전체 동의'}</b><small>선택 항목을 포함하며 언제든 개별 변경할 수 있습니다.</small></span>
                </label>
                <div className="consent-list">
                  <ConsentRow checked={consents.terms} onChange={(checked) => setConsent('terms', checked)} label="[필수] OddTrip 서비스 이용약관에 동의합니다." to="/legal/terms" />
                  <ConsentRow checked={consents.community} onChange={(checked) => setConsent('community', checked)} label="[필수] OddTrip 커뮤니티 운영정책에 동의합니다." to="/legal/community" />
                  <ConsentRow checked={consents.adult} onChange={(checked) => setConsent('adult', checked)} label="[필수] 본인은 만 19세 이상이며 본인의 정보로 가입합니다." />
                  <ConsentRow checked={consents.privacy} onChange={(checked) => setConsent('privacy', checked)} label="[확인] 개인정보 처리방침을 확인했습니다." to="/legal/privacy" />
                  <ConsentRow checked={consents.marketing} onChange={(checked) => setConsent('marketing', checked)} label="[선택] 이벤트 및 혜택 정보 수신에 동의합니다." to="/legal/marketing" optional />
                </div>
                <p className={registrationReady ? 'consent-hint ready' : 'consent-hint'}>
                  {registrationReady
                    ? '가입 정보와 필수 동의를 모두 확인했습니다.'
                    : requiredAccepted
                      ? '이메일, 8자 이상 비밀번호와 닉네임을 입력해 주세요.'
                      : '가입 정보와 필수 동의 4개를 모두 완료해 주세요.'}
                </p>
              </section>
            ) : null}
            {error ? <div className="error-strip" role="alert">{error}</div> : null}
            <button className="solid-btn" disabled={status.auth === 'loading' || (mode === 'register' && !registrationReady)} aria-busy={status.auth === 'loading'}>{status.auth === 'loading' ? '처리 중…' : mode === 'login' ? '로그인' : '필수 항목에 동의하고 가입하기'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function ConsentRow({ checked, onChange, label, to, optional = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; to?: string; optional?: boolean }) {
  return (
    <div className={optional ? 'consent-row optional' : 'consent-row'}>
      <label>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {to ? <Link to={to} target="_blank" rel="noreferrer" aria-label={label + ' 내용 보기'}>내용 보기 ↗</Link> : null}
    </div>
  );
}
