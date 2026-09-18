import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { oddtripService } from '../../entities/trip/api/oddtripService';
import { useToast } from '../../shared/ui/Toast';

export function PasswordResetPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const show = useToast((state) => state.show);
  const token = search.get('token') ?? '';
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [debugToken, setDebugToken] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const requestReset = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await oddtripService.requestPasswordReset(email);
      setSent(true);
      setDebugToken(response.data.resetToken ?? '');
      setExpiresInMinutes(response.data.expiresInMinutes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '재설정 메일을 요청하지 못했습니다.');
    } finally { setBusy(false); }
  };

  const confirmReset = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) { setError('새 비밀번호는 8자 이상이어야 합니다.'); return; }
    if (newPassword !== confirmPassword) { setError('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try {
      await oddtripService.resetPassword(token, newPassword);
      show('비밀번호를 재설정했습니다. 새 비밀번호로 로그인해 주세요.');
      navigate('/auth', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '비밀번호를 재설정하지 못했습니다.');
      setBusy(false);
    }
  };

  return <main className="page password-reset-page"><div className="password-reset-card">
    <Link className="brand" to="/"><i>odd</i>trip</Link>
    <span className="eyebrow">ACCOUNT RECOVERY</span>
    <h1>{token ? '새 비밀번호 설정' : '비밀번호 재설정'}</h1>
    <p>{token ? '메일로 받은 일회용 링크를 확인했습니다. 새 비밀번호를 입력해 주세요.' : '가입한 이메일로 30분 동안 한 번 사용할 수 있는 재설정 링크를 보냅니다.'}</p>
    {error ? <div className="error-strip" role="alert">{error}</div> : null}
    {!token && !sent ? <form className="auth-form" onSubmit={requestReset}><label className="field"><span>가입 이메일</span><input type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><button className="solid-btn" disabled={busy}>{busy ? '요청 중…' : '재설정 링크 받기'}</button></form> : null}
    {!token && sent ? <div className="reset-sent"><strong>메일을 확인해 주세요.</strong><p>가입 여부를 노출하지 않기 위해 항상 같은 안내를 표시합니다. 계정이 있다면 {expiresInMinutes}분 동안 한 번 사용할 수 있는 재설정 링크가 발송됩니다.</p>{debugToken ? <Link className="solid-btn" to={`/password-reset?token=${encodeURIComponent(debugToken)}`}>개발용 재설정 링크 열기</Link> : null}</div> : null}
    {token ? <form className="auth-form" onSubmit={confirmReset}><label className="field"><span>새 비밀번호</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label className="field"><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><button className="solid-btn" disabled={busy}>{busy ? '변경 중…' : '비밀번호 재설정'}</button></form> : null}
    <Link className="text-btn password-reset-back" to="/auth">로그인으로 돌아가기 →</Link>
  </div></main>;
}
