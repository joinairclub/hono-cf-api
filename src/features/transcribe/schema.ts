import { z } from "zod";
import type { WorkersAiTranscription } from "../../integrations/workers-ai/schema";
import { trimmedStringSchema } from "../../shared/schemas/string";

const audioUrlSchema = trimmedStringSchema.pipe(
  z.url({
    protocol: /^https?$/,
  }),
);

export const transcribeAudioRequestSchema = z.object({
  audioUrl: audioUrlSchema,
}).strip();

export type TranscribeAudioRequest = z.infer<typeof transcribeAudioRequestSchema>;
export type TranscribeAudioResponse = WorkersAiTranscription;
