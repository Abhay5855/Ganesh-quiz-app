type AnswerProgressProps = {
  submitted: number;
  players: number;
};

export const AnswerProgress = ({ submitted, players }: AnswerProgressProps) => (
  <div
    className="rounded-xl border border-slate-200 bg-white px-5 py-4"
    role="status"
    aria-live="polite"
  >
    <p className="text-sm font-medium text-slate-500">Answers submitted</p>
    <p className="mt-1 text-3xl font-bold text-slate-900">
      {submitted}
      <span className="text-xl font-medium text-slate-400"> / {players}</span>
    </p>
  </div>
);
