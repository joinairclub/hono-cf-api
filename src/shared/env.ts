import { ConfigurationError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

export const getRequiredBindingString = (
  env: object,
  key: string,
): Result<string, ConfigurationError> => {
  const value: unknown = Reflect.get(env, key);
  if (typeof value !== "string") {
    return Result.err(new ConfigurationError({ message: `Missing required binding: ${key}` }));
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return Result.err(new ConfigurationError({ message: `Missing required binding: ${key}` }));
  }

  return Result.ok(trimmedValue);
};
