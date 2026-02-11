import { z } from "zod";

export const createChatGroupSchema = z.object({
  leagueId: z.string().uuid(),
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1).optional(),
});

export type CreateChatGroupInput = z.infer<typeof createChatGroupSchema>;

export const createChatMessageSchema = z.object({
  chatGroupId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  replyToId: z.string().uuid().optional(),
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageSchema>;
