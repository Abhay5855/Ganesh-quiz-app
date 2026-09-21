import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/index";
import { requireAdmin } from "~/lib/auth.server";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import { generateGameCode } from "~/lib/pin";
import type { Quiz } from "~/types/game";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request);
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("status", "published")
    .order("title");

  if (error) {
    throw new Response(error.message, { status: 500, headers });
  }

  const { data: drafts } = await supabase
    .from("quizzes")
    .select("*")
    .neq("status", "archived")
    .order("title");

  return Response.json(
    { quizzes: drafts ?? data ?? [] },
    { headers: Object.fromEntries(headers.entries()) },
  );
}

export default function HostIndex({ loaderData }: Route.ComponentProps) {
  const { quizzes } = loaderData as { quizzes: Quiz[] };
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!quizId || creatingRef.current) return;
    creatingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setError("Session expired. Sign in again from Admin login.");
        return;
      }

      let code = generateGameCode();
      let attempts = 0;
      let gameId: string | null = null;

      while (attempts < 8) {
        const { data, error: insertError } = await supabase
          .from("games")
          .insert({
            quiz_id: quizId,
            game_code: code,
            status: "active",
            phase: "lobby",
            host_user_id: user.id,
          })
          .select("id")
          .single();

        if (!insertError && data) {
          gameId = data.id;
          break;
        }

        if (insertError?.code !== "23505") {
          setError(insertError?.message ?? "Could not create game");
          return;
        }

        code = generateGameCode();
        attempts += 1;
      }

      if (!gameId) {
        setError("Could not create game. Try again.");
        return;
      }

      navigate(`/host/game/${gameId}`);
    } finally {
      creatingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-3xl font-bold text-festival-navy">
        Start a live game
      </h1>
      <Card className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-sm font-medium text-festival-navy">
            Quiz
          </span>
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="rounded-md border border-festival-border px-4 py-3 font-sans"
            aria-label="Select quiz"
          >
            {quizzes.length === 0 ? (
              <option value="">No quizzes available</option>
            ) : null}
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} ({quiz.status})
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p className="font-sans text-sm text-festival-danger">{error}</p>
        ) : null}
        <Button
          size="lg"
          className="w-full"
          disabled={!quizId || loading}
          onClick={handleStart}
          aria-label="Create live game"
        >
          {loading ? "Creating…" : "Create game & show PIN"}
        </Button>
      </Card>
    </div>
  );
}
