import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { TaggedError, matchError } from '../lib/result';

export class DbConnectionError extends TaggedError('DbConnectionError')<{
  message: string;
  cause: unknown;
}>() {
  constructor(args: { cause: unknown }) {
    const msg = args.cause instanceof Error ? args.cause.message : String(args.cause);
    super({ ...args, message: `Database connection failed: ${msg}` });
  }
}

export class DbQueryError extends TaggedError('DbQueryError')<{
  operation: string;
  message: string;
  cause: unknown;
}>() {
  constructor(args: { operation: string; cause: unknown }) {
    const msg = args.cause instanceof Error ? args.cause.message : String(args.cause);
    super({ ...args, message: `Database query failed during ${args.operation}: ${msg}` });
  }
}

export class NotFoundError extends TaggedError('NotFoundError')<{
  message: string;
}>() {}

export class InternalError extends TaggedError('InternalError')<{
  message: string;
}>() {}

export type AppError = DbConnectionError | DbQueryError | NotFoundError | InternalError;

export type ApiErrorBody = { message: string; code: AppError['_tag'] };

export function toApiError(
  error: AppError,
): { status: ContentfulStatusCode; error: ApiErrorBody } {
  return matchError(error, {
    DbConnectionError: (e) => ({
      status: 500 as const,
      error: { message: 'Database connection failed', code: e._tag },
    }),
    DbQueryError: (e) => ({
      status: 500 as const,
      error: { message: 'Database query failed', code: e._tag },
    }),
    NotFoundError: (e) => ({
      status: 404 as const,
      error: { message: e.message, code: e._tag },
    }),
    InternalError: (e) => ({
      status: 500 as const,
      error: { message: e.message, code: e._tag },
    }),
  });
}
