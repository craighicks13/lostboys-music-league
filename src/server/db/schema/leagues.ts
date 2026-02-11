import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Enums
export const leagueVisibilityEnum = pgEnum("league_visibility", [
  "public",
  "private",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
]);

// ── Tables ──────────────────────────────────────────────────────────────

export const leagues = pgTable("league", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: leagueVisibilityEnum("visibility").default("private").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").$type<{
    votingRules?: string;
    anonymousMode?: boolean;
    downvotingEnabled?: boolean;
    maxSubmissions?: number;
    pointsPerVote?: number;
  }>(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const leagueMembers = pgTable(
  "league_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
    bannedAt: timestamp("banned_at", { mode: "date" }),
  },
  (table) => [
    uniqueIndex("league_member_unique").on(table.leagueId, table.userId),
  ]
);

export const invites = pgTable("invite", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  code: text("code").unique().notNull(),
  linkToken: text("link_token").unique().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  maxUses: integer("max_uses"),
  uses: integer("uses").default(0).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// Moderation
export const moderationActionEnum = pgEnum("moderation_action", [
  "kick",
  "ban",
  "unban",
  "role_change",
]);

export const moderationLogs = pgTable(
  "moderation_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    performedBy: uuid("performed_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: moderationActionEnum("action").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("moderation_log_league_idx").on(table.leagueId),
  ]
);

// ── Relations ───────────────────────────────────────────────────────────

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  owner: one(users, {
    fields: [leagues.ownerId],
    references: [users.id],
  }),
  members: many(leagueMembers),
  invites: many(invites),
}));

export const leagueMembersRelations = relations(leagueMembers, ({ one }) => ({
  league: one(leagues, {
    fields: [leagueMembers.leagueId],
    references: [leagues.id],
  }),
  user: one(users, {
    fields: [leagueMembers.userId],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  league: one(leagues, {
    fields: [invites.leagueId],
    references: [leagues.id],
  }),
  creator: one(users, {
    fields: [invites.createdBy],
    references: [users.id],
  }),
}));

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  league: one(leagues, {
    fields: [moderationLogs.leagueId],
    references: [leagues.id],
  }),
  performer: one(users, {
    fields: [moderationLogs.performedBy],
    references: [users.id],
    relationName: "moderationPerformer",
  }),
  target: one(users, {
    fields: [moderationLogs.targetUserId],
    references: [users.id],
    relationName: "moderationTarget",
  }),
}));
