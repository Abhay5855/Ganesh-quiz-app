import { useMemo, useState } from "react";
import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/index";
import { requireAdmin } from "~/lib/auth.server";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Input } from "~/components/ui/Input";
import type { Quiz, QuizStatus } from "~/types/game";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request);
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Response(error.message, { status: 500, headers });
  }

  return Response.json({ quizzes: data ?? [] }, {
    headers: Object.fromEntries(headers.entries()),
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const quizId = String(form.get("quizId") ?? "");

  if (intent === "delete" && quizId) {
    const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
    if (error) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
  }

  throw redirect("/admin", { headers });
}

type Filter = "all" | QuizStatus;

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { quizzes } = loaderData as { quizzes: Quiz[] };
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (filter !== "all" && quiz.status !== filter) return false;
      if (!q) return true;
      return (
        quiz.title.toLowerCase().includes(q) ||
        (quiz.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [quizzes, query, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Draft" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-festival-navy">
          Quiz Library
        </h1>
        <Link to="/admin/quizzes/new">
          <Button aria-label="Create quiz">+ Create new quiz</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search"
            name="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search quizzes…"
            aria-label="Search quizzes"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`rounded-full px-3 py-2 font-sans text-sm font-semibold ${
                filter === item.id
                  ? "bg-festival-saffron text-white"
                  : "bg-white text-festival-navy ring-1 ring-festival-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="font-sans text-festival-muted">
          No quizzes match. Create your first one.
        </p>
      ) : (
        <ul className="divide-y divide-festival-border overflow-hidden rounded-lg border border-festival-border bg-white shadow-card">
          {filtered.map((quiz) => (
            <li
              key={quiz.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <Link
                  to={`/admin/quizzes/${quiz.id}`}
                  className="font-sans text-lg font-semibold text-festival-navy hover:text-festival-saffron"
                >
                  {quiz.title}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    tone={
                      quiz.status === "published"
                        ? "success"
                        : quiz.status === "archived"
                          ? "neutral"
                          : "warning"
                    }
                  >
                    {quiz.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/quizzes/${quiz.id}`}>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Edit ${quiz.title}`}
                  >
                    Edit
                  </Button>
                </Link>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="quizId" value={quiz.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="danger"
                    aria-label={`Delete ${quiz.title}`}
                    onClick={(e) => {
                      if (!confirm("Delete this quiz and all questions?")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
