import { z } from "zod";
import { trimmedStringSchema } from "@/shared/schemas/string";

const titleSchema = trimmedStringSchema.pipe(
  z
    .string()
    .min(1, "title cannot be empty")
    .max(300, "title must be at most 300 characters"),
);

const bodySchema = trimmedStringSchema.pipe(
  z
    .string()
    .min(1, "body cannot be empty")
    .max(50_000, "body must be at most 50000 characters"),
);

export const createPostSchema = z
  .object({
    title: titleSchema,
    body: bodySchema,
    published: z.boolean().optional(),
  })
  .strip();

export const postResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
  createdAt: z.string(),
});

export const listPostsResponseDataSchema = z.array(postResponseSchema);

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type PostResponse = z.infer<typeof postResponseSchema>;
