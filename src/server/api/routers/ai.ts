import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds } from "@/server/db/schema/rounds";
import { leagueMembers } from "@/server/db/schema/leagues";
import { generateText, experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";
import { put } from "@vercel/blob";

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
				eq(leagueMembers.userId, userId)
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

async function generateRoundArtwork(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: any,
	roundId: string,
	theme: string,
	leagueId: string
) {
	const { image } = await generateImage({
		model: openai.image("dall-e-3"),
		prompt: `Create an artistic, visually striking album cover or playlist artwork for a music round with the theme: "${theme}". The image should be colorful, modern, and evocative of the musical theme. Do not include any text in the image.`,
		size: "1024x1024",
	});

	const blob = await put(
		`artwork/${leagueId}/${roundId}.png`,
		Buffer.from(image.base64, "base64"),
		{ access: "public", contentType: "image/png" }
	);

	await db
		.update(rounds)
		.set({ aiArtworkUrl: blob.url })
		.where(eq(rounds.id, roundId));

	return { url: blob.url };
}

export const aiRouter = router({
	suggestThemes: protectedProcedure
		.input(
			z.object({
				leagueId: z.string().uuid(),
				context: z.string().max(500).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId);

			const contextLine = input.context
				? `\nThe user wants themes related to: ${input.context}`
				: "";

			try {
				const { text } = await generateText({
					model: openai("gpt-4o-mini"),
					prompt: `Suggest 5 creative and fun music round theme ideas for a music league game where players submit songs matching a theme. Each theme should be unique and inspire a wide variety of song choices.${contextLine}

Respond with a JSON array of objects, each with "theme" (short title) and "description" (1-2 sentence explanation). Only output the JSON array, no other text.`,
				});

				const parsed = JSON.parse(text);
				return parsed as { theme: string; description: string }[];
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate theme suggestions",
				});
			}
		}),

	refineTheme: protectedProcedure
		.input(
			z.object({
				theme: z.string(),
				feedback: z.string().max(500),
				history: z
					.array(
						z.object({
							role: z.enum(["user", "assistant"]),
							content: z.string(),
						})
					)
					.optional(),
			})
		)
		.mutation(async ({ input }) => {
			const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
				{
					role: "system",
					content:
						"You are a creative music round theme assistant. Help refine and improve theme ideas for a music league game where players submit songs matching a theme. Always respond with a JSON object containing \"theme\" (short title) and \"description\" (1-2 sentence explanation). Only output the JSON object, no other text.",
				},
			];

			if (input.history) {
				for (const msg of input.history) {
					messages.push({ role: msg.role, content: msg.content });
				}
			}

			messages.push({
				role: "user",
				content: `Current theme: "${input.theme}"\n\nFeedback: ${input.feedback}\n\nPlease refine the theme based on this feedback.`,
			});

			try {
				const { text } = await generateText({
					model: openai("gpt-4o-mini"),
					messages,
				});

				const parsed = JSON.parse(text);
				return parsed as { theme: string; description: string };
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to refine theme",
				});
			}
		}),

	generateArtwork: protectedProcedure
		.input(
			z.object({
				roundId: z.string().uuid(),
				theme: z.string(),
				leagueId: z.string().uuid(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId, [
				"owner",
				"admin",
			]);

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

			if (round.leagueId !== input.leagueId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Round does not belong to this league",
				});
			}

			try {
				return await generateRoundArtwork(
					ctx.db,
					input.roundId,
					input.theme,
					input.leagueId
				);
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate artwork",
				});
			}
		}),

	regenerateArtwork: protectedProcedure
		.input(
			z.object({
				roundId: z.string().uuid(),
				theme: z.string().optional(),
				leagueId: z.string().uuid(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id!;

			await checkMembership(ctx.db, input.leagueId, userId, [
				"owner",
				"admin",
			]);

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

			if (round.leagueId !== input.leagueId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Round does not belong to this league",
				});
			}

			const theme = input.theme ?? round.theme;

			try {
				return await generateRoundArtwork(
					ctx.db,
					input.roundId,
					theme,
					input.leagueId
				);
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to regenerate artwork",
				});
			}
		}),
});
