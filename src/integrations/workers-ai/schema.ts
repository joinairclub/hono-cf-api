import { z } from "zod";
import { UpstreamResponseError } from "../../shared/errors/app-error";
import { Result } from "../../shared/result";
import { optionalTrimmedStringSchema, trimmedStringSchema } from "../../shared/schemas/string";

const timeSecondSchema = z
  .number()
  .nonnegative("Timestamp must be >= 0");

const workersAiWordSchema = z.object({
  word: optionalTrimmedStringSchema,
  start: timeSecondSchema.optional(),
  end: timeSecondSchema.optional(),
}).strip();

const workersAiSegmentSchema = z.object({
  text: optionalTrimmedStringSchema,
  start: timeSecondSchema.optional(),
  end: timeSecondSchema.optional(),
  words: z.array(workersAiWordSchema).optional(),
}).strip();

const workersAiRawTranscriptionSchema = z.object({
  text: trimmedStringSchema,
  segments: z.array(workersAiSegmentSchema).optional(),
  transcription_info: z.object({
    language: optionalTrimmedStringSchema,
    duration: timeSecondSchema.optional(),
  }).strip().optional(),
}).strip();

const workersAiNormalizedSegmentSchema = z
  .object({
    text: z.string().min(1, "Segment text cannot be empty"),
    start: timeSecondSchema,
    end: timeSecondSchema,
    confidence: z
      .number()
      .min(0, "Confidence must be >= 0")
      .max(1, "Confidence must be <= 1")
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.end < value.start) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Segment end must be >= start",
      });
    }
  });

type WorkersAiSegment = z.infer<typeof workersAiNormalizedSegmentSchema>;

const extractSegmentLevelFallback = (
  segment: z.infer<typeof workersAiSegmentSchema>,
): WorkersAiSegment[] => {
  if (
    !segment.text
    || segment.start === undefined
    || segment.end === undefined
    || segment.end < segment.start
  ) {
    return [];
  }

  return [{
    text: segment.text,
    start: segment.start,
    end: segment.end,
    confidence: null,
  }];
};

const extractWordLevelSegments = (
  segment: z.infer<typeof workersAiSegmentSchema>,
): WorkersAiSegment[] =>
  (segment.words ?? []).flatMap((word) => {
    if (
      !word.word
      || word.start === undefined
      || word.end === undefined
      || word.end < word.start
    ) {
      return [];
    }

    return [{
      text: word.word,
      start: word.start,
      end: word.end,
      confidence: null,
    }];
  });

const normalizeSegments = (
  segments: z.infer<typeof workersAiSegmentSchema>[],
): WorkersAiSegment[] =>
  segments.flatMap((segment) => {
    const wordLevelSegments = extractWordLevelSegments(segment);
    return wordLevelSegments.length > 0 ? wordLevelSegments : extractSegmentLevelFallback(segment);
  });

const workersAiNormalizedTranscriptionSchema = z.object({
  text: z.string(),
  segments: z.array(workersAiNormalizedSegmentSchema),
  language: z.string().min(1, "language cannot be empty").nullable(),
  duration: timeSecondSchema.nullable(),
}).strip();

export const workersAiTranscriptionResponseSchema = workersAiNormalizedTranscriptionSchema;

const workersAiTranscriptionSchema = workersAiRawTranscriptionSchema
  .transform((data) => {
    const sourceSegments = data.segments ?? [];

    return {
      text: data.text,
      segments: normalizeSegments(sourceSegments),
      language: data.transcription_info?.language ?? null,
      duration: data.transcription_info?.duration ?? null,
    };
  })
  .pipe(workersAiNormalizedTranscriptionSchema);

export type WorkersAiTranscription = z.infer<typeof workersAiNormalizedTranscriptionSchema>;

export const extractWorkersAiTranscription = (
  payload: unknown,
): Result<WorkersAiTranscription, UpstreamResponseError> => {
  const parsed = workersAiTranscriptionSchema.safeParse(payload);

  if (!parsed.success) {
    return Result.err(
      new UpstreamResponseError({
        service: "WorkersAi",
        message: "Workers AI transcription schema mismatch",
      }),
    );
  }

  return Result.ok(parsed.data);
};
