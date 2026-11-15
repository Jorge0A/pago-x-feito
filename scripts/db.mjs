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

let dbUrl = null;
for (const u of dbUrls(sb)) {
  if (await reachable(u)) { dbUrl = u; break; }
}
if (!dbUrl) {
  console.error(`No reachable Postgres endpoint for ${target} (${sb.ref}).`);
  process.exit(1);
}
console.log(`[db] target=${target} ref=${sb.ref} via ${new URL(dbUrl).hostname}`);

function run(args, opts = {}) {
  const r = spawnSync("supabase", args, { cwd: dbDir, stdio: opts.capture ? ["ignore", "pipe", "inherit"] : "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  return r.stdout?.toString() ?? "";
}

if (target === "prod" && (cmd === "push" || cmd === "seed") && process.env.CONFIRM_PROD !== "yes") {
  console.error("Refusing to touch prod without CONFIRM_PROD=yes");
  process.exit(1);
}

switch (cmd) {
  case "dry-run":
    run(["db", "push", "--remote", dbUrl, "--dry-run"]);
    break;
  case "push":
    run(["db", "push", "--remote", dbUrl, "--yes"]);
    break;
  case "types": {
    const out = run(["gen", "types", "typescript", "--remote", dbUrl, "--schema", "public"], { capture: true });
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
