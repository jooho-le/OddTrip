import { TRIP_FLOW_STEPS } from './coordinationFlow';

type TripFlowGuideProps = {
  currentIndex: number;
  current: string;
  next: string;
  partnerStatus: string;
  finalized?: boolean;
};

export function TripFlowGuide({ currentIndex, current, next, partnerStatus, finalized = false }: TripFlowGuideProps) {
  return (
    <section className={`trip-flow-guide${finalized ? ' finalized' : ''}`} aria-label="여행 계획 진행 단계">
      <div className="trip-flow-copy">
        <span className="eyebrow">TRIP FLOW · {finalized ? 'COMPLETE' : `${String(currentIndex + 1).padStart(2, '0')}/${String(TRIP_FLOW_STEPS.length).padStart(2, '0')}`}</span>
        <strong>{current}</strong>
        <p><b>다음</b>{next}</p>
      </div>
      <p className="trip-flow-partner"><span>동행 상태</span><b>{partnerStatus}</b></p>
      <ol className="trip-flow-steps">
        {TRIP_FLOW_STEPS.map((step, index) => {
          const state = finalized || index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
          return <li className={state} aria-current={!finalized && index === currentIndex ? 'step' : undefined} key={step}><i>{state === 'done' ? '✓' : index + 1}</i><span>{step}</span></li>;
        })}
      </ol>
    </section>
  );
}
