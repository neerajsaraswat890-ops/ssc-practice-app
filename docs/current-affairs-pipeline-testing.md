# JD Exambook — Current Affairs Pipeline (Testing only)
Status: design specification, NOT automatically running.
1. Ingest from approved, attributable public sources; record canonical URL, source, publication UTC timestamp and event date. Respect publisher permissions/licensing; store original paraphrases rather than copying articles.
2. Normalize Hindi and English summaries, SSC/Railway/Banking/State-exam tags, topics and event category. Check duplicate URL, semantic duplicates, dates and conflicting reports.
3. Stage all items with status=pending; only editor-approved, source-verified items may be published. Never synthesize plausible news or cite a stale article as new.
4. Generate draft bilingual MCQs, four bilingual options, validated answer and explanation referencing source URLs; review factual correctness and ambiguous wording before approval.
5. Approved daily items feed sidebar and dedicated /current-affairs route. Quiz is free and should not expose answers before submission.
6. Sunday weekly test scheduled at 10:00 Asia/Kolkata only after data and publishing mechanism exist; preserve earlier weekly mock schedules for other exam categories.
7. Link every approved quiz question to unique master-question identity, source, revision and topic; upsert by stable key to avoid duplicates, log editorial changes.
8. All schema changes, secrets, job scheduling and publishing require testing-only verification. Production data and env settings MUST NOT be changed.
9. Database RLS: publicly readable only approved/published current-affairs records; write restricted to trusted server/editor. Avoid browser-side service_role key.
10. Use feature flags and an empty state while pipeline is not deployed or content awaits approval.
