import { z } from "zod";

export const createCommentSchema = z.object({
  submissionId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
});

export const hideCommentSchema = z.object({
  commentId: z.string().uuid(),
});

export const toggleReactionSchema = z.object({
  submissionId: z.string().uuid(),
  emoji: z.string().min(1).max(4),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type HideCommentInput = z.infer<typeof hideCommentSchema>;
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
