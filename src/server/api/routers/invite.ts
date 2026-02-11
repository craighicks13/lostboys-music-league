import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { router, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  leagues,
  leagueMembers,
  invites,
} from "@/server/db/schema/leagues";
import {
  createInviteSchema,
  joinByCodeSchema,
  joinByLinkSchema,
} from "@/lib/validators/invite";

type Db = typeof db;

async function verifyAdminOrOwner(database: Db, leagueId: string, userId: string) {
  const rows = await database
    .select({ role: leagueMembers.role })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, userId)
      )
    );

  const membership = rows[0];

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an owner or admin of this league",
    });
  }
}

async function validateAndJoin(database: Db, invite: typeof invites.$inferSelect, userId: string) {
  // Check expiration
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This invite has expired",
    });
  }

  // Check max uses
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This invite has reached its maximum number of uses",
    });
  }

  // Check if user is banned
  const bannedRows = await database
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, invite.leagueId),
        eq(leagueMembers.userId, userId),
        isNotNull(leagueMembers.bannedAt)
      )
    );

  if (bannedRows.length > 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are banned from this league",
    });
  }

  // Check if already a member
  const existingRows = await database
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, invite.leagueId),
        eq(leagueMembers.userId, userId),
        isNull(leagueMembers.bannedAt)
      )
    );

  if (existingRows.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are already a member of this league",
    });
  }

  // Add member
  await database.insert(leagueMembers).values({
    leagueId: invite.leagueId,
    userId,
    role: "member",
  });

  // Increment uses
  await database
    .update(invites)
    .set({ uses: sql`${invites.uses} + 1` })
    .where(eq(invites.id, invite.id));

  return { leagueId: invite.leagueId };
}

export const inviteRouter = router({
  create: protectedProcedure
    .input(createInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      await verifyAdminOrOwner(ctx.db, input.leagueId, userId);

      const code = crypto.randomBytes(4).toString("hex");
      const linkToken = crypto.randomUUID();

      const [invite] = await ctx.db
        .insert(invites)
        .values({
          leagueId: input.leagueId,
          code,
          linkToken,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          maxUses: input.maxUses ?? null,
          createdBy: userId,
        })
        .returning();

      return invite;
    }),

  list: protectedProcedure
    .input(z.object({ leagueId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      await verifyAdminOrOwner(ctx.db, input.leagueId, userId);

      return ctx.db
        .select()
        .from(invites)
        .where(eq(invites.leagueId, input.leagueId));
    }),

  delete: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const rows = await ctx.db
        .select()
        .from(invites)
        .where(eq(invites.id, input.inviteId));

      const invite = rows[0];

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      await verifyAdminOrOwner(ctx.db, invite.leagueId, userId);

      await ctx.db.delete(invites).where(eq(invites.id, input.inviteId));

      return { success: true };
    }),

  joinByCode: protectedProcedure
    .input(joinByCodeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const rows = await ctx.db
        .select()
        .from(invites)
        .where(eq(invites.code, input.code));

      const invite = rows[0];

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      return validateAndJoin(ctx.db, invite, userId);
    }),

  joinByLink: protectedProcedure
    .input(joinByLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const rows = await ctx.db
        .select()
        .from(invites)
        .where(eq(invites.linkToken, input.token));

      const invite = rows[0];

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite link",
        });
      }

      return validateAndJoin(ctx.db, invite, userId);
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          leagueId: invites.leagueId,
          leagueName: leagues.name,
          leagueDescription: leagues.description,
          expiresAt: invites.expiresAt,
        })
        .from(invites)
        .innerJoin(leagues, eq(invites.leagueId, leagues.id))
        .where(eq(invites.linkToken, input.token));

      const result = rows[0];

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (result.expiresAt && result.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This invite has expired",
        });
      }

      return {
        leagueId: result.leagueId,
        leagueName: result.leagueName,
        leagueDescription: result.leagueDescription,
      };
    }),
});
