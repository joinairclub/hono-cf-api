import { fromUnixTime, isValid, parseISO } from 'date-fns';

export const unixSecondsToDate = (value: number): Date => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`Invalid unix timestamp seconds: ${value}`);
  }

  const parsed = fromUnixTime(value);
  if (!isValid(parsed)) {
    throw new RangeError(`Invalid unix timestamp seconds: ${value}`);
  }

  return parsed;
};

export const isoToDate = (value: string): Date => {
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    throw new RangeError(`Invalid ISO timestamp: ${value}`);
  }

  return parsed;
};
