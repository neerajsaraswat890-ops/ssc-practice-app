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
