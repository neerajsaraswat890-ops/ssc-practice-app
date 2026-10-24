import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

// Testing-only, read-only diagnostics. No content, credentials or internal records are returned.
export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ ok: false, issue: "preview_supabase_config_missing" }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();
  const names = ["exams", "ca_items", "ca_questions"];
  const results = await Promise.all(names.map(async (table) => {
    const started = Date.now();
    try {
      const { error } = await db.from(table).select("id").limit(1).abortSignal(AbortSignal.timeout(8000));
      return { table, ok: !error, durationMs: Date.now() - started,
        code: error?.code || null, kind: error?.name || null,
        issue: error ? (error.message || "read_failed").slice(0,140) : null };
    } catch (error) {
      return { table, ok: false, durationMs: Date.now() - started,
        code: null, kind: error?.name || "unknown", issue: "request_failed" };
    }
  }));
  const ok = results.every(r => r.ok);
  return Response.json({ ok, environment: "preview", checks: results, checked_at: now },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
