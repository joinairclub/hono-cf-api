import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppError } from "@/shared/errors/app-error";
import { toApiError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

export type AppResponder = <T, E extends AppError>(
  c: Context,
  result: Result<T, E>,
  status?: ContentfulStatusCode,
) => Response;

export const respond: AppResponder = <T, E extends AppError>(
  c: Context,
  result: Result<T, E>,
  status: ContentfulStatusCode = 200,
) =>
  Result.match<T, E, Response>(result, {
    ok: (value) => c.json({ data: value, error: null }, status),
    err: (error) => {
      const apiError = toApiError(error);
      return c.json({ data: null, error: apiError.error }, apiError.status);
    },
  });
