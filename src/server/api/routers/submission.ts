import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, submissions } from "@/server/db/schema/rounds";
import { leagues, leagueMembers } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";
import {
	createSubmissionSchema,
	updateSubmissionSchema,
} from "@/lib/validators/submission";

async function checkLeagueMembership(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	leagueId: string,
	userId: string
) {
	const [membership] = await db
		.select()
		.from(leagueMembers)
		.where(
			and(
				eq(leagueMembers.leagueId, leagueId),
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

	return membership;
}

export const submissionRouter = router({
	create: protectedProcedure
		.input(createSubmissionSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the round and validate status
			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, input.roundId))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			// Check league membership
			await checkLeagueMembership(ctx.db, round.leagueId, userId);

			// Round must be in submitting status
			if (round.status !== "submitting") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Round is not accepting submissions",
				});
			}

			// Check submission deadline
			if (round.submissionEnd && round.submissionEnd <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Submission deadline has passed",
				});
			}

			// Check for existing submission
			const [existing] = await ctx.db
				.select({ id: submissions.id })
				.from(submissions)
				.where(
					and(
						eq(submissions.roundId, input.roundId),
						eq(submissions.userId, userId)
					)
				)
				.limit(1);

			if (existing) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You have already submitted for this round",
				});
			}

			const [submission] = await ctx.db
				.insert(submissions)
				.values({
					roundId: input.roundId,
					userId,
					provider: input.provider,
					providerTrackId: input.providerTrackId,
					trackName: input.trackName,
					artist: input.artist,
					album: input.album ?? null,
					artworkUrl: input.artworkUrl ?? null,
					duration: input.duration ?? null,
					previewUrl: input.previewUrl ?? null,
					note: input.note ?? null,
				})
				.returning();

			return submission;
		}),

	getMySubmission: protectedProcedure
		.input(z.object({ roundId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [submission] = await ctx.db
				.select()
				.from(submissions)
				.where(
					and(
						eq(submissions.roundId, input.roundId),
						eq(submissions.userId, userId)
					)
				)
				.limit(1);

			return submission ?? null;
		}),

	getByRound: protectedProcedure
		.input(z.object({ roundId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the round and check visibility
			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, input.roundId))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			// Check league membership
			await checkLeagueMembership(ctx.db, round.leagueId, userId);

			// Only show submissions after submitting phase (blind submissions)
			if (round.status === "draft" || round.status === "submitting") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Submissions are hidden during the submission phase",
				});
			}

			// Fetch league settings to check for anonymous mode
			const [league] = await ctx.db
				.select({ settings: leagues.settings })
				.from(leagues)
				.where(eq(leagues.id, round.leagueId))
				.limit(1);
			const settings = (league?.settings ?? {}) as Record<string, unknown>;
			const isAnonymous =
				settings.anonymousSubmissions === true && round.status === "voting";

			const result = await ctx.db
				.select({
					id: submissions.id,
					roundId: submissions.roundId,
					userId: submissions.userId,
					trackName: submissions.trackName,
					artist: submissions.artist,
					album: submissions.album,
					artworkUrl: submissions.artworkUrl,
					duration: submissions.duration,
					provider: submissions.provider,
					providerTrackId: submissions.providerTrackId,
					previewUrl: submissions.previewUrl,
					note: submissions.note,
					createdAt: submissions.createdAt,
					userName: users.name,
					userImage: users.image,
				})
				.from(submissions)
				.innerJoin(users, eq(users.id, submissions.userId))
				.where(eq(submissions.roundId, input.roundId));

			if (isAnonymous) {
				return result.map((row) => ({
					...row,
					userName: null as string | null,
					userImage: null as string | null,
				}));
			}

			return result;
		}),

	update: protectedProcedure
		.input(updateSubmissionSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get submission and verify ownership
			const [submission] = await ctx.db
				.select()
				.from(submissions)
				.where(eq(submissions.id, input.id))
				.limit(1);

			if (!submission) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Submission not found",
				});
			}

			if (submission.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only edit your own submission",
				});
			}

			// Get round to check status and deadline
			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, submission.roundId))
				.limit(1);

			if (!round || round.status !== "submitting") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Round is no longer accepting changes",
				});
			}

			if (round.submissionEnd && round.submissionEnd <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Submission deadline has passed",
				});
			}

			const [updated] = await ctx.db
				.update(submissions)
				.set({ note: input.note ?? null })
				.where(eq(submissions.id, input.id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get submission and verify ownership
			const [submission] = await ctx.db
				.select()
				.from(submissions)
				.where(eq(submissions.id, input.id))
				.limit(1);

			if (!submission) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Submission not found",
				});
			}

			if (submission.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only delete your own submission",
				});
			}

			// Get round to check status and deadline
			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, submission.roundId))
				.limit(1);

			if (!round || round.status !== "submitting") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Round is no longer accepting changes",
				});
			}

			if (round.submissionEnd && round.submissionEnd <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Submission deadline has passed",
				});
			}

			await ctx.db
				.delete(submissions)
				.where(eq(submissions.id, input.id));

			return { success: true };
		}),
});
