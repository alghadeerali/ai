import { Router } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  personasTable,
} from "@workspace/db";
import { eq, isNull, and, sql, desc } from "drizzle-orm";

const router = Router();

// List conversations
router.get("/", async (req, res) => {
  const projectId = req.query.projectId
    ? Number(req.query.projectId)
    : undefined;
  const archived = req.query.archived === "true";
  const deleted = req.query.deleted === "true";

  const conditions: ReturnType<typeof eq>[] = [];

  if (deleted) {
    // Show only soft-deleted
    conditions.push(sql`${conversationsTable.deletedAt} IS NOT NULL`);
  } else {
    conditions.push(isNull(conversationsTable.deletedAt));
    conditions.push(eq(conversationsTable.archived, archived));
  }

  if (projectId !== undefined) {
    conditions.push(eq(conversationsTable.projectId, projectId));
  }

  const rows = await db
    .select({
      id: conversationsTable.id,
      projectId: conversationsTable.projectId,
      personaId: conversationsTable.personaId,
      title: conversationsTable.title,
      model: conversationsTable.model,
      archived: conversationsTable.archived,
      deletedAt: conversationsTable.deletedAt,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: sql<number>`cast(count(${messagesTable.id}) as int)`,
      lastMessageAt: sql<string | null>`max(${messagesTable.createdAt})`,
    })
    .from(conversationsTable)
    .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(and(...conditions))
    .groupBy(conversationsTable.id)
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(rows);
});

// Create conversation
router.post("/", async (req, res) => {
  const { title, model, projectId, personaId } = req.body as {
    title: string;
    model: string;
    projectId?: number | null;
    personaId?: number | null;
  };
  const [conv] = await db
    .insert(conversationsTable)
    .values({ title, model, projectId, personaId })
    .returning();
  res.status(201).json({ ...conv, messageCount: 0, lastMessageAt: null });
});

// Get conversation with messages
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!conv) return res.status(404).json({ error: "Not found" });

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  let persona = null;
  if (conv.personaId) {
    const [p] = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.id, conv.personaId));
    persona = p ?? null;
  }

  res.json({ ...conv, messages, persona });
});

// Update conversation
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, model, personaId, projectId } = req.body as {
    title?: string;
    model?: string;
    personaId?: number | null;
    projectId?: number | null;
  };
  const [updated] = await db
    .update(conversationsTable)
    .set({ title, model, personaId, projectId, updatedAt: new Date() })
    .where(eq(conversationsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, messageCount: 0, lastMessageAt: null });
});

// Soft delete
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db
    .update(conversationsTable)
    .set({ deletedAt: new Date() })
    .where(eq(conversationsTable.id, id));
  res.json({ success: true });
});

// Archive / restore
router.patch("/:id/archive", async (req, res) => {
  const id = Number(req.params.id);
  const { archived } = req.body as { archived: boolean };
  const [updated] = await db
    .update(conversationsTable)
    .set({ archived, updatedAt: new Date() })
    .where(eq(conversationsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, messageCount: 0, lastMessageAt: null });
});

// Restore deleted
router.patch("/:id/restore", async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(conversationsTable)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(conversationsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, messageCount: 0, lastMessageAt: null });
});

// Export as markdown
router.get("/:id/export", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!conv) return res.status(404).json({ error: "Not found" });

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  const lines: string[] = [
    `# ${conv.title}`,
    ``,
    `**Model:** ${conv.model}`,
    `**Created:** ${conv.createdAt.toISOString()}`,
    ``,
    `---`,
    ``,
  ];

  for (const msg of messages) {
    const label =
      msg.role === "user"
        ? "**You**"
        : msg.role === "assistant"
          ? `**Assistant** *(${msg.model ?? conv.model})*`
          : "**System**";
    lines.push(`${label}`, ``, msg.content, ``, `---`, ``);
  }

  res.json({ markdown: lines.join("\n"), title: conv.title });
});

export default router;
