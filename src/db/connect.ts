import { createDbClient } from "@/db/client";
import type { Db } from "@/db/client";
import { DbConnectionError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

export const connectDb = (
  connectionString: string,
): Promise<Result<Db, DbConnectionError>> =>
  Result.tryPromise({
    try: () => {
      const { client, db } = createDbClient(connectionString);
      return client.connect().then(() => db);
    },
    catch: (cause) => new DbConnectionError({ cause }),
  });
