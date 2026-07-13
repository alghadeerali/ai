import { Router } from "express";
import { db } from "@workspace/db";
import { personasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const personas = await db.select().from(personasTable).orderBy(personasTable.createdAt);
  res.json(personas);
});

router.post("/", async (req, res) => {
  const { name, description, systemPrompt, temperature, emoji } = req.body as {
    name: string;
    description?: string;
    systemPrompt: string;
    temperature?: number;
    emoji?: string;
  };
  const [persona] = await db
    .insert(personasTable)
    .values({ name, description, systemPrompt, temperature: temperature ?? 0.7, emoji })
    .returning();
  res.status(201).json(persona);
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, systemPrompt, temperature, emoji } = req.body as {
    name?: string;
    description?: string;
    systemPrompt?: string;
    temperature?: number;
    emoji?: string;
  };
  const [updated] = await db
    .update(personasTable)
    .set({ name, description, systemPrompt, temperature, emoji, updatedAt: new Date() })
    .where(eq(personasTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [persona] = await db.select().from(personasTable).where(eq(personasTable.id, id));
  if (!persona) return res.status(404).json({ error: "Not found" });
  if (persona.isDefault) return res.status(400).json({ error: "Cannot delete a default persona" });
  await db.delete(personasTable).where(eq(personasTable.id, id));
  res.json({ success: true });
});

export default router;
