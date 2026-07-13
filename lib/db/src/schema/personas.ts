import { pgTable, serial, text, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personasTable = pgTable("personas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  temperature: real("temperature").notNull().default(0.7),
  isDefault: boolean("is_default").notNull().default(false),
  emoji: text("emoji"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPersonaSchema = createInsertSchema(personasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personasTable.$inferSelect;
