import { z } from "zod";
import {
	eq,
	and,
	desc,
	asc,
	count,
	countDistinct,
	sql,
	isNull,
	inArray,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, submissions, seasons } from "@/server/db/schema/rounds";
import { leagueMembers } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";
import {
	leaderboardEntries,
	userStatistics,
} from "@/server/db/schema/leaderboard";
import { votes } from "@/server/db/schema/voting";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkMembership(db: any, leagueId: string, userId: string) {
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

export const statisticsRouter = router({
	getLeagueStats: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, userId);

			const roundConditions = [eq(rounds.leagueId, input.leagueId)];
			if (input.seasonId) {
				roundConditions.push(eq(rounds.seasonId, input.seasonId));
			}

			// Total rounds
			const [roundStats] = await ctx.db
				.select({ totalRounds: count(rounds.id) })
				.from(rounds)
				.where(and(...roundConditions));

			const totalRounds = roundStats?.totalRounds ?? 0;

			// Submission stats (total, unique participants)
			const [subStats] = await ctx.db
				.select({
					totalSubmissions: count(submissions.id),
					uniqueParticipants: countDistinct(submissions.userId),
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...roundConditions));

			const totalSubmissions = subStats?.totalSubmissions ?? 0;
			const uniqueParticipants = subStats?.uniqueParticipants ?? 0;

			// Total votes cast
			const [voteStats] = await ctx.db
				.select({ totalVotesCast: count(votes.id) })
				.from(votes)
				.innerJoin(rounds, eq(votes.roundId, rounds.id))
				.where(and(...roundConditions));

			const totalVotesCast = voteStats?.totalVotesCast ?? 0;

			// Avg submissions per round
			const avgSubmissionsPerRound =
				totalRounds > 0 ? totalSubmissions / totalRounds : 0;

			// Total league member count for participation rate
			const [memberStats] = await ctx.db
				.select({ memberCount: count(leagueMembers.id) })
				.from(leagueMembers)
				.where(eq(leagueMembers.leagueId, input.leagueId));

			const memberCount = memberStats?.memberCount ?? 0;
			const participationRate =
				memberCount > 0 ? uniqueParticipants / memberCount : 0;

			// Most active submitter
			const mostActiveRows = await ctx.db
				.select({
					userName: users.name,
					submissionCount: count(submissions.id),
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.innerJoin(users, eq(submissions.userId, users.id))
				.where(and(...roundConditions))
				.groupBy(users.id, users.name)
				.orderBy(desc(count(submissions.id)))
				.limit(1);

			const mostActiveSubmitter = mostActiveRows.length > 0
				? {
						name: mostActiveRows[0].userName ?? "Unknown",
						count: mostActiveRows[0].submissionCount,
					}
				: null;

			return {
				totalRounds,
				totalSubmissions,
				uniqueParticipants,
				totalVotesCast,
				avgSubmissionsPerRound,
				participationRate,
				mostActiveSubmitter,
			};
		}),

	getSeasonStats: protectedProcedure
		.input(
			z.object({
				seasonId: z.string().uuid(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Look up the season to get its leagueId
			const [season] = await ctx.db
				.select()
				.from(seasons)
				.where(eq(seasons.id, input.seasonId))
				.limit(1);

			if (!season) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Season not found",
				});
			}

			await checkMembership(ctx.db, season.leagueId, userId);

			const roundConditions = [
				eq(rounds.leagueId, season.leagueId),
				eq(rounds.seasonId, input.seasonId),
			];

			// Rounds played & unique participants & total submissions
			const [subStats] = await ctx.db
				.select({
					totalSubmissions: count(submissions.id),
					uniqueParticipants: countDistinct(submissions.userId),
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...roundConditions));

			const [roundStats] = await ctx.db
				.select({ roundsPlayed: count(rounds.id) })
				.from(rounds)
				.where(and(...roundConditions));

			// Current leader from season leaderboard
			const leaderRows = await ctx.db
				.select({
					userName: users.name,
					totalPoints: leaderboardEntries.totalPoints,
				})
				.from(leaderboardEntries)
				.innerJoin(users, eq(users.id, leaderboardEntries.userId))
				.where(
					and(
						eq(leaderboardEntries.leagueId, season.leagueId),
						eq(leaderboardEntries.seasonId, input.seasonId)
					)
				)
				.orderBy(desc(leaderboardEntries.totalPoints))
				.limit(1);

			const currentLeader = leaderRows.length > 0
				? {
						name: leaderRows[0].userName ?? "Unknown",
						points: leaderRows[0].totalPoints,
					}
				: null;

			// Round breakdown
			const roundRows = await ctx.db
				.select({
					roundId: rounds.id,
					theme: rounds.theme,
					status: rounds.status,
				})
				.from(rounds)
				.where(and(...roundConditions))
				.orderBy(asc(rounds.createdAt));

			const roundBreakdown = await Promise.all(
				roundRows.map(async (r) => {
					// Submission count for this round
					const [sc] = await ctx.db
						.select({ submissionCount: count(submissions.id) })
						.from(submissions)
						.where(eq(submissions.roundId, r.roundId));

					// Winner: top scorer for this round using net score (upvotes - downvotes)
					const winnerRows = await ctx.db
						.select({
							userId: submissions.userId,
							userName: users.name,
							totalPoints: sql<number>`coalesce(sum(${votes.points}), 0)`,
						})
						.from(submissions)
						.leftJoin(votes, eq(votes.submissionId, submissions.id))
						.innerJoin(users, eq(submissions.userId, users.id))
						.where(eq(submissions.roundId, r.roundId))
						.groupBy(submissions.userId, users.name)
						.orderBy(desc(sql`coalesce(sum(${votes.points}), 0)`))
						.limit(1);

					return {
						roundId: r.roundId,
						theme: r.theme,
						status: r.status,
						submissionCount: sc?.submissionCount ?? 0,
						winnerId: winnerRows.length > 0 ? winnerRows[0].userId : null,
						winnerName: winnerRows.length > 0
							? winnerRows[0].userName
							: null,
					};
				})
			);

			return {
				roundsPlayed: roundStats?.roundsPlayed ?? 0,
				uniqueParticipants: subStats?.uniqueParticipants ?? 0,
				totalSubmissions: subStats?.totalSubmissions ?? 0,
				currentLeader,
				roundBreakdown,
			};
		}),

	getUserDetailedStats: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				userId: z.string().uuid().optional(),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const currentUserId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, currentUserId);

			const targetUserId = input.userId ?? currentUserId;

			// Fetch from userStatistics table
			const statsConditions = [
				eq(userStatistics.userId, targetUserId),
				eq(userStatistics.leagueId, input.leagueId),
			];
			if (input.seasonId) {
				statsConditions.push(
					eq(userStatistics.seasonId, input.seasonId)
				);
			}

			const statsRows = await ctx.db
				.select()
				.from(userStatistics)
				.where(and(...statsConditions));

			// Aggregate across rows if multiple seasons
			const avgPlacements = statsRows
				.map((r: { avgPlacement: number | null }) => r.avgPlacement)
				.filter((p: number | null): p is number => p != null);
			const avgPlacement =
				avgPlacements.length > 0
					? avgPlacements.reduce((s: number, p: number) => s + p, 0) /
						avgPlacements.length
					: null;

			const bestPlacements = statsRows
				.map((r: { bestPlacement: number | null }) => r.bestPlacement)
				.filter((p: number | null): p is number => p != null);
			const bestPlacement =
				bestPlacements.length > 0 ? Math.min(...bestPlacements) : null;

			const worstPlacements = statsRows
				.map((r: { worstPlacement: number | null }) => r.worstPlacement)
				.filter((p: number | null): p is number => p != null);
			const worstPlacement =
				worstPlacements.length > 0 ? Math.max(...worstPlacements) : null;

			const totalVotesCast = statsRows.reduce(
				(s: number, r: { totalVotesCast: number }) =>
					s + r.totalVotesCast,
				0
			);
			const totalUpvotesCast = statsRows.reduce(
				(s: number, r: { totalUpvotesCast: number }) =>
					s + r.totalUpvotesCast,
				0
			);
			const totalDownvotesCast = statsRows.reduce(
				(s: number, r: { totalDownvotesCast: number }) =>
					s + r.totalDownvotesCast,
				0
			);

			// Merge favorite genres across rows (stored as {genre, count} objects)
			const genreMap = new Map<string, number>();
			for (const row of statsRows) {
				const genres = (row as { favoriteGenres: Array<{ genre: string; count: number }> | null })
					.favoriteGenres;
				if (genres && Array.isArray(genres)) {
					for (const g of genres) {
						const genreName = typeof g === "string" ? g : g.genre;
						const genreCount = typeof g === "string" ? 1 : (g.count ?? 1);
						genreMap.set(
							genreName,
							(genreMap.get(genreName) ?? 0) + genreCount
						);
					}
				}
			}
			const favoriteGenres = Array.from(genreMap.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([genre]) => genre);

			// Submission history: all submissions by user in league (optionally season-filtered)
			const subConditions = [
				eq(submissions.userId, targetUserId),
				eq(rounds.leagueId, input.leagueId),
			];
			if (input.seasonId) {
				subConditions.push(eq(rounds.seasonId, input.seasonId));
			}

			const userSubmissions = await ctx.db
				.select({
					submissionId: submissions.id,
					roundId: submissions.roundId,
					theme: rounds.theme,
					trackName: submissions.trackName,
					artist: submissions.artist,
					createdAt: submissions.createdAt,
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...subConditions))
				.orderBy(asc(rounds.createdAt));

			// For each submission, calculate placement and points
			const submissionHistory = await Promise.all(
				userSubmissions.map(async (sub) => {
					// Get all submissions in that round ranked by votes
					const ranked = await ctx.db
						.select({
							submissionId: submissions.id,
							userId: submissions.userId,
							totalPoints: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then ${votes.points} else 0 end), 0) - coalesce(sum(case when ${votes.voteType} = 'downvote' then ${votes.points} else 0 end), 0)`,
							upvoteCount: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`,
						})
						.from(submissions)
						.leftJoin(votes, eq(votes.submissionId, submissions.id))
						.where(eq(submissions.roundId, sub.roundId))
						.groupBy(submissions.id, submissions.userId, submissions.createdAt)
						.orderBy(
							desc(
								sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then ${votes.points} else 0 end), 0) - coalesce(sum(case when ${votes.voteType} = 'downvote' then ${votes.points} else 0 end), 0)`
							),
							desc(
								sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`
							),
							asc(submissions.createdAt)
						);

					const placement =
						ranked.findIndex(
							(r) => r.submissionId === sub.submissionId
						) + 1;
					const entry = ranked.find(
						(r) => r.submissionId === sub.submissionId
					);

					return {
						roundId: sub.roundId,
						theme: sub.theme,
						trackName: sub.trackName,
						artist: sub.artist,
						placement: placement > 0 ? placement : null,
						pointsEarned: entry
							? Number(entry.totalPoints)
							: 0,
					};
				})
			);

			// Win streak: longest consecutive round wins
			let winStreak = 0;
			let currentStreak = 0;
			for (const sh of submissionHistory) {
				if (sh.placement === 1) {
					currentStreak++;
					if (currentStreak > winStreak) {
						winStreak = currentStreak;
					}
				} else {
					currentStreak = 0;
				}
			}

			return {
				avgPlacement,
				bestPlacement,
				worstPlacement,
				totalVotesCast,
				totalUpvotesCast,
				totalDownvotesCast,
				favoriteGenres,
				submissionHistory,
				winStreak,
			};
		}),

	getControversialSubmissions: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
				limit: z.number().int().positive().default(10),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, userId);

			const conditions = [eq(rounds.leagueId, input.leagueId)];
			if (input.seasonId) {
				conditions.push(eq(rounds.seasonId, input.seasonId));
			}

			const results = await ctx.db
				.select({
					submissionId: submissions.id,
					trackName: submissions.trackName,
					artist: submissions.artist,
					artworkUrl: submissions.artworkUrl,
					userName: users.name,
					roundTheme: rounds.theme,
					upvoteCount: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`,
					downvoteCount: sql<number>`coalesce(sum(case when ${votes.voteType} = 'downvote' then 1 else 0 end), 0)`,
					controversyScore: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0) * coalesce(sum(case when ${votes.voteType} = 'downvote' then 1 else 0 end), 0)`,
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.innerJoin(users, eq(submissions.userId, users.id))
				.leftJoin(votes, eq(votes.submissionId, submissions.id))
				.where(and(...conditions))
				.groupBy(
					submissions.id,
					submissions.trackName,
					submissions.artist,
					submissions.artworkUrl,
					users.name,
					rounds.theme
				)
				.having(
					sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0) >= 1 AND coalesce(sum(case when ${votes.voteType} = 'downvote' then 1 else 0 end), 0) >= 1`
				)
				.orderBy(
					desc(
						sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0) * coalesce(sum(case when ${votes.voteType} = 'downvote' then 1 else 0 end), 0)`
					)
				)
				.limit(input.limit);

			return results.map((r) => ({
				submissionId: r.submissionId,
				trackName: r.trackName,
				artist: r.artist,
				artworkUrl: r.artworkUrl,
				userName: r.userName,
				roundTheme: r.roundTheme,
				upvoteCount: Number(r.upvoteCount),
				downvoteCount: Number(r.downvoteCount),
				controversyScore: Number(r.controversyScore),
			}));
		}),

	getComparativeStats: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				userId1: z.string().uuid(),
				userId2: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const currentUserId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, currentUserId);

			// Helper to get user stats
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			async function getUserStats(db: any, targetUserId: string) {
				// Leaderboard entry
				const leaderboardConditions = [
					eq(leaderboardEntries.leagueId, input.leagueId),
					eq(leaderboardEntries.userId, targetUserId),
				];
				if (input.seasonId) {
					leaderboardConditions.push(
						eq(leaderboardEntries.seasonId, input.seasonId)
					);
				} else {
					leaderboardConditions.push(
						isNull(leaderboardEntries.seasonId)
					);
				}

				const [lb] = await db
					.select()
					.from(leaderboardEntries)
					.where(and(...leaderboardConditions))
					.limit(1);

				// userStatistics for avgPlacement
				const statsConditions = [
					eq(userStatistics.userId, targetUserId),
					eq(userStatistics.leagueId, input.leagueId),
				];
				if (input.seasonId) {
					statsConditions.push(
						eq(userStatistics.seasonId, input.seasonId)
					);
				}

				const statsRows = await db
					.select()
					.from(userStatistics)
					.where(and(...statsConditions));

				const avgPlacements = statsRows
					.map(
						(r: { avgPlacement: number | null }) => r.avgPlacement
					)
					.filter(
						(p: number | null): p is number => p != null
					);
				const avgPlacement =
					avgPlacements.length > 0
						? avgPlacements.reduce(
								(s: number, p: number) => s + p,
								0
							) / avgPlacements.length
						: null;

				// Get user info
				const [user] = await db
					.select({ name: users.name, image: users.image })
					.from(users)
					.where(eq(users.id, targetUserId))
					.limit(1);

				return {
					userId: targetUserId,
					userName: user?.name ?? null,
					userImage: user?.image ?? null,
					totalPoints: lb?.totalPoints ?? 0,
					wins: lb?.wins ?? 0,
					avgPlacement,
					roundsPlayed: lb?.roundsParticipated ?? 0,
					upvotesReceived: lb?.upvotesReceived ?? 0,
					downvotesReceived: lb?.downvotesReceived ?? 0,
				};
			}

			const user1Stats = await getUserStats(ctx.db, input.userId1);
			const user2Stats = await getUserStats(ctx.db, input.userId2);

			// Head-to-head: find rounds where both users submitted
			const roundConditions = [eq(rounds.leagueId, input.leagueId)];
			if (input.seasonId) {
				roundConditions.push(eq(rounds.seasonId, input.seasonId));
			}

			// Get all round IDs in this league/season
			const allRounds = await ctx.db
				.select({ roundId: rounds.id })
				.from(rounds)
				.where(and(...roundConditions));

			const allRoundIds = allRounds.map((r) => r.roundId);

			let user1Wins = 0;
			let user2Wins = 0;
			let ties = 0;
			let commonRounds = 0;

			if (allRoundIds.length > 0) {
				// Get rounds where user1 submitted
				const user1Subs = await ctx.db
					.select({ roundId: submissions.roundId })
					.from(submissions)
					.where(
						and(
							eq(submissions.userId, input.userId1),
							inArray(submissions.roundId, allRoundIds)
						)
					);
				const user1RoundIds = new Set(
					user1Subs.map((s) => s.roundId)
				);

				// Get rounds where user2 submitted
				const user2Subs = await ctx.db
					.select({ roundId: submissions.roundId })
					.from(submissions)
					.where(
						and(
							eq(submissions.userId, input.userId2),
							inArray(submissions.roundId, allRoundIds)
						)
					);
				const user2RoundIds = new Set(
					user2Subs.map((s) => s.roundId)
				);

				// Common rounds
				const commonRoundIds = [...user1RoundIds].filter((id) =>
					user2RoundIds.has(id)
				);
				commonRounds = commonRoundIds.length;

				// For each common round, compare placements
				for (const roundId of commonRoundIds) {
					// Rank all submissions in this round
					const ranked = await ctx.db
						.select({
							userId: submissions.userId,
							totalPoints: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then ${votes.points} else 0 end), 0) - coalesce(sum(case when ${votes.voteType} = 'downvote' then ${votes.points} else 0 end), 0)`,
							upvoteCount: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`,
						})
						.from(submissions)
						.leftJoin(
							votes,
							eq(votes.submissionId, submissions.id)
						)
						.where(eq(submissions.roundId, roundId))
						.groupBy(submissions.userId, submissions.createdAt)
						.orderBy(
							desc(
								sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then ${votes.points} else 0 end), 0) - coalesce(sum(case when ${votes.voteType} = 'downvote' then ${votes.points} else 0 end), 0)`
							),
							desc(
								sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`
							),
							asc(submissions.createdAt)
						);

					const u1Idx = ranked.findIndex(
						(r) => r.userId === input.userId1
					);
					const u2Idx = ranked.findIndex(
						(r) => r.userId === input.userId2
					);

					if (u1Idx >= 0 && u2Idx >= 0) {
						if (u1Idx < u2Idx) {
							user1Wins++;
						} else if (u2Idx < u1Idx) {
							user2Wins++;
						} else {
							ties++;
						}
					}
				}
			}

			return {
				user1: user1Stats,
				user2: user2Stats,
				headToHead: {
					user1Wins,
					user2Wins,
					ties,
					commonRounds,
				},
			};
		}),

	exportLeaderboardCsv: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, userId);

			const conditions = [
				eq(leaderboardEntries.leagueId, input.leagueId),
			];
			if (input.seasonId) {
				conditions.push(
					eq(leaderboardEntries.seasonId, input.seasonId)
				);
			} else {
				conditions.push(isNull(leaderboardEntries.seasonId));
			}

			const entries = await ctx.db
				.select({
					totalPoints: leaderboardEntries.totalPoints,
					wins: leaderboardEntries.wins,
					roundsParticipated: leaderboardEntries.roundsParticipated,
					upvotesReceived: leaderboardEntries.upvotesReceived,
					downvotesReceived: leaderboardEntries.downvotesReceived,
					userName: users.name,
				})
				.from(leaderboardEntries)
				.innerJoin(users, eq(users.id, leaderboardEntries.userId))
				.where(and(...conditions))
				.orderBy(desc(leaderboardEntries.totalPoints));

			const header =
				"Rank,Player,Total Points,Wins,Rounds Played,Upvotes Received,Downvotes Received";
			const rows = entries.map((e, i) => {
				const name = (e.userName ?? "Unknown").replace(/,/g, " ");
				return `${i + 1},${name},${e.totalPoints},${e.wins},${e.roundsParticipated},${e.upvotesReceived},${e.downvotesReceived}`;
			});
			const csv = [header, ...rows].join("\n");
			const filename = input.seasonId
				? `leaderboard-season-${input.seasonId}.csv`
				: `leaderboard-alltime.csv`;

			return { csv, filename };
		}),

	exportUserHistoryCsv: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				userId: z.string().uuid().optional(),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const currentUserId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, currentUserId);

			const targetUserId = input.userId ?? currentUserId;

			const subConditions = [
				eq(submissions.userId, targetUserId),
				eq(rounds.leagueId, input.leagueId),
			];
			if (input.seasonId) {
				subConditions.push(eq(rounds.seasonId, input.seasonId));
			}

			const userSubmissions = await ctx.db
				.select({
					submissionId: submissions.id,
					roundId: submissions.roundId,
					theme: rounds.theme,
					trackName: submissions.trackName,
					artist: submissions.artist,
					createdAt: submissions.createdAt,
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...subConditions))
				.orderBy(asc(rounds.createdAt));

			// Calculate placement for each submission
			const historyRows = await Promise.all(
				userSubmissions.map(async (sub) => {
					const ranked = await ctx.db
						.select({
							submissionId: submissions.id,
							totalPoints: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then ${votes.points} else 0 end), 0) - coalesce(sum(case when ${votes.voteType} = 'downvote' then ${votes.points} else 0 end), 0)`,
							upvoteCount: sql<number>`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`,
						})
						.from(submissions)
						.leftJoin(
							votes,
							eq(votes.submissionId, submissions.id)
						)
						.where(eq(submissions.roundId, sub.roundId))
						.groupBy(submissions.id, submissions.createdAt)
						.orderBy(
							desc(
								sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then ${votes.points} else 0 end), 0) - coalesce(sum(case when ${votes.voteType} = 'downvote' then ${votes.points} else 0 end), 0)`
							),
							desc(
								sql`coalesce(sum(case when ${votes.voteType} = 'upvote' then 1 else 0 end), 0)`
							),
							asc(submissions.createdAt)
						);

					const placement =
						ranked.findIndex(
							(r) => r.submissionId === sub.submissionId
						) + 1;
					const entry = ranked.find(
						(r) => r.submissionId === sub.submissionId
					);

					return {
						theme: sub.theme,
						trackName: sub.trackName,
						artist: sub.artist,
						placement: placement > 0 ? placement : null,
						pointsEarned: entry
							? Number(entry.totalPoints)
							: 0,
					};
				})
			);

			const header =
				"Round Theme,Track,Artist,Placement,Points Earned";
			const rows = historyRows.map((r) => {
				const theme = (r.theme ?? "").replace(/,/g, " ");
				const track = (r.trackName ?? "").replace(/,/g, " ");
				const artist = (r.artist ?? "").replace(/,/g, " ");
				return `${theme},${track},${artist},${r.placement ?? "N/A"},${r.pointsEarned}`;
			});
			const csv = [header, ...rows].join("\n");
			const filename = input.seasonId
				? `user-history-season-${input.seasonId}.csv`
				: `user-history-alltime.csv`;

			return { csv, filename };
		}),
});
