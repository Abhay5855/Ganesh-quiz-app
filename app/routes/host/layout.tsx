import { Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireAdmin } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireAdmin(request);
  return Response.json(
    { email: user.email },
    { headers: Object.fromEntries(headers.entries()) },
  );
}

export default function HostLayout({ loaderData }: Route.ComponentProps) {
  const data = loaderData as { email?: string };

  return (
    <div className="min-h-dvh bg-festival-cream">
      <header className="border-b border-festival-border bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/host"
              className="font-display text-lg font-bold text-festival-navy"
            >
              Host
            </Link>
            <Link
              to="/admin"
              className="font-sans text-sm font-medium text-festival-muted hover:text-festival-navy"
            >
              Admin
            </Link>
          </div>
          <span className="font-sans text-sm text-festival-muted">
            {data.email}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
