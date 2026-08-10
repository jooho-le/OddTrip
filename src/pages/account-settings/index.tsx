import { useEffect, useState, type FormEvent } from 'react';
import { Camera, Save } from 'lucide-react';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { Avatar } from '../../shared/ui/Avatar';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { useToast } from '../../shared/ui/Toast';
import { ProgressBar } from '../../shared/ui/ProgressBar';

export function AccountSettingsPage() {
  const { user, updateProfile } = useTripStore();
  const showToast = useToast((state) => state.show);
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [homeRegion, setHomeRegion] = useState(user?.homeRegion ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const completeness = [nickname, homeRegion, avatarUrl].filter(Boolean).length * 25 + (user?.email ? 25 : 0);
  useEffect(() => { setNickname(user?.nickname ?? ''); setHomeRegion(user?.homeRegion ?? ''); setAvatarUrl(user?.avatarUrl ?? ''); }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const success = await updateProfile({ nickname: nickname.trim(), homeRegion: homeRegion.trim(), avatarUrl: avatarUrl.trim() });
    setSaving(false); if (success) showToast('계정 설정을 저장했습니다.');
  }

  return <div className="page-canvas"><section className="mb-6"><p className="eyebrow">Account</p><h1>계정 설정</h1><p>프로필과 기본 여행 정보를 관리합니다.</p></section>
    <Card className="mx-auto max-w-2xl"><form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-4"><Avatar src={avatarUrl} fallback={nickname} className="h-20 w-20 text-2xl"/><div><h2 className="font-extrabold">프로필 이미지</h2><p className="mt-1 text-xs text-muted">이미지 URL을 입력하면 바로 미리 볼 수 있어요.</p></div></div>
      <ProgressBar value={completeness} label="프로필 완성도" />
      <label className="field-label"><span><Camera className="h-4 w-4"/>이미지 URL</span><input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." /></label>
      <label className="field-label"><span>닉네임</span><input required minLength={2} value={nickname} onChange={(e) => setNickname(e.target.value)} /></label>
      <label className="field-label"><span>이메일</span><input value={user?.email ?? ''} disabled /><small>이메일 변경은 현재 지원하지 않습니다.</small></label>
      <label className="field-label"><span>기본 출발 지역</span><input value={homeRegion} onChange={(e) => setHomeRegion(e.target.value)} placeholder="예: 서울" /></label>
      <Button type="submit" disabled={saving || !nickname.trim()} icon={<Save className="h-4 w-4"/>}>{saving ? '저장 중...' : '변경사항 저장'}</Button>
    </form></Card>
  </div>;
}
