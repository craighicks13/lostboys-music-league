import {
  pgTable,
  timestamp,
  uuid,
  integer,
  jsonb,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leagues } from "./leagues";
import { seasons } from "./rounds";

// ── Tables ──────────────────────────────────────────────────────────────

export const leaderboardEntries = pgTable(
  "leaderboard_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalPoints: integer("total_points").default(0).notNull(),
    upvotesReceived: integer("upvotes_received").default(0).notNull(),
    downvotesReceived: integer("downvotes_received").default(0).notNull(),
    wins: integer("wins").default(0).notNull(),
    roundsParticipated: integer("rounds_participated").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("leaderboard_entry_unique").on(
      table.leagueId,
      table.seasonId,
      table.userId
    ),
  ]
);

export const userStatistics = pgTable(
  "user_statistic",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, {
      onDelete: "cascade",
    }),
    totalSubmissions: integer("total_submissions").default(0).notNull(),
    totalVotesCast: integer("total_votes_cast").default(0).notNull(),
    totalUpvotesCast: integer("total_upvotes_cast").default(0).notNull(),
    totalDownvotesCast: integer("total_downvotes_cast").default(0).notNull(),
    avgPlacement: real("avg_placement"),
    bestPlacement: integer("best_placement"),
    worstPlacement: integer("worst_placement"),
    totalPointsEarned: integer("total_points_earned").default(0).notNull(),
    totalWins: integer("total_wins").default(0).notNull(),
    favoriteGenres: jsonb("favorite_genres").$type<{ genre: string; count: number }[]>(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_statistic_unique").on(
      table.userId,
      table.leagueId,
      table.seasonId
    ),
  ]
);

// ── Relations ───────────────────────────────────────────────────────────

export const leaderboardEntriesRelations = relations(
  leaderboardEntries,
  ({ one }) => ({
    league: one(leagues, {
      fields: [leaderboardEntries.leagueId],
      references: [leagues.id],
    }),
    season: one(seasons, {
      fields: [leaderboardEntries.seasonId],
      references: [seasons.id],
    }),
    user: one(users, {
      fields: [leaderboardEntries.userId],
      references: [users.id],
    }),
  })
);

export const userStatisticsRelations = relations(
  userStatistics,
  ({ one }) => ({
    user: one(users, {
      fields: [userStatistics.userId],
      references: [users.id],
    }),
    league: one(leagues, {
      fields: [userStatistics.leagueId],
      references: [leagues.id],
    }),
    season: one(seasons, {
      fields: [userStatistics.seasonId],
      references: [seasons.id],
    }),
  })
);
