# hono-cf-api

Hono API running on Cloudflare Workers with Hyperdrive + PostgreSQL and Drizzle.

## Prerequisites

- Bun (`>=1.3`)
- Docker
- Node.js (for Wrangler CLI tooling)

## Local Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Start PostgreSQL

```bash
bun run db:start
```

### 3. Create local env file

Copy values from `.env.example` into `.env.local`:

```env
MIGRATION_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hono_cf
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://postgres:postgres@localhost:5433/hono_cf
```

### 4. Run DB migrations

```bash
bun run db:migrate
```

This uses `DOTENV_CONFIG_PATH=.env.local` and applies migrations with `drizzle-kit`.

### 5. Start local worker

```bash
bun run dev
```

Worker runs at `http://localhost:8787`.

## Smoke Test

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/api/posts
curl -X POST http://127.0.0.1:8787/api/posts \
  -H "content-type: application/json" \
  -d '{"title":"Hello","body":"World","published":true}'
curl http://127.0.0.1:8787/api/posts
```

## Useful Scripts

- `bun run dev` - local worker with `.env.local`
- `bun run dev:remote` - run with `wrangler dev --remote`
- `bun run db:start` - start local PostgreSQL with Docker Compose
- `bun run db:stop` - stop local PostgreSQL container
- `bun run db:down` - stop and remove compose resources
- `bun run db:logs` - tail PostgreSQL logs
- `bun run db:reset` - reset PostgreSQL volume/data
- `bun run db:migrate` - run local migrations
- `bun run db:push` - push schema to local DB
- `bun run db:studio` - open Drizzle Studio against local DB
- `bun run check` - `typegen` + `typecheck`

## Deployment Model

- Local `bun run deploy` is intentionally blocked.
- Deployments run in GitHub Actions only:
  - PR checks: `.github/workflows/ci.yml`
  - Deploy on merge to `main`: `.github/workflows/deploy.yml`
- Required GitHub secrets for deploy workflow:
  - `MIGRATION_DATABASE_URL`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN`
