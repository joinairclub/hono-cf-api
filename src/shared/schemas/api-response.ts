import { z } from "zod";

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
});

export const apiErrorResponseSchema = z.object({
  data: z.null(),
  error: apiErrorSchema,
});

export const apiSuccessResponseSchema = <TData extends z.ZodType>(
  dataSchema: TData,
) =>
  z.object({
    data: dataSchema,
    error: z.null(),
  });
