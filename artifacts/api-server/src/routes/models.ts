import { Router } from "express";

const router = Router();

let cachedModels: unknown[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

router.get("/", async (_req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });

  // Return cached
  if (cachedModels && Date.now() - cacheTime < CACHE_TTL) {
    return res.json(cachedModels);
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch models from OpenRouter" });
    }

    const data = (await response.json()) as {
      data: {
        id: string;
        name: string;
        description?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
      }[];
    };

    const models = data.data.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description ?? null,
      contextLength: m.context_length ?? null,
      pricingPrompt: m.pricing?.prompt ?? null,
      pricingCompletion: m.pricing?.completion ?? null,
      isFree:
        !m.pricing?.prompt ||
        m.pricing.prompt === "0" ||
        Number(m.pricing.prompt) === 0,
    }));

    cachedModels = models;
    cacheTime = Date.now();
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
