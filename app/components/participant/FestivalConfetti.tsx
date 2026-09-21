export const FestivalConfetti = ({ active }: { active: boolean }) => {
  if (!active) return null;

  return (
    <div className="festival-confetti" aria-hidden>
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
};
