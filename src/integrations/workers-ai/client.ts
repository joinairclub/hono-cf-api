import { Buffer } from "node:buffer";
import { Result } from "../../shared/result";
import {
  WorkersAiRequestError,
  WorkersAiResponseError,
} from "./errors";
import { extractWorkersAiTranscription } from "./schema";
import type { WorkersAiTranscription } from "./schema";

const WORKERS_AI_TRANSCRIBE_MODEL = "@cf/openai/whisper-large-v3-turbo";

export type WorkersAiClientError = WorkersAiRequestError | WorkersAiResponseError;

const tryWorkersAiRequest = <T>(
  request: () => Promise<T>,
  message?: string,
): Promise<Result<T, WorkersAiRequestError>> =>
  Result.tryPromise({
    try: request,
    catch: (cause) =>
      new WorkersAiRequestError({
        cause,
        message,
      }),
  });

const encodeAudioBase64 = (
  audioBuffer: ArrayBuffer,
): Result<string, WorkersAiRequestError> =>
  Result.try({
    try: () => Buffer.from(audioBuffer).toString("base64"),
    catch: (cause) =>
      new WorkersAiRequestError({
        cause,
        message: "Failed to encode audio payload for Workers AI",
      }),
  });

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
        new WorkersAiResponseError({
          message: `Audio source returned ${audioResponse.status}: ${responseText.slice(0, 300)}`,
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
