import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Enum-like type for channel types
export const channelTypes = ["slack", "email", "sms", "webhook"] as const;
export type ChannelType = (typeof channelTypes)[number];

// Enum-like type for message direction
export const messageDirections = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof messageDirections)[number];

// Enum-like type for conversation status
export const conversationStatuses = ["new", "resolved"] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

// Enum-like type for conversation type
export const conversationTypes = ["feedback", "error"] as const;
export type ConversationType = (typeof conversationTypes)[number];

// API Keys table
export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  userId: text("user_id"),
});

// Notification Channels table
export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiKeyId: integer("api_key_id")
    .notNull()
    .references(() => apiKeys.id),
  type: text("type", { enum: channelTypes }).notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
});

// Conversations table
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiKeyId: integer("api_key_id")
    .notNull()
    .references(() => apiKeys.id),
  sessionId: text("session_id").notNull(),
  status: text("status", { enum: conversationStatuses }).notNull().default("new"),
  type: text("type", { enum: conversationTypes }).notNull().default("feedback"),
  fingerprint: text("fingerprint"),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  lastOccurredAt: text("last_occurred_at"),
  readAt: integer("read_at"),
  archivedAt: integer("archived_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Messages table
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  direction: text("direction", { enum: messageDirections }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Export types for TypeScript inference
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// Users table - for dashboard authentication
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Auth tokens table - for magic link authentication
export const authTokens = sqliteTable("auth_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Sessions table - for authenticated dashboard sessions
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
