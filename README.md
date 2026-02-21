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
TIKHUB_API_TOKEN=your_tikhub_token
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
curl "http://127.0.0.1:8787/api/tiktok/info?share_url=https://www.tiktok.com/@travelwithjustjess/video/7551026080430181662"
curl -X POST http://127.0.0.1:8787/api/transcribe \
  -H "content-type: application/json" \
  -d '{"audioUrl":"https://cdn.example.com/audio.mp3"}'
```

## Transcription Endpoint

`POST /api/transcribe`

Request body:

```json
{
  "audioUrl": "https://cdn.example.com/audio.mp3"
}
```

Success response:

```json
{
  "data": {
    "text": "Full transcript text...",
    "segments": [
      {
        "text": "word",
        "start": 100,
        "end": 350,
        "confidence": 0.99
      }
    ],
    "language": "en",
    "duration": 62
  },
  "error": null
}
```

Notes:

- Accepts public audio file URLs (`mp3`, `wav`, `m4a`, `flac`, `ogg`, `webm`, etc.).
- Uses Cloudflare Workers AI Whisper (`@cf/openai/whisper-large-v3-turbo`).
- Worker fetches the audio URL, base64-encodes the payload, and sends it to Workers AI.

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
- `bun run test` - run project tests with Vitest (`src/**/*.test.ts`)
- `bun run test:watch` - run tests in watch mode
- `bun run check` - `typegen` + `typecheck`

Use `bun run test` instead of `bun test` to avoid executing vendored tests under `opensrc/`.

## Git Hooks

Hooks are managed with Husky and installed automatically by `bun install` (`prepare` script).

- `pre-commit` runs `lint-staged` and applies `eslint --fix` to staged `src/**/*.ts` files.
- `pre-push` runs `bun run typecheck` and `bun run test`.

If hooks are missing locally, run:

```bash
bun run prepare
```

Bypass policy:

- `git commit --no-verify` or `git push --no-verify` is only for emergencies.
- If bypass is used, run `bun run typecheck`, `bun run lint`, and `bun run test` before opening or merging a PR.

## Imports

- Use `@/...` absolute imports for internal modules under `src/`.
- Relative imports like `./...` and `../...` are disallowed by lint rules.

## Deployment Model

- PR checks run in GitHub Actions: `.github/workflows/ci.yml`
- Deployment is handled outside GitHub Actions (for example, Cloudflare Workers Builds).
