# Phase 2 — Three-test verification report (2026-10-18)

## Scope and safety
These are **non-mutating database assertions and source-code contract checks**. They are **not authenticated end-to-end RPC tests**. No tests were published, no attempts were created, and no live scoring function was replaced.

### 1. Timer expiry — PARTIAL PASS
- PostgreSQL assertion verified the exact 30-minute boundary (29:59 not expired, 30:00 expired).
- Draft `save_test_response` rejects `get_test_state(...).expired = true`.
- Frontend draft allows automatic finalization after an autosave rejection.
- **Not yet tested:** a real signed-in user's timer expiry, retries, concurrent saves, and result-page navigation.

### 2. Section locking — PARTIAL PASS
- Verified active SSC Stenographer stage 8 has 3 sections and 200 questions, with `allow_previous_section=false` and `auto_lock_on_timeout=true`.
- Draft `submit_test` rejects premature final submission before the final section.
- Existing `save_test_response` checks the question's section against the current section.
- **Not yet tested:** a real signed-in user attempting to save a previous-section answer after a server-side transition, especially with concurrent requests.

### 3. Scoring and duplicate submission — PARTIAL PASS
- PostgreSQL assertion checked 2 correct, 1 wrong, 1 unanswered => 1.75/4 (43.75%) for Stenographer stage 8.
- Prior read-only grading audit reproduced stored score and percentage for all 21 submitted attempts.
- Draft `submit_test` uses server-saved answers, does not delete prior answers, checks published status, and locks the latest attempt row with `FOR UPDATE`. It rejects already submitted/auto-submitted attempts.
- **Not yet tested:** authenticated final submission and concurrent duplicate calls against a disposable test account. Existing tests 1 and 2 intentionally contain only 10 and 50 questions and must remain untouched.

## Release blockers
1. The draft SQL functions are **not installed**. Their internal logic needs database-level integration tests with a disposable account/test before deployment.
2. Coordinate expired-answer locking and finalization so that failed autosaves cannot change already locked answers.
3. Verify result page and API responses for the new server-only scoring implementation.
4. Keep Draft PR #1 unmerged and do not deploy to production until these checks pass.
