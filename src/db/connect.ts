import { DbConnectionError } from "../shared/errors/app-error";
import { Result } from "../shared/result";
import { createDbClient } from "./client";
import type { Db } from "./client";

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
