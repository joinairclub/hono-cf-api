import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Result, matchError } from "../../shared/result";
import { transcribeAudioRequestSchema } from "./schema";
import type { TranscribeAudioResponse } from "./schema";
import { transcribeAudioUrl } from "./service";
import type { TranscribeServiceError } from "./service";

export const transcribeRoutes = new Hono<{ Bindings: Env }>();

interface TranscribeApiError {
  message: string;
  code: TranscribeServiceError["_tag"];
}

const toTranscribeApiError = (
  error: TranscribeServiceError,
): { status: ContentfulStatusCode; error: TranscribeApiError } =>
  matchError(error, {
    ConfigurationError: (e) => ({
      status: 500 as const,
      error: { message: "Server configuration error", code: e._tag },
    }),
    TranscribeUpstreamError: (e) => ({
      status: 502 as const,
      error: { message: "Upstream transcription failed", code: e._tag },
    }),
  });

transcribeRoutes.post("/", zValidator("json", transcribeAudioRequestSchema), async (c) => {
  const { audioUrl } = c.req.valid("json");
  const result = await transcribeAudioUrl({ env: c.env, audioUrl });

  return Result.match<TranscribeAudioResponse, TranscribeServiceError, Response>(result, {
    ok: (value) => c.json(value, 200),
    err: (error) => {
      const apiError = toTranscribeApiError(error);
      return c.json({ data: null, error: apiError.error }, apiError.status);
    },
  });
});
