import { desc } from 'drizzle-orm';
import { DbQueryError } from '../errors/app-error';
import type { Db } from '../db/client';
import { posts as postsTable, type Post } from '../db/schema';
import { Result } from '../lib/result';
import type { CreatePostInput } from './schema';

export const listPosts = async (
  db: Db,
): Promise<Result<Post[], DbQueryError>> => {
  return Result.tryPromise({
    try: () => db.select().from(postsTable).orderBy(desc(postsTable.id)).limit(20),
    catch: (cause) => new DbQueryError({ operation: 'list posts', cause }),
  });
};

export const createPost = async (
  db: Db,
  input: CreatePostInput,
): Promise<Result<Post, DbQueryError>> => {
  return Result.tryPromise({
    try: async () => {
      const [created] = await db
        .insert(postsTable)
        .values({
          title: input.title,
          body: input.body,
          published: input.published ?? false,
        })
        .returning();

      if (!created) {
        throw new Error('Insert returned no row');
      }

      return created;
    },
    catch: (cause) => new DbQueryError({ operation: 'create post', cause }),
  });
};
