import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

export function VerificationPage() {
  const user = useTripStore((state) => state.user);
  const showComingSoon = useUiNoticeStore((state) => state.showComingSoon);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const [phone, setPhone] = useState('');

  const requestCode = (event: FormEvent) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      showInfo('휴대전화 번호를 확인해 주세요.', '숫자 10~11자리의 국내 휴대전화 번호를 입력해 주세요.');
      return;
    }
    showComingSoon('휴대전화 인증번호 발송', '실제 SMS 인증기관과 연결되기 전이므로 인증번호를 발송하거나 인증 완료 상태로 변경하지 않았습니다.');
  };

  return (
    <main className="page verification-page">
      <div className="container">
        <header className="page-heading">
          <div><span className="eyebrow">IDENTITY · VERIFICATION</span><h1>본인확인</h1></div>
          <p>매칭을 시작하기 전에 성인 여부와 본인 명의를 확인하는 절차입니다.</p>
        </header>

        <div className="verification-grid">
          <section className="verification-document">
            <div className="verification-step"><b>01</b><span>번호 확인</span><em>현재 단계</em></div>
            <div className="verification-step muted"><b>02</b><span>인증번호 입력</span><em>연결 대기</em></div>
            <div className="verification-step muted"><b>03</b><span>완료</span><em>연결 대기</em></div>

            <form onSubmit={requestCode} className="verification-form">
              <p className="paper-note">본인 명의의 휴대전화 번호를 입력해 주세요. 본인확인이 정식 제공되면 필요한 정보만 안전하게 처리합니다.</p>
              <label className="document-field">
                <span>휴대전화 번호</span>
                <input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" />
              </label>
              <button className="solid-btn" type="submit">인증번호 요청</button>
            </form>

            <div className="verification-code" aria-disabled="true">
              <label className="document-field">
                <span>인증번호 6자리</span>
                <input disabled inputMode="numeric" placeholder="SMS 연결 후 입력할 수 있습니다" />
              </label>
              <button type="button" className="line-btn" disabled>인증 확인</button>
            </div>
          </section>

          <aside className="verification-aside">
            <span className="eyebrow">ACCOUNT CHECK</span>
            <h2>{user?.nickname ?? '여행자'}님의<br />안전한 매칭을 위해</h2>
            <dl>
              <div><dt>현재 상태</dt><dd>준비 중</dd></div>
              <div><dt>확인 목적</dt><dd>성인·본인 명의</dd></div>
              <div><dt>공개 범위</dt><dd>인증 여부만 공개</dd></div>
            </dl>
            <p>휴대전화 번호 원문을 다른 회원에게 보여주지 않습니다. 실제 처리 항목과 보유기간은 인증기관 확정 후 별도 동의 화면에 반영합니다.</p>
            <Link className="line-btn" to="/settings">계정 설정으로 돌아가기</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
