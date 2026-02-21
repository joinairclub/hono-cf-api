import type { ContentfulStatusCode } from "hono/utils/http-status";
import { TaggedError, matchError } from "@/shared/result";

export class DbConnectionError extends TaggedError("DbConnectionError")<{
  message: string;
  cause: unknown;
}>() {
  constructor(args: { cause: unknown }) {
    const msg = args.cause instanceof Error ? args.cause.message : String(args.cause);
    super({ ...args, message: `Database connection failed: ${msg}` });
  }
}

export class DbQueryError extends TaggedError("DbQueryError")<{
  operation: string;
  message: string;
  cause: unknown;
}>() {
  constructor(args: { operation: string; cause: unknown }) {
    const msg = args.cause instanceof Error ? args.cause.message : String(args.cause);
    super({ ...args, message: `Database query failed during ${args.operation}: ${msg}` });
  }
}

export class NotFoundError extends TaggedError("NotFoundError")<{
  message: string;
}>() {}

export class InternalError extends TaggedError("InternalError")<{
  message: string;
}>() {}

export class ConfigurationError extends TaggedError("ConfigurationError")<{
  message: string;
}>() {}

export class UpstreamRequestError extends TaggedError("UpstreamRequestError")<{
  service: string;
  message: string;
  cause: unknown;
}>() {
  constructor(args: { service: string; cause: unknown; message?: string }) {
    const msg = args.cause instanceof Error ? args.cause.message : String(args.cause);
    super({
      ...args,
      message: args.message ?? `Upstream request to ${args.service} failed: ${msg}`,
    });
  }
}

export class UpstreamResponseError extends TaggedError("UpstreamResponseError")<{
  service: string;
  message: string;
}>() {}

export type AppError =
  | DbConnectionError
  | DbQueryError
  | NotFoundError
  | InternalError
  | ConfigurationError
  | UpstreamRequestError
  | UpstreamResponseError;

export interface ApiErrorBody {
  message: string;
  code: AppError["_tag"];
}

export function toApiError(
  error: AppError,
): { status: ContentfulStatusCode; error: ApiErrorBody } {
  return matchError(error, {
    DbConnectionError: (e) => ({
      status: 500 as const,
      error: { message: "Database connection failed", code: e._tag },
    }),
    DbQueryError: (e) => ({
      status: 500 as const,
      error: { message: "Database query failed", code: e._tag },
    }),
    NotFoundError: (e) => ({
      status: 404 as const,
      error: { message: "Not Found", code: e._tag },
    }),
    InternalError: (e) => ({
      status: 500 as const,
      error: { message: "Internal Server Error", code: e._tag },
    }),
    ConfigurationError: (e) => ({
      status: 500 as const,
      error: { message: "Server configuration error", code: e._tag },
    }),
    UpstreamRequestError: (e) => ({
      status: 502 as const,
      error: { message: "Upstream request failed", code: e._tag },
    }),
    UpstreamResponseError: (e) => ({
      status: 502 as const,
      error: { message: "Upstream response failed", code: e._tag },
    }),
  });
}
