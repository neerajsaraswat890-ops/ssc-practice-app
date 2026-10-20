# JD Exambook — Current Affairs Automation (Testing only)

## Running architecture — 20 October 2026
- Testing Supabase: `gfoyzlbehikcxfluznvq`; Vercel Preview branch: `feat/jd-responsive-current-affairs-testing`. Production is not in scope.
- `jd-ca-ingest` Edge Function (v5): ingest publisher RSS feeds with URL deduplication, host allowlist, dates, per-source error logs, and pending-only staging. Official PIB Hindi and English feeds are paired by matching PRID when both are accessible; Hindi enrichment never rewrites an approved item.
- `jd-ca-verify` Edge Function (v1): scheduled every hour at minute 25, custom secret-header authorization, independent fetch of official first-party PIB article pages in both languages, publication-date check, headline overlap, numeric claim check, duplicate check and verification audit. Auto-approves only bilingual eligible pending items passing all gates; failures remain pending.
- Publisher feeds: PIB English, PIB Hindi, RBI, WHO (per-source fail handling). An RSS endpoint's existence does not guarantee a successful fetch; monitor source runs.
- Public News: `ca_items` RLS exposes only approved verified content; browser uses publishable key and never gets service role or scheduler secret.
- Editor UI: `/current-affairs/editor` restricted by trusted `app_metadata.role` for manual exceptions.
- Daily/weekly quizzes: scheduled release gates for 08:00 IST daily and 10:00 IST Sunday. Only verified bilingual MCQs that pass question QA can appear. Quiz answer keys are returned after submission, not with public question listing.
- Backfill 14–20 Oct 2026: 11 bilingual PIB items inserted from first-party dated press releases with evidence-check records on 20 Oct. Other independently inserted items may appear; inspect database counts. This is curated seed content, **not** evidence that the automatic verifier has successfully approved a record.

## Verification limitations and fail-closed rules
- Approval is conditional on accessible official English and Hindi pages, matching publication date, title and numeric claims, bilingual fields, unique headlines, and matching first-party source host.
- Automatic verification is **not** independent corroboration of every policy claim: primary-source verification establishes what the authority published. Contested claims and unclear figures still require review.
- RBI updates may remain pending without matching official Hindi material or when source sites block automated access.
- The system does not yet auto-generate original bilingual MCQs, and successful future cron invocations plus real auto-approvals must be checked in `ca_source_runs`, `ca_verification_checks`, and `ca_automation_runs`.
- All editorial corrections and publication decisions should be logged. Do not classify an unverified item as approved or invent a headline for an unavailable period.


## Exam-oriented editorial rubric (StudyIQ / Utkarsh / Bankers Adda / SSC Adda comparison)

**Research method:** public educational materials and available video descriptions are analysed as examples of pedagogy, not replicated verbatim. There is no blanket claim that every YouTube video was watched in full.

- SSC/GD/CGL/CHSL/MTS focus: national & international appointments, awards, sports results, organisations, schemes, place/date/year, firsts, rankings, science/defence initiatives; concise one-liners, factual MCQs and linked static GK.
- Banking/IBPS/SBI/RRB focus: RBI actions, repo/standing facilities, financial institutions, appointments, banking regulation, amounts/rates, reports, rankings, economic indicators and international financial agreements.
- Analytical focus from StudyIQ: context, significance, impact, differences between announcement/proposal and finalized implementation. Never infer outcomes from proposals.
- Revision focus from Utkarsh and SSC Adda: names, dates, ministries, schemes, venues, measurable figures and match-the-following/factual question targets.
- News scoring: topical keywords select exam category and SSC/Banking/Railway/State tags; this is an indicative score, not independent proof of factual correctness.

### Deployed article reader (Testing only)
- Supabase function `jd-ca-full-article-study` version 1. Server-only authenticated using the existing scheduler token; source domains constrained to official PIB/RBI websites.
- Reads full accessible first-party HTML article rather than relying on RSS headline/summary. Excludes common navigation/footers and extracts candidate statements containing facts/numbers; compares English and Hindi official PIB releases by numeric anchors. Saves source hash, source excerpt, publication date, coverage statistics, fact candidates, reasons and review state in `ca_article_analyses`.
- **Auto-publication gate:** source headline and date must match, at least 2 English/Hindi sentence-level pairs must share factual numeric anchors, original article must be sufficiently complete, and record must meet relevance threshold. Rejected, incomplete, source-blocked, or English-only articles remain pending for further review. The gate is enforced by a database trigger; the previous verifier cannot bypass this gate.
- Existing editorially approved articles are evaluated but are never overwritten automatically.
- Do **not** use Adda247, YouTube, or other teaching platforms as news database sources; only publicly accessible official source documents are ingested. Derive original notes and explanations rather than copying teaching materials.
- Runs on UTC cron. Hourly `45 * * * *` ingest corresponds to each hour's **:15 IST**; `55 * * * *` full-article study corresponds to **:25 IST**.
- `article_analysis_status` and `ca_article_analyses` track source errors, incomplete bilingual corroboration, low priority, and grounded facts separately. A deployed function is not proof that any given item was fully read; inspect its actual run logs and coverage.
- Source snippets are evidence, not a replacement for fact-checking contested claims or suitable examination questions; quiz drafting and answer QA remain separate gates.
