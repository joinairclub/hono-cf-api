import { z } from "zod";
import { workersAiTranscriptionResponseSchema } from "@/integrations/workers-ai/schema";
import { trimmedStringSchema } from "@/shared/schemas/string";

const audioUrlSchema = trimmedStringSchema.pipe(
  z.url({
    protocol: /^https?$/,
    message: "audioUrl must be a valid HTTP or HTTPS URL",
  }),
);

export const transcribeAudioRequestSchema = z.object({
  audioUrl: audioUrlSchema,
}).strip();

export const transcribeAudioResponseSchema = workersAiTranscriptionResponseSchema;

export type TranscribeAudioRequest = z.infer<typeof transcribeAudioRequestSchema>;
export type TranscribeAudioResponse = z.infer<typeof transcribeAudioResponseSchema>;
