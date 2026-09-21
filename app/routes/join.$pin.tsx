import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/join.$pin";
import { NameForm } from "~/components/participant/NameForm";
import { ParticipantShell } from "~/components/participant/ParticipantShell";
import { GaneshMascot } from "~/components/participant/GaneshMascot";
import { StatusMessage } from "~/components/participant/StatusMessage";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import { savePlayerSession } from "~/lib/player-session";
import { normalizeGameCode } from "~/lib/pin";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Join ${params.pin} · Ganesh Quiz` }];
}

const mapJoinError = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes("invalid game code")) return "Invalid PIN";
  if (lower.includes("game not found")) return "Game not found";
  if (
    lower.includes("not accepting") ||
    lower.includes("finished") ||
    lower.includes("already")
  ) {
    return "This game has already finished";
  }
  if (lower.includes("full")) return "This game is full";
  return "Couldn't join the game. Please try again.";
};

export default function JoinPage({ params }: Route.ComponentProps) {
  const pin = normalizeGameCode(params.pin);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (displayName: string) => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("join_game", {
      p_game_code: pin,
      p_display_name: displayName,
    });

    setLoading(false);

    if (rpcError) {
      setError(mapJoinError(rpcError.message));
      return;
    }

    if (!data) {
      setError("Couldn't join the game. Please try again.");
      return;
    }

    const result = data as {
      player_id: string;
      player_token: string;
      game_id: string;
      display_name: string;
    };

    savePlayerSession({
      player_id: result.player_id,
      player_token: result.player_token,
      game_id: result.game_id,
    });

    navigate(`/play/${result.game_id}`);
  };

  if (pin.length !== 6) {
    return (
      <ParticipantShell className="justify-center gap-6">
        <StatusMessage
          title="Invalid PIN"
          description="Enter a 6-digit PIN on the home page."
          tone="danger"
          pose="surprised"
        />
        <Link
          to="/"
          className="text-center font-semibold text-festival-saffron underline"
        >
          Back home
        </Link>
      </ParticipantShell>
    );
  }

  return (
    <ParticipantShell className="justify-center gap-6">
      <header className="text-center">
        <GaneshMascot pose="wave" size="lg" className="mb-4" />
        <Badge tone="live">PIN {pin}</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold text-festival-navy">
          Almost there!
        </h1>
        <p className="mt-2 font-sans text-sm text-festival-muted">
          Names can match — your identity stays private to this device.
        </p>
      </header>
      <Card>
        <NameForm onSubmit={handleJoin} loading={loading} error={error} />
      </Card>
    </ParticipantShell>
  );
}
