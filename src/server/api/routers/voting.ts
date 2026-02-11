import { z } from "zod";
import { eq, and, isNull, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, submissions } from "@/server/db/schema/rounds";
import { leagues, leagueMembers } from "@/server/db/schema/leagues";
import { votes } from "@/server/db/schema/voting";
import { leaderboardEntries } from "@/server/db/schema/leaderboard";
import { users } from "@/server/db/schema/users";
import { castVotesSchema } from "@/lib/validators/vote";
import type { LeagueSettings } from "@/lib/validators/league";

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

function getLeagueSettings(rawSettings: unknown): LeagueSettings {
	const defaults: LeagueSettings = {
		anonymousSubmissions: false,
		allowSelfVote: false,
		downvotingEnabled: false,
		votingStyle: "points",
		maxUpvotes: 3,
		maxDownvotes: 1,
		upvotePoints: [3, 2, 1],
		downvotePoints: [-1],
	};
	if (!rawSettings || typeof rawSettings !== "object") return defaults;
	return { ...defaults, ...(rawSettings as Partial<LeagueSettings>) };
}

export const votingRouter = router({
	castVotes: protectedProcedure
		.input(castVotesSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the round
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

			// Round must be in voting status
			if (round.status !== "voting") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Round is not in the voting phase",
				});
			}

			// Check voting deadline
			if (round.votingEnd && round.votingEnd <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Voting deadline has passed",
				});
			}

			// Get league settings for validation
			const [league] = await ctx.db
				.select({ settings: leagues.settings })
				.from(leagues)
				.where(eq(leagues.id, round.leagueId))
				.limit(1);

			const settings = getLeagueSettings(league?.settings);

			// Self-vote prevention
			if (!settings.allowSelfVote && input.votes.length > 0) {
				const userSubmissions = await ctx.db
					.select({ id: submissions.id })
					.from(submissions)
					.where(
						and(
							eq(submissions.roundId, input.roundId),
							eq(submissions.userId, userId)
						)
					);

				const userSubmissionIds = new Set(
					userSubmissions.map((s: { id: string }) => s.id)
				);
				for (const vote of input.votes) {
					if (userSubmissionIds.has(vote.submissionId)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Self-voting is not allowed in this league",
						});
					}
				}
			}

			// Validate vote counts and points based on voting style
			const upvotes = input.votes.filter((v) => v.voteType === "upvote");
			const downvotes = input.votes.filter(
				(v) => v.voteType === "downvote"
			);

			// Validate upvote count
			if (upvotes.length > settings.maxUpvotes) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Maximum ${settings.maxUpvotes} upvotes allowed`,
				});
			}

			// Validate downvotes
			if (downvotes.length > 0 && !settings.downvotingEnabled) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Downvoting is not enabled for this league",
				});
			}

			if (downvotes.length > settings.maxDownvotes) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Maximum ${settings.maxDownvotes} downvotes allowed`,
				});
			}

			// Validate points based on voting style
			if (settings.votingStyle === "single_pick") {
				if (upvotes.length > 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Single pick mode: you may only vote for one submission",
					});
				}
				if (upvotes.length === 1 && upvotes[0].points !== 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Single pick mode: vote must have exactly 1 point",
					});
				}
			} else if (settings.votingStyle === "rank") {
				// In rank mode, upvote points must come from the upvotePoints array in order
				const expectedPoints = settings.upvotePoints.slice(
					0,
					upvotes.length
				);
				const actualPoints = upvotes
					.map((v) => v.points)
					.sort((a, b) => b - a);
				const sortedExpected = [...expectedPoints].sort(
					(a, b) => b - a
				);
				if (
					actualPoints.length !== sortedExpected.length ||
					!actualPoints.every(
						(p, i) => p === sortedExpected[i]
					)
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Rank mode: vote points must match the configured point values",
					});
				}
			} else {
				// points mode: each upvote's points must be one of the configured values
				const allowedUpvotePoints = new Set(settings.upvotePoints);
				for (const vote of upvotes) {
					if (!allowedUpvotePoints.has(vote.points)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Invalid point value: ${vote.points}. Allowed: ${settings.upvotePoints.join(", ")}`,
						});
					}
				}
			}

			// Validate downvote points
			if (downvotes.length > 0) {
				const allowedDownvotePoints = new Set(settings.downvotePoints);
				for (const vote of downvotes) {
					if (!allowedDownvotePoints.has(vote.points)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Invalid downvote point value: ${vote.points}. Allowed: ${settings.downvotePoints.join(", ")}`,
						});
					}
				}
			}

			// Verify all submission IDs belong to this round
			if (input.votes.length > 0) {
				const submissionIds = input.votes.map((v) => v.submissionId);
				const validSubmissions = await ctx.db
					.select({ id: submissions.id })
					.from(submissions)
					.where(eq(submissions.roundId, input.roundId));

				const validIds = new Set(
					validSubmissions.map((s: { id: string }) => s.id)
				);
				for (const sid of submissionIds) {
					if (!validIds.has(sid)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Submission ${sid} is not part of this round`,
						});
					}
				}
			}

			// Delete existing votes and insert new ones in a transaction
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await ctx.db.transaction(async (tx: any) => {
				// Delete existing votes for this user + round
				await tx
					.delete(votes)
					.where(
						and(
							eq(votes.roundId, input.roundId),
							eq(votes.userId, userId)
						)
					);

				// Insert new votes
				if (input.votes.length > 0) {
					await tx.insert(votes).values(
						input.votes.map((v) => ({
							roundId: input.roundId,
							userId,
							submissionId: v.submissionId,
							points: v.points,
							voteType: v.voteType as "upvote" | "downvote",
						}))
					);
				}
			});

			return { success: true };
		}),

	deleteMyVotes: protectedProcedure
		.input(z.object({ roundId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the round and verify status
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

			// Must be in voting phase to delete votes
			if (round.status !== "voting") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Can only delete votes during the voting phase",
				});
			}

			// Check voting deadline
			if (round.votingEnd && round.votingEnd <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Voting deadline has passed",
				});
			}

			await ctx.db
				.delete(votes)
				.where(
					and(
						eq(votes.roundId, input.roundId),
						eq(votes.userId, userId)
					)
				);

			return { success: true };
		}),

	getMyVotes: protectedProcedure
		.input(z.object({ roundId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const result = await ctx.db
				.select({
					id: votes.id,
					roundId: votes.roundId,
					submissionId: votes.submissionId,
					points: votes.points,
					voteType: votes.voteType,
					createdAt: votes.createdAt,
				})
				.from(votes)
				.where(
					and(
						eq(votes.roundId, input.roundId),
						eq(votes.userId, userId)
					)
				);

			return result;
		}),

	getResults: protectedProcedure
		.input(z.object({ roundId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the round
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

			// Only available for revealed or archived rounds
			if (round.status !== "revealed" && round.status !== "archived") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Results are only available for revealed or archived rounds",
				});
			}

			// Get all submissions with user info
			const allSubmissions = await ctx.db
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

			// Get all votes for this round
			const allVotes = await ctx.db
				.select({
					submissionId: votes.submissionId,
					points: votes.points,
					voteType: votes.voteType,
				})
				.from(votes)
				.where(eq(votes.roundId, input.roundId));

			// Calculate scores per submission
			const scoreMap = new Map<
				string,
				{
					totalPoints: number;
					upvoteCount: number;
					downvoteCount: number;
				}
			>();

			for (const submission of allSubmissions) {
				scoreMap.set(submission.id, {
					totalPoints: 0,
					upvoteCount: 0,
					downvoteCount: 0,
				});
			}

			for (const vote of allVotes) {
				const entry = scoreMap.get(vote.submissionId);
				if (entry) {
					entry.totalPoints += vote.points;
					if (vote.voteType === "upvote") {
						entry.upvoteCount++;
					} else {
						entry.downvoteCount++;
					}
				}
			}

			// Build results and sort
			const results = allSubmissions
				.map((sub) => {
					const scores = scoreMap.get(sub.id) ?? {
						totalPoints: 0,
						upvoteCount: 0,
						downvoteCount: 0,
					};
					return {
						...sub,
						...scores,
					};
				})
				.sort((a, b) => {
					// Sort by total points descending
					if (b.totalPoints !== a.totalPoints)
						return b.totalPoints - a.totalPoints;
					// Tiebreak by upvote count descending
					if (b.upvoteCount !== a.upvoteCount)
						return b.upvoteCount - a.upvoteCount;
					// Tiebreak by earliest submission
					return (
						a.createdAt.getTime() - b.createdAt.getTime()
					);
				});

			return results;
		}),

	calculateAndSaveResults: protectedProcedure
		.input(z.object({ roundId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the round
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

			// Enforce league membership and owner/admin role
			const [membership] = await ctx.db
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

			if (
				!membership ||
				(membership.role !== "owner" && membership.role !== "admin")
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only league owners and admins can recompute results",
				});
			}

			// --- Idempotent rebuild: recalculate from ALL revealed/archived rounds ---

			// Helper to aggregate scores and rebuild leaderboard entries for a set of rounds
			async function rebuildLeaderboard(
				roundIds: string[],
				leagueId: string,
				seasonId: string | null
			) {
				if (roundIds.length === 0) {
					// Delete any stale entries for this scope
					if (seasonId !== null) {
						await ctx.db
							.delete(leaderboardEntries)
							.where(
								and(
									eq(leaderboardEntries.leagueId, leagueId),
									eq(leaderboardEntries.seasonId, seasonId)
								)
							);
					} else {
						await ctx.db
							.delete(leaderboardEntries)
							.where(
								and(
									eq(leaderboardEntries.leagueId, leagueId),
									isNull(leaderboardEntries.seasonId)
								)
							);
					}
					return;
				}

				// Get all submissions and votes for these rounds
				const allSubs = await ctx.db
					.select({
						id: submissions.id,
						userId: submissions.userId,
						roundId: submissions.roundId,
						createdAt: submissions.createdAt,
					})
					.from(submissions)
					.where(inArray(submissions.roundId, roundIds));

				const allVotes = await ctx.db
					.select({
						submissionId: votes.submissionId,
						points: votes.points,
						voteType: votes.voteType,
					})
					.from(votes)
					.where(inArray(votes.roundId, roundIds));

				// Per-submission scores
				const subScores = new Map<
					string,
					{
						userId: string;
						roundId: string;
						totalPoints: number;
						upvoteCount: number;
						downvoteCount: number;
						createdAt: Date;
					}
				>();
				for (const sub of allSubs) {
					subScores.set(sub.id, {
						userId: sub.userId,
						roundId: sub.roundId,
						totalPoints: 0,
						upvoteCount: 0,
						downvoteCount: 0,
						createdAt: sub.createdAt,
					});
				}
				for (const vote of allVotes) {
					const entry = subScores.get(vote.submissionId);
					if (entry) {
						entry.totalPoints += vote.points;
						if (vote.voteType === "upvote") {
							entry.upvoteCount++;
						} else {
							entry.downvoteCount++;
						}
					}
				}

				// Group by round to determine per-round winners
				const roundGroups = new Map<
					string,
					Array<{
						userId: string;
						totalPoints: number;
						upvoteCount: number;
						downvoteCount: number;
						createdAt: Date;
					}>
				>();
				for (const subData of subScores.values()) {
					if (!roundGroups.has(subData.roundId)) {
						roundGroups.set(subData.roundId, []);
					}
					roundGroups.get(subData.roundId)!.push(subData);
				}

				// Aggregate per-user across all rounds
				const userAgg = new Map<
					string,
					{
						totalPoints: number;
						upvotesReceived: number;
						downvotesReceived: number;
						wins: number;
						rounds: Set<string>;
					}
				>();

				for (const [rId, subs] of roundGroups.entries()) {
					// Sort to find round winner
					subs.sort((a, b) => {
						if (b.totalPoints !== a.totalPoints)
							return b.totalPoints - a.totalPoints;
						if (b.upvoteCount !== a.upvoteCount)
							return b.upvoteCount - a.upvoteCount;
						return (
							a.createdAt.getTime() -
							b.createdAt.getTime()
						);
					});
					const roundWinnerId =
						subs.length > 0 ? subs[0].userId : null;

					// Per-user aggregation within this round
					const userRound = new Map<
						string,
						{
							totalPoints: number;
							upvotes: number;
							downvotes: number;
						}
					>();
					for (const sub of subs) {
						const cur = userRound.get(sub.userId) ?? {
							totalPoints: 0,
							upvotes: 0,
							downvotes: 0,
						};
						cur.totalPoints += sub.totalPoints;
						cur.upvotes += sub.upvoteCount;
						cur.downvotes += sub.downvoteCount;
						userRound.set(sub.userId, cur);
					}

					for (const [uId, scores] of userRound.entries()) {
						const agg = userAgg.get(uId) ?? {
							totalPoints: 0,
							upvotesReceived: 0,
							downvotesReceived: 0,
							wins: 0,
							rounds: new Set<string>(),
						};
						agg.totalPoints += scores.totalPoints;
						agg.upvotesReceived += scores.upvotes;
						agg.downvotesReceived += scores.downvotes;
						if (uId === roundWinnerId) agg.wins++;
						agg.rounds.add(rId);
						userAgg.set(uId, agg);
					}
				}

				// Delete existing entries for this scope
				if (seasonId !== null) {
					await ctx.db
						.delete(leaderboardEntries)
						.where(
							and(
								eq(leaderboardEntries.leagueId, leagueId),
								eq(leaderboardEntries.seasonId, seasonId)
							)
						);
				} else {
					await ctx.db
						.delete(leaderboardEntries)
						.where(
							and(
								eq(leaderboardEntries.leagueId, leagueId),
								isNull(leaderboardEntries.seasonId)
							)
						);
				}

				// Insert fresh entries
				for (const [uId, agg] of userAgg.entries()) {
					await ctx.db.insert(leaderboardEntries).values({
						leagueId,
						seasonId,
						userId: uId,
						totalPoints: agg.totalPoints,
						upvotesReceived: agg.upvotesReceived,
						downvotesReceived: agg.downvotesReceived,
						wins: agg.wins,
						roundsParticipated: agg.rounds.size,
					});
				}
			}

			// Rebuild season leaderboard from all revealed/archived rounds in this season
			const seasonRounds = await ctx.db
				.select({ id: rounds.id })
				.from(rounds)
				.where(
					and(
						eq(rounds.leagueId, round.leagueId),
						eq(rounds.seasonId, round.seasonId),
						or(
							eq(rounds.status, "revealed"),
							eq(rounds.status, "archived")
						)
					)
				);

			await rebuildLeaderboard(
				seasonRounds.map((r) => r.id),
				round.leagueId,
				round.seasonId
			);

			// Rebuild all-time leaderboard from all revealed/archived rounds in the league
			const allLeagueRounds = await ctx.db
				.select({ id: rounds.id })
				.from(rounds)
				.where(
					and(
						eq(rounds.leagueId, round.leagueId),
						or(
							eq(rounds.status, "revealed"),
							eq(rounds.status, "archived")
						)
					)
				);

			await rebuildLeaderboard(
				allLeagueRounds.map((r) => r.id),
				round.leagueId,
				null
			);

			// Determine the winner of the input round for the return value
			const roundSubs = await ctx.db
				.select({
					id: submissions.id,
					userId: submissions.userId,
					createdAt: submissions.createdAt,
				})
				.from(submissions)
				.where(eq(submissions.roundId, input.roundId));

			const roundVotes = await ctx.db
				.select({
					submissionId: votes.submissionId,
					points: votes.points,
					voteType: votes.voteType,
				})
				.from(votes)
				.where(eq(votes.roundId, input.roundId));

			const scoreMap = new Map<
				string,
				{
					userId: string;
					totalPoints: number;
					upvoteCount: number;
					createdAt: Date;
				}
			>();
			for (const sub of roundSubs) {
				scoreMap.set(sub.id, {
					userId: sub.userId,
					totalPoints: 0,
					upvoteCount: 0,
					createdAt: sub.createdAt,
				});
			}
			for (const vote of roundVotes) {
				const entry = scoreMap.get(vote.submissionId);
				if (entry) {
					entry.totalPoints += vote.points;
					if (vote.voteType === "upvote") {
						entry.upvoteCount++;
					}
				}
			}

			const ranked = Array.from(scoreMap.values()).sort((a, b) => {
				if (b.totalPoints !== a.totalPoints)
					return b.totalPoints - a.totalPoints;
				if (b.upvoteCount !== a.upvoteCount)
					return b.upvoteCount - a.upvoteCount;
				return a.createdAt.getTime() - b.createdAt.getTime();
			});

			const winnerId =
				ranked.length > 0 ? ranked[0].userId : null;

			return { success: true, winnerId };
		}),
});
