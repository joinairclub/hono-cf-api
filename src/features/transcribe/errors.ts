import { TaggedError } from "../../shared/result";

export class TranscribeUpstreamError extends TaggedError("TranscribeUpstreamError")<{
  provider: "workers-ai";
  kind: "request" | "response";
  message: string;
  cause?: unknown;
}>() {}
