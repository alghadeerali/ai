import { Router } from "express";
import { db } from "@workspace/db";
import { usageLogsTable, projectsTable } from "@workspace/db";
import { sql, desc, eq, and, gte, isNull } from "drizzle-orm";

const router = Router();

// Usage stats dashboard
router.get("/stats", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totals] = await db
    .select({
      totalCostUsd: sql<number>`coalesce(sum(${usageLogsTable.costUsd}), 0)`,
      totalMessages: sql<number>`cast(count(*) as int)`,
    })
    .from(usageLogsTable);

  const [todayTotals] = await db
    .select({
      todayCostUsd: sql<number>`coalesce(sum(${usageLogsTable.costUsd}), 0)`,
    })
    .from(usageLogsTable)
    .where(gte(usageLogsTable.createdAt, todayStart));

  const totalConversationsResult = await db
    .select({ count: sql<number>`cast(count(distinct ${usageLogsTable.conversationId}) as int)` })
    .from(usageLogsTable);

  const byModel = await db
    .select({
      model: usageLogsTable.model,
      totalMessages: sql<number>`cast(count(*) as int)`,
      totalTokens: sql<number>`cast(sum(${usageLogsTable.totalTokens}) as int)`,
      totalCostUsd: sql<number>`coalesce(sum(${usageLogsTable.costUsd}), 0)`,
    })
    .from(usageLogsTable)
    .groupBy(usageLogsTable.model)
    .orderBy(desc(sql`sum(${usageLogsTable.costUsd})`));

  const byProject = await db
    .select({
      projectId: usageLogsTable.projectId,
      projectName: sql<string>`coalesce(${projectsTable.name}, 'No Project')`,
      totalMessages: sql<number>`cast(count(*) as int)`,
      totalCostUsd: sql<number>`coalesce(sum(${usageLogsTable.costUsd}), 0)`,
    })
    .from(usageLogsTable)
    .leftJoin(projectsTable, eq(usageLogsTable.projectId, projectsTable.id))
    .groupBy(usageLogsTable.projectId, projectsTable.name)
    .orderBy(desc(sql`sum(${usageLogsTable.costUsd})`));

  // Daily costs for last 30 days
  const dailyCosts = await db
    .select({
      date: sql<string>`date(${usageLogsTable.createdAt})::text`,
      costUsd: sql<number>`coalesce(sum(${usageLogsTable.costUsd}), 0)`,
      messages: sql<number>`cast(count(*) as int)`,
    })
    .from(usageLogsTable)
    .where(gte(usageLogsTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`date(${usageLogsTable.createdAt})`)
    .orderBy(sql`date(${usageLogsTable.createdAt})`);

  const topModel = byModel[0]?.model ?? null;
  const topProject = byProject[0]?.projectName ?? null;

  res.json({
    totalCostUsd: totals?.totalCostUsd ?? 0,
    todayCostUsd: todayTotals?.todayCostUsd ?? 0,
    totalMessages: totals?.totalMessages ?? 0,
    totalConversations: totalConversationsResult[0]?.count ?? 0,
    topModel,
    topProject,
    byModel,
    byProject,
    dailyCosts,
  });
});

// Usage logs
router.get("/logs", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const model = req.query.model ? String(req.query.model) : undefined;

  const conditions = [];
  if (projectId !== undefined) conditions.push(eq(usageLogsTable.projectId, projectId));
  if (model) conditions.push(eq(usageLogsTable.model, model));

  const logs = await db
    .select()
    .from(usageLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(usageLogsTable.createdAt))
    .limit(limit);

  res.json(logs);
});

export default router;
