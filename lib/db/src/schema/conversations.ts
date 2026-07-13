import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { personasTable } from "./personas";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  personaId: integer("persona_id").references(() => personasTable.id, { onDelete: "set null" }),
  title: text("title").notNull().default("New Conversation"),
  model: text("model").notNull().default("openai/gpt-4o-mini"),
  archived: boolean("archived").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
