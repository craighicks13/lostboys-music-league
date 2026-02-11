import { z } from "zod";
import {
	eq,
	and,
	desc,
	count,
	countDistinct,
	ilike,
	sql,
	or,
	isNull,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, submissions } from "@/server/db/schema/rounds";
import { leagueMembers, leagues } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";
import { userStatistics } from "@/server/db/schema/leaderboard";

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

export const analyticsRouter = router({
	searchSubmissions: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				query: z.string().min(1),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, userId);

			const searchPattern = `%${input.query}%`;

			const conditions = [
				eq(rounds.leagueId, input.leagueId),
				or(
					ilike(submissions.trackName, searchPattern),
					ilike(submissions.artist, searchPattern)
				),
			];

			if (input.seasonId) {
				conditions.push(eq(rounds.seasonId, input.seasonId));
			}

			const results = await ctx.db
				.select({
					trackName: submissions.trackName,
					artist: submissions.artist,
					album: submissions.album,
					artworkUrl: submissions.artworkUrl,
					roundTheme: rounds.theme,
					submitterName: users.name,
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.innerJoin(users, eq(submissions.userId, users.id))
				.where(and(...conditions))
				.orderBy(desc(submissions.createdAt))
				.limit(50);

			return results;
		}),

	topArtists: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
				limit: z.number().int().positive().default(20),
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
					artist: submissions.artist,
					submissionCount: count(submissions.id),
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...conditions))
				.groupBy(submissions.artist)
				.orderBy(desc(count(submissions.id)))
				.limit(input.limit);

			return results;
		}),

	topSongs: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
				limit: z.number().int().positive().default(20),
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
					trackName: submissions.trackName,
					artist: submissions.artist,
					submissionCount: count(submissions.id),
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...conditions))
				.groupBy(submissions.trackName, submissions.artist)
				.having(sql`count(${submissions.id}) > 1`)
				.orderBy(desc(count(submissions.id)))
				.limit(input.limit);

			return results;
		}),

	leagueOverview: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;
			await checkMembership(ctx.db, input.leagueId, userId);

			const conditions = [eq(rounds.leagueId, input.leagueId)];

			if (input.seasonId) {
				conditions.push(eq(rounds.seasonId, input.seasonId));
			}

			const [submissionStats] = await ctx.db
				.select({
					totalSubmissions: count(submissions.id),
					uniqueArtists: countDistinct(submissions.artist),
					uniqueSubmitters: countDistinct(submissions.userId),
				})
				.from(submissions)
				.innerJoin(rounds, eq(submissions.roundId, rounds.id))
				.where(and(...conditions));

			const [roundStats] = await ctx.db
				.select({
					totalRounds: count(rounds.id),
				})
				.from(rounds)
				.where(and(...conditions));

			return {
				totalSubmissions: submissionStats?.totalSubmissions ?? 0,
				uniqueArtists: submissionStats?.uniqueArtists ?? 0,
				uniqueSubmitters: submissionStats?.uniqueSubmitters ?? 0,
				totalRounds: roundStats?.totalRounds ?? 0,
			};
		}),

	myStats: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id!;

		// Get all leagues the user is a member of
		const memberships = await ctx.db
			.select({
				leagueId: leagueMembers.leagueId,
				leagueName: leagues.name,
			})
			.from(leagueMembers)
			.innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
			.where(eq(leagueMembers.userId, userId));

		// For each league, count submissions/rounds and pull userStatistics
		const perLeague = await Promise.all(
			memberships.map(async (m) => {
				const [submissionStats] = await ctx.db
					.select({
						submissionCount: count(submissions.id),
						roundsParticipated: countDistinct(submissions.roundId),
					})
					.from(submissions)
					.innerJoin(rounds, eq(submissions.roundId, rounds.id))
					.where(
						and(
							eq(submissions.userId, userId),
							eq(rounds.leagueId, m.leagueId)
						)
					);

				// Aggregate stats from userStatistics table (all-time only to avoid double-counting)
				const userStatsRows = await ctx.db
					.select({
						totalWins: userStatistics.totalWins,
						avgPlacement: userStatistics.avgPlacement,
						totalPointsEarned: userStatistics.totalPointsEarned,
					})
					.from(userStatistics)
					.where(
						and(
							eq(userStatistics.userId, userId),
							eq(userStatistics.leagueId, m.leagueId),
							isNull(userStatistics.seasonId)
						)
					);

				const wins = userStatsRows.reduce((s, r) => s + r.totalWins, 0);
				const points = userStatsRows.reduce((s, r) => s + r.totalPointsEarned, 0);
				const placements = userStatsRows
					.map((r) => r.avgPlacement)
					.filter((p): p is number => p != null);
				const avgPlacement =
					placements.length > 0
						? placements.reduce((s, p) => s + p, 0) / placements.length
						: null;

				return {
					leagueId: m.leagueId,
					leagueName: m.leagueName,
					submissionCount: submissionStats?.submissionCount ?? 0,
					roundsParticipated: submissionStats?.roundsParticipated ?? 0,
					wins,
					avgPlacement,
					totalPoints: points,
				};
			})
		);

		const totalSubmissions = perLeague.reduce(
			(sum, l) => sum + l.submissionCount,
			0
		);
		const totalWins = perLeague.reduce((sum, l) => sum + l.wins, 0);
		const totalPoints = perLeague.reduce((sum, l) => sum + l.totalPoints, 0);
		const allPlacements = perLeague
			.map((l) => l.avgPlacement)
			.filter((p): p is number => p != null);
		const avgPlacement =
			allPlacements.length > 0
				? allPlacements.reduce((s, p) => s + p, 0) / allPlacements.length
				: null;

		return {
			leaguesJoined: memberships.length,
			totalSubmissions,
			totalWins,
			avgPlacement,
			totalPoints,
			perLeague,
		};
	}),
});
