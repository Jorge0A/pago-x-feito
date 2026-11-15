import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@pxf/db";
import { publicEnv } from "@/lib/env";

/** Supabase client bound to the current request's cookies. RLS applies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

/** Returns the signed-in user or null. Verified against the auth server, not just the cookie. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
