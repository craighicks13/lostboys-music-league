import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leagues } from "./leagues";

// Enums
export const chatGroupTypeEnum = pgEnum("chat_group_type", [
  "in_app",
  "whatsapp",
]);

// ── Tables ──────────────────────────────────────────────────────────────

export const chatGroups = pgTable("chat_group", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: chatGroupTypeEnum("type").default("in_app").notNull(),
  whatsappGroupId: text("whatsapp_group_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatGroupId: uuid("chat_group_id")
    .notNull()
    .references(() => chatGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Relations ───────────────────────────────────────────────────────────

export const chatGroupsRelations = relations(chatGroups, ({ one, many }) => ({
  league: one(leagues, {
    fields: [chatGroups.leagueId],
    references: [leagues.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chatGroup: one(chatGroups, {
    fields: [chatMessages.chatGroupId],
    references: [chatGroups.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
