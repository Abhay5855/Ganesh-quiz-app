import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "./+types/game.$gameId";
import { requireAdmin } from "~/lib/auth.server";
import { GamePinDisplay } from "~/components/host/GamePinDisplay";
import { PlayerRoster } from "~/components/host/PlayerRoster";
import { HostControlBar } from "~/components/host/HostControlBar";
import { HostQuestionStatus } from "~/components/host/HostQuestionStatus";
import { HostLeaderboard } from "~/components/host/HostLeaderboard";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { Spinner } from "~/components/ui/Spinner";
import { FastestFingers } from "~/components/ui/FastestFingers";
import {
  CorrectAnswerSummary,
  correctAnswerFromConfig,
} from "~/components/questions/CorrectAnswerSummary";
import { useGameSession } from "~/hooks/useGameSession";
import { useAnswerCount } from "~/hooks/useAnswerCount";
import { useLeaderboard } from "~/hooks/useLeaderboard";
import { useTimer } from "~/hooks/useTimer";
import { useFastestAnswers } from "~/hooks/useFastestAnswers";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import { PHASE_LABELS } from "~/lib/game-state";
import type { Player, Question } from "~/types/game";
import type { OrderItem, TextOption } from "~/types/questions";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request);
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", params.gameId)
    .single();

  if (error || !game) {
    throw new Response("Game not found", { status: 404, headers });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", game.quiz_id)
    .order("position", { ascending: true });

  return Response.json(
    { initialGame: game, questions: questions ?? [] },
    { headers: Object.fromEntries(headers.entries()) },
  );
}

export function HydrateFallback() {
  return <Spinner label="Loading host console…" />;
}

export default function HostGamePage({
  params,
  loaderData,
}: Route.ComponentProps) {
  const { questions } = loaderData as {
    questions: Question[];
  };
  const gameId = params.gameId;
  const { game, loading } = useGameSession(gameId);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardLimit, setBoardLimit] = useState(10);
  const pendingRef = useRef(false);

  const { submitted, players: playerCount } = useAnswerCount(
    gameId,
    game?.phase === "question",
  );
  const showBoard = game?.phase === "finished";
  const { entries, refresh: refreshBoard } = useLeaderboard({
    gameId,
    enabled: showBoard,
    limit: boardLimit,
  });
  const { entries: fastest } = useFastestAnswers({
    gameId,
    enabled: game?.phase === "answer_reveal",
    limit: 3,
  });

  const currentIndex = useMemo(() => {
    if (!game?.current_question_id) return -1;
    return questions.findIndex((q) => q.id === game.current_question_id);
  }, [game?.current_question_id, questions]);

  const currentQuestion =
    currentIndex >= 0 ? questions[currentIndex] : undefined;
  const { remainingSeconds, isExpired } = useTimer(
    game?.phase === "question" ? game.question_started_at : null,
    currentQuestion?.time_limit_seconds,
  );
  const hasNextQuestion = currentIndex >= 0 && currentIndex < questions.length - 1;
  const nextQuestion =
    currentIndex >= 0 && hasNextQuestion
      ? questions[currentIndex + 1]
      : questions[0];

  const loadPlayers = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .order("joined_at", { ascending: true });
    setPlayers(data ?? []);
  }, [gameId]);

  useEffect(() => {
    void loadPlayers();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`host-players-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void loadPlayers();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId, loadPlayers]);

  useEffect(() => {
    if (showBoard) void refreshBoard();
  }, [showBoard, game?.phase, refreshBoard]);

  const updateGame = async (patch: Record<string, unknown>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("games")
        .update(patch)
        .eq("id", gameId);

      if (updateError) {
        setError(updateError.message);
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const handleStartQuestion = async () => {
    const question =
      game?.phase === "lobby"
        ? questions[0]
        : hasNextQuestion
          ? questions[currentIndex + 1]
          : null;

    // From leaderboard "Next question" via control bar Start
    const target =
      game?.phase === "lobby"
        ? questions[0]
        : game?.phase === "leaderboard"
          ? questions[currentIndex + 1]
          : question;

    if (!target) {
      setError("No questions available");
      return;
    }

    await updateGame({
      phase: "question",
      current_question_id: target.id,
      question_started_at: new Date().toISOString(),
    });
  };

  const handleReveal = async () => {
    await updateGame({ phase: "answer_reveal" });
  };

  const handleLeaderboard = async () => {
    await updateGame({ phase: "leaderboard" });
  };

  const handleNext = async () => {
    if (!nextQuestion || !hasNextQuestion) return;
    await updateGame({
      phase: "question",
      current_question_id: questions[currentIndex + 1].id,
      question_started_at: new Date().toISOString(),
    });
  };

  const handleFinish = async () => {
    await updateGame({
      phase: "finished",
      status: "finished",
      finished_at: new Date().toISOString(),
    });
  };

  if (loading && !game) {
    return <Spinner label="Loading game…" />;
  }

  if (!game) {
    return <p className="text-festival-danger">Game not found</p>;
  }

  const isLive =
    game.status === "active" && game.phase !== "finished";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-festival-navy">
            Live control
          </h1>
          {isLive ? <Badge tone="live">LIVE</Badge> : null}
        </div>
        <Badge tone={game.phase === "finished" ? "neutral" : "warning"}>
          {PHASE_LABELS[game.phase]}
        </Badge>
      </div>

      {error ? (
        <p className="rounded-lg bg-festival-danger/10 px-3 py-2 font-sans text-sm text-festival-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <GamePinDisplay code={game.game_code} />
        <Card>
          <PlayerRoster players={players} />
        </Card>
      </div>

      {game.phase === "question" ? (
        <HostQuestionStatus
          remainingSeconds={remainingSeconds}
          isExpired={isExpired}
          submitted={submitted}
          players={playerCount || players.length}
        />
      ) : null}

      {currentQuestion ? (
        <Card>
          <p className="font-sans text-sm font-medium text-festival-muted">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <p className="mt-2 font-display text-xl font-semibold text-festival-navy">
            {currentQuestion.question_text}
          </p>
          <p className="mt-1 font-sans text-sm text-festival-muted">
            {currentQuestion.type} · {currentQuestion.time_limit_seconds}s ·{" "}
            {currentQuestion.points} pts
          </p>
        </Card>
      ) : null}

      {game.phase === "answer_reveal" && currentQuestion ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <CorrectAnswerSummary
            type={currentQuestion.type}
            correctAnswer={correctAnswerFromConfig(
              currentQuestion.type,
              currentQuestion.config_json,
            )}
            options={
              (currentQuestion.config_json as { options?: TextOption[] }).options
            }
            items={
              (currentQuestion.config_json as { items?: OrderItem[] }).items
            }
            imageUrl={
              currentQuestion.media_url ??
              (currentQuestion.config_json as { imageUrl?: string }).imageUrl ??
              null
            }
          />
          <FastestFingers entries={fastest} prominent />
        </div>
      ) : null}

      <Card>
        <HostControlBar
          phase={game.phase}
          pending={pending}
          hasNextQuestion={hasNextQuestion}
          onStartQuestion={handleStartQuestion}
          onReveal={handleReveal}
          onLeaderboard={handleLeaderboard}
          onNext={handleNext}
          onFinish={handleFinish}
        />
      </Card>

      {game.phase === "finished" && (
        <Card>
          <HostLeaderboard
            entries={entries}
            expanded={boardLimit >= 50}
            onExpand={
              boardLimit < 50
                ? () => {
                    setBoardLimit(50);
                  }
                : undefined
            }
          />
        </Card>
      )}
    </div>
  );
}
