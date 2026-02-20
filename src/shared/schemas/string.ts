import { z } from "zod";

export const normalizeTrimmedString = (value: unknown): unknown =>
  typeof value === "string" ? value.trim() : value;

export const normalizeOptionalTrimmedString = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const trimmedStringSchema = z.preprocess(
  normalizeTrimmedString,
  z.string(),
);

export const optionalTrimmedStringSchema = z.preprocess(
  normalizeOptionalTrimmedString,
  z.string().optional(),
);
