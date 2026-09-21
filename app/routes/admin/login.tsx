import { Form, redirect, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { getSupabaseServerClient } from "~/lib/supabase.server";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin login · Ganesh Quiz" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = getSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) {
      throw redirect("/admin", { headers });
    }
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { supabase, headers } = getSupabaseServerClient(request);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return Response.json({ error: error.message }, { status: 400, headers });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return Response.json(
      { error: "This account is not an admin. Add a row in the admins table." },
      { status: 403, headers },
    );
  }

  throw redirect("/admin", { headers });
}

export default function AdminLogin({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const busy = navigation.state !== "idle";
  const error =
    (actionData as { error?: string } | undefined)?.error ??
    (params.get("error") === "not_admin"
      ? "Not authorized as admin"
      : null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Card>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin login</h1>
        <Form method="post" className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="username"
            aria-label="Email"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-label="Password"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy} aria-label="Sign in">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Form>
      </Card>
    </main>
  );
}
