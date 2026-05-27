import { FormEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useTripStore } from '../../entities/tripStore';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

type Mode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const { error, login, register, status, user } = useTripStore();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [homeRegion, setHomeRegion] = useState('Seoul');

  if (user) return <Navigate to="/tti/start" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = mode === 'login'
      ? await login(email, password)
      : await register({ email, password, nickname, homeRegion });
    if (ok) navigate('/tti/start');
  };

  return (
    <div className="page-canvas grid min-h-[calc(100dvh-7rem)] place-items-center">
      <Card className="w-full max-w-xl rounded-[28px] p-6 md:p-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#fd267a]">OddTrip Account</p>
          <h1 className="mt-3 text-3xl font-black text-[#111111] md:text-5xl">{mode === 'login' ? '로그인' : '회원가입'}</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
            계정에 TTI 결과, 매칭, 저장한 관광지와 일정을 안전하게 연결합니다.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Field icon={<Mail className="h-4 w-4" />} label="이메일" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Field icon={<LockKeyhole className="h-4 w-4" />} label="비밀번호" type="password" value={password} onChange={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {mode === 'register' ? (
            <>
              <Field icon={<UserRound className="h-4 w-4" />} label="닉네임" value={nickname} onChange={setNickname} autoComplete="nickname" />
              <Field label="지역" value={homeRegion} onChange={setHomeRegion} />
            </>
          ) : null}
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
          <Button className="w-full" disabled={status.auth === 'loading'}>
            {status.auth === 'loading' ? '처리 중' : mode === 'login' ? '로그인' : '가입하고 시작'}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-[#f5f0e9] px-4 py-3 text-sm font-black text-slate-700"
          onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
        >
          {mode === 'login' ? '계정이 없어요. 회원가입' : '이미 계정이 있어요. 로그인'}
        </button>
      </Card>
    </div>
  );
}

function Field({
  autoComplete,
  icon,
  label,
  onChange,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <div className="flex min-h-12 items-center gap-3 rounded-xl border border-black/10 bg-white px-4">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        <input
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
          required
          minLength={type === 'password' ? 8 : undefined}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}
