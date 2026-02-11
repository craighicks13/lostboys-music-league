import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leagues } from "./leagues";

// Enums
export const seasonStatusEnum = pgEnum("season_status", [
  "upcoming",
  "active",
  "completed",
]);

export const roundStatusEnum = pgEnum("round_status", [
  "draft",
  "submitting",
  "voting",
  "revealed",
  "archived",
]);

export const musicProviderEnum = pgEnum("music_provider", [
  "spotify",
  "apple",
]);

// ── Tables ──────────────────────────────────────────────────────────────

export const seasons = pgTable("season", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  number: integer("number").notNull(),
  status: seasonStatusEnum("status").default("upcoming").notNull(),
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const rounds = pgTable("round", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  theme: text("theme").notNull(),
  description: text("description"),
  aiArtworkUrl: text("ai_artwork_url"),
  status: roundStatusEnum("status").default("draft").notNull(),
  submissionStart: timestamp("submission_start", { mode: "date" }),
  submissionEnd: timestamp("submission_end", { mode: "date" }),
  votingEnd: timestamp("voting_end", { mode: "date" }),
  votingConfig: jsonb("voting_config").$type<{
    pointsPerUser?: number;
    allowDownvotes?: boolean;
    anonymousVoting?: boolean;
  }>(),
  playlistSpotifyId: text("playlist_spotify_id"),
  playlistAppleId: text("playlist_apple_id"),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const submissions = pgTable(
  "submission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackName: text("track_name").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    artworkUrl: text("artwork_url"),
    duration: integer("duration"),
    provider: musicProviderEnum("provider").notNull(),
    providerTrackId: text("provider_track_id").notNull(),
    previewUrl: text("preview_url"),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("submission_round_user_unique").on(
      table.roundId,
      table.userId
    ),
  ]
);

// ── Relations ───────────────────────────────────────────────────────────

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  league: one(leagues, {
    fields: [seasons.leagueId],
    references: [leagues.id],
  }),
  rounds: many(rounds),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  league: one(leagues, {
    fields: [rounds.leagueId],
    references: [leagues.id],
  }),
  season: one(seasons, {
    fields: [rounds.seasonId],
    references: [seasons.id],
  }),
  creator: one(users, {
    fields: [rounds.createdBy],
    references: [users.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  round: one(rounds, {
    fields: [submissions.roundId],
    references: [rounds.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
}));
