import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  conversationsTable,
} from "@workspace/db";
import { eq, isNull, and, sql, count } from "drizzle-orm";

const router = Router();

// List projects
router.get("/", async (req, res) => {
  const archived = req.query.archived === "true";
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      color: projectsTable.color,
      archived: projectsTable.archived,
      deletedAt: projectsTable.deletedAt,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
      conversationCount: sql<number>`cast(count(${conversationsTable.id}) as int)`,
    })
    .from(projectsTable)
    .leftJoin(
      conversationsTable,
      and(
        eq(conversationsTable.projectId, projectsTable.id),
        isNull(conversationsTable.deletedAt)
      )
    )
    .where(
      and(
        eq(projectsTable.archived, archived),
        isNull(projectsTable.deletedAt)
      )
    )
    .groupBy(projectsTable.id)
    .orderBy(projectsTable.updatedAt);
  res.json(rows);
});

// Create project
router.post("/", async (req, res) => {
  const { name, description, color } = req.body as {
    name: string;
    description?: string;
    color?: string;
  };
  const [project] = await db
    .insert(projectsTable)
    .values({ name, description, color })
    .returning();
  res.status(201).json({ ...project, conversationCount: 0 });
});

// Get project
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      color: projectsTable.color,
      archived: projectsTable.archived,
      deletedAt: projectsTable.deletedAt,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
      conversationCount: sql<number>`cast(count(${conversationsTable.id}) as int)`,
    })
    .from(projectsTable)
    .leftJoin(
      conversationsTable,
      and(
        eq(conversationsTable.projectId, projectsTable.id),
        isNull(conversationsTable.deletedAt)
      )
    )
    .where(eq(projectsTable.id, id))
    .groupBy(projectsTable.id);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Update project
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, color } = req.body as {
    name?: string;
    description?: string;
    color?: string;
  };
  const [updated] = await db
    .update(projectsTable)
    .set({ name, description, color, updatedAt: new Date() })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, conversationCount: 0 });
});

// Delete project (soft delete)
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .update(projectsTable)
    .set({ deletedAt: new Date() })
    .where(eq(projectsTable.id, id));
  res.json({ success: true });
});

// Archive / restore project
router.patch("/:id/archive", async (req, res) => {
  const id = Number(req.params.id);
  const { archived } = req.body as { archived: boolean };
  const [updated] = await db
    .update(projectsTable)
    .set({ archived, updatedAt: new Date() })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, conversationCount: 0 });
});

export default router;
