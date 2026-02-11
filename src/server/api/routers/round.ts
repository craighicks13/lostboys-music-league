import { z } from "zod";
import { eq, and, desc, count, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, seasons, submissions } from "@/server/db/schema/rounds";
import { leagueMembers, leagues } from "@/server/db/schema/leagues";
import { users, accounts } from "@/server/db/schema/users";
import { createRoundSchema, updateRoundSchema } from "@/lib/validators/round";
import { generateSpotifyPlaylist } from "@/lib/services/spotify-playlist";
import { refreshSpotifyToken } from "@/lib/auth/token-refresh";
import { fetchTrackMetadata } from "@/lib/services/music";
import { votes } from "@/server/db/schema/voting";
import { leaderboardEntries, userStatistics } from "@/server/db/schema/leaderboard";
import { chatGroups, chatMessages } from "@/server/db/schema/chat";

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

/**
 * Auto-generate a Spotify playlist when a round is revealed.
 * Best-effort: failures are logged but do not block the status transition.
 */
async function autoGenerateSpotifyPlaylist(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	roundId: string,
	leagueId: string,
	userId: string,
	theme: string
) {
	// Get the user's Spotify account
	const [account] = await db
		.select()
		.from(accounts)
		.where(and(eq(accounts.userId, userId), eq(accounts.providerId, "spotify")))
		.limit(1);

	if (!account?.accessToken) return;

	// Refresh token if expired
	let accessToken = account.accessToken;
	const now = new Date();
	if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < now && account.refreshToken) {
		const refreshed = await refreshSpotifyToken(account.refreshToken);
		accessToken = refreshed.accessToken;
		await db
			.update(accounts)
			.set({
				accessToken: refreshed.accessToken,
				accessTokenExpiresAt: new Date(refreshed.expiresAt),
			})
			.where(
				and(eq(accounts.userId, userId), eq(accounts.providerId, "spotify"))
			);
	}

	// Get league name
	const [league] = await db
		.select({ name: leagues.name })
		.from(leagues)
		.where(eq(leagues.id, leagueId))
		.limit(1);

	// Get Spotify track IDs from submissions
	const roundSubmissions = await db
		.select({
			provider: submissions.provider,
			providerTrackId: submissions.providerTrackId,
		})
		.from(submissions)
		.where(eq(submissions.roundId, roundId));

	const spotifyTrackIds = roundSubmissions
		.filter((s: { provider: string }) => s.provider === "spotify")
		.map((s: { providerTrackId: string }) => s.providerTrackId);

	if (spotifyTrackIds.length === 0) return;

	const result = await generateSpotifyPlaylist({
		accessToken,
		roundTheme: theme,
		leagueName: league?.name ?? "Music League",
		trackIds: spotifyTrackIds,
	});

	// Store playlist ID on round
	await db
		.update(rounds)
		.set({ playlistSpotifyId: result.playlistId })
		.where(eq(rounds.id, roundId));
}

/**
 * Calculate voting results and update leaderboard entries for a revealed round.
 * Best-effort: failures are logged but do not block the status transition.
 */
async function calculateRoundResults(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	roundId: string,
	leagueId: string,
	seasonId: string
) {
	// Get all submissions for this round
	const allSubmissions = await db
		.select({
			id: submissions.id,
			userId: submissions.userId,
			createdAt: submissions.createdAt,
			provider: submissions.provider,
			providerTrackId: submissions.providerTrackId,
		})
		.from(submissions)
		.where(eq(submissions.roundId, roundId));

	// Get all votes for this round
	const allVotes = await db
		.select({
			submissionId: votes.submissionId,
			points: votes.points,
			voteType: votes.voteType,
		})
		.from(votes)
		.where(eq(votes.roundId, roundId));

	// Calculate per-submission scores
	const scoreMap = new Map<string, { userId: string; totalPoints: number; upvoteCount: number; downvoteCount: number }>();
	for (const sub of allSubmissions) {
		scoreMap.set(sub.id, { userId: sub.userId, totalPoints: 0, upvoteCount: 0, downvoteCount: 0 });
	}
	for (const vote of allVotes) {
		const entry = scoreMap.get(vote.submissionId);
		if (entry) {
			entry.totalPoints += vote.points;
			if (vote.voteType === "upvote") entry.upvoteCount++;
			else entry.downvoteCount++;
		}
	}

	// Determine the winner
	const ranked = Array.from(scoreMap.entries())
		.map(([submissionId, scores]) => {
			const sub = allSubmissions.find((s: { id: string }) => s.id === submissionId)!;
			return { submissionId, ...scores, createdAt: sub.createdAt };
		})
		.sort((a, b) => {
			if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
			if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
			return a.createdAt.getTime() - b.createdAt.getTime();
		});

	const winnerId = ranked.length > 0 ? ranked[0].userId : null;

	// Aggregate per-user scores
	const userScores = new Map<string, { totalPoints: number; upvotesReceived: number; downvotesReceived: number }>();
	for (const entry of scoreMap.values()) {
		const existing = userScores.get(entry.userId) ?? { totalPoints: 0, upvotesReceived: 0, downvotesReceived: 0 };
		existing.totalPoints += entry.totalPoints;
		existing.upvotesReceived += entry.upvoteCount;
		existing.downvotesReceived += entry.downvoteCount;
		userScores.set(entry.userId, existing);
	}

	// Upsert leaderboard entries
	const participantUserIds = [...new Set(allSubmissions.map((s: { userId: string }) => s.userId))] as string[];
	for (const participantId of participantUserIds) {
		const scores = userScores.get(participantId) ?? { totalPoints: 0, upvotesReceived: 0, downvotesReceived: 0 };
		const isWinner = participantId === winnerId;

		const [existing] = await db
			.select()
			.from(leaderboardEntries)
			.where(
				and(
					eq(leaderboardEntries.leagueId, leagueId),
					eq(leaderboardEntries.seasonId, seasonId),
					eq(leaderboardEntries.userId, participantId)
				)
			)
			.limit(1);

		if (existing) {
			await db
				.update(leaderboardEntries)
				.set({
					totalPoints: existing.totalPoints + scores.totalPoints,
					upvotesReceived: existing.upvotesReceived + scores.upvotesReceived,
					downvotesReceived: existing.downvotesReceived + scores.downvotesReceived,
					wins: existing.wins + (isWinner ? 1 : 0),
					roundsParticipated: existing.roundsParticipated + 1,
				})
				.where(eq(leaderboardEntries.id, existing.id));
		} else {
			await db.insert(leaderboardEntries).values({
				leagueId,
				seasonId,
				userId: participantId,
				totalPoints: scores.totalPoints,
				upvotesReceived: scores.upvotesReceived,
				downvotesReceived: scores.downvotesReceived,
				wins: isWinner ? 1 : 0,
				roundsParticipated: 1,
			});
		}
	}

	// Upsert all-time leaderboard entries (seasonId = null)
	for (const participantId of participantUserIds) {
		const scores = userScores.get(participantId) ?? { totalPoints: 0, upvotesReceived: 0, downvotesReceived: 0 };
		const isWinner = participantId === winnerId;

		const [existingAllTime] = await db
			.select()
			.from(leaderboardEntries)
			.where(
				and(
					eq(leaderboardEntries.leagueId, leagueId),
					isNull(leaderboardEntries.seasonId),
					eq(leaderboardEntries.userId, participantId)
				)
			)
			.limit(1);

		if (existingAllTime) {
			await db
				.update(leaderboardEntries)
				.set({
					totalPoints: existingAllTime.totalPoints + scores.totalPoints,
					upvotesReceived: existingAllTime.upvotesReceived + scores.upvotesReceived,
					downvotesReceived: existingAllTime.downvotesReceived + scores.downvotesReceived,
					wins: existingAllTime.wins + (isWinner ? 1 : 0),
					roundsParticipated: existingAllTime.roundsParticipated + 1,
				})
				.where(eq(leaderboardEntries.id, existingAllTime.id));
		} else {
			await db.insert(leaderboardEntries).values({
				leagueId,
				seasonId: null,
				userId: participantId,
				totalPoints: scores.totalPoints,
				upvotesReceived: scores.upvotesReceived,
				downvotesReceived: scores.downvotesReceived,
				wins: isWinner ? 1 : 0,
				roundsParticipated: 1,
			});
		}
	}

	// ── Upsert userStatistics entries ────────────────────────────────
	// Count votes cast per user in this round
	const votesCastByUser = new Map<string, { total: number; upvotes: number; downvotes: number }>();
	const allRoundVotes = await db
		.select({ userId: votes.userId, voteType: votes.voteType })
		.from(votes)
		.where(eq(votes.roundId, roundId));
	for (const v of allRoundVotes) {
		const entry = votesCastByUser.get(v.userId) ?? { total: 0, upvotes: 0, downvotes: 0 };
		entry.total++;
		if (v.voteType === "upvote") entry.upvotes++;
		else entry.downvotes++;
		votesCastByUser.set(v.userId, entry);
	}

	// Build placement map: userId → placement (1-based rank)
	const placementMap = new Map<string, number>();
	for (let i = 0; i < ranked.length; i++) {
		placementMap.set(ranked[i].userId, i + 1);
	}

	// Upsert season + all-time userStatistics for each participant
	for (const seasonIdValue of [seasonId, null]) {
		for (const participantId of participantUserIds) {
			const scores = userScores.get(participantId) ?? { totalPoints: 0, upvotesReceived: 0, downvotesReceived: 0 };
			const isWinner = participantId === winnerId;
			const placement = placementMap.get(participantId) ?? ranked.length;
			const votesCast = votesCastByUser.get(participantId) ?? { total: 0, upvotes: 0, downvotes: 0 };

			const whereConditions = seasonIdValue
				? and(
						eq(userStatistics.userId, participantId),
						eq(userStatistics.leagueId, leagueId),
						eq(userStatistics.seasonId, seasonIdValue)
					)
				: and(
						eq(userStatistics.userId, participantId),
						eq(userStatistics.leagueId, leagueId),
						isNull(userStatistics.seasonId)
					);

			const [existing] = await db
				.select()
				.from(userStatistics)
				.where(whereConditions)
				.limit(1);

			if (existing) {
				const newRoundsCount = existing.totalSubmissions + 1;
				const prevTotal = existing.avgPlacement != null ? existing.avgPlacement * existing.totalSubmissions : 0;
				const newAvg = (prevTotal + placement) / newRoundsCount;

				await db
					.update(userStatistics)
					.set({
						totalSubmissions: newRoundsCount,
						totalVotesCast: existing.totalVotesCast + votesCast.total,
						totalUpvotesCast: existing.totalUpvotesCast + votesCast.upvotes,
						totalDownvotesCast: existing.totalDownvotesCast + votesCast.downvotes,
						avgPlacement: newAvg,
						bestPlacement: existing.bestPlacement != null ? Math.min(existing.bestPlacement, placement) : placement,
						worstPlacement: existing.worstPlacement != null ? Math.max(existing.worstPlacement, placement) : placement,
						totalPointsEarned: existing.totalPointsEarned + scores.totalPoints,
						totalWins: existing.totalWins + (isWinner ? 1 : 0),
					})
					.where(eq(userStatistics.id, existing.id));
			} else {
				await db.insert(userStatistics).values({
					userId: participantId,
					leagueId,
					seasonId: seasonIdValue,
					totalSubmissions: 1,
					totalVotesCast: votesCast.total,
					totalUpvotesCast: votesCast.upvotes,
					totalDownvotesCast: votesCast.downvotes,
					avgPlacement: placement,
					bestPlacement: placement,
					worstPlacement: placement,
					totalPointsEarned: scores.totalPoints,
					totalWins: isWinner ? 1 : 0,
				});
			}
		}
	}

	// ── Update favoriteGenres per user ──────────────────────────────
	// Fetch genres for each submission (best-effort, skip on failure)
	const userGenresMap = new Map<string, string[]>();
	for (const sub of allSubmissions) {
		try {
			const metadata = await fetchTrackMetadata(
				sub.provider as "spotify" | "apple",
				sub.providerTrackId
			);
			if (metadata.genres && metadata.genres.length > 0) {
				const existing = userGenresMap.get(sub.userId) ?? [];
				existing.push(...metadata.genres);
				userGenresMap.set(sub.userId, existing);
			}
		} catch {
			// Skip genre lookup failures — don't break stats
		}
	}

	// Merge new genres into existing favoriteGenres for both season + all-time
	for (const [participantId, newGenres] of userGenresMap.entries()) {
		if (newGenres.length === 0) continue;

		for (const seasonIdValue of [seasonId, null]) {
			const whereConditions = seasonIdValue
				? and(
						eq(userStatistics.userId, participantId),
						eq(userStatistics.leagueId, leagueId),
						eq(userStatistics.seasonId, seasonIdValue)
					)
				: and(
						eq(userStatistics.userId, participantId),
						eq(userStatistics.leagueId, leagueId),
						isNull(userStatistics.seasonId)
					);

			const [existing] = await db
				.select({ id: userStatistics.id, favoriteGenres: userStatistics.favoriteGenres })
				.from(userStatistics)
				.where(whereConditions)
				.limit(1);

			if (!existing) continue;

			// Merge: build count map from existing + new
			const countMap = new Map<string, number>();
			const prev = (existing.favoriteGenres ?? []) as { genre: string; count: number }[];
			for (const entry of prev) {
				countMap.set(entry.genre, entry.count);
			}
			for (const g of newGenres) {
				countMap.set(g, (countMap.get(g) ?? 0) + 1);
			}

			// Sort by count descending, limit to top 50
			const merged = Array.from(countMap.entries())
				.map(([genre, count]) => ({ genre, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 50);

			await db
				.update(userStatistics)
				.set({ favoriteGenres: merged })
				.where(eq(userStatistics.id, existing.id));
		}
	}
}

async function postChatNotification(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	leagueId: string,
	userId: string,
	content: string
) {
	const [group] = await db
		.select({ id: chatGroups.id })
		.from(chatGroups)
		.where(
			and(
				eq(chatGroups.leagueId, leagueId),
				eq(chatGroups.type, "in_app")
			)
		)
		.limit(1);
	if (group) {
		await db.insert(chatMessages).values({
			chatGroupId: group.id,
			userId,
			content,
		});
	}
}

const validTransitions: Record<string, string[]> = {
	draft: ["submitting"],
	submitting: ["voting"],
	voting: ["revealed"],
	revealed: ["archived"],
	archived: [],
};

export const roundRouter = router({
	create: protectedProcedure
		.input(createRoundSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId, [
				"owner",
				"admin",
			]);

			// Verify season belongs to this league
			const [season] = await ctx.db
				.select()
				.from(seasons)
				.where(eq(seasons.id, input.seasonId))
				.limit(1);

			if (!season || season.leagueId !== input.leagueId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Season not found in this league",
				});
			}

			const [round] = await ctx.db
				.insert(rounds)
				.values({
					leagueId: input.leagueId,
					seasonId: input.seasonId,
					theme: input.theme,
					description: input.description ?? null,
					submissionStart: input.submissionStart
						? new Date(input.submissionStart)
						: null,
					submissionEnd: input.submissionEnd
						? new Date(input.submissionEnd)
						: null,
					votingEnd: input.votingEnd
						? new Date(input.votingEnd)
						: null,
					votingConfig: input.votingConfig ?? null,
					createdBy: userId,
				})
				.returning();

			return round;
		}),

	list: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				seasonId: z.string().uuid().optional(),
				status: z
					.enum([
						"draft",
						"submitting",
						"voting",
						"revealed",
						"archived",
					])
					.optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId);

			const conditions = [eq(rounds.leagueId, input.leagueId)];

			if (input.seasonId) {
				conditions.push(eq(rounds.seasonId, input.seasonId));
			}

			if (input.status) {
				conditions.push(eq(rounds.status, input.status));
			}

			const result = await ctx.db
				.select({
					id: rounds.id,
					leagueId: rounds.leagueId,
					seasonId: rounds.seasonId,
					theme: rounds.theme,
					description: rounds.description,
					status: rounds.status,
					submissionStart: rounds.submissionStart,
					submissionEnd: rounds.submissionEnd,
					votingEnd: rounds.votingEnd,
					votingConfig: rounds.votingConfig,
					createdBy: rounds.createdBy,
					createdAt: rounds.createdAt,
					submissionCount: count(submissions.id),
				})
				.from(rounds)
				.leftJoin(submissions, eq(submissions.roundId, rounds.id))
				.where(and(...conditions))
				.groupBy(rounds.id)
				.orderBy(desc(rounds.createdAt));

			return result;
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, input.id))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			await checkMembership(ctx.db, round.leagueId, userId);

			const [submissionResult] = await ctx.db
				.select({ submissionCount: count(submissions.id) })
				.from(submissions)
				.where(eq(submissions.roundId, round.id));

			const [creator] = round.createdBy
				? await ctx.db
						.select({ name: users.name, image: users.image })
						.from(users)
						.where(eq(users.id, round.createdBy))
						.limit(1)
				: [null];

			return {
				...round,
				submissionCount: submissionResult?.submissionCount ?? 0,
				creator: creator ?? null,
			};
		}),

	update: protectedProcedure
		.input(updateRoundSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, input.id))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			if (round.status !== "draft") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Can only edit rounds in Draft status",
				});
			}

			await checkMembership(ctx.db, round.leagueId, userId, [
				"owner",
				"admin",
			]);

			const updateData: Record<string, unknown> = {};

			if (input.theme !== undefined) updateData.theme = input.theme;
			if (input.description !== undefined)
				updateData.description = input.description;
			if (input.submissionStart !== undefined)
				updateData.submissionStart = input.submissionStart
					? new Date(input.submissionStart)
					: null;
			if (input.submissionEnd !== undefined)
				updateData.submissionEnd = input.submissionEnd
					? new Date(input.submissionEnd)
					: null;
			if (input.votingEnd !== undefined)
				updateData.votingEnd = input.votingEnd
					? new Date(input.votingEnd)
					: null;
			if (input.votingConfig !== undefined)
				updateData.votingConfig = input.votingConfig;

			const [updated] = await ctx.db
				.update(rounds)
				.set(updateData)
				.where(eq(rounds.id, input.id))
				.returning();

			return updated;
		}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				status: z.enum([
					"draft",
					"submitting",
					"voting",
					"revealed",
					"archived",
				]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, input.id))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			await checkMembership(ctx.db, round.leagueId, userId, [
				"owner",
				"admin",
			]);

			if (!validTransitions[round.status]?.includes(input.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot transition from "${round.status}" to "${input.status}"`,
				});
			}

			const [updated] = await ctx.db
				.update(rounds)
				.set({ status: input.status })
				.where(eq(rounds.id, input.id))
				.returning();

			// Post chat notification for status transitions (best-effort)
			try {
				const notificationMessages: Record<string, string> = {
					submitting: `🎵 Round '${round.theme}' is now open for submissions!`,
					voting: `🗳️ Voting is now open for '${round.theme}'!`,
					revealed: `🎉 Results are in for '${round.theme}'!`,
				};
				const notification = notificationMessages[input.status];
				if (notification) {
					await postChatNotification(ctx.db, round.leagueId, userId, notification);
				}
			} catch {
				// Don't block status transition on notification failure
			}

			// When transitioning to "revealed", calculate results and generate playlist
			if (input.status === "revealed") {
				// Calculate voting results and update leaderboard (best-effort)
				try {
					await calculateRoundResults(
						ctx.db,
						round.id,
						round.leagueId,
						round.seasonId
					);
				} catch {
					console.warn(
						`Results calculation failed for round ${round.id}`
					);
				}

				// Auto-generate Spotify playlist (best-effort)
				try {
					await autoGenerateSpotifyPlaylist(
						ctx.db,
						round.id,
						round.leagueId,
						userId,
						round.theme
					);
				} catch {
					console.warn(
						`Auto-playlist generation failed for round ${round.id}`
					);
				}
			}

			return updated;
		}),

	cancel: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			const [round] = await ctx.db
				.select()
				.from(rounds)
				.where(eq(rounds.id, input.id))
				.limit(1);

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			await checkMembership(ctx.db, round.leagueId, userId, [
				"owner",
				"admin",
			]);

			if (!["draft", "submitting"].includes(round.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Can only cancel rounds in Draft or Submitting status",
				});
			}

			// Delete submissions if any
			await ctx.db
				.delete(submissions)
				.where(eq(submissions.roundId, round.id));

			// Delete the round
			await ctx.db.delete(rounds).where(eq(rounds.id, input.id));

			return { success: true };
		}),

	getActive: protectedProcedure
		.input(z.object({ leagueId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId);

			// Active rounds are those in submitting or voting status
			const activeRounds = await ctx.db
				.select({
					id: rounds.id,
					leagueId: rounds.leagueId,
					seasonId: rounds.seasonId,
					theme: rounds.theme,
					description: rounds.description,
					status: rounds.status,
					submissionStart: rounds.submissionStart,
					submissionEnd: rounds.submissionEnd,
					votingEnd: rounds.votingEnd,
					createdAt: rounds.createdAt,
					submissionCount: count(submissions.id),
				})
				.from(rounds)
				.leftJoin(submissions, eq(submissions.roundId, rounds.id))
				.where(
					and(
						eq(rounds.leagueId, input.leagueId),
						inArray(rounds.status, ["submitting", "voting"])
					)
				)
				.groupBy(rounds.id)
				.orderBy(desc(rounds.createdAt))
				.limit(1);

			return activeRounds[0] ?? null;
		}),

	checkDeadlines: protectedProcedure
		.input(z.object({ leagueId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId, [
				"owner",
				"admin",
			]);

			const now = new Date();
			let transitioned = 0;

			// Find rounds where submissionEnd has passed and status is still submitting
			const submittingRounds = await ctx.db
				.select()
				.from(rounds)
				.where(
					and(
						eq(rounds.leagueId, input.leagueId),
						eq(rounds.status, "submitting")
					)
				);

			for (const round of submittingRounds) {
				if (round.submissionEnd && round.submissionEnd <= now) {
					await ctx.db
						.update(rounds)
						.set({ status: "voting" })
						.where(eq(rounds.id, round.id));
					transitioned++;
				}
			}

			// Find rounds where votingEnd has passed and status is still voting
			const votingRounds = await ctx.db
				.select()
				.from(rounds)
				.where(
					and(
						eq(rounds.leagueId, input.leagueId),
						eq(rounds.status, "voting")
					)
				);

			for (const round of votingRounds) {
				if (round.votingEnd && round.votingEnd <= now) {
					await ctx.db
						.update(rounds)
						.set({ status: "revealed" })
						.where(eq(rounds.id, round.id));
					transitioned++;

					// Calculate results on auto-transition to revealed
					try {
						await calculateRoundResults(
							ctx.db,
							round.id,
							round.leagueId,
							round.seasonId
						);
					} catch {
						console.warn(
							`Results calculation failed for auto-revealed round ${round.id}`
						);
					}
				}
			}

			return { transitioned };
		}),
});
