import { Button } from "~/components/ui/Button";
import type { GamePhase } from "~/types/game";
import {
  canFinish,
  canReveal,
  canShowLeaderboard,
  canStartQuestion,
} from "~/lib/game-state";

type HostControlBarProps = {
  phase: GamePhase;
  pending?: boolean;
  hasNextQuestion: boolean;
  onStartQuestion: () => void;
  onReveal: () => void;
  onLeaderboard: () => void;
  onNext: () => void;
  onFinish: () => void;
};

export const HostControlBar = ({
  phase,
  pending,
  hasNextQuestion,
  onStartQuestion,
  onReveal,
  onLeaderboard,
  onNext,
  onFinish,
}: HostControlBarProps) => {
  const handleFinish = () => {
    if (
      !confirm(
        "Finish the quiz for all players? This cannot be undone for this game.",
      )
    ) {
      return;
    }
    onFinish();
  };

  return (
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

      {canShowLeaderboard(phase) ? (
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
          {hasNextQuestion ? (
            <Button
              size="lg"
              disabled={pending}
              onClick={onNext}
              aria-label="Advance to next question"
            >
              Next question →
            </Button>
          ) : null}
        </>
      ) : null}

      {canFinish(phase) ? (
        <Button
          size="lg"
          variant="danger"
          disabled={pending}
          onClick={handleFinish}
          aria-label="Finish quiz"
        >
          Finish quiz
        </Button>
      ) : null}
    </div>
  );
};
