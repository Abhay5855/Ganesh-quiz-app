import { Form, Link, Outlet, redirect } from "react-router";
import type { Route } from "./+types/layout";
import { requireAdmin } from "~/lib/auth.server";
import { Button } from "~/components/ui/Button";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireAdmin(request);
  return Response.json(
    { email: user.email },
    { headers: Object.fromEntries(headers.entries()) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = await requireAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "logout") {
    await supabase.auth.signOut();
    throw redirect("/admin/login", { headers });
  }
  return null;
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const data = loaderData as { email?: string };

  return (
    <div className="min-h-dvh bg-festival-cream">
      <header className="border-b border-festival-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="font-display text-lg font-bold text-festival-navy"
            >
              Admin
            </Link>
            <Link
              to="/host"
              className="font-sans text-sm font-medium text-festival-muted hover:text-festival-navy"
            >
              Host console
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-sans text-sm text-festival-muted">
              {data.email}
            </span>
            <Form method="post">
              <input type="hidden" name="intent" value="logout" />
              <Button type="submit" variant="ghost" size="sm" aria-label="Log out">
                Log out
              </Button>
            </Form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
