import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTripStore } from '../../entities/trip/model/tripStore';
import {
  hasMatchingProfileConsent,
  saveMatchingProfileConsent,
} from '../../shared/legal/consentStorage';
import { useUiNoticeStore } from '../../shared/model/uiNoticeStore';

type LegalDocumentKey = 'terms' | 'community' | 'privacy' | 'matching-profile' | 'marketing';

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
  const [accepted, setAccepted] = useState(() => user ? hasMatchingProfileConsent(user.id) : false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAccepted(user ? hasMatchingProfileConsent(user.id) : false);
    setChecked(false);
  }, [user?.id]);

  if (!user || accepted) return <>{children}</>;

  const accept = () => {
    if (!checked) return;
    saveMatchingProfileConsent(user.id);
    setAccepted(true);
    showInfo(
      '매칭 프로필 공개 동의를 확인했습니다.',
      '현재 동의 기록은 이 브라우저에 보관됩니다. 서버 동의 이력 저장과 다른 기기 동기화는 준비 중입니다.',
    );
  };

  return (
    <>
      <main className="page">
        <div className="container">
          <header className="page-heading"><h1>동행 찾기</h1><p>프로필 공개 범위를 확인한 뒤 시작합니다.</p></header>
          <div className="empty-state"><strong>매칭 프로필 공개 동의가 필요합니다.</strong><p>동의 전에는 후보 프로필을 불러오거나 내 프로필을 다른 후보에게 공개하지 않습니다.</p></div>
        </div>
      </main>
      <div className="ui-notice-layer matching-consent-layer" role="presentation">
        <section className="ui-notice-dialog matching-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="matching-consent-title">
          <div className="ui-notice-kicker">MATCHING PROFILE CONSENT</div>
          <h2 id="matching-consent-title">내 프로필 공개 범위를 확인해주세요.</h2>
          <p>동행 후보 추천과 비교를 위해 닉네임, 나이대, 활동·희망 지역, 여행 성향과 선호, 여행 조건 및 확인 상태가 매칭 후보에게 제공됩니다.</p>
          <dl>
            <div><dt>제공받는 자</dt><dd>매칭 후보 및 상호 매칭된 회원</dd></div>
            <div><dt>이용 목적</dt><dd>동행 후보 확인·비교 및 공동 여행계획</dd></div>
            <div><dt>열람 기간</dt><dd>공개 중단·매칭 종료·탈퇴 중 가장 이른 때까지</dd></div>
          </dl>
          <label className="consent-check prominent">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span><b>[필수]</b> 매칭을 위하여 내 프로필 정보가 매칭 후보 회원에게 제공되는 것에 동의합니다.</span>
          </label>
          <Link className="legal-detail-link" to="/legal/matching-profile" target="_blank">제공 항목과 거부권 전문 보기 ↗</Link>
          <div className="button-row matching-consent-actions">
            <button type="button" className="line-btn" onClick={() => navigate('/home')}>나중에</button>
            <button type="button" className="solid-btn" disabled={!checked} onClick={accept}>동의하고 매칭 활성화</button>
          </div>
        </section>
      </div>
    </>
  );
}
