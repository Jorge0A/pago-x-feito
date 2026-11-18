// Runs Supabase CLI database commands against pxf-dev or pxf-prod using the root .env.
// Usage: node scripts/db.mjs <push|types|seed|dry-run> <dev|prod>
import { spawnSync } from "node:child_process";
import { connect } from "node:net";
import { resolve } from "node:path";
import { loadRootEnv, supabaseConfig, dbUrls } from "./env.mjs";

const [cmd, target = "dev"] = process.argv.slice(2);
if (!cmd) {
  console.error("usage: node scripts/db.mjs <push|types|seed|login|dry-run> <dev|prod>");
  process.exit(2);
}
const env = loadRootEnv();
const sb = supabaseConfig(env, target);
const dbDir = resolve(import.meta.dirname, "..", "packages", "db");

function reachable(url) {
  const { hostname, port } = new URL(url);
  return new Promise((res) => {
    const s = connect({ host: hostname, port: Number(port), timeout: 4000 });
    s.once("connect", () => { s.destroy(); res(true); });
    s.once("error", () => res(false));
    s.once("timeout", () => { s.destroy(); res(false); });
  });
}

// Candidate endpoints: direct host (IPv6), then the regional poolers. A pooler answers on TCP even
// when the project lives on another pooler, so push/types try each candidate until one accepts.
const candidates = [];
for (const u of dbUrls(sb)) if (await reachable(u)) candidates.push(u);
if (process.env.PXF_DB_URL) candidates.unshift(process.env.PXF_DB_URL);
if (candidates.length === 0) {
  console.error(`No reachable Postgres endpoint for ${target} (${sb.ref}).`);
  process.exit(1);
}
console.log(`[db] target=${target} ref=${sb.ref} candidates=${candidates.map((u) => new URL(u).hostname).join(", ")}`);

/** Runs a supabase command once per candidate until one connects. */
function runWithFallback(makeArgs, opts = {}) {
  let last = "";
  for (const u of candidates) {
    const r = spawnSync("supabase", makeArgs(u), { cwd: dbDir, encoding: "utf8" });
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    const notFound = /tenant\/user .* not found|DbConnectError/i.test(out);
    if (r.status === 0) {
      if (!opts.capture) process.stdout.write(out);
      return r.stdout ?? "";
    }
    if (!notFound) {
      process.stdout.write(out);
      process.exit(r.status ?? 1);
    }
    last = out;
    console.log(`[db] ${new URL(u).hostname} does not host this project, trying next…`);
  }
  process.stdout.write(last);
  process.exit(1);
}

if (target === "prod" && (cmd === "push" || cmd === "seed") && process.env.CONFIRM_PROD !== "yes") {
  console.error("Refusing to touch prod without CONFIRM_PROD=yes");
  process.exit(1);
}

switch (cmd) {
  case "dry-run":
    runWithFallback((u) => ["db", "push", "--remote", u, "--dry-run"]);
    break;
  case "push":
    runWithFallback((u) => ["db", "push", "--remote", u, "--yes"]);
    break;
  case "types": {
    const out = runWithFallback((u) => ["gen", "types", "typescript", "--db-url", u, "--schema", "public"], { capture: true });
    const { writeFileSync } = await import("node:fs");
    const file = resolve(dbDir, "src", "database.types.ts");
    writeFileSync(file, out);
    console.log(`[db] wrote ${file}`);
    break;
  }
  case "login":
  case "seed": {
    if (cmd === "login" && target !== "dev") {
      console.error("login links are generated for dev only");
      process.exit(1);
    }
    const script = cmd === "login" ? "src/dev-login.ts" : "src/seed.ts";
    const r = spawnSync("pnpm", ["--filter", "@pxf/db", "exec", "tsx", script], {
      stdio: "inherit",
      env: {
        ...process.env,
        SUPABASE_URL: sb.url,
        SUPABASE_SERVICE_ROLE_KEY: sb.service,
        OWNER_EMAIL: env.OWNER_EMAIL,
      },
    });
    process.exit(r.status ?? 1);
  }
  default:
    console.error(`unknown command ${cmd}`);
    process.exit(2);
}
