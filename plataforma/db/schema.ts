import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), createdAt: text("created_at").notNull(),
});
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), name: text("name").notNull(), kind: text("kind").notNull(),
  plan: text("plan").notNull(), status: text("status").notNull().default("active"),
  limits: text("limits").notNull(), createdAt: text("created_at").notNull(),
});
export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull().references(() => accounts.id),
  email: text("email").notNull(), userId: text("user_id"), role: text("role").notNull(),
}, table => [uniqueIndex("membership_account_email").on(table.accountId, table.email)]);
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull().references(() => accounts.id),
  name: text("name").notNull(), niche: text("niche").notNull(), audience: text("audience").notNull(),
  brandColor: text("brand_color").notNull(), brief: text("brief").notNull(),
  language: text("language").notNull(), createdAt: text("created_at").notNull(),
});
export const productions = sqliteTable("productions", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull().references(() => accounts.id),
  profileId: text("profile_id").notNull().references(() => profiles.id), title: text("title").notNull(),
  type: text("type").notNull(), style: text("style").notNull(), topic: text("topic").notNull(),
  episodes: integer("episodes").notNull(), duration: integer("duration").notNull(),
  budgetCents: integer("budget_cents").notNull(), status: text("status").notNull(),
  progress: integer("progress").notNull().default(0), bible: text("bible"), outline: text("outline"),
  error: text("error"), requestKey: text("request_key").notNull().unique(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const episodes = sqliteTable("episodes", {
  id: text("id").primaryKey(), productionId: text("production_id").notNull().references(() => productions.id),
  number: integer("number").notNull(), title: text("title").notNull(), data: text("data").notNull(),
  status: text("status").notNull(),
}, table => [uniqueIndex("episode_production_number").on(table.productionId, table.number)]);
export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(), productionId: text("production_id").notNull().references(() => productions.id).unique(),
  accountId: text("account_id").notNull().references(() => accounts.id), period: text("period").notNull(),
  seconds: integer("seconds").notNull(), cents: integer("cents").notNull(),
  status: text("status").notNull(), createdAt: text("created_at").notNull(),
});
export const audit = sqliteTable("audit", {
  id: text("id").primaryKey(), actor: text("actor").notNull(), accountId: text("account_id"),
  action: text("action").notNull(), detail: text("detail").notNull(), createdAt: text("created_at").notNull(),
});
export const workflowRuns = sqliteTable("workflow_runs", {
  productionId: text("production_id").primaryKey().references(() => productions.id),
  executionId: text("execution_id").notNull(), leaseUntil: integer("lease_until").notNull().default(0),
  leaseToken: text("lease_token").notNull().default(""), attempts: integer("attempts").notNull().default(0),
  stepKey: text("step_key").notNull().default(""), planningCents: integer("planning_cents").notNull().default(0),
});
