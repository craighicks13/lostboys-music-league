import { z } from "zod";

export const createInviteSchema = z.object({
  leagueId: z.string().uuid(),
  email: z.string().email().optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const joinByCodeSchema = z.object({
  code: z.string().min(6).max(20),
});

export type JoinByCodeInput = z.infer<typeof joinByCodeSchema>;

export const joinByLinkSchema = z.object({
  token: z.string().min(1).max(255),
});

export type JoinByLinkInput = z.infer<typeof joinByLinkSchema>;
