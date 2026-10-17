# JD Exambook — Phase 2 Test Security Review

Status: **Draft / not production-ready**. Branch: `fix/test-submit-autosave-safety`.

## Confirmed source observations

- `app/test/[id]/page.js` queues answer saves through `save_test_response` and invokes `submit_test` with client-side `p_answers` and `p_review`.
- The previous autosave handler logged errors without propagating failure, and the final submission continued after `Promise.allSettled`. The branch change tracks and retries failed saves and blocks submission if the retry fails.
- `submit_test_section` invokes `get_test_state`, checks current section and advances the attempt; it does not score the final attempt.
- The live `submit_test` implementation deletes prior saved answers and reinserts browser-supplied answers. It calculates one positive mark per correct answer and uses `tests.negative_mark`, rather than reliably using stage/section marks. It does not enforce section locking itself.
- `save_test_response` invokes `get_test_state` but does not reject its `expired` flag.
- Database has existing student attempts and answers. Preserve them.

## Remaining tasks before merging

1. Review timeout/auto-submit flow. In particular, a timeout can coincide with failed autosave; blocking automatic submit must not strand an attempt indefinitely. Server-side expiry finalization is needed.
2. Make scoring authoritative on the server and consistent with `exam_stages` and `exam_sections`; inspect per-test overrides before choosing precedence.
3. Prevent edits to expired tests and previously locked sections, including attempts to replace answers through final submission.
4. Verify authenticated RPC permissions, data exposure, and RLS. Do not weaken Phase 1 permissions.
5. Build the Next.js application, test overall and sectional flows, including save failures, offline recovery, expiry, refresh, duplicate submission, and result calculation.
6. Deploy database migrations and frontend changes in a coordinated, rollback-aware sequence only after verification.

## Release gate

Do not merge this PR or apply scoring migrations to the production Supabase project until the above tests pass. No production DB changes are part of this review.
