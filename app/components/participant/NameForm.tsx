import { useState, type FormEvent } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";

type NameFormProps = {
  onSubmit: (name: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export const NameForm = ({ onSubmit, loading, error }: NameFormProps) => {
  const [name, setName] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Input
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        placeholder="Your name"
        maxLength={12}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
        aria-label="Display name"
      />
      <p className="-mt-2 text-xs text-festival-muted">Maximum 12 characters</p>
      <Button
        type="submit"
        size="lg"
        className="w-full min-h-14"
        disabled={loading || !name.trim()}
        aria-label="Enter waiting room"
      >
        {loading ? "Joining…" : "Enter waiting room"}
      </Button>
    </form>
  );
};
