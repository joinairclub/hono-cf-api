import { desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { posts as postsTable } from "@/db/schema";
import type { Post } from "@/db/schema";
import type { CreatePostInput } from "@/features/posts/schema";
import { DbQueryError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

export const listPosts = (
  db: Db,
): Promise<Result<Post[], DbQueryError>> =>
  Result.tryPromise({
    try: () => db.select().from(postsTable).orderBy(desc(postsTable.id)).limit(20),
    catch: (cause) => new DbQueryError({ operation: "list posts", cause }),
  });

export const createPost = (
  db: Db,
  input: CreatePostInput,
): Promise<Result<Post, DbQueryError>> =>
  Result.tryPromise({
    try: () =>
      db
        .insert(postsTable)
        .values({
          title: input.title,
          body: input.body,
          published: input.published ?? false,
        })
        .returning(),
    catch: (cause) => new DbQueryError({ operation: "create post", cause }),
  }).then((result) =>
    result.andThen((rows) => {
      const created = rows.at(0);

      if (!created) {
        return Result.err(
          new DbQueryError({
            operation: "create post",
            cause: new Error("Insert returned no row"),
          }),
        );
      }

      return Result.ok(created);
    }),
  );
