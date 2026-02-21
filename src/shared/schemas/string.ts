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

/** Coerce an API value that may arrive as a number or string into a trimmed string. */
export const normalizeStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const normalized = normalizeOptionalTrimmedString(value);
    return typeof normalized === "string" ? normalized : undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }

  return undefined;
};

const TRUE_BOOLEAN_LITERALS = new Set(["true", "1"]);
const FALSE_BOOLEAN_LITERALS = new Set(["false", "0"]);

export const normalizeOptionalBoolean = (value: unknown): unknown => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  if (TRUE_BOOLEAN_LITERALS.has(trimmed)) {
    return true;
  }

  if (FALSE_BOOLEAN_LITERALS.has(trimmed)) {
    return false;
  }

  return undefined;
};
