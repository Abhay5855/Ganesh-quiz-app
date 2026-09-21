import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/play.$gameId";
import { WaitingRoom } from "~/components/participant/WaitingRoom";
import { TimerBar } from "~/components/participant/TimerBar";
import { LockedInBanner } from "~/components/participant/LockedInBanner";
import { ResultBanner } from "~/components/participant/ResultBanner";
import { FinalRanking } from "~/components/participant/FinalRanking";
import { BetweenQuestions } from "~/components/participant/BetweenQuestions";
import { ParticipantShell } from "~/components/participant/ParticipantShell";
import { StatusMessage } from "~/components/participant/StatusMessage";
import { QuestionRenderer } from "~/components/questions/QuestionRenderer";
import { CorrectAnswerSummary } from "~/components/questions/CorrectAnswerSummary";
import { FastestFingers } from "~/components/ui/FastestFingers";
import { Spinner } from "~/components/ui/Spinner";
import { Card } from "~/components/ui/Card";
import { formatPoints } from "~/lib/scoring-display";
import { useGameSession } from "~/hooks/useGameSession";
import { usePlayer } from "~/hooks/usePlayer";
import { useTimer } from "~/hooks/useTimer";
import { useLeaderboard } from "~/hooks/useLeaderboard";
import { useAnswerSubmit } from "~/hooks/useAnswerSubmit";
import { useFastestAnswers } from "~/hooks/useFastestAnswers";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import type { PlayerState } from "~/types/game";
import type { ActiveQuestion, QuestionReveal } from "~/types/questions";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Playing · Ganesh Quiz" }];
}

export function HydrateFallback() {
  return <Spinner label="Loading game…" />;
}

export default function PlayPage({ params }: Route.ComponentProps) {
  const gameId = params.gameId;
  const navigate = useNavigate();
  const { session, ready, clear } = usePlayer(gameId);
  const {
    game,
    loading: gameLoading,
    error: gameError,
    refresh: refreshGame,
    connectionState,
  } = useGameSession(gameId);
  const { submit, submitting, lockedIn, error, reset, setLockedIn } =
    useAnswerSubmit();
  const [question, setQuestion] = useState<ActiveQuestion | null>(null);
  const [reveal, setReveal] = useState<QuestionReveal | null>(null);
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  const showFinalRanking = game?.phase === "finished";
  const { me, refresh: refreshFinalRank } = useLeaderboard({
    gameId,
    enabled: showFinalRanking,
    playerId: session?.player_id,
    playerToken: session?.player_token,
    limit: 1,
  });

  const { remainingSeconds, isExpired } = useTimer(
    game?.phase === "question" ? game.question_started_at : null,
    question?.time_limit_seconds,
  );
  const showFastest =
    game?.phase === "answer_reveal" && Boolean(session?.player_token);
  const { entries: fastest } = useFastestAnswers({
    gameId,
    enabled: showFastest,
    playerId: session?.player_id,
    playerToken: session?.player_token,
    limit: 3,
  });

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      navigate("/");
    }
  }, [ready, session, navigate]);

  const handlePlayerAuthError = useCallback(
    (message: string) => {
      if (message === "Unauthorized player") {
        clear();
        navigate("/");
        return true;
      }
      return false;
    },
    [clear, navigate],
  );

  const loadPlayerState = useCallback(async () => {
    if (!session) return;
    const supabase = getSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("get_player_state", {
      p_game_id: session.game_id,
      p_player_id: session.player_id,
      p_player_token: session.player_token,
    });
    if (rpcError) {
      if (handlePlayerAuthError(rpcError.message)) return;
      setLoadError(rpcError.message);
      return;
    }
    const state = data as PlayerState;
    setDisplayName(state.display_name);
    setPlayerScore(state.score);
    if (
      state.current_question_id &&
      state.answered_question_ids?.includes(state.current_question_id)
    ) {
      setLockedIn(true);
    }
  }, [session, setLockedIn, handlePlayerAuthError]);

  useEffect(() => {
    if (session) void loadPlayerState();
  }, [session, loadPlayerState]);

  useEffect(() => {
    if (connectionState !== "reconnecting" || !session) return;
    void refreshGame();
    void loadPlayerState();
  }, [connectionState, session, refreshGame, loadPlayerState]);

  useEffect(() => {
    if (!session || !game) return;

    const supabase = getSupabaseBrowserClient();

    const loadQuestion = async () => {
      setQuestionLoading(true);
      const { data, error: rpcError } = await supabase.rpc(
        "get_active_question",
        {
          p_game_id: session.game_id,
          p_player_id: session.player_id,
          p_player_token: session.player_token,
        },
      );
      if (rpcError) {
        if (handlePlayerAuthError(rpcError.message)) return;
        setLoadError(rpcError.message);
        setQuestionLoading(false);
        return;
      }
      const q = data as ActiveQuestion;
      setQuestion(q);
      if (q.already_answered) setLockedIn(true);
      setLoadError(null);
      setQuestionLoading(false);
    };

    const loadReveal = async () => {
      const { data, error: rpcError } = await supabase.rpc(
        "get_question_reveal",
        {
          p_game_id: session.game_id,
          p_player_id: session.player_id,
          p_player_token: session.player_token,
        },
      );
      if (rpcError) {
        if (handlePlayerAuthError(rpcError.message)) return;
        setLoadError(rpcError.message);
        return;
      }
      setReveal(data as QuestionReveal);
    };

    if (game.phase === "question" && game.current_question_id) {
      const questionChanged =
        lastQuestionIdRef.current !== game.current_question_id;
      if (questionChanged) {
        reset();
        setReveal(null);
        setQuestion(null);
        lastQuestionIdRef.current = game.current_question_id;
      }
      void loadQuestion();
    } else if (game.phase === "answer_reveal") {
      void loadReveal();
      void loadPlayerState();
    } else if (game.phase === "leaderboard") {
      void loadPlayerState();
    } else if (game.phase === "finished") {
      void refreshFinalRank();
      void loadPlayerState();
    } else if (game.phase === "lobby") {
      lastQuestionIdRef.current = null;
      setQuestion(null);
      setReveal(null);
      reset();
    }
  }, [
    game?.phase,
    game?.current_question_id,
    session,
    reset,
    setLockedIn,
    refreshFinalRank,
    handlePlayerAuthError,
    loadPlayerState,
  ]);

  if (!ready || gameLoading) {
    return (
      <ParticipantShell className="justify-center">
        <Spinner label="Rejoining the quiz…" />
      </ParticipantShell>
    );
  }

  if (!session) {
    return (
      <ParticipantShell className="justify-center gap-4 text-center">
        <p className="text-festival-muted">Join the game with a PIN to play.</p>
        <Link to="/" className="font-semibold text-festival-saffron underline">
          Back home
        </Link>
      </ParticipantShell>
    );
  }

  if (!game) {
    return (
      <ParticipantShell className="justify-center gap-4 text-center">
        <p className="text-festival-muted">{gameError ?? "Game not found."}</p>
        <Link to="/" className="font-semibold text-festival-saffron underline">
          Back home
        </Link>
      </ParticipantShell>
    );
  }

  return (
    <ParticipantShell
      subtle={game.phase === "question"}
      className="safe-pad-bottom gap-4"
    >
      {game.phase === "question" && question ? (
        <div className="sticky top-0 z-20 -mx-4 bg-festival-cream/95 px-4 pt-2 backdrop-blur-sm">
          <TimerBar
            remainingSeconds={remainingSeconds}
            durationSeconds={question.time_limit_seconds}
            questionNumber={question.question_number}
            questionCount={question.question_count}
            isExpired={isExpired}
            points={question.points}
          />
        </div>
      ) : null}

      {game.phase !== "question" && game.phase !== "lobby" ? (
        <header className="flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-festival-navy">
            Ganesh Quiz
          </h1>
          {displayName ? (
            <span className="font-sans text-sm text-festival-muted">
              {displayName}
            </span>
          ) : null}
        </header>
      ) : null}

      {connectionState === "reconnecting" ? (
        <StatusMessage
          title="Connection lost"
          description="Trying to reconnect..."
          tone="warning"
          pose="thinking"
        />
      ) : null}

      {loadError ? (
        <p
          className="rounded-lg bg-festival-danger/10 px-3 py-2 text-sm text-festival-danger"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      {game.phase === "lobby" ? (
        <Card>
          <WaitingRoom displayName={displayName} />
        </Card>
      ) : null}

      {game.phase === "question" && questionLoading && !question ? (
        <Card>
          <Spinner label="Loading question…" />
        </Card>
      ) : null}

      {game.phase === "question" && question ? (
        <Card className="space-y-5">
          {lockedIn ? (
            <LockedInBanner />
          ) : (
            <>
              <QuestionRenderer
                question={question}
                disabled={isExpired || submitting}
                submitting={submitting}
                onSubmit={async (payload) => {
                  await submit({
                    gameId: session.game_id,
                    playerId: session.player_id,
                    playerToken: session.player_token,
                    questionId: question.id,
                    payload,
                  });
                }}
              />
              {error ? (
                <p className="text-sm text-festival-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      {game.phase === "answer_reveal" ? (
        <Card className="space-y-4">
          {reveal?.player_result ? (
            <ResultBanner
              isCorrect={reveal.player_result.is_correct}
              pointsAwarded={reveal.player_result.points_awarded}
              responseTimeMs={reveal.player_result.response_time_ms}
            />
          ) : (
            <p className="py-2 text-center text-festival-muted">
              No answer recorded for this question.
            </p>
          )}
          {typeof playerScore === "number" ? (
            <p className="text-center font-sans text-sm text-festival-muted">
              Your score: {formatPoints(playerScore)}
            </p>
          ) : null}
          {reveal ? (
            <CorrectAnswerSummary
              type={reveal.type}
              correctAnswer={reveal.correct_answer}
              options={reveal.options}
              items={reveal.items}
              imageUrl={reveal.image_url ?? reveal.media_url}
              playerPin={
                reveal.type === "pin_image" &&
                reveal.player_result?.answer_json &&
                typeof reveal.player_result.answer_json === "object" &&
                "x" in reveal.player_result.answer_json &&
                "y" in reveal.player_result.answer_json
                  ? {
                      x: Number(
                        (reveal.player_result.answer_json as { x: number }).x,
                      ),
                      y: Number(
                        (reveal.player_result.answer_json as { y: number }).y,
                      ),
                    }
                  : null
              }
            />
          ) : (
            <Spinner label="Loading results…" />
          )}
          <FastestFingers entries={fastest} />
        </Card>
      ) : null}

      {game.phase === "leaderboard" ? (
        <Card>
          <BetweenQuestions score={playerScore} />
        </Card>
      ) : null}

      {game.phase === "finished" ? (
        <Card>
          <FinalRanking me={me} questionCount={question?.question_count} />
        </Card>
      ) : null}
    </ParticipantShell>
  );
}
