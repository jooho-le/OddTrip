import { type FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';

type Mode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, login, register, status, user } = useTripStore();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [homeRegion, setHomeRegion] = useState('');

  useEffect(() => {
    sessionStorage.removeItem('oddtrip.sessionExpired');
  }, []);

  if (user && localStorage.getItem('oddtrip.authToken')) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = mode === 'login'
      ? await login(email, password)
      : await register({ email, password, nickname, homeRegion: homeRegion || undefined });
    if (ok) navigate(mode === 'register' ? '/tti/start' : '/');
  };

  return (
    <main className="auth-page">
      <section className="auth-image" aria-label="OddTrip 여행 이미지">
        <div className="auth-image-copy"><span className="eyebrow" style={{ color: '#ffb39f' }}>DIFFERENT TASTES, ONE TRIP</span><h1>다른 취향 그대로,<br />하나의 여행으로.</h1><p>계정은 TTI 결과, 동행 요청, 채팅과 공동 여행을 한 흐름으로 연결합니다.</p></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <span className="eyebrow">ODDTRIP ACCOUNT</span>
          <h2>{mode === 'login' ? '다시 만났네요.' : '여행을 시작합니다.'}</h2>
          <p>{mode === 'login' ? '저장된 여행 공간으로 돌아가세요.' : '계정을 만들고 여행 성향 조사서를 작성하세요.'}</p>
          <div className="auth-tabs" role="tablist"><button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')} role="tab" aria-selected={mode === 'login'}>로그인</button><button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')} role="tab" aria-selected={mode === 'register'}>회원가입</button></div>
          {searchParams.get('expired') ? <div className="error-strip" role="alert">세션이 만료되었습니다. 다시 로그인해주세요.</div> : null}
          <form className="auth-form" onSubmit={submit}>
            <label className="field"><span>이메일</span><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
            <label className="field"><span>비밀번호</span><input type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" /></label>
            {mode === 'register' ? <><label className="field"><span>닉네임</span><input required maxLength={50} autoComplete="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><label className="field"><span>생활 지역 · 선택</span><input maxLength={100} value={homeRegion} onChange={(event) => setHomeRegion(event.target.value)} placeholder="예: 서울" /></label></> : null}
            {error ? <div className="error-strip" role="alert">{error}</div> : null}
            <button className="solid-btn" disabled={status.auth === 'loading'} aria-busy={status.auth === 'loading'}>{status.auth === 'loading' ? '처리 중…' : mode === 'login' ? '로그인' : '가입하고 TTI 시작'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
