---
name: better-result-consistency
description: "Ensure TypeScript services and routes follow better-result patterns: wrap I/O boundaries with Result.try/Result.tryPromise, keep typed TaggedError unions, compose with map/andThen/andThenAsync/Result.gen appropriately, and keep API error mapping sanitized. Use when adding or refactoring Result-based flows, reviewing error-handling consistency, or auditing for over-wrapping and broad error types."
---

# Better Result Consistency

## Overview

Audit and refactor code to align with better-result's recommended adoption workflow.
Prefer narrow, typed error flows and simple composition while keeping boundary wrapping explicit.

## Workflow

1. Read the canonical better-result docs in local `opensrc` before changing patterns:
- `opensrc/repos/github.com/dmmulroy/better-result/README.md`
- `opensrc/repos/github.com/dmmulroy/better-result/skills/adopt/SKILL.md`

2. Inventory current callsites first:
- Search for `Result.try`, `Result.tryPromise`, `Result.gen`, `Result.await`, `map`, `andThen`, `andThenAsync`, `matchError`, and `TaggedError`.
- Group findings by layer: integration client, service/repository, route/controller, responder.

3. Enforce boundary wrapping:
- Use `Result.try` / `Result.tryPromise` at throwing boundaries (network, DB, parsing).
- Convert thrown causes into typed `TaggedError` variants with preserved context.
- Avoid ad-hoc try/catch propagation outside boundaries.

4. Enforce composition style:
- Use `map` / `andThen` / `andThenAsync` for straightforward linear transformations.
- Use `Result.gen` when multiple Result-producing steps and short-circuit control flow are clearer in generator form.
- Remove trivial wrappers that only unwrap and immediately rewrap values.
- Do not throw inside `map` / `andThen` / `andThenAsync` callbacks for expected failures; return `Result.err(...)` instead.

5. Keep error types narrow by layer:
- Do not widen to a global union too early.
- Keep integration/service unions explicit.
- Normalize to API-facing error mappings only at responder/boundary layers.

6. Panic and extraction discipline:
- Avoid `unwrap` in request/runtime paths; prefer `match`/`unwrapOr`/explicit Result handling.
- Treat `Panic` as a defect signal and only handle it at top-level boundaries for logging/telemetry.

7. Verify no implementation detail leaks:
- Keep client-facing error messages sanitized.
- Preserve detailed cause/context in internal `TaggedError` payloads and logs.

8. Validate after every refactor:
- Run `bun run typecheck`.
- Run `bunx vitest run` (or targeted tests during iteration, full suite before completion).

## Reference Checklist

Use `references/checklist.md` for a compact, repeatable review rubric and search patterns.
