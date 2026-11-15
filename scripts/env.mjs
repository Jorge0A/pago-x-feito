// Reads the root .env (never committed) into a plain object. No dependencies.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadRootEnv() {
  const path = resolve(import.meta.dirname, "..", ".env");
  if (!existsSync(path)) throw new Error(`Missing ${path}. Follow SETUP.md.`);
  const out = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function supabaseConfig(env, target) {
  const T = target.toUpperCase();
  const url = env[`SUPABASE_${T}_URL`];
  const anon = env[`SUPABASE_${T}_ANON_KEY`];
  const service = env[`SUPABASE_${T}_SERVICE_ROLE_KEY`];
  const password = env[`SUPABASE_${T}_DB_PASSWORD`];
  if (!url || !anon || !service || !password) throw new Error(`Incomplete SUPABASE_${T}_* in .env`);
  const ref = new URL(url).hostname.split(".")[0];
  return { url, anon, service, password, ref };
}

/** Candidate Postgres URLs for a project: direct (IPv6) first, then the session pooler. */
export function dbUrls({ ref, password }) {
  const pw = encodeURIComponent(password);
  return [
    `postgresql://postgres:${pw}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${pw}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${ref}:${pw}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`,
  ];
}
