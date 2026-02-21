import { Buffer } from "node:buffer";
import { extractWorkersAiTranscription } from "@/integrations/workers-ai/schema";
import type { WorkersAiTranscription } from "@/integrations/workers-ai/schema";
import {
  UpstreamRequestError,
  UpstreamResponseError,
} from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

const WORKERS_AI_TRANSCRIBE_MODEL = "@cf/openai/whisper-large-v3-turbo";
const WORKERS_AI_SERVICE = "WorkersAi";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type WorkersAiClientError = UpstreamRequestError | UpstreamResponseError;

const tryWorkersAiRequest = <T>(
  request: () => Promise<T>,
  message?: string,
): Promise<Result<T, UpstreamRequestError>> =>
  Result.tryPromise({
    try: request,
    catch: (cause) =>
      new UpstreamRequestError({
        service: WORKERS_AI_SERVICE,
        cause,
        message,
      }),
  });

const encodeAudioBase64 = (
  audioBuffer: ArrayBuffer,
): Result<string, UpstreamRequestError> =>
  Result.try({
    try: () => Buffer.from(audioBuffer).toString("base64"),
    catch: (cause) =>
      new UpstreamRequestError({
        service: WORKERS_AI_SERVICE,
        cause,
        message: "Failed to encode audio payload for Workers AI",
      }),
  });

const parseContentLengthBytes = (
  contentLengthHeader: string,
): number | null => {
  if (!/^\d+$/.test(contentLengthHeader)) {
    return null;
  }

  const contentLength = Number.parseInt(contentLengthHeader, 10);
  return Number.isSafeInteger(contentLength) ? contentLength : null;
};

export const transcribeWithWorkersAi = async (params: {
  audioUrl: string;
  ai: Ai;
}): Promise<Result<WorkersAiTranscription, WorkersAiClientError>> =>
  Result.gen(async function* () {
    const audioResponse = yield* Result.await(
      tryWorkersAiRequest(() => fetch(params.audioUrl), "Failed to fetch audio URL"),
    );

    if (!audioResponse.ok) {
      const responseText = yield* Result.await(
        tryWorkersAiRequest(
          () => audioResponse.text(),
          "Failed to read audio source error response",
        ),
      );

      return Result.err(
        new UpstreamResponseError({
          service: WORKERS_AI_SERVICE,
          message: `Audio source returned ${audioResponse.status}: ${responseText.slice(0, 300)}`,
        }),
      );
    }

    // Assumption: upstream audio sources provide a valid content-length header.
    // We intentionally use header-based size enforcement (instead of stream byte counting)
    // to keep this guard simple for the current TikTok CDN-backed flow.
    const contentLengthHeader = audioResponse.headers.get("content-length");
    if (contentLengthHeader === null) {
      return Result.err(
        new UpstreamResponseError({
          service: WORKERS_AI_SERVICE,
          message: "Audio source did not provide content-length header",
        }),
      );
    }

    const contentLength = parseContentLengthBytes(contentLengthHeader);
    if (contentLength === null) {
      return Result.err(
        new UpstreamResponseError({
          service: WORKERS_AI_SERVICE,
          message: "Audio source returned invalid content-length header",
        }),
      );
    }

    if (contentLength > MAX_AUDIO_BYTES) {
      return Result.err(
        new UpstreamResponseError({
          service: WORKERS_AI_SERVICE,
          message: `Audio source is too large (${contentLength} bytes). Maximum supported size is ${MAX_AUDIO_BYTES} bytes`,
        }),
      );
    }

    const audioBuffer = yield* Result.await(
      tryWorkersAiRequest(
        () => audioResponse.arrayBuffer(),
        "Failed to read audio response body",
      ),
    );

    const encodedAudio = yield* encodeAudioBase64(audioBuffer);

    const inferencePayload = yield* Result.await(
      tryWorkersAiRequest(
        () =>
          params.ai.run(WORKERS_AI_TRANSCRIBE_MODEL, {
            audio: encodedAudio,
          }),
        "Workers AI transcription request failed",
      ),
    );

    const transcription = yield* extractWorkersAiTranscription(inferencePayload);

    return Result.ok(transcription);
  });
