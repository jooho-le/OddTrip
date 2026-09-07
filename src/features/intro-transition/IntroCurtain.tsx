import { useIntroTransitionStore } from './introTransitionStore';

const LINES = [
  { no: '01', text: '취향이 다른 두 사람' },
  { no: '02', text: '각자의 선택을 문서로' },
  { no: '03', text: '하나의 일정으로' },
  { no: null, text: 'oddtrip' }
];

/** Mount once, above the router outlet, so the curtain survives client-side navigation. */
export function IntroCurtain() {
  const active = useIntroTransitionStore((state) => state.active);
  const lift = useIntroTransitionStore((state) => state.lift);
  const cue = useIntroTransitionStore((state) => state.cue);

  return (
    <div className={['intro-curtain', active ? 'active' : '', lift ? 'lift' : ''].filter(Boolean).join(' ')} aria-hidden="true">
      {LINES.map((line, index) => {
        const step = index + 1;
        return (
          <div key={line.text} className={['curtain-line', cue === step ? 'on' : '', cue > step ? 'past' : ''].filter(Boolean).join(' ')}>
            {line.no ? <small>{line.no}</small> : null}
            <b>{line.text}</b>
          </div>
        );
      })}
    </div>
  );
}
