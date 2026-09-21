import { useState, type FormEvent } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type { QuizStatus } from "~/types/game";

type QuizFormProps = {
  initial?: {
    title: string;
    description: string | null;
    status: QuizStatus;
  };
  onSubmit: (values: {
    title: string;
    description: string;
    status: QuizStatus;
  }) => Promise<void>;
  submitLabel?: string;
};

export const QuizForm = ({
  initial,
  onSubmit,
  submitLabel = "Save quiz",
}: QuizFormProps) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<QuizStatus>(initial?.status ?? "draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <Input
        label="Title"
        name="title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Quiz title"
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          aria-label="Quiz description"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as QuizStatus)}
          className="rounded-lg border border-slate-300 px-4 py-3"
          aria-label="Quiz status"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading || !title.trim()}>
        {loading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
};
