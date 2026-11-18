// Sets the two GitHub Actions secrets the nightly backup needs, from the root .env.
// Usage: node scripts/backup-secrets.mjs   (needs `gh auth login` done)
import { spawnSync } from "node:child_process";
import { loadRootEnv, supabaseConfig } from "./env.mjs";

const env = loadRootEnv();
const sb = supabaseConfig(env, "prod");
const repo = (env.GITHUB_REPO_URL ?? "").replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
if (!repo) throw new Error("GITHUB_REPO_URL missing in .env");
if (!env.BACKUP_PASSPHRASE) throw new Error("BACKUP_PASSPHRASE missing in .env");

// Prod lives on the aws-1 pooler (see scripts/db.mjs fallback); session mode, port 5432.
const host = process.env.PXF_PROD_POOLER ?? "aws-1-sa-east-1.pooler.supabase.com";
const dbUrl = `postgresql://postgres.${sb.ref}:${encodeURIComponent(sb.password)}@${host}:5432/postgres`;

function setSecret(name, value) {
  const r = spawnSync("gh", ["secret", "set", name, "--repo", repo], { input: value, stdio: ["pipe", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`gh secret set ${name} failed`);
  console.log(`set ${name}`);
}
setSecret("PROD_DB_URL", dbUrl);
setSecret("BACKUP_PASSPHRASE", env.BACKUP_PASSPHRASE);
console.log(`done. Trigger a first run: gh workflow run backup.yml --repo ${repo}`);
