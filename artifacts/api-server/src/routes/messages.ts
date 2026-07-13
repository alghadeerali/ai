import { Router } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  personasTable,
  usageLogsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router({ mergeParams: true });

// List messages for a conversation
router.get("/", async (req, res) => {
  const conversationId = Number(req.params.id);
  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(asc(messagesTable.createdAt));
  res.json(messages);
});

// Send a message and get AI response
router.post("/", async (req, res) => {
  const conversationId = Number(req.params.id);
  const { content, model: overrideModel, thinking } = req.body as {
    content: string;
    model?: string | null;
    thinking?: boolean;
  };

  // Get conversation
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const model = overrideModel || conv.model;

  // Get persona system prompt if set
  let systemPrompt: string | undefined;
  if (conv.personaId) {
    const [persona] = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.id, conv.personaId));
    if (persona) systemPrompt = persona.systemPrompt;
  }

  // Get existing messages for context
  const historyRows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(asc(messagesTable.createdAt));

  // Save user message
  const [userMessage] = await db
    .insert(messagesTable)
    .values({ conversationId, role: "user", content })
    .returning();

  // Build messages array for OpenRouter
  const chatMessages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    chatMessages.push({ role: "system", content: systemPrompt });
  }
  for (const msg of historyRows) {
    chatMessages.push({ role: msg.role, content: msg.content });
  }
  chatMessages.push({ role: "user", content });

  // Call OpenRouter
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-workspace.app",
        "X-Title": "AI Workspace",
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        stream: false,
        // Ask OpenRouter to include the real credit cost in the usage object
        usage: { include: true },
        // Enable reasoning tokens for reasoning-capable models when requested
        ...(thinking ? { reasoning: { enabled: true } } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `OpenRouter error: ${errText}` });
    }

    const data = (await response.json()) as {
      choices: { message: { content: string; reasoning?: string | null } }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cost?: number;
      };
      model?: string;
    };

    const assistantContent = data.choices[0]?.message?.content ?? "";
    const reasoning = data.choices[0]?.message?.reasoning ?? null;
    const usage = data.usage;
    const actualModel = data.model || model;

    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    // Prefer the real cost reported by OpenRouter (usage.cost); fall back to a
    // rough per-token estimate only if it's unavailable.
    const costUsd =
      typeof usage?.cost === "number" && Number.isFinite(usage.cost)
        ? usage.cost
        : ((promptTokens + completionTokens) / 1000) * 0.0015;

    // Save assistant message
    const [assistantMessage] = await db
      .insert(messagesTable)
      .values({
        conversationId,
        role: "assistant",
        content: assistantContent,
        model: actualModel,
        promptTokens,
        completionTokens,
        costUsd,
        reasoning,
      })
      .returning();

    // Log usage
    await db.insert(usageLogsTable).values({
      conversationId,
      projectId: conv.projectId,
      model: actualModel,
      promptTokens,
      completionTokens,
      totalTokens: (usage?.total_tokens ?? promptTokens + completionTokens),
      costUsd,
    });

    // Update conversation updatedAt
    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    res.json({ userMessage, assistantMessage });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
