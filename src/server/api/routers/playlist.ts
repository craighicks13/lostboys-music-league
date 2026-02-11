import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/api/trpc";
import { rounds, submissions } from "@/server/db/schema/rounds";
import { leagueMembers, leagues } from "@/server/db/schema/leagues";
import { accounts } from "@/server/db/schema/users";
import { generateSpotifyPlaylist } from "@/lib/services/spotify-playlist";
import { refreshSpotifyToken } from "@/lib/auth/token-refresh";

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
 * Get a fresh Spotify access token for a user.
 * Looks up the user's Spotify account in the accounts table,
 * refreshes if expired, and returns the access token.
 */
async function getSpotifyAccessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string
): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.providerId, "spotify"))
    )
    .limit(1);

  if (!account?.accessToken) return null;

  // Check if token is expired
  const now = new Date();
  if (
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt < now &&
    account.refreshToken
  ) {
    const refreshed = await refreshSpotifyToken(account.refreshToken);
    // Update the stored token
    await db
      .update(accounts)
      .set({
        accessToken: refreshed.accessToken,
        accessTokenExpiresAt: new Date(refreshed.expiresAt),
      })
      .where(
        and(eq(accounts.userId, userId), eq(accounts.providerId, "spotify"))
      );
    return refreshed.accessToken;
  }

  return account.accessToken;
}

export const playlistRouter = router({
  /**
   * Generate a Spotify playlist for a revealed/archived round.
   * Uses the requesting user's Spotify token.
   */
  generateSpotify: protectedProcedure
    .input(z.object({ roundId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Get round
      const [round] = await ctx.db
        .select()
        .from(rounds)
        .where(eq(rounds.id, input.roundId))
        .limit(1);

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      if (!["revealed", "archived"].includes(round.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Playlist can only be generated for revealed or archived rounds",
        });
      }

      await checkMembership(ctx.db, round.leagueId, userId, [
        "owner",
        "admin",
      ]);

      // Get league name
      const [league] = await ctx.db
        .select({ name: leagues.name })
        .from(leagues)
        .where(eq(leagues.id, round.leagueId))
        .limit(1);

      // Get Spotify access token
      const accessToken = await getSpotifyAccessToken(ctx.db, userId);
      if (!accessToken) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connect your Spotify account to generate playlists",
        });
      }

      // Get all submissions for this round
      const roundSubmissions = await ctx.db
        .select({
          provider: submissions.provider,
          providerTrackId: submissions.providerTrackId,
        })
        .from(submissions)
        .where(eq(submissions.roundId, round.id));

      // Only include Spotify tracks
      const spotifyTrackIds = roundSubmissions
        .filter((s: { provider: string }) => s.provider === "spotify")
        .map((s: { providerTrackId: string }) => s.providerTrackId);

      if (spotifyTrackIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Spotify tracks found in this round's submissions",
        });
      }

      const result = await generateSpotifyPlaylist({
        accessToken,
        roundTheme: round.theme,
        leagueName: league?.name ?? "Music League",
        trackIds: spotifyTrackIds,
      });

      // Store playlist ID on round
      await ctx.db
        .update(rounds)
        .set({ playlistSpotifyId: result.playlistId })
        .where(eq(rounds.id, round.id));

      return {
        playlistId: result.playlistId,
        externalUrl: result.externalUrl,
      };
    }),

  /**
   * Generate an Apple Music playlist for a revealed/archived round.
   * Requires the user's Music User Token (obtained client-side via MusicKit JS).
   */
  generateAppleMusic: protectedProcedure
    .input(
      z.object({
        roundId: z.string().uuid(),
        musicUserToken: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [round] = await ctx.db
        .select()
        .from(rounds)
        .where(eq(rounds.id, input.roundId))
        .limit(1);

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      if (!["revealed", "archived"].includes(round.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Playlist can only be generated for revealed or archived rounds",
        });
      }

      await checkMembership(ctx.db, round.leagueId, userId, [
        "owner",
        "admin",
      ]);

      const [league] = await ctx.db
        .select({ name: leagues.name })
        .from(leagues)
        .where(eq(leagues.id, round.leagueId))
        .limit(1);

      // Get all submissions for this round
      const roundSubmissions = await ctx.db
        .select({
          provider: submissions.provider,
          providerTrackId: submissions.providerTrackId,
        })
        .from(submissions)
        .where(eq(submissions.roundId, round.id));

      // Only include Apple Music tracks
      const appleTrackIds = roundSubmissions
        .filter((s: { provider: string }) => s.provider === "apple")
        .map((s: { providerTrackId: string }) => s.providerTrackId);

      if (appleTrackIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Apple Music tracks found in this round's submissions",
        });
      }

      // Import dynamically to avoid circular deps
      const { generateAppleMusicPlaylist } = await import(
        "@/lib/services/apple-music-playlist"
      );
      const { getAppleMusicToken } = await import(
        "@/lib/services/apple-music"
      );

      const developerToken = await getAppleMusicToken();
      const result = await generateAppleMusicPlaylist({
        developerToken,
        musicUserToken: input.musicUserToken,
        roundTheme: round.theme,
        leagueName: league?.name ?? "Music League",
        trackIds: appleTrackIds,
      });

      // Store playlist ID on round
      await ctx.db
        .update(rounds)
        .set({ playlistAppleId: result.playlistId })
        .where(eq(rounds.id, round.id));

      return { playlistId: result.playlistId };
    }),

  /**
   * Get playlist links for a round.
   */
  getLinks: protectedProcedure
    .input(z.object({ roundId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const [round] = await ctx.db
        .select({
          id: rounds.id,
          leagueId: rounds.leagueId,
          playlistSpotifyId: rounds.playlistSpotifyId,
          playlistAppleId: rounds.playlistAppleId,
        })
        .from(rounds)
        .where(eq(rounds.id, input.roundId))
        .limit(1);

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      await checkMembership(ctx.db, round.leagueId, userId);

      return {
        spotify: round.playlistSpotifyId
          ? {
              playlistId: round.playlistSpotifyId,
              url: `https://open.spotify.com/playlist/${round.playlistSpotifyId}`,
            }
          : null,
        apple: round.playlistAppleId
          ? {
              playlistId: round.playlistAppleId,
            }
          : null,
      };
    }),
});
