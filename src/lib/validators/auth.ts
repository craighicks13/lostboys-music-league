import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  callbackUrl: z.string().url().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  streamingPreference: z
    .enum(["spotify", "apple_music", "youtube_music", "other"])
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const passwordResetSchema = z.object({
  email: z.string().email(),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
