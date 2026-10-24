import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ ok: false, issue: "preview_supabase_config_missing" }, { status: 503 });

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const [news, quiz] = await Promise.all([
    db.from("ca_items").select("id", { count: "exact", head: true })
      .in("status", ["approved", "published"]).eq("evidence_checked", true)
      .not("visible_at", "is", null).lte("visible_at", now)
      .not("headline_hi", "is", null).not("summary_hi", "is", null),
    db.from("ca_questions").select("id", { count: "exact", head: true })
      .in("status", ["approved", "published"]).eq("qa_passed", true)
      .not("visible_at", "is", null).lte("visible_at", now)
      .not("question_hi", "is", null).not("option_a_hi", "is", null),
  ]);
  if (news.error || quiz.error) {
    return Response.json({
      ok: false,
      issue: "testing_read_failed",
      newsCode: news.error?.code || null,
      quizCode: quiz.error?.code || null,
    }, { status: 503 });
  }
  return Response.json({
    ok: true, environment: "preview",
    approved_visible_news: news.count ?? 0,
    qa_passed_visible_questions: quiz.count ?? 0,
    checked_at: now,
  }, { headers: { "cache-control": "no-store" } });
}
