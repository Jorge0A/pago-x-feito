/**
 * DEV ONLY. Prints a one-time local sign-in URL for an account on the dev project, so the app can
 * be tested without waiting for an e-mail. Run through `node scripts/db.mjs login dev`.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL, APP_URL (optional)
 */
import { createServiceClient } from "./index";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.OWNER_EMAIL;
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
if (!url || !key || !email) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OWNER_EMAIL are required");
  process.exit(1);
}

const admin = createServiceClient(url, key);
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error(error.message);
  process.exit(1);
}
const link = new URL("/auth/callback", appUrl);
link.searchParams.set("token_hash", data.properties.hashed_token);
link.searchParams.set("type", "magiclink");
link.searchParams.set("next", "/app");
console.log(link.toString());
