import path from "path";
import fs from "fs";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";
import { projectsTable } from "./schema/projects";
import { personasTable } from "./schema/personas";

/** Returns true if the given fully-qualified relation exists. */
async function relationExists(qualifiedName: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT to_regclass(${qualifiedName}) AS exists`,
  );
  const rows =
    (result as unknown as { rows?: Array<{ exists: string | null }> }).rows ?? [];
  return rows.length > 0 && rows[0].exists !== null;
}

/**
 * Number of migrations recorded in drizzle's journal. Returns 0 if the journal
 * table doesn't exist OR exists but is empty (a failed prior migrate() can
 * leave an empty journal table behind, since drizzle creates it outside the
 * migration transaction).
 */
async function recordedMigrationCount(): Promise<number> {
  if (!(await relationExists("drizzle.__drizzle_migrations"))) return 0;
  const result = await db.execute(
    sql`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations`,
  );
  const rows =
    (result as unknown as { rows?: Array<{ c: number }> }).rows ?? [];
  return rows[0]?.c ?? 0;
}

/**
 * Locate the generated SQL migrations folder at runtime. In the Docker image
 * the whole repo lives at /app, so migrations are at /app/lib/db/drizzle.
 * We try a few candidate paths to also work in local dev.
 */
function findMigrationsFolder(): string | null {
  const candidates = [
    path.join(process.cwd(), "lib/db/drizzle"),
    path.join(process.cwd(), "../../lib/db/drizzle"),
    path.resolve(process.cwd(), "..", "..", "lib", "db", "drizzle"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const DEFAULT_PROJECTS = [
  { name: "عام", description: "المشروع الافتراضي للمحادثات العامة", color: "#6366f1" },
  { name: "تطوير", description: "مشاريع البرمجة والتطوير", color: "#10b981" },
];

const DEFAULT_PERSONAS = [
  {
    name: "مساعد عام",
    description: "مساعد ذكاء اصطناعي متعدد الأغراض",
    systemPrompt:
      "You are a helpful, concise, and intelligent AI assistant. Support both Arabic and English seamlessly. When the user writes in Arabic, respond in Arabic. When they write in English, respond in English.",
    temperature: 0.7,
    isDefault: true,
    emoji: "🤖",
  },
  {
    name: "مطور Google Apps Script",
    description: "متخصص في برمجة Google Apps Script وأتمتة Google Workspace",
    systemPrompt:
      "You are an expert Google Apps Script developer. Help users write, debug, and optimize GAS code. Always provide working code examples. Explain in Arabic when the user writes in Arabic.",
    temperature: 0.3,
    isDefault: true,
    emoji: "⚙️",
  },
  {
    name: "كاتب حسيني",
    description: "متخصص في الكتابة والمحتوى الديني والحسيني",
    systemPrompt:
      "أنت كاتب متخصص في الأدب الحسيني والمحتوى الديني الإسلامي. تكتب بأسلوب راقٍ وعميق. تساعد في صياغة الخطب والقصائد والمقالات الدينية.",
    temperature: 0.8,
    isDefault: true,
    emoji: "📖",
  },
  {
    name: "مراجع عربي",
    description: "مراجعة وتدقيق النصوص العربية",
    systemPrompt:
      "أنت مراجع لغوي متخصص في اللغة العربية. راجع النصوص وصحح الأخطاء النحوية والإملائية وأسلوب الكتابة. قدم تفسيرًا واضحًا لكل تصحيح.",
    temperature: 0.3,
    isDefault: true,
    emoji: "✏️",
  },
  {
    name: "مساعد إنتاج فيديو",
    description: "مساعد في تخطيط وإنتاج محتوى الفيديو",
    systemPrompt:
      "You are a video production expert. Help with scripting, storyboarding, editing advice, thumbnail ideas, and content strategy for YouTube and social media. Support Arabic and English creators.",
    temperature: 0.7,
    isDefault: true,
    emoji: "🎬",
  },
];

/**
 * Run pending migrations and seed default data if the tables are empty.
 * Safe to call on every server startup — migrations and seeds are idempotent.
 */
export async function bootstrapDatabase(
  log: (msg: string) => void = console.log,
): Promise<void> {
  // Decide how to bring the schema up to date, handling three cases:
  //  1. Fresh DB (no tables)            → run all migrations.
  //  2. Prod DB with a migration journal → apply any pending migrations.
  //  3. Legacy/dev DB created via `drizzle push` (tables but no journal)
  //     → skip migrate() (it would try to re-create/alter existing objects);
  //     the schema is managed by `drizzle push` in that environment.
  const hasSchema = await relationExists("public.projects");
  const recordedCount = await recordedMigrationCount();
  const migrationsFolder = findMigrationsFolder();

  if (hasSchema && recordedCount === 0) {
    log("Schema present but no migrations recorded — externally (push) managed; skipping migrate");
    // Self-heal: since migrate() is skipped here, additive columns from newer
    // schema revisions won't be applied automatically. Guard the ones that
    // runtime inserts depend on with idempotent ALTERs so a push-managed (or
    // journal-less) database can never fail message inserts.
    await db.execute(
      sql`ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS reasoning text`,
    );
  } else if (!migrationsFolder) {
    log("No migrations folder found — skipping migrations");
  } else {
    log(`Running migrations from ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    log("Migrations complete");
  }

  const existingProjects = await db.select().from(projectsTable).limit(1);
  if (existingProjects.length === 0) {
    await db.insert(projectsTable).values(DEFAULT_PROJECTS);
    log("Seeded default projects");
  }

  const existingPersonas = await db.select().from(personasTable).limit(1);
  if (existingPersonas.length === 0) {
    await db.insert(personasTable).values(DEFAULT_PERSONAS);
    log("Seeded default personas");
  }
}
