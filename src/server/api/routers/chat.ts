import { z } from "zod";
import { eq, and, desc, lt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { chatGroups, chatMessages } from "@/server/db/schema/chat";
import { leagueMembers } from "@/server/db/schema/leagues";
import { users } from "@/server/db/schema/users";

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

export const chatRouter = router({
	getOrCreateGroup: protectedProcedure
		.input(z.object({ leagueId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkLeagueMembership(ctx.db, input.leagueId, userId);

			// Try to find existing in_app chat group
			const [existing] = await ctx.db
				.select()
				.from(chatGroups)
				.where(
					and(
						eq(chatGroups.leagueId, input.leagueId),
						eq(chatGroups.type, "in_app")
					)
				)
				.limit(1);

			if (existing) return existing;

			// Create one if it doesn't exist
			const [group] = await ctx.db
				.insert(chatGroups)
				.values({
					leagueId: input.leagueId,
					name: "League Chat",
					type: "in_app" as const,
				})
				.returning();

			return group;
		}),

	sendMessage: protectedProcedure
		.input(
			z.object({
				chatGroupId: z.string().uuid(),
				content: z.string().min(1).max(5000),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the chat group to find the league
			const [group] = await ctx.db
				.select()
				.from(chatGroups)
				.where(eq(chatGroups.id, input.chatGroupId))
				.limit(1);

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat group not found",
				});
			}

			await checkLeagueMembership(ctx.db, group.leagueId, userId);

			const [message] = await ctx.db
				.insert(chatMessages)
				.values({
					chatGroupId: input.chatGroupId,
					userId,
					content: input.content,
				})
				.returning();

			// Return message with user info
			const [user] = await ctx.db
				.select({ name: users.name, image: users.image })
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			return {
				...message,
				userName: user?.name ?? null,
				userImage: user?.image ?? null,
			};
		}),

	getMessages: protectedProcedure
		.input(
			z.object({
				chatGroupId: z.string().uuid(),
				cursor: z.string().datetime().optional(),
				limit: z.number().min(1).max(100).default(50),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			// Get the chat group to find the league
			const [group] = await ctx.db
				.select()
				.from(chatGroups)
				.where(eq(chatGroups.id, input.chatGroupId))
				.limit(1);

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat group not found",
				});
			}

			await checkLeagueMembership(ctx.db, group.leagueId, userId);

			const conditions = [eq(chatMessages.chatGroupId, input.chatGroupId)];

			if (input.cursor) {
				conditions.push(lt(chatMessages.createdAt, new Date(input.cursor)));
			}

			// Fetch one extra to determine if there's a next page
			const messages = await ctx.db
				.select({
					id: chatMessages.id,
					chatGroupId: chatMessages.chatGroupId,
					userId: chatMessages.userId,
					content: chatMessages.content,
					createdAt: chatMessages.createdAt,
					userName: users.name,
					userImage: users.image,
				})
				.from(chatMessages)
				.innerJoin(users, eq(chatMessages.userId, users.id))
				.where(and(...conditions))
				.orderBy(desc(chatMessages.createdAt))
				.limit(input.limit + 1);

			let nextCursor: string | undefined;
			if (messages.length > input.limit) {
				const lastItem = messages.pop()!;
				nextCursor = lastItem.createdAt.toISOString();
			}

			return {
				messages,
				nextCursor,
			};
		}),
});
