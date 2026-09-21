import { useCallback, useState } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import type { AnswerPayload } from "~/types/questions";

export const useAnswerSubmit = () => {
  const [submitting, setSubmitting] = useState(false);
  const [lockedIn, setLockedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setLockedIn(false);
    setError(null);
  }, []);

  const submit = useCallback(
    async (params: {
      gameId: string;
      playerId: string;
      playerToken: string;
      questionId: string;
      payload: AnswerPayload;
    }) => {
      setSubmitting(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();

      const { data, error: rpcError } = await supabase.rpc("submit_answer", {
        p_game_id: params.gameId,
        p_player_id: params.playerId,
        p_player_token: params.playerToken,
        p_question_id: params.questionId,
        p_answer_json: params.payload as Record<string, unknown>,
      });

      setSubmitting(false);

      if (rpcError) {
        setError("Couldn't submit your answer. Please try again.");
        return null;
      }

      const result = data as {
        accepted: boolean;
        already_answered: boolean;
      };

      if (!result?.accepted && !result?.already_answered) {
        setError("Couldn't submit your answer. Please try again.");
        return null;
      }

      setLockedIn(true);
      return result;
    },
    [],
  );

  return { submit, submitting, lockedIn, error, reset, setLockedIn };
};
