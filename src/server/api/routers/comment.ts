import { z } from "zod";
import { eq, and, asc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { comments } from "@/server/db/schema/voting";
import { submissions, rounds } from "@/server/db/schema/rounds";
import { leagueMembers } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";
import {
	createCommentSchema,
	deleteCommentSchema,
	hideCommentSchema,
} from "@/lib/validators/comment";

async function checkLeagueMembershipViaSubmission(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	submissionId: string,
	userId: string
) {
	// submission -> round -> league -> league_members
	const [submission] = await db
		.select({
			id: submissions.id,
			roundId: submissions.roundId,
		})
		.from(submissions)
		.where(eq(submissions.id, submissionId))
		.limit(1);

	if (!submission) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Submission not found",
		});
	}

	const [round] = await db
		.select({
			id: rounds.id,
			leagueId: rounds.leagueId,
			status: rounds.status,
		})
		.from(rounds)
		.where(eq(rounds.id, submission.roundId))
		.limit(1);

	if (!round) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Round not found",
		});
	}

	const [membership] = await db
		.select()
		.from(leagueMembers)
		.where(
			and(
				eq(leagueMembers.leagueId, round.leagueId),
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

	return { submission, round, membership };
}

export const commentRouter = router({
	getBySubmission: protectedProcedure
		.input(z.object({ submissionId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Verify league membership via submission -> round -> league
			await checkLeagueMembershipViaSubmission(
				ctx.db,
				input.submissionId,
				userId
			);

			const result = await ctx.db
				.select({
					id: comments.id,
					submissionId: comments.submissionId,
					userId: comments.userId,
					content: comments.content,
					hidden: comments.hidden,
					createdAt: comments.createdAt,
					userName: users.name,
					userImage: users.image,
				})
				.from(comments)
				.innerJoin(users, eq(comments.userId, users.id))
				.where(eq(comments.submissionId, input.submissionId))
				.orderBy(asc(comments.createdAt));

			return result;
		}),

	create: protectedProcedure
		.input(createCommentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Verify league membership and get round status
			const { round } = await checkLeagueMembershipViaSubmission(
				ctx.db,
				input.submissionId,
				userId
			);

			// Only allow commenting during voting/revealed/archived
			if (round.status === "draft" || round.status === "submitting") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Comments are only allowed during voting, revealed, or archived phases",
				});
			}

			const [comment] = await ctx.db
				.insert(comments)
				.values({
					submissionId: input.submissionId,
					userId,
					content: input.content,
				})
				.returning();

			// Return with user info
			const [user] = await ctx.db
				.select({ name: users.name, image: users.image })
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			return {
				...comment,
				userName: user?.name ?? null,
				userImage: user?.image ?? null,
			};
		}),

	delete: protectedProcedure
		.input(deleteCommentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Fetch the comment
			const [comment] = await ctx.db
				.select()
				.from(comments)
				.where(eq(comments.id, input.commentId))
				.limit(1);

			if (!comment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Comment not found",
				});
			}

			// Check if user is the author
			const isAuthor = comment.userId === userId;

			if (!isAuthor) {
				// Check if user is admin/owner in the league
				// comment -> submission -> round -> league -> league_members
				const [submission] = await ctx.db
					.select({ roundId: submissions.roundId })
					.from(submissions)
					.where(eq(submissions.id, comment.submissionId))
					.limit(1);

				if (!submission) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Submission not found",
					});
				}

				const [round] = await ctx.db
					.select({ leagueId: rounds.leagueId })
					.from(rounds)
					.where(eq(rounds.id, submission.roundId))
					.limit(1);

				if (!round) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Round not found",
					});
				}

				const [membership] = await ctx.db
					.select({ role: leagueMembers.role })
					.from(leagueMembers)
					.where(
						and(
							eq(leagueMembers.leagueId, round.leagueId),
							eq(leagueMembers.userId, userId),
							isNull(leagueMembers.bannedAt)
						)
					)
					.limit(1);

				if (
					!membership ||
					(membership.role !== "admin" && membership.role !== "owner")
				) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"You can only delete your own comments, or be an admin/owner",
					});
				}
			}

			await ctx.db
				.delete(comments)
				.where(eq(comments.id, input.commentId));

			return { success: true };
		}),

	hide: protectedProcedure
		.input(hideCommentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Fetch the comment
			const [comment] = await ctx.db
				.select()
				.from(comments)
				.where(eq(comments.id, input.commentId))
				.limit(1);

			if (!comment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Comment not found",
				});
			}

			// Only admin/owner can hide comments
			// comment -> submission -> round -> league -> league_members
			const [submission] = await ctx.db
				.select({ roundId: submissions.roundId })
				.from(submissions)
				.where(eq(submissions.id, comment.submissionId))
				.limit(1);

			if (!submission) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Submission not found",
				});
			}

			const [round] = await ctx.db
				.select({ leagueId: rounds.leagueId })
				.from(rounds)
				.where(eq(rounds.id, submission.roundId))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			const [membership] = await ctx.db
				.select({ role: leagueMembers.role })
				.from(leagueMembers)
				.where(
					and(
						eq(leagueMembers.leagueId, round.leagueId),
						eq(leagueMembers.userId, userId),
						isNull(leagueMembers.bannedAt)
					)
				)
				.limit(1);

			if (
				!membership ||
				(membership.role !== "admin" && membership.role !== "owner")
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins and owners can hide comments",
				});
			}

			const [updated] = await ctx.db
				.update(comments)
				.set({ hidden: true })
				.where(eq(comments.id, input.commentId))
				.returning();

			return updated;
		}),
});
