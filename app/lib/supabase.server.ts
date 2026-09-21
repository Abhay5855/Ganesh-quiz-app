import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

/**
 * Server Supabase client using the publishable key + user cookies.
 * Never pass SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export const getSupabaseServerClient = (request: Request) => {
  const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const headers = new Headers();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
          (c) => ({ name: c.name, value: c.value ?? "" }),
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options ?? {}),
          );
        });
      },
    },
  });

  return { supabase, headers };
};

/** Server-only. Do not import from client components. */
export const getSupabaseServiceClient = () => {
  const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is server-only and must be set in server env",
    );
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
};
