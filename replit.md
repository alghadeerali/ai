# AI Workspace

مساحة عمل ذكاء اصطناعي متكاملة تشبه ChatGPT، مبنية على OpenRouter مع دعم كامل للعربية والـ RTL.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ai-workspace run dev` — run the frontend (port 19531)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `OPENROUTER_API_KEY` — OpenRouter API key

## Stack

- pnpm workspaces, Node.js 22, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, wouter, TanStack Query
- UI: Dark-first design, Cairo font (Arabic support), amber accent color
- AI: OpenRouter API (multi-model support)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Database schema (projects, conversations, messages, personas, usage_logs)
- `artifacts/api-server/src/routes/` — Express API routes
- `artifacts/ai-workspace/src/` — React frontend

## Features

- Multi-project workspace (like folders for conversations)
- Multi-model AI chat (100+ models from OpenRouter)
- Custom personas (system prompts, temperature, emoji)
- Full Arabic/RTL support
- Search across projects, conversations, messages (Cmd+K)
- Export conversations to Markdown
- Archive & soft-delete with restore
- Usage/cost dashboard with charts
- Dark/light theme toggle

## Railway Deployment

1. Push code to GitHub
2. Create project on Railway, connect GitHub repo
3. Add PostgreSQL plugin (auto-sets DATABASE_URL)
4. Set env: OPENROUTER_API_KEY
5. Deploy — Railway auto-detects nixpacks.toml

**Pricing note:** Railway offers a trial with $5 in credits for 30 days. After the trial, the free tier includes a small monthly free credit allowance (currently around $1/month). Usage beyond that requires adding a payment method.

## Architecture decisions

- OpenRouter as AI provider (supports 100+ models, no vendor lock-in)
- Soft delete for conversations (deletedAt field, not hard delete)
- Usage logs table for cost tracking per conversation/project/model
- Model list cached for 10 minutes (avoids repeated OpenRouter API calls)
- All API routes under /api/* (shared Express server, not serverless)

## User preferences

- نشر على Railway (تجربة $5 لـ 30 يومًا، ثم Free tier بحدود)
- دعم كامل للعربية وRTL
- تصميم داكن أولاً

## Gotchas

- Run codegen after any OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- Run `pnpm --filter @workspace/db run push` after schema changes
- The /api/models endpoint is cached 10 min — restart server to clear cache
