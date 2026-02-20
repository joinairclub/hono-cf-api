import { TaggedError } from "../../shared/result";

export class WorkersAiRequestError extends TaggedError("WorkersAiRequestError")<{
  message: string;
  cause: unknown;
}>() {
  constructor(args: { cause: unknown; message?: string }) {
    const msg = args.cause instanceof Error ? args.cause.message : String(args.cause);
    super({
      ...args,
      message: args.message ?? `Workers AI request failed: ${msg}`,
    });
  }
}

export class WorkersAiResponseError extends TaggedError("WorkersAiResponseError")<{
  message: string;
}>() {}

export type WorkersAiError = WorkersAiRequestError | WorkersAiResponseError;
