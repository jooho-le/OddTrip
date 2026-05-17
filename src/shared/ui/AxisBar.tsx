import type { AxisScore } from '../../types';

const axisNames: Record<string, string> = {
  PW: '즉흥 P / 계획 W',
  NC: '새로움 N / 안정 C',
  FA: '휴식 F / 활동 A',
  HS: '숨은 H / 대표 S'
};

export function AxisBar({ score }: { score: AxisScore }) {
  const percent = ((score.score + 2) / 4) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{axisNames[score.axis]}</span>
        <span>{score.score <= 0 ? score.leftLetter : score.rightLetter}</span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-100">
        <div className="absolute left-1/2 top-0 h-3 w-px bg-slate-300" />
        <div className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-coral shadow" style={{ left: `calc(${percent}% - 10px)` }} />
      </div>
    </div>
  );
}
