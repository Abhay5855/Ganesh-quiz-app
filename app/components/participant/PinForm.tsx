import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/Button";
import { GamePinInput } from "~/components/participant/GamePinInput";
import { normalizeGameCode } from "~/lib/pin";

export const PinForm = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeGameCode(pin);
    if (code.length !== 6) {
      setError("Invalid PIN");
      return;
    }
    navigate(`/join/${code}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <GamePinInput
        value={pin}
        onChange={(next) => {
          setPin(next);
          if (error) setError(null);
        }}
        error={error}
      />
      <Button
        type="submit"
        size="lg"
        className="w-full min-h-14"
        aria-label="Join game"
      >
        Join game
      </Button>
    </form>
  );
};
