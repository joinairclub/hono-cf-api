# better-result consistency checklist

## Quick scan commands

```bash
rg -n "Result\\.try\\(|Result\\.tryPromise\\(|Result\\.gen\\(|Result\\.await\\(|\\.andThen\\(|\\.andThenAsync\\(|\\.map\\(|matchError\\(|TaggedError\\(" src
```

```bash
rg -n "Promise<Result<.*AppError|Result<.*AppError" src
```

```bash
rg -n "throw\\s+" src
```

```bash
rg -n "unwrap\\(|panic\\(|isPanic\\(" src
```

## Review rubric

1. Boundary wrapping:
- Every throwing external boundary is wrapped in `Result.try` / `Result.tryPromise`.
- Catch handlers convert causes into typed `TaggedError` values.

2. Composition style:
- Simple linear flows use `map`, `andThen`, `andThenAsync`.
- `Result.gen` is used for multi-step short-circuit composition where generator control flow improves clarity.
- No trivial `Result.gen` wrappers that only rewrap values.
- No control-flow throws inside Result callbacks for expected failures.

3. Error typing:
- Layer-local unions remain narrow (integration/service/repository).
- Global `AppError` is only used where cross-feature API mapping is required.

4. API safety:
- `matchError` maps internal errors to sanitized client messages.
- Causes and implementation details are retained in internal error values/logs, not exposed to clients.

5. Testing and validation:
- Typecheck and tests pass after refactors.
- Endpoint behavior is unchanged except for explicit bug fixes.

6. Panic and extraction:
- `unwrap` is not used in runtime request paths.
- `Panic` handling is limited to top-level boundaries (for logging/telemetry), not domain recovery logic.
