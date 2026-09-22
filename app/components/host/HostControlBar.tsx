import { Button } from "~/components/ui/Button";
import type { GamePhase } from "~/types/game";
import {
  canReveal,
  canShowLeaderboard,
  canStartQuestion,
} from "~/lib/game-state";

type HostControlBarProps = {
  phase: GamePhase;
  pending?: boolean;
  hasNextQuestion: boolean;
  isFinalQuestion: boolean;
  onStartQuestion: () => void;
  onReveal: () => void;
  onLeaderboard: () => void;
  onNext: () => void;
};

export const HostControlBar = ({
  phase,
  pending,
  hasNextQuestion,
  isFinalQuestion,
  onStartQuestion,
  onReveal,
  onLeaderboard,
  onNext,
}: HostControlBarProps) => (
  <div className="flex flex-wrap gap-3">
    {canStartQuestion(phase) ? (
      <Button
        size="lg"
        disabled={pending}
        onClick={onStartQuestion}
        aria-label={
          phase === "lobby" ? "Start first question" : "Start next question"
        }
      >
        {phase === "lobby" ? "Start question" : "Next question →"}
      </Button>
    ) : null}

    {canReveal(phase) ? (
      <Button
        size="lg"
        variant="secondary"
        disabled={pending}
        onClick={onReveal}
        aria-label="Reveal answer"
      >
        Reveal answer
      </Button>
    ) : null}

    {canShowLeaderboard(phase) && isFinalQuestion ? (
      <>
        <Button
          size="lg"
          variant="secondary"
          disabled={pending}
          onClick={onLeaderboard}
          aria-label="Show leaderboard"
        >
          Show leaderboard
        </Button>
      </>
    ) : null}

    {canShowLeaderboard(phase) && !isFinalQuestion && hasNextQuestion ? (
      <Button
        size="lg"
        disabled={pending}
        onClick={onNext}
        aria-label="Advance to next question"
      >
        Next question →
      </Button>
    ) : null}
  </div>
);
