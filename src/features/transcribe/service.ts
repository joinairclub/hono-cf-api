import type { TranscribeAudioResponse } from "@/features/transcribe/schema";
import { transcribeWithWorkersAi } from "@/integrations/workers-ai/client";
import type {
  WorkersAiClientError,
} from "@/integrations/workers-ai/client";
import { ConfigurationError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

export type TranscribeServiceError =
  | ConfigurationError
  | WorkersAiClientError;

const getWorkersAiBinding = (
  env: Env,
): Result<Ai, ConfigurationError> => {
  const value: unknown = Reflect.get(env, "AI");
  if (!value || typeof value !== "object") {
    return Result.err(
      new ConfigurationError({
        message: "Missing required binding: AI",
      }),
    );
  }

  const aiBinding = value as Partial<Ai>;
  if (typeof aiBinding.run !== "function") {
    return Result.err(
      new ConfigurationError({
        message: "Missing required binding: AI",
      }),
    );
  }

  return Result.ok(aiBinding as Ai);
};

export const transcribeAudioUrl = async (params: {
  env: Env;
  audioUrl: string;
}): Promise<Result<TranscribeAudioResponse, TranscribeServiceError>> =>
  Result.gen(async function* () {
    const ai = yield* getWorkersAiBinding(params.env);
    const transcription = yield* Result.await(transcribeWithWorkersAi({
      audioUrl: params.audioUrl,
      ai,
    }));

    return Result.ok({
      text: transcription.text,
      segments: transcription.segments,
      language: transcription.language,
      duration: transcription.duration,
    });
  });
