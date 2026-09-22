import { useEffect, useState } from "react";
import type { Route } from "./+types/quizzes.$quizId";
import { requireAdmin } from "~/lib/auth.server";
import { QuizForm } from "~/components/admin/QuizForm";
import { QuestionList } from "~/components/admin/QuestionList";
import { QuestionEditor } from "~/components/admin/QuestionEditor";
import { QuestionPreview } from "~/components/admin/QuestionPreview";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import type { Question, Quiz } from "~/types/game";
import type { QuestionConfig, QuestionType } from "~/types/questions";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request);
  const quizId = params.quizId;

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    throw new Response("Quiz not found", { status: 404, headers });
  }

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  if (qError) {
    throw new Response(qError.message, { status: 500, headers });
  }

  return Response.json(
    { quiz, questions: questions ?? [] },
    { headers: Object.fromEntries(headers.entries()) },
  );
}

export default function EditQuizPage({ loaderData }: Route.ComponentProps) {
  const initial = loaderData as { quiz: Quiz; questions: Question[] };
  const [quiz, setQuiz] = useState(initial.quiz);
  const [questions, setQuestions] = useState(initial.questions);
  const [editing, setEditing] = useState<Question | null>(null);
  const [viewing, setViewing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshQuestions = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("position", { ascending: true });
    setQuestions(data ?? []);
  };

  useEffect(() => {
    if (!viewing) return;
    document
      .getElementById("question-preview")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [viewing]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-4 text-3xl font-bold text-slate-900">Edit quiz</h1>
        <QuizForm
          initial={{
            title: quiz.title,
            description: quiz.description,
            status: quiz.status,
          }}
          onSubmit={async (values) => {
            const supabase = getSupabaseBrowserClient();
            const { data, error } = await supabase
              .from("quizzes")
              .update({
                title: values.title,
                description: values.description || null,
                status: values.status,
              })
              .eq("id", quiz.id)
              .select("*")
              .single();
            if (error) throw error;
            setQuiz(data);
            setMessage("Quiz saved");
          }}
        />
        {message ? (
          <p className="mt-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Questions</h2>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            onClick={() => {
              setEditing(null);
              setViewing(null);
              setCreating(true);
            }}
            aria-label="Add question"
          >
            Add question
          </button>
        </div>

        <QuestionList
          questions={questions}
          onView={(q) => {
            setCreating(false);
            setEditing(null);
            setViewing(q);
          }}
          onEdit={(q) => {
            setCreating(false);
            setViewing(null);
            setEditing(q);
          }}
          onDelete={async (q) => {
            if (!confirm("Delete this question?")) return;
            const supabase = getSupabaseBrowserClient();
            const { error } = await supabase
              .from("questions")
              .delete()
              .eq("id", q.id);
            if (error) {
              alert(error.message);
              return;
            }
            if (viewing?.id === q.id) setViewing(null);
            if (editing?.id === q.id) setEditing(null);
            await refreshQuestions();
          }}
          onReorder={async (orderedIds) => {
            const supabase = getSupabaseBrowserClient();
            await Promise.all(
              orderedIds.map((id, index) =>
                supabase
                  .from("questions")
                  .update({ position: index })
                  .eq("id", id),
              ),
            );
            await refreshQuestions();
          }}
        />

        {viewing && !creating && !editing ? (
          <div id="question-preview">
            <QuestionPreview
              question={viewing}
              onClose={() => setViewing(null)}
              onEdit={() => {
                setEditing(viewing);
                setViewing(null);
              }}
            />
          </div>
        ) : null}

        {(creating || editing) && (
          <QuestionEditor
            key={editing?.id ?? "new"}
            initial={
              editing
                ? {
                    type: editing.type,
                    question_text: editing.question_text,
                    media_url: editing.media_url,
                    config_json: editing.config_json,
                    time_limit_seconds: editing.time_limit_seconds,
                    points: editing.points,
                  }
                : undefined
            }
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={async (values) => {
              const supabase = getSupabaseBrowserClient();
              if (editing) {
                const { error } = await supabase
                  .from("questions")
                  .update({
                    type: values.type,
                    question_text: values.question_text,
                    media_url: values.media_url,
                    config_json: values.config_json,
                    time_limit_seconds: values.time_limit_seconds,
                    points: 1,
                  })
                  .eq("id", editing.id);
                if (error) throw error;
              } else {
                const position = questions.length;
                const { error } = await supabase.from("questions").insert({
                  quiz_id: quiz.id,
                  type: values.type as QuestionType,
                  question_text: values.question_text,
                  media_url: values.media_url,
                  config_json: values.config_json as QuestionConfig,
                  time_limit_seconds: values.time_limit_seconds,
                  points: 1,
                  position,
                });
                if (error) throw error;
              }
              setCreating(false);
              setEditing(null);
              await refreshQuestions();
            }}
          />
        )}
      </div>
    </div>
  );
}
