import { z } from "zod";
import { trimmedStringSchema } from "../../shared/schemas/string";

const audioUrlSchema = trimmedStringSchema.pipe(
  z.url({
    protocol: /^https?$/,
  }),
);

const segmentTimeSchema = z
  .number()
  .nonnegative("Segment time must be >= 0");

export const transcribeAudioRequestSchema = z.object({
  audioUrl: audioUrlSchema,
}).strip();

export const transcribeSegmentSchema = z.object({
  text: z.string().min(1, "Segment text cannot be empty"),
  start: segmentTimeSchema,
  end: segmentTimeSchema,
  confidence: z
    .number()
    .min(0, "Confidence must be >= 0")
    .max(1, "Confidence must be <= 1")
    .nullable(),
}).superRefine((value, ctx) => {
  if (value.end < value.start) {
    ctx.addIssue({
      code: "custom",
      path: ["end"],
      message: "Segment end must be >= start",
    });
  }
});

export const transcribeAudioResponseSchema = z.object({
  text: z.string(),
  segments: z.array(transcribeSegmentSchema),
  language: z.string().min(1, "language cannot be empty").nullable(),
  duration: z
    .number()
    .nonnegative("duration must be >= 0")
    .nullable(),
}).strip();

export type TranscribeAudioRequest = z.infer<typeof transcribeAudioRequestSchema>;
export type TranscribeAudioResponse = z.infer<typeof transcribeAudioResponseSchema>;
