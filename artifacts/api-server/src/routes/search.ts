import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, conversationsTable, messagesTable } from "@workspace/db";
import { ilike, or, and, isNull, eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

  if (!q) return res.json({ results: [], total: 0 });

  const pattern = `%${q}%`;

  // Search projects
  const projectResults = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        isNull(projectsTable.deletedAt),
        or(
          ilike(projectsTable.name, pattern),
          ilike(projectsTable.description, pattern)
        )
      )
    )
    .limit(5);

  // Search conversations
  const convConditions = [
    isNull(conversationsTable.deletedAt),
    ilike(conversationsTable.title, pattern),
  ];
  if (projectId !== undefined) {
    convConditions.push(eq(conversationsTable.projectId, projectId));
  }
  const convResults = await db
    .select()
    .from(conversationsTable)
    .where(and(...convConditions))
    .limit(10);

  // Search messages
  const msgConditions = [ilike(messagesTable.content, pattern)];
  const msgResults = await db
    .select({ msg: messagesTable, conv: conversationsTable })
    .from(messagesTable)
    .innerJoin(
      conversationsTable,
      and(
        eq(messagesTable.conversationId, conversationsTable.id),
        isNull(conversationsTable.deletedAt)
      )
    )
    .where(and(...msgConditions))
    .limit(10);

  const results = [
    ...projectResults.map((p) => ({
      type: "project" as const,
      id: p.id,
      title: p.name,
      excerpt: p.description ?? null,
      conversationId: null,
      projectId: null,
      createdAt: p.createdAt.toISOString(),
    })),
    ...convResults.map((c) => ({
      type: "conversation" as const,
      id: c.id,
      title: c.title,
      excerpt: null,
      conversationId: null,
      projectId: c.projectId ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    ...msgResults.map(({ msg, conv }) => ({
      type: "message" as const,
      id: msg.id,
      title: conv.title,
      excerpt: msg.content.slice(0, 200),
      conversationId: msg.conversationId,
      projectId: conv.projectId ?? null,
      createdAt: msg.createdAt.toISOString(),
    })),
  ];

  res.json({ results, total: results.length });
});

export default router;
