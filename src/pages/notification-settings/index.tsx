import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { decision } from '../../entities/consent/api/consentService';
import { useConsentStore } from '../../entities/consent/model/consentStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

export function NotificationSettingsPage() {
  const consent = useConsentStore((state) => state.status);
  const loadStatus = useConsentStore((state) => state.loadStatus);
  const submitStatus = useConsentStore((state) => state.submitStatus);
  const error = useConsentStore((state) => state.error);
  const load = useConsentStore((state) => state.load);
  const submit = useConsentStore((state) => state.submit);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);

  useEffect(() => { void load(); }, [load]);

  const marketing = consent?.items.find((item) => item.type === 'marketing');
  const toggleMarketing = () => marketing && submit([decision('marketing', !marketing.accepted)], 'settings');

  return (
    <main className="page">
      <div className="container">
        <header className="page-heading">
          <div><Link className="text-btn" to="/settings">‹ 계정 설정</Link><h1 style={{ marginTop: 9 }}>알림 설정</h1></div>
          <p>서비스 운영 알림과 선택 수신 채널을 구분해 관리합니다.</p>
        </header>

        <section className="channel-ledger">
          <ChannelRow
            number="01"
            title="서비스 내 알림"
            description="동행 요청, 매칭 상태, 채팅과 신고 처리 결과를 알림함에서 받습니다."
            status="사용 중"
            locked
            action={() => showComingSoon('서비스 알림 개별 설정', '알림 유형별 수신 설정 API가 준비되기 전까지 필수 서비스 알림은 알림함에 표시됩니다.')}
          />
          <ChannelRow
            number="02"
            title="이벤트·혜택 이메일"
            description="이벤트, 신규 기능과 여행 콘텐츠 안내를 이메일로 받습니다."
            status={loadStatus === 'loading' ? '확인 중' : marketing?.accepted ? '수신 중' : '수신 안 함'}
            action={() => void toggleMarketing()}
            busy={submitStatus === 'loading' || !marketing}
            actionLabel={marketing?.accepted ? '수신 철회' : '수신 동의'}
          />
          <ChannelRow
            number="03"
            title="여행 리마인더"
            description="여행 시작 하루 전에는 일정과 준비물을, 여행이 끝난 다음 날에는 후기 작성을 알림함으로 안내합니다."
            status="사용 중"
            locked
            action={() => showComingSoon('여행 리마인더 개별 설정', '알림 유형별 수신 설정 API가 준비되기 전까지 여행 리마인더는 알림함에 표시됩니다.')}
          />
          <ChannelRow
            number="04"
            title="모바일 Push"
            description="앱이 닫혀 있을 때 동행 요청과 중요한 여행 변경을 기기로 받습니다."
            status="연결 전"
            action={() => showComingSoon('모바일 Push', '기기 토큰 등록·철회와 APNs/FCM 전송 결과 API가 준비되기 전에는 권한을 요청하지 않습니다.')}
          />
        </section>

        {error ? <div className="error-strip" role="alert"><span>{error}</span><button onClick={() => void load()}>다시 시도</button></div> : null}
        <p className="channel-footnote">계정 보안, 약관 변경과 매칭 상태처럼 서비스 운영에 필요한 안내는 마케팅 수신 동의와 관계없이 발송될 수 있습니다.</p>
      </div>
    </main>
  );
}

function ChannelRow({ number, title, description, status, action, actionLabel = '설정 보기', locked = false, busy = false }: { number: string; title: string; description: string; status: string; action: () => void; actionLabel?: string; locked?: boolean; busy?: boolean }) {
  return (
    <article className="channel-row">
      <b className="channel-no">{number}</b>
      <div><h2>{title}</h2><p>{description}</p></div>
      <span className={locked ? 'status' : 'status gray'}>{status}</span>
      <button type="button" className="line-btn" disabled={busy} onClick={action}>{busy ? '처리 중…' : actionLabel}</button>
    </article>
  );
}
