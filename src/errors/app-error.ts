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

export type AppError = DbConnectionError | DbQueryError;

export type ApiErrorBody = { message: string; code: AppError['_tag'] };

export const toApiError = (
  error: AppError,
): { status: ContentfulStatusCode; error: ApiErrorBody } => {
  return matchError(error, {
    DbConnectionError: (e) => ({
      status: 500 as const,
      error: { message: 'Database connection failed', code: e._tag },
    }),
    DbQueryError: (e) => ({
      status: 500 as const,
      error: { message: 'Database query failed', code: e._tag },
    }),
  });
};
