import { z } from 'zod';

const mmddyyyyRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
const defaultStartDate = '01/01/2025';

const formatAsMmDdYyyy = (date: Date): string => {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
};

export const growiBackfillSchema = z.object({
  bearerToken: z.string().trim().min(1),
  startDate: z.preprocess(
    (value) => value ?? defaultStartDate,
    z.string().regex(mmddyyyyRegex),
  ),
  endDate: z.preprocess(
    (value) => value ?? formatAsMmDdYyyy(new Date()),
    z.string().regex(mmddyyyyRegex),
  ),
  perPage: z.number().int().min(1).max(1000).default(1000),
  maxPages: z.number().int().min(1).optional(),
});

export type GrowiBackfillInput = z.infer<typeof growiBackfillSchema>;

export const growiPublicBackfillSchema = z.object({
  publicApiKey: z.string().trim().min(1),
  startDate: z.preprocess(
    (value) => value ?? defaultStartDate,
    z.string().regex(mmddyyyyRegex),
  ),
  endDate: z.preprocess(
    (value) => value ?? formatAsMmDdYyyy(new Date()),
    z.string().regex(mmddyyyyRegex),
  ),
  limit: z.number().int().min(1).max(10000).default(10000),
  perPage: z.number().int().min(1).max(100).default(100),
  maxPages: z.number().int().min(1).optional(),
  includeGmv: z.boolean().default(false),
});

export type GrowiPublicBackfillInput = z.infer<typeof growiPublicBackfillSchema>;
