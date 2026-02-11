import { z } from "zod";

export const banMemberSchema = z.object({
  leagueId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const unbanMemberSchema = z.object({
  leagueId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const getModerationLogSchema = z.object({
  leagueId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});
