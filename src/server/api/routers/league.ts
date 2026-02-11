import { z } from "zod";
import { eq, and, count, countDistinct, desc, isNull, isNotNull, gt, lt, sum, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { leagues, leagueMembers, moderationLogs } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";
import { leaderboardEntries } from "@/server/db/schema/leaderboard";
import { chatGroups } from "@/server/db/schema/chat";
import { rounds, submissions } from "@/server/db/schema/rounds";
import { votes } from "@/server/db/schema/voting";
import {
  createLeagueSchema,
  updateLeagueSchema,
  leagueSettingsSchema,
} from "@/lib/validators/league";
import {
  banMemberSchema,
  unbanMemberSchema,
  getModerationLogSchema,
} from "@/lib/validators/moderation";

export const leagueRouter = router({
  create: protectedProcedure
    .input(createLeagueSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const settings = input.settings ?? leagueSettingsSchema.parse({});

      const [league] = await ctx.db
        .insert(leagues)
        .values({
          name: input.name,
          description: input.description,
          visibility: input.isPrivate ? "private" : "public",
          ownerId: userId,
          settings,
        })
        .returning();

      await ctx.db.insert(leagueMembers).values({
        leagueId: league.id,
        userId,
        role: "owner",
      });

      // Auto-create in-app chat group for the league
      await ctx.db.insert(chatGroups).values({
        leagueId: league.id,
        name: `${input.name} Chat`,
        type: "in_app" as const,
      });

      return league;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [league] = await ctx.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.id))
        .limit(1);

      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.id),
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

      const [{ memberCount }] = await ctx.db
        .select({ memberCount: count() })
        .from(leagueMembers)
        .where(eq(leagueMembers.leagueId, input.id));

      return {
        ...league,
        memberCount,
        userRole: membership.role,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const memberCountSq = ctx.db
      .select({
        leagueId: leagueMembers.leagueId,
        memberCount: count().as("member_count"),
      })
      .from(leagueMembers)
      .groupBy(leagueMembers.leagueId)
      .as("member_counts");

    const results = await ctx.db
      .select({
        id: leagues.id,
        name: leagues.name,
        description: leagues.description,
        visibility: leagues.visibility,
        settings: leagues.settings,
        createdAt: leagues.createdAt,
        userRole: leagueMembers.role,
        memberCount: memberCountSq.memberCount,
      })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .leftJoin(memberCountSq, eq(leagues.id, memberCountSq.leagueId))
      .where(and(eq(leagueMembers.userId, userId), isNull(leagueMembers.bannedAt)));

    return results.map((r) => ({
      ...r,
      memberCount: r.memberCount ?? 0,
    }));
  }),

  updateSettings: protectedProcedure
    .input(updateLeagueSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.id),
            eq(leagueMembers.userId, userId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update league settings",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isPrivate !== undefined) {
        updateData.visibility = input.isPrivate ? "private" : "public";
      }

      if (input.settings !== undefined) {
        const [existing] = await ctx.db
          .select({ settings: leagues.settings })
          .from(leagues)
          .where(eq(leagues.id, input.id))
          .limit(1);

        updateData.settings = { ...(existing?.settings ?? {}), ...input.settings };
      }

      const [updated] = await ctx.db
        .update(leagues)
        .set(updateData)
        .where(eq(leagues.id, input.id))
        .returning();

      return updated;
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        leagueId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["admin", "member"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const callerId = ctx.session.user.id!;

      const [callerMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, callerId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (!callerMembership || callerMembership.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league owner can change roles",
        });
      }

      const [targetMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!targetMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (targetMembership.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the owner's role",
        });
      }

      const oldRole = targetMembership.role;

      await ctx.db
        .update(leagueMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        );

      // Log moderation action
      await ctx.db.insert(moderationLogs).values({
        leagueId: input.leagueId,
        performedBy: callerId,
        targetUserId: input.userId,
        action: "role_change",
        metadata: { oldRole, newRole: input.role },
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        leagueId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const callerId = ctx.session.user.id!;

      const [callerMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, callerId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (
        !callerMembership ||
        (callerMembership.role !== "owner" && callerMembership.role !== "admin")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can remove members",
        });
      }

      const [targetMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!targetMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (targetMembership.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the league owner",
        });
      }

      if (callerMembership.role === "admin" && targetMembership.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot remove other admins",
        });
      }

      await ctx.db
        .delete(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        );

      // Log moderation action
      await ctx.db.insert(moderationLogs).values({
        leagueId: input.leagueId,
        performedBy: callerId,
        targetUserId: input.userId,
        action: "kick",
      });

      return { success: true };
    }),

  getMembers: protectedProcedure
    .input(z.object({ leagueId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
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

      const members = await ctx.db
        .select({
          id: leagueMembers.id,
          userId: leagueMembers.userId,
          name: users.name,
          image: users.image,
          role: leagueMembers.role,
          joinedAt: leagueMembers.joinedAt,
          bannedAt: leagueMembers.bannedAt,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(eq(leagueMembers.leagueId, input.leagueId));

      return members;
    }),

  banMember: protectedProcedure
    .input(banMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const callerId = ctx.session.user.id!;

      const [callerMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, callerId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (
        !callerMembership ||
        (callerMembership.role !== "owner" && callerMembership.role !== "admin")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can ban members",
        });
      }

      const [targetMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!targetMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (targetMembership.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot ban the league owner",
        });
      }

      if (callerMembership.role === "admin" && targetMembership.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot ban other admins",
        });
      }

      await ctx.db
        .update(leagueMembers)
        .set({ bannedAt: new Date() })
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        );

      await ctx.db.insert(moderationLogs).values({
        leagueId: input.leagueId,
        performedBy: callerId,
        targetUserId: input.userId,
        action: "ban",
        reason: input.reason,
      });

      return { success: true };
    }),

  unbanMember: protectedProcedure
    .input(unbanMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const callerId = ctx.session.user.id!;

      const [callerMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, callerId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (
        !callerMembership ||
        (callerMembership.role !== "owner" && callerMembership.role !== "admin")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can unban members",
        });
      }

      const [targetMembership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!targetMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (!targetMembership.bannedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This member is not banned",
        });
      }

      await ctx.db
        .update(leagueMembers)
        .set({ bannedAt: null })
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, input.userId)
          )
        );

      await ctx.db.insert(moderationLogs).values({
        leagueId: input.leagueId,
        performedBy: callerId,
        targetUserId: input.userId,
        action: "unban",
      });

      return { success: true };
    }),

  getBannedMembers: protectedProcedure
    .input(z.object({ leagueId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, userId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can view banned members",
        });
      }

      return ctx.db
        .select({
          id: leagueMembers.id,
          userId: leagueMembers.userId,
          name: users.name,
          image: users.image,
          role: leagueMembers.role,
          joinedAt: leagueMembers.joinedAt,
          bannedAt: leagueMembers.bannedAt,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            isNotNull(leagueMembers.bannedAt)
          )
        );
    }),

  getModerationLog: protectedProcedure
    .input(getModerationLogSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, userId),
            isNull(leagueMembers.bannedAt)
          )
        )
        .limit(1);

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can view moderation logs",
        });
      }

      const performer = alias(users, "performer");
      const target = alias(users, "target");

      const conditions = [eq(moderationLogs.leagueId, input.leagueId)];
      if (input.cursor) {
        // Cursor-based: get entries created before the cursor entry
        const [cursorEntry] = await ctx.db
          .select({ createdAt: moderationLogs.createdAt })
          .from(moderationLogs)
          .where(eq(moderationLogs.id, input.cursor))
          .limit(1);
        if (cursorEntry) {
          conditions.push(lt(moderationLogs.createdAt, cursorEntry.createdAt));
        }
      }

      const items = await ctx.db
        .select({
          id: moderationLogs.id,
          action: moderationLogs.action,
          reason: moderationLogs.reason,
          metadata: moderationLogs.metadata,
          createdAt: moderationLogs.createdAt,
          performerName: performer.name,
          performerImage: performer.image,
          targetName: target.name,
          targetImage: target.image,
        })
        .from(moderationLogs)
        .innerJoin(performer, eq(moderationLogs.performedBy, performer.id))
        .innerJoin(target, eq(moderationLogs.targetUserId, target.id))
        .where(and(...conditions))
        .orderBy(desc(moderationLogs.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }

      return { items, nextCursor };
    }),

  getAllTimeLeaderboard: protectedProcedure
    .input(z.object({ leagueId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
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
          roundsParticipated: leaderboardEntries.roundsParticipated,
          createdAt: leaderboardEntries.createdAt,
          updatedAt: leaderboardEntries.updatedAt,
          userName: users.name,
          userImage: users.image,
        })
        .from(leaderboardEntries)
        .innerJoin(users, eq(users.id, leaderboardEntries.userId))
        .where(
          and(
            eq(leaderboardEntries.leagueId, input.leagueId),
            isNull(leaderboardEntries.seasonId)
          )
        )
        .orderBy(desc(leaderboardEntries.totalPoints));

      return entries;
    }),

  getPersonalStats: protectedProcedure
    .input(z.object({ leagueId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify membership
      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
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

      // All-time leaderboard entry (seasonId is null)
      const [allTimeEntry] = await ctx.db
        .select()
        .from(leaderboardEntries)
        .where(
          and(
            eq(leaderboardEntries.leagueId, input.leagueId),
            eq(leaderboardEntries.userId, userId),
            isNull(leaderboardEntries.seasonId)
          )
        )
        .limit(1);

      // Calculate all-time rank
      let allTimeRank: number | null = null;
      if (allTimeEntry) {
        const [{ higherCount }] = await ctx.db
          .select({ higherCount: count() })
          .from(leaderboardEntries)
          .where(
            and(
              eq(leaderboardEntries.leagueId, input.leagueId),
              isNull(leaderboardEntries.seasonId),
              gt(leaderboardEntries.totalPoints, allTimeEntry.totalPoints)
            )
          );
        allTimeRank = higherCount + 1;
      }

      // Find active season leaderboard entry
      const seasonEntries = await ctx.db
        .select()
        .from(leaderboardEntries)
        .where(
          and(
            eq(leaderboardEntries.leagueId, input.leagueId),
            eq(leaderboardEntries.userId, userId),
            isNotNull(leaderboardEntries.seasonId)
          )
        )
        .orderBy(desc(leaderboardEntries.updatedAt))
        .limit(1);

      const latestSeasonEntry = seasonEntries[0] ?? null;

      let seasonRank: number | null = null;
      if (latestSeasonEntry?.seasonId) {
        const [{ higherCount }] = await ctx.db
          .select({ higherCount: count() })
          .from(leaderboardEntries)
          .where(
            and(
              eq(leaderboardEntries.leagueId, input.leagueId),
              eq(leaderboardEntries.seasonId, latestSeasonEntry.seasonId),
              gt(leaderboardEntries.totalPoints, latestSeasonEntry.totalPoints)
            )
          );
        seasonRank = higherCount + 1;
      }

      // Count total submissions in this league
      const [{ totalSubmissions }] = await ctx.db
        .select({ totalSubmissions: count() })
        .from(submissions)
        .innerJoin(rounds, eq(submissions.roundId, rounds.id))
        .where(
          and(
            eq(submissions.userId, userId),
            eq(rounds.leagueId, input.leagueId)
          )
        );

      // Count rounds played (distinct rounds with a submission)
      const [{ roundsPlayed }] = await ctx.db
        .select({ roundsPlayed: countDistinct(submissions.roundId) })
        .from(submissions)
        .innerJoin(rounds, eq(submissions.roundId, rounds.id))
        .where(
          and(
            eq(submissions.userId, userId),
            eq(rounds.leagueId, input.leagueId)
          )
        );

      // Count upvotes and downvotes received on user's submissions
      const userSubmissionIds = ctx.db
        .select({ id: submissions.id })
        .from(submissions)
        .innerJoin(rounds, eq(submissions.roundId, rounds.id))
        .where(
          and(
            eq(submissions.userId, userId),
            eq(rounds.leagueId, input.leagueId)
          )
        );

      const [upvoteResult] = await ctx.db
        .select({ total: sum(votes.points) })
        .from(votes)
        .where(
          and(
            sql`${votes.submissionId} IN (${userSubmissionIds})`,
            eq(votes.voteType, "upvote")
          )
        );

      const [downvoteResult] = await ctx.db
        .select({ total: sum(votes.points) })
        .from(votes)
        .where(
          and(
            sql`${votes.submissionId} IN (${userSubmissionIds})`,
            eq(votes.voteType, "downvote")
          )
        );

      return {
        seasonRank,
        allTimeRank,
        totalPoints: allTimeEntry?.totalPoints ?? 0,
        wins: allTimeEntry?.wins ?? 0,
        roundsPlayed,
        totalSubmissions,
        upvotesReceived: Number(upvoteResult?.total ?? 0),
        downvotesReceived: Math.abs(Number(downvoteResult?.total ?? 0)),
      };
    }),
});
