import { z } from "zod";

export const roundStatusSchema = z.enum([
  "draft",
  "submitting",
  "voting",
  "revealed",
  "archived",
]);

export type RoundStatus = z.infer<typeof roundStatusSchema>;

export const votingConfigSchema = z.object({
  pointsPerUser: z.number().int().min(1).max(20).optional(),
  allowDownvotes: z.boolean().optional(),
  anonymousVoting: z.boolean().optional(),
});

export type VotingConfig = z.infer<typeof votingConfigSchema>;

export const createRoundSchema = z.object({
  leagueId: z.string().uuid(),
  seasonId: z.string().uuid(),
  theme: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  submissionStart: z.string().datetime().optional(),
  submissionEnd: z.string().datetime().optional(),
  votingEnd: z.string().datetime().optional(),
  votingConfig: votingConfigSchema.optional(),
  aiArtworkUrl: z.string().url().nullable().optional(),
});

export type CreateRoundInput = z.infer<typeof createRoundSchema>;

export const updateRoundSchema = z.object({
  id: z.string().uuid(),
  theme: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  submissionStart: z.string().datetime().nullable().optional(),
  submissionEnd: z.string().datetime().nullable().optional(),
  votingEnd: z.string().datetime().nullable().optional(),
  votingConfig: votingConfigSchema.nullable().optional(),
  aiArtworkUrl: z.string().url().nullable().optional(),
});

export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
