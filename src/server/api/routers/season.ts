import { z } from "zod";
import { eq, and, desc, count, max, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { seasons } from "@/server/db/schema/rounds";
import { rounds } from "@/server/db/schema/rounds";
import { leagueMembers } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";
import { leaderboardEntries } from "@/server/db/schema/leaderboard";
import { createSeasonSchema, updateSeasonSchema } from "@/lib/validators/season";

async function checkMembership(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	leagueId: string,
	userId: string,
	requireRole?: ("owner" | "admin")[]
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

	if (requireRole && !requireRole.includes(membership.role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Insufficient permissions",
		});
	}

	return membership;
}

export const seasonRouter = router({
	create: protectedProcedure
		.input(createSeasonSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId, [
				"owner",
				"admin",
			]);

			const [maxResult] = await ctx.db
				.select({ maxNumber: max(seasons.number) })
				.from(seasons)
				.where(eq(seasons.leagueId, input.leagueId));

			const nextNumber = (maxResult?.maxNumber ?? 0) + 1;

			const [season] = await ctx.db
				.insert(seasons)
				.values({
					leagueId: input.leagueId,
					name: input.name,
					number: nextNumber,
					startDate: input.startDate
						? new Date(input.startDate)
						: undefined,
					endDate: input.endDate
						? new Date(input.endDate)
						: undefined,
				})
				.returning();

			return season;
		}),

	list: protectedProcedure
		.input(z.object({ leagueId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId);

			const result = await ctx.db
				.select({
					id: seasons.id,
					leagueId: seasons.leagueId,
					name: seasons.name,
					number: seasons.number,
					status: seasons.status,
					startDate: seasons.startDate,
					endDate: seasons.endDate,
					createdAt: seasons.createdAt,
					roundCount: count(rounds.id),
				})
				.from(seasons)
				.leftJoin(rounds, eq(rounds.seasonId, seasons.id))
				.where(eq(seasons.leagueId, input.leagueId))
				.groupBy(seasons.id)
				.orderBy(desc(seasons.number));

			return result;
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [season] = await ctx.db
				.select()
				.from(seasons)
				.where(eq(seasons.id, input.id))
				.limit(1);

			if (!season) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Season not found",
				});
			}

			await checkMembership(ctx.db, season.leagueId, userId);

			const [roundCountResult] = await ctx.db
				.select({ roundCount: count(rounds.id) })
				.from(rounds)
				.where(eq(rounds.seasonId, season.id));

			return {
				...season,
				roundCount: roundCountResult?.roundCount ?? 0,
			};
		}),

	update: protectedProcedure
		.input(updateSeasonSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [season] = await ctx.db
				.select()
				.from(seasons)
				.where(eq(seasons.id, input.id))
				.limit(1);

			if (!season) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Season not found",
				});
			}

			await checkMembership(ctx.db, season.leagueId, userId, [
				"owner",
				"admin",
			]);

			const updateData: Record<string, unknown> = {};

			if (input.name !== undefined) {
				updateData.name = input.name;
			}

			if (input.startDate !== undefined) {
				updateData.startDate = input.startDate
					? new Date(input.startDate)
					: null;
			}

			if (input.endDate !== undefined) {
				updateData.endDate = input.endDate
					? new Date(input.endDate)
					: null;
			}

			const [updated] = await ctx.db
				.update(seasons)
				.set(updateData)
				.where(eq(seasons.id, input.id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [season] = await ctx.db
				.select()
				.from(seasons)
				.where(eq(seasons.id, input.id))
				.limit(1);

			if (!season) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Season not found",
				});
			}

			await checkMembership(ctx.db, season.leagueId, userId, [
				"owner",
				"admin",
			]);

			const [roundExists] = await ctx.db
				.select({ roundCount: count(rounds.id) })
				.from(rounds)
				.where(eq(rounds.seasonId, season.id));

			if (roundExists && roundExists.roundCount > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Cannot delete a season that has rounds. Remove all rounds first.",
				});
			}

			await ctx.db.delete(seasons).where(eq(seasons.id, input.id));

			return { success: true };
		}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				status: z.enum(["upcoming", "active", "completed"]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [season] = await ctx.db
				.select()
				.from(seasons)
				.where(eq(seasons.id, input.id))
				.limit(1);

			if (!season) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Season not found",
				});
			}

			await checkMembership(ctx.db, season.leagueId, userId, [
				"owner",
				"admin",
			]);

			// Validate status transitions - no going backwards
			const validTransitions: Record<string, string[]> = {
				upcoming: ["active"],
				active: ["completed"],
				completed: [],
			};

			if (!validTransitions[season.status]?.includes(input.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot transition from "${season.status}" to "${input.status}"`,
				});
			}

			// When activating, deactivate any other active season in the same league
			if (input.status === "active") {
				await ctx.db
					.update(seasons)
					.set({ status: "completed" })
					.where(
						and(
							eq(seasons.leagueId, season.leagueId),
							eq(seasons.status, "active")
						)
					);
			}

			const [updated] = await ctx.db
				.update(seasons)
				.set({ status: input.status })
				.where(eq(seasons.id, input.id))
				.returning();

			return updated;
		}),

	getActive: protectedProcedure
		.input(z.object({ leagueId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId);

			const [activeSeason] = await ctx.db
				.select()
				.from(seasons)
				.where(
					and(
						eq(seasons.leagueId, input.leagueId),
						eq(seasons.status, "active")
					)
				)
				.limit(1);

			return activeSeason ?? null;
		}),

	getLeaderboard: protectedProcedure
		.input(z.object({ seasonId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

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

			const entries = await ctx.db
				.select({
					id: leaderboardEntries.id,
					leagueId: leaderboardEntries.leagueId,
					seasonId: leaderboardEntries.seasonId,
					userId: leaderboardEntries.userId,
					totalPoints: leaderboardEntries.totalPoints,
					upvotesReceived: leaderboardEntries.upvotesReceived,
					downvotesReceived: leaderboardEntries.downvotesReceived,
					wins: leaderboardEntries.wins,
					roundsParticipated:
						leaderboardEntries.roundsParticipated,
					createdAt: leaderboardEntries.createdAt,
					updatedAt: leaderboardEntries.updatedAt,
					userName: users.name,
					userImage: users.image,
				})
				.from(leaderboardEntries)
				.innerJoin(users, eq(users.id, leaderboardEntries.userId))
				.where(eq(leaderboardEntries.seasonId, input.seasonId))
				.orderBy(desc(leaderboardEntries.totalPoints));

			return entries;
		}),
});
