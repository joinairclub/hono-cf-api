import { z } from 'zod';

const mmddyyyyRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

export const growiBackfillSchema = z.object({
  startDate: z.string().regex(mmddyyyyRegex).optional(),
  endDate: z.string().regex(mmddyyyyRegex).optional(),
  perPage: z.number().int().min(1).max(1000).optional(),
  maxPages: z.number().int().min(1).optional(),
});

export type GrowiBackfillInput = z.infer<typeof growiBackfillSchema>;
