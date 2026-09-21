import type { Route } from "./+types/quizzes.new";
import { requireAdmin } from "~/lib/auth.server";
import { QuizForm } from "~/components/admin/QuizForm";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New quiz · Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

export default function NewQuizPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">New quiz</h1>
      <QuizForm
        submitLabel="Create quiz"
        onSubmit={async (values) => {
          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase
            .from("quizzes")
            .insert({
              title: values.title,
              description: values.description || null,
              status: values.status,
            })
            .select("id")
            .single();

          if (error) throw error;
          window.location.href = `/admin/quizzes/${data.id}`;
        }}
      />
    </div>
  );
}
