/**
 * Converts a Unix timestamp in seconds or milliseconds to an ISO string.
 * Returns null for missing or invalid values.
 */
export const unixTimestampToIso = (value: number | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const milliseconds = value >= 1_000_000_000_000 ? value : value * 1_000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
