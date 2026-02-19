import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  published: z.boolean().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
