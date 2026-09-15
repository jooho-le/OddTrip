import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import {
  decision,
  isAccepted,
  stateOf,
  MATCHING_GATES,
  type ConsentType,
} from '../../entities/consent/api/consentService';
import { useConsentStore } from '../../entities/consent/model/consentStore';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

type LegalDocumentKey = 'terms' | 'community' | 'privacy' | 'safety' | 'matching-profile' | 'marketing' | 'account-deletion';

const LEGAL_DOCUMENTS: Record<LegalDocumentKey, { title: string; file: string; kicker: string }> = {
  terms: {
    title: '서비스 이용약관',
    file: '/legal/oddtrip-terms.md',
    kicker: 'TERMS OF SERVICE',
  },
  community: {
    title: '커뮤니티 운영정책',
    file: '/legal/community-policy.md',
    kicker: 'COMMUNITY POLICY',
  },
  privacy: {
    title: '필수 개인정보 처리 안내',
    file: '/legal/privacy-processing-notice.md',
    kicker: 'PRIVACY NOTICE',
  },
  safety: {
    title: '안전 이용수칙',
    file: '/legal/safety-guide.md',
    kicker: 'SAFETY GUIDE',
  },
  'matching-profile': {
    title: '매칭 프로필 공개 동의',
    file: '/legal/matching-profile-consent.md',
    kicker: 'MATCHING PROFILE CONSENT',
  },
  marketing: {
    title: '이벤트 및 혜택 정보 수신 동의',
    file: '/legal/marketing-consent.md',
    kicker: 'MARKETING CONSENT',
  },
  // 로그인 없이 열리는 경로여야 합니다. 앱을 설치하지 않았거나 로그인할 수
  // 없는 사람도 삭제를 요청할 수 있어야 한다는 스토어 정책 요건입니다.
  'account-deletion': {
    title: '계정 삭제 안내',
    file: '/legal/account-deletion.md',
    kicker: 'ACCOUNT DELETION',
  },
};

export function LegalPage() {
  const { document: documentKey = '' } = useParams();
  const config = LEGAL_DOCUMENTS[documentKey as LegalDocumentKey];
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!config) return;
    let active = true;
    setSource('');
    setError('');
    fetch(config.file)
      .then((response) => {
        if (!response.ok) throw new Error('문서를 불러오지 못했습니다.');
        return response.text();
      })
      .then((text) => {
        if (active) setSource(text);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '문서를 불러오지 못했습니다.');
      });
    return () => { active = false; };
  }, [config]);

  useEffect(() => {
    if (config) document.title = config.title + ' | OddTrip';
    return () => { document.title = 'OddTrip'; };
  }, [config]);

  if (!config) return <Navigate to="/legal/terms" replace />;

  const isDraft = source.includes('[YYYY년 MM월 DD일]');

  return (
    <div className="legal-shell">
      <header className="legal-header">
        <Link className="brand" to="/" aria-label="OddTrip 홈"><i>odd</i>trip<small>DIFFERENT TASTES, ONE TRIP</small></Link>
        <nav aria-label="법적 고지">
          <Link className={documentKey === 'terms' ? 'active' : ''} to="/legal/terms">이용약관</Link>
          <Link className={documentKey === 'community' ? 'active' : ''} to="/legal/community">운영정책</Link>
          <Link className={documentKey === 'privacy' ? 'active' : ''} to="/legal/privacy">개인정보 처리 안내</Link>
          <Link className={documentKey === 'safety' ? 'active' : ''} to="/legal/safety">안전 이용수칙</Link>
          <Link className={documentKey === 'account-deletion' ? 'active' : ''} to="/legal/account-deletion">계정 삭제</Link>
        </nav>
        <Link className="line-btn" to="/auth">가입 화면으로</Link>
      </header>
      <main className="legal-page">
        <aside className="legal-index" aria-label="문서 정보">
          <span className="eyebrow">{config.kicker}</span>
          <strong>{config.title}</strong>
          <p>OddTrip 가입 및 기능 이용 전에 확인하는 문서입니다.</p>
          <a href={config.file} target="_blank" rel="noreferrer">원문 파일 열기 ↗</a>
        </aside>
        <article className="legal-document">
          {isDraft ? (
            <div className="legal-draft-note" role="note">
              <b>공개 전 확인 필요</b>
              <span>제공된 원문에 시행일과 운영주체 자리표시자가 남아 있습니다. 정식 배포 전에 확정해야 합니다.</span>
            </div>
          ) : null}
          {error ? <div className="error-strip" role="alert">{error}</div> : null}
          {!source && !error ? <div className="legal-loading" role="status">문서를 불러오고 있습니다.</div> : null}
          {source ? <MarkdownDocument source={source} /> : null}
        </article>
      </main>
    </div>
  );
}

function MarkdownDocument({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return <>{blocks}</>;
}

function parseMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let ordered = false;

  const flushList = () => {
    if (!listItems.length) return;
    const List = ordered ? 'ol' : 'ul';
    blocks.push(<List key={'list-' + blocks.length}>{listItems.map((item, index) => <li key={index}>{item}</li>)}</List>);
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    const unorderedMatch = line.match(/^-\s+(.+)$/);

    if (orderedMatch || unorderedMatch) {
      const nextOrdered = Boolean(orderedMatch);
      if (listItems.length && ordered !== nextOrdered) flushList();
      ordered = nextOrdered;
      listItems.push((orderedMatch ?? unorderedMatch)?.[1] ?? '');
      return;
    }

    flushList();
    if (!line) return;
    if (line === '---') {
      blocks.push(<hr key={'hr-' + blocks.length} />);
    } else if (line.startsWith('### ')) {
      blocks.push(<h3 key={'h3-' + blocks.length}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={'h2-' + blocks.length}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      blocks.push(<h1 key={'h1-' + blocks.length}>{line.slice(2)}</h1>);
    } else {
      blocks.push(<p key={'p-' + blocks.length}>{line}</p>);
    }
  });
  flushList();
  return blocks;
}

export function MatchingProfileConsentGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const user = useTripStore((state) => state.user);
  const showInfo = useUiNoticeStore((state) => state.showInfo);
  const status = useConsentStore((state) => state.status);
  const loadStatus = useConsentStore((state) => state.loadStatus);
  const submitStatus = useConsentStore((state) => state.submitStatus);
  const consentError = useConsentStore((state) => state.error);
  const load = useConsentStore((state) => state.load);
  const submit = useConsentStore((state) => state.submit);
  const [checked, setChecked] = useState<Partial<Record<ConsentType, boolean>>>({});

  useEffect(() => {
    if (!user) return;
    setChecked({});
    void load();
  }, [user?.id, load]);

  if (!user) return <>{children}</>;

  // 아직 상태를 모르는 동안에는 통과시키지 않습니다. 조회에 실패한 상태를
  // 동의로 해석하면 게이트가 있으나 마나입니다.
  if (loadStatus === 'idle' || loadStatus === 'loading') {
    return (
      <main className="page">
        <div className="container">
          <header className="page-heading"><h1>동행 찾기</h1><p>동의 상태를 확인하고 있습니다.</p></header>
          <div className="skeleton-stack"><div className="skeleton-row" /><div className="skeleton-row" /></div>
        </div>
      </main>
    );
  }

  if (loadStatus === 'error') {
    return (
      <main className="page">
        <div className="container">
          <header className="page-heading"><h1>동행 찾기</h1><p>동의 상태를 확인하지 못했습니다.</p></header>
          <div className="error-strip" role="alert"><span>{consentError ?? '동의 상태를 불러오지 못했습니다.'}</span><button onClick={() => void load()}>다시 시도</button></div>
        </div>
      </main>
    );
  }

  const pending = MATCHING_GATES.filter((type) => !isAccepted(status, type));
  if (!pending.length) return <>{children}</>;

  // 이전에 동의했지만 문서가 개정된 경우입니다. 첫 동의와 다른 안내가 필요합니다.
  const reconsent = pending.some((type) => stateOf(status, type)?.stale);
  const ready = pending.every((type) => checked[type]);
  const tick = (type: ConsentType, value: boolean) => setChecked((current) => ({ ...current, [type]: value }));

  const accept = async () => {
    if (!ready) return;
    // 아직 동의하지 않은 항목만 보냅니다. 이미 유효한 동의를 다시 적재하면
    // 이력에 의미 없는 줄이 쌓입니다.
    const ok = await submit(pending.map((type) => decision(type)), 'matching_gate');
    if (!ok) return;
    showInfo(
      '매칭 이용 동의를 확인했습니다.',
      '동의한 문서와 버전, 동의 시각이 계정에 기록되었습니다. 기록은 계정 설정에서 확인할 수 있습니다.',
    );
  };

  return (
    <>
      <main className="page">
        <div className="container">
          <header className="page-heading"><h1>동행 찾기</h1><p>프로필 공개 범위와 안전 이용수칙을 확인한 뒤 시작합니다.</p></header>
          <div className="empty-state"><strong>매칭을 시작하기 전에 확인할 내용이 있습니다.</strong><p>동의 전에는 후보 프로필을 불러오거나 내 프로필을 다른 후보에게 공개하지 않습니다.</p></div>
        </div>
      </main>
      <div className="ui-notice-layer matching-consent-layer" role="presentation">
        <section className="ui-notice-dialog matching-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="matching-consent-title">
          <div className="ui-notice-kicker">{reconsent ? 'CONSENT UPDATE' : 'BEFORE YOU MATCH'}</div>
          <h2 id="matching-consent-title">{reconsent ? '문서가 개정되어 다시 확인이 필요합니다.' : '매칭을 시작하기 전에 확인해주세요.'}</h2>

          {pending.includes('matching_profile') ? (
            <>
              <p>동행 후보 추천과 비교를 위해 닉네임, 나이대, 활동·희망 지역, 여행 성향과 선호, 여행 조건 및 확인 상태가 매칭 후보에게 제공됩니다.</p>
              <dl>
                <div><dt>제공받는 자</dt><dd>매칭 후보 및 상호 매칭된 회원</dd></div>
                <div><dt>이용 목적</dt><dd>동행 후보 확인·비교 및 공동 여행계획</dd></div>
                <div><dt>열람 기간</dt><dd>공개 중단·매칭 종료·탈퇴 중 가장 이른 때까지</dd></div>
              </dl>
              <label className="consent-check prominent">
                <input type="checkbox" checked={Boolean(checked.matching_profile)} onChange={(event) => tick('matching_profile', event.target.checked)} />
                <span><b>[필수]</b> 매칭을 위하여 내 프로필 정보가 매칭 후보 회원에게 제공되는 것에 동의합니다.</span>
              </label>
              <Link className="legal-detail-link" to="/legal/matching-profile" target="_blank">제공 항목과 거부권 전문 보기 ↗</Link>
            </>
          ) : null}

          {pending.includes('safety_guide') ? (
            <>
              <p className="matching-consent-safety-lead">프로필 정보는 사실과 다를 수 있고, 인증 표시가 상대방의 안전성을 보증하지는 않습니다. 다음 내용을 확인해주세요.</p>
              <ul className="matching-consent-safety-list">
                <li>실명, 전화번호, 신분증, 계좌번호, 상세주소와 실시간 위치는 공유하지 않습니다.</li>
                <li>예약금·보증금·대리구매 등 어떤 이유로도 상대방에게 송금하지 않습니다.</li>
                <li>금전 요구, 사칭, 협박, 성적 요구, 스토킹이 발생하면 대화를 중단하고 신고·차단합니다.</li>
                <li>신체적 위험이 있으면 112 또는 현지 긴급기관에 즉시 신고합니다.</li>
              </ul>
              <label className="consent-check prominent">
                <input type="checkbox" checked={Boolean(checked.safety_guide)} onChange={(event) => tick('safety_guide', event.target.checked)} />
                <span><b>[필수]</b> 안전 이용수칙을 확인했습니다.</span>
              </label>
              <Link className="legal-detail-link" to="/legal/safety" target="_blank">안전 이용수칙 전문 보기 ↗</Link>
            </>
          ) : null}

          {submitStatus === 'error' && consentError ? <div className="error-strip" role="alert">{consentError}</div> : null}
          <div className="button-row matching-consent-actions">
            <button type="button" className="line-btn" onClick={() => navigate('/home')}>나중에</button>
            <button type="button" className="solid-btn" disabled={!ready || submitStatus === 'loading'} onClick={() => void accept()}>
              {submitStatus === 'loading' ? '기록하는 중…' : '동의하고 매칭 활성화'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
