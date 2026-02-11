import { z } from "zod";

export const voteTypeSchema = z.enum(["upvote", "downvote"]);

export type VoteType = z.infer<typeof voteTypeSchema>;

export const createVoteSchema = z.object({
  submissionId: z.string().uuid(),
  roundId: z.string().uuid(),
  points: z.number().int(),
  voteType: voteTypeSchema.default("upvote"),
});

export type CreateVoteInput = z.infer<typeof createVoteSchema>;

export const castVotesSchema = z.object({
  roundId: z.string().uuid(),
  votes: z.array(
    z.object({
      submissionId: z.string().uuid(),
      points: z.number().int(),
      voteType: voteTypeSchema,
    })
  ),
});

export type CastVotesInput = z.infer<typeof castVotesSchema>;
