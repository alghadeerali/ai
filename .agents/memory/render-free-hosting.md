---
name: Render + Neon free hosting of the pnpm monorepo
description: Non-obvious gotchas that made the Dockerized Render deploy work
---

Deploying this pnpm monorepo to Render (free plan, Docker env) + Neon Postgres required three fixes that each took multiple attempts:

- **pnpm version must match the lockfile.** The Dockerfile must install the exact pnpm major/minor that generated `pnpm-lock.yaml` (check `pnpm --version` locally). A mismatch throws `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on the `overrides` block (defined in `pnpm-workspace.yaml`), even though a plain install would succeed. **Why:** different pnpm majors serialize the overrides config differently in the lockfile.
- **Single-stage Docker build.** A multi-stage build that re-ran `pnpm install --prod` in the runtime stage failed because not every workspace `package.json` was copied, which pnpm reads as a workspace/overrides mismatch. One stage that copies the whole repo, installs, builds, then `pnpm prune --prod` avoids the class of problem entirely.
- **Express 5 has no bare `"*"` route.** `app.get("*", ...)` crashes at boot (path-to-regexp v8). Use a catch-all middleware (`app.use((req,res,next)=>{...})`) for the SPA fallback instead.

**Auto-bootstrap on startup (no Shell on Render free):** `bootstrapDatabase` runs schema + idempotent seeds on every boot. Migration decision must be driven by the **count of recorded rows in `drizzle.__drizzle_migrations`, not by the table's existence** — a failed prior `migrate()` commits the empty journal table (created outside the migration transaction) but rolls back the migration, so "table exists" is not "migrations applied". Rule: run `migrate()` on a fresh DB or when the journal has ≥1 row (prod, gets incremental migrations); skip it when schema exists but the journal is empty (dev is `drizzle push`-managed). **Why:** dev uses `push` (no journal) and prod uses `migrate` (journal seeded on first deploy); conflating them re-runs `0000` and crashes on "relation already exists".
- Because the skip path bypasses `migrate()`, additive columns newer code inserts into must be guarded there with idempotent `ALTER TABLE IF EXISTS ... ADD COLUMN IF NOT EXISTS`, or a journal-less/push env fails inserts.
- `drizzle-kit generate` needs **relative** `out`/`schema` in `drizzle.config.ts` (it runs with the package as cwd); an absolute `out` mangles the journal path to `.//abs/...` and throws ENOENT. `push` tolerates absolute paths, so this only bites `generate`.
- For real per-request cost, send OpenRouter `usage:{include:true}` and store `usage.cost` (guard with `Number.isFinite`); for reasoning models, `reasoning:{enabled:true}` returns `choices[0].message.reasoning`.

**Note:** Render free spins down after inactivity → ~50s cold start on first request.
