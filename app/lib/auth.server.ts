import { redirect } from "react-router";
import { getSupabaseServerClient } from "./supabase.server";

export const requireAdmin = async (request: Request) => {
  const { supabase, headers } = getSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/admin/login", { headers });
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error || !isAdmin) {
    await supabase.auth.signOut();
    throw redirect("/admin/login?error=not_admin", { headers });
  }

  return { user, supabase, headers };
};

export const getOptionalAdmin = async (request: Request) => {
  const { supabase, headers } = getSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, supabase, headers, isAdmin: false };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { user, supabase, headers, isAdmin: Boolean(isAdmin) };
};
