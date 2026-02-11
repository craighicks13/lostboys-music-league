import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, submissions } from "@/server/db/schema/rounds";
import { leagueMembers } from "@/server/db/schema/leagues";
import { reactions } from "@/server/db/schema/voting";
import { toggleReactionSchema } from "@/lib/validators/comment";

async function getSubmissionWithRound(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	submissionId: string,
	userId: string
) {
	const [row] = await db
		.select({
			submissionId: submissions.id,
			roundId: rounds.id,
			leagueId: rounds.leagueId,
			roundStatus: rounds.status,
		})
		.from(submissions)
		.innerJoin(rounds, eq(rounds.id, submissions.roundId))
		.where(eq(submissions.id, submissionId))
		.limit(1);

	if (!row) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Submission not found",
		});
	}

	// Check league membership
	const [membership] = await db
		.select()
		.from(leagueMembers)
		.where(
			and(
				eq(leagueMembers.leagueId, row.leagueId),
				eq(leagueMembers.userId, userId),
				isNull(leagueMembers.bannedAt)
			)
		)
		.limit(1);

	if (!membership) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You are not a member of this league",
		});
	}

	return row;
}

export const reactionRouter = router({
	getBySubmission: protectedProcedure
		.input(z.object({ submissionId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Verify membership via submission → round → league
			await getSubmissionWithRound(ctx.db, input.submissionId, userId);

			// Get all reactions for this submission
			const allReactions = await ctx.db
				.select({
					emoji: reactions.emoji,
					userId: reactions.userId,
				})
				.from(reactions)
				.where(eq(reactions.submissionId, input.submissionId));

			// Aggregate by emoji
			const emojiMap = new Map<
				string,
				{ count: number; userReacted: boolean }
			>();

			for (const r of allReactions) {
				const entry = emojiMap.get(r.emoji) ?? {
					count: 0,
					userReacted: false,
				};
				entry.count++;
				if (r.userId === userId) {
					entry.userReacted = true;
				}
				emojiMap.set(r.emoji, entry);
			}

			return Array.from(emojiMap.entries()).map(
				([emoji, { count, userReacted }]) => ({
					emoji,
					count,
					userReacted,
				})
			);
		}),

	toggle: protectedProcedure
		.input(toggleReactionSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Verify membership and get round status
			const row = await getSubmissionWithRound(
				ctx.db,
				input.submissionId,
				userId
			);

			// Only allow reactions during voting/revealed/archived
			if (
				row.roundStatus === "draft" ||
				row.roundStatus === "submitting"
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Reactions are only allowed during voting, revealed, or archived phases",
				});
			}

			// Check if reaction already exists
			const [existing] = await ctx.db
				.select({ id: reactions.id })
				.from(reactions)
				.where(
					and(
						eq(reactions.submissionId, input.submissionId),
						eq(reactions.userId, userId),
						eq(reactions.emoji, input.emoji)
					)
				)
				.limit(1);

			if (existing) {
				// Toggle off — delete
				await ctx.db
					.delete(reactions)
					.where(eq(reactions.id, existing.id));
				return { added: false };
			} else {
				// Toggle on — insert
				await ctx.db.insert(reactions).values({
					submissionId: input.submissionId,
					userId,
					emoji: input.emoji,
				});
				return { added: true };
			}
		}),
});
