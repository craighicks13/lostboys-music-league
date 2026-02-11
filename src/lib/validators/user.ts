import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  streamingPreference: z
    .enum(["spotify", "apple_music", "youtube_music", "other"])
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  streamingPreference: z
    .enum(["spotify", "apple_music", "youtube_music", "other"])
    .optional(),
  bio: z.string().max(500).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable(),
  streamingPreference: z
    .enum(["spotify", "apple_music", "youtube_music", "other"])
    .nullable(),
  bio: z.string().max(500).nullable(),
  createdAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
