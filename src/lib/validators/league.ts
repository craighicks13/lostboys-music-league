import { z } from "zod";

export const leagueSettingsSchema = z.object({
  anonymousSubmissions: z.boolean().default(false),
  allowSelfVote: z.boolean().default(false),
  downvotingEnabled: z.boolean().default(false),
  votingStyle: z.enum(["rank", "points", "single_pick"]).default("points"),
  maxUpvotes: z.number().int().min(1).max(10).default(3),
  maxDownvotes: z.number().int().min(1).max(10).default(1),
  upvotePoints: z
    .array(z.number().int())
    .default([3, 2, 1]),
  downvotePoints: z
    .array(z.number().int())
    .default([-1]),
  whatsappGroupLink: z.string().url().optional().or(z.literal("")),
});

export type LeagueSettings = z.infer<typeof leagueSettingsSchema>;

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  isPrivate: z.boolean().default(true),
  settings: leagueSettingsSchema.optional(),
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const updateLeagueSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isPrivate: z.boolean().optional(),
  settings: leagueSettingsSchema.partial().optional(),
});

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;
