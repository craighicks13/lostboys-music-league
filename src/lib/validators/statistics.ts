import { z } from "zod";

// ── Genre entry shape for favoriteGenres JSONB ─────────────────────────
export const genreEntrySchema = z.object({
  genre: z.string(),
  count: z.number().int().nonnegative(),
});

export type GenreEntry = z.infer<typeof genreEntrySchema>;

// ── User statistics output schema ──────────────────────────────────────
export const userStatisticsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  leagueId: z.string().uuid(),
  seasonId: z.string().uuid().nullable(),
  totalSubmissions: z.number().int(),
  totalVotesCast: z.number().int(),
  totalUpvotesCast: z.number().int(),
  totalDownvotesCast: z.number().int(),
  avgPlacement: z.number().nullable(),
  bestPlacement: z.number().int().nullable(),
  worstPlacement: z.number().int().nullable(),
  totalPointsEarned: z.number().int(),
  totalWins: z.number().int(),
  favoriteGenres: z.array(genreEntrySchema).nullable(),
  updatedAt: z.date(),
});

export type UserStatistics = z.infer<typeof userStatisticsSchema>;

// ── Controversial submission schema ────────────────────────────────────
export const controversialSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  trackName: z.string(),
  artist: z.string(),
  artworkUrl: z.string().nullable(),
  userName: z.string().nullable(),
  roundTheme: z.string(),
  upvoteCount: z.number().int(),
  downvoteCount: z.number().int(),
  controversyScore: z.number(),
});

export type ControversialSubmission = z.infer<typeof controversialSubmissionSchema>;

// ── Comparative stats schema ───────────────────────────────────────────
export const comparativeStatsSchema = z.object({
  user1: z.object({
    userId: z.string().uuid(),
    userName: z.string().nullable(),
    userImage: z.string().nullable(),
    totalPoints: z.number().int(),
    wins: z.number().int(),
    avgPlacement: z.number().nullable(),
    roundsPlayed: z.number().int(),
    upvotesReceived: z.number().int(),
    downvotesReceived: z.number().int(),
  }),
  user2: z.object({
    userId: z.string().uuid(),
    userName: z.string().nullable(),
    userImage: z.string().nullable(),
    totalPoints: z.number().int(),
    wins: z.number().int(),
    avgPlacement: z.number().nullable(),
    roundsPlayed: z.number().int(),
    upvotesReceived: z.number().int(),
    downvotesReceived: z.number().int(),
  }),
  headToHead: z.object({
    user1Wins: z.number().int(),
    user2Wins: z.number().int(),
    ties: z.number().int(),
    commonRounds: z.number().int(),
  }),
});

export type ComparativeStats = z.infer<typeof comparativeStatsSchema>;

// ── CSV export input schemas ───────────────────────────────────────────
export const exportLeagueStatsSchema = z.object({
  leagueId: z.string().uuid(),
  seasonId: z.string().uuid().optional(),
});

export const exportUserHistorySchema = z.object({
  leagueId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  seasonId: z.string().uuid().optional(),
});
