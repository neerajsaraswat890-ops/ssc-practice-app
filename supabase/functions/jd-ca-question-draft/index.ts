import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
const dbSignal = () => AbortSignal.timeout(7000);
const compact = (v: unknown, max = 1000) => String(v ?? "").trim().slice(0, max);
const norm = (s: string) => s.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
const sha = async (s: string) => Array.from(new Uint8Array(
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
)).map((b) => b.toString(16).padStart(2, "0")).join("");

type FactPair = { en: string; hi: string; anchor: string };

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    eligible: { type: "boolean" },
    reason: { type: "string" },
    question_en: { type: "string" },
    question_hi: { type: "string" },
    options_en: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    options_hi: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    correct_answer: { type: "string", enum: ["A", "B", "C", "D"] },
    explanation_en: { type: "string" },
    explanation_hi: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
    evidence_fact_id: { type: "string" },
  },
  required: [
    "eligible", "reason", "question_en", "question_hi", "options_en", "options_hi",
    "correct_answer", "explanation_en", "explanation_hi", "difficulty", "evidence_fact_id",
  ],
};

function groundedPhrase(phrase: string, facts: string[]) {
  const needle = norm(phrase);
  return needle.length >= 2 && facts.some((fact) => norm(fact).includes(needle));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json({ error: "not_configured" }, 503);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authErr } = await db.from("ca_job_auth")
    .select("token").eq("id", 1).single().abortSignal(dbSignal());
  if (authErr || !auth?.token) return json({ error: "auth_unavailable" }, 503);
  if (req.headers.get("authorization") !== "Bearer " + auth.token) {
    return json({ error: "unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
  if (!apiKey) {
    await db.from("ca_automation_runs").insert({
      job_name: "jd-ca-question-draft-testing",
      status: "skipped",
      completed_at: new Date().toISOString(),
      affected: 0,
      details: "OPENAI_API_KEY is not configured; no question drafts were created",
    }).abortSignal(dbSignal());
    return json({ ok: true, configured: false, created: 0, autoPublished: 0 });
  }

  const params = await req.json().catch(() => ({}));
  const requested = Number(params?.limit);
  const limit = Number.isFinite(requested) && requested > 0
    ? Math.min(4, Math.trunc(requested))
    : 2;

  const { data: items, error: itemErr } = await db.from("ca_items")
    .select("id,canonical_url,headline_en,headline_hi,summary_en,summary_hi,event_date,status,evidence_checked,approved_at,article_analysis_status,article_evidence_sha256,exam_category,exam_tags")
    .eq("status", "approved").eq("evidence_checked", true)
    .eq("article_analysis_status", "bilingual_grounded")
    .not("approved_at", "is", null)
    .order("approved_at", { ascending: true }).limit(30).abortSignal(dbSignal());
  if (itemErr) return json({ error: "approved_items_read_failed" }, 503);

  let created = 0;
  const results: Array<Record<string, unknown>> = [];
  for (const item of items || []) {
    if (created >= limit) break;
    const { data: existing, error: qe } = await db.from("ca_questions")
      .select("id").eq("item_id", item.id).limit(1).abortSignal(dbSignal());
    if (qe) {
      results.push({ item_id: item.id, status: "question_check_failed" });
      continue;
    }
    if (existing?.length) continue;

    const { data: analysis, error: ae } = await db.from("ca_article_analyses")
      .select("source_url,article_sha256,analysis_status,full_article_words,matched_fact_pairs")
      .eq("item_id", item.id).single().abortSignal(dbSignal());
    const pairs = Array.isArray(analysis?.matched_fact_pairs)
      ? analysis.matched_fact_pairs as FactPair[]
      : [];
    if (
      ae || analysis?.source_url !== item.canonical_url ||
      analysis?.analysis_status !== "bilingual_grounded" ||
      Number(analysis?.full_article_words || 0) < 180 ||
      !item.article_evidence_sha256 || analysis?.article_sha256 !== item.article_evidence_sha256 ||
      pairs.length < 2
    ) {
      results.push({ item_id: item.id, status: "held", reason: "grounded_analysis_incomplete" });
      continue;
    }

    const facts = pairs.slice(0, 5).map((p, i) => ({
      id: "F" + (i + 1),
      en: compact(p.en, 400),
      hi: compact(p.hi, 400),
      anchor: compact(p.anchor, 60),
    })).filter((p) => p.en.length >= 35 && p.hi.length >= 25);
    if (facts.length < 2) {
      results.push({ item_id: item.id, status: "held", reason: "insufficient_bilingual_facts" });
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: "Bearer " + apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("CA_QUESTION_MODEL") || "gpt-4.1-mini",
          temperature: 0.1,
          max_completion_tokens: 1200,
          response_format: {
            type: "json_schema",
            json_schema: { name: "grounded_current_affairs_question", strict: true, schema: responseSchema },
          },
          messages: [
            {
              role: "system",
              content: "Create one SSC-style bilingual current-affairs MCQ draft. Use only the supplied paired official-source facts. Do not add dates, names, numbers, claims, or source attributions. The correct option must be an exact phrase copied from the cited fact in English and Hindi. Every distractor must also be an exact phrase present in one of the supplied facts in that language. If four distinct source-grounded options cannot be formed, set eligible=false and leave question/options/explanations empty. Keep the Hindi natural and faithful. This is an editor-review draft, never a published question.",
            },
            {
              role: "user",
              content: JSON.stringify({
                official_source: item.canonical_url,
                event_date: item.event_date,
                headline_en: item.headline_en,
                headline_hi: item.headline_hi,
                facts,
                instructions: [
                  "Ask one direct factual question suitable for SSC/railway/banking general awareness.",
                  "Prefer a high-yield name, institution, scheme, award, report, ranking, place, date, or number explicitly present in the facts.",
                  "Use exactly four distinct options in each language and keep corresponding option meanings aligned.",
                  "Set evidence_fact_id to the supplied fact ID that directly proves the answer.",
                  "Explanations must state why the answer follows from that fact; do not add related facts.",
                  "Return eligible=false if source-grounded distractors or bilingual wording are uncertain.",
                ],
              }),
            },
          ],
        }),
      });
    } catch {
      results.push({ item_id: item.id, status: "model_request_failed" });
      continue;
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      results.push({ item_id: item.id, status: "model_request_failed", http_status: response.status });
      continue;
    }

    const completion = await response.json().catch(() => ({}));
    const content = completion?.choices?.[0]?.message?.content;
    let draft: any;
    try { draft = JSON.parse(content); } catch { draft = null; }
    if (!draft?.eligible) {
      results.push({ item_id: item.id, status: "no_grounded_question", reason: compact(draft?.reason, 120) });
      continue;
    }

    const answer = String(draft.correct_answer || "");
    const answerIndex = ["A", "B", "C", "D"].indexOf(answer);
    const evidence = facts.find((f) => f.id === draft.evidence_fact_id);
    const enOptions = Array.isArray(draft.options_en) ? draft.options_en.map((x: unknown) => compact(x, 120)) : [];
    const hiOptions = Array.isArray(draft.options_hi) ? draft.options_hi.map((x: unknown) => compact(x, 120)) : [];
    const allEn = facts.map((f) => f.en);
    const allHi = facts.map((f) => f.hi);
    const valid =
      answerIndex >= 0 && evidence && enOptions.length === 4 && hiOptions.length === 4 &&
      enOptions.every((x: string) => x && groundedPhrase(x, allEn)) &&
      hiOptions.every((x: string) => x && groundedPhrase(x, allHi)) &&
      new Set(enOptions.map(norm)).size === 4 && new Set(hiOptions.map(norm)).size === 4 &&
      groundedPhrase(enOptions[answerIndex], [evidence.en]) &&
      groundedPhrase(hiOptions[answerIndex], [evidence.hi]) &&
      ["easy", "moderate", "hard"].includes(draft.difficulty) &&
      compact(draft.question_en, 500).length >= 15 &&
      compact(draft.question_hi, 500).length >= 10 &&
      compact(draft.explanation_en, 1200).length >= 20 &&
      compact(draft.explanation_hi, 1200).length >= 15;
    if (!valid) {
      results.push({ item_id: item.id, status: "held", reason: "generated_content_failed_source_phrase_checks" });
      continue;
    }

    const fingerprint = await sha(String(item.id) + "|" + norm(draft.question_en));
    const row = {
      item_id: item.id,
      question_en: compact(draft.question_en, 500),
      question_hi: compact(draft.question_hi, 500),
      option_a_en: enOptions[0], option_b_en: enOptions[1], option_c_en: enOptions[2], option_d_en: enOptions[3],
      option_a_hi: hiOptions[0], option_b_hi: hiOptions[1], option_c_hi: hiOptions[2], option_d_hi: hiOptions[3],
      correct_answer: answer,
      explanation_en: compact(draft.explanation_en, 1200),
      explanation_hi: compact(draft.explanation_hi, 1200),
      difficulty: draft.difficulty,
      status: "draft",
      qa_passed: false,
      visible_at: null,
      fingerprint,
    };
    const { error: insertErr } = await db.from("ca_questions").insert(row).abortSignal(dbSignal());
    if (insertErr) {
      results.push({ item_id: item.id, status: "draft_insert_failed" });
      continue;
    }
    created++;
    results.push({ item_id: item.id, status: "draft_created", autoPublished: 0 });
  }

  await db.from("ca_automation_runs").insert({
    job_name: "jd-ca-question-draft-testing",
    status: "success",
    completed_at: new Date().toISOString(),
    affected: created,
    details: JSON.stringify({ processed: results.length, created, autoPublished: 0, results }).slice(0, 1000),
  }).abortSignal(dbSignal());

  return json({ ok: true, created, autoPublished: 0, results });
});
