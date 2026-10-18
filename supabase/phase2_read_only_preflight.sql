-- JD Exambook Phase 2 pre-deployment audit (READ ONLY)
-- Run against Supabase SQL editor. Does not update attempts or answers.
-- Test IDs 1 (10 questions) and 2 (50 questions) are intentional test fixtures.

-- 1. Detect duplicate/missing question ordering and invalid answer keys.
SELECT t.id AS test_id,
       COUNT(tq.id) AS questions,
       COUNT(DISTINCT tq.question_order) AS unique_orders,
       MIN(tq.question_order) AS first_order,
       MAX(tq.question_order) AS last_order,
       COUNT(*) FILTER (WHERE q.id IS NULL) AS missing_question_references,
       COUNT(*) FILTER (WHERE q.correct_answer NOT IN ('A','B','C','D')) AS invalid_answer_keys
FROM public.tests t
LEFT JOIN public.test_questions tq ON tq.test_id=t.id
LEFT JOIN public.questions q ON q.id=tq.question_id
GROUP BY t.id ORDER BY t.id;

-- 2. Recompute historical submitted results using server-saved answers.
-- Expect zero mismatches before any new grading function is deployed.
WITH section_ranges AS (
 SELECT s.stage_id, s.marks_per_question, s.negative_mark,
        COALESCE(SUM(s.question_count) OVER
          (PARTITION BY s.stage_id ORDER BY s.display_order
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0)+1 AS start_order,
        SUM(s.question_count) OVER
          (PARTITION BY s.stage_id ORDER BY s.display_order) AS end_order
 FROM public.exam_sections s WHERE s.is_active=true
), graded AS (
 SELECT a.id AS attempt_id,
        SUM(CASE WHEN sa.selected_answer IS NULL THEN 0
          WHEN UPPER(sa.selected_answer::text)=UPPER(q.correct_answer::text)
            THEN COALESCE(sr.marks_per_question,es.marks_per_question,1)
          ELSE -COALESCE(sr.negative_mark,es.negative_mark,0) END) AS computed_score,
        SUM(COALESCE(sr.marks_per_question,es.marks_per_question,1)) AS max_marks
 FROM public.attempts a
 JOIN public.tests t ON t.id=a.test_id
 JOIN public.exam_stages es ON es.id=t.exam_stage_id
 JOIN public.test_questions tq ON tq.test_id=t.id
 JOIN public.questions q ON q.id=tq.question_id
 LEFT JOIN public.student_answers sa ON sa.attempt_id=a.id AND sa.question_id=tq.question_id
 LEFT JOIN section_ranges sr ON sr.stage_id=es.id
       AND tq.question_order BETWEEN sr.start_order AND sr.end_order
 WHERE a.status IN ('submitted','auto_submitted')
 GROUP BY a.id
)
SELECT a.id AS attempt_id, a.test_id, a.score AS stored_score,
       g.computed_score, a.percentage AS stored_percentage,
       ROUND(100*g.computed_score/NULLIF(g.max_marks,0),2) AS computed_percentage
FROM graded g JOIN public.attempts a ON a.id=g.attempt_id
WHERE a.score IS DISTINCT FROM g.computed_score
   OR ROUND(a.percentage,2) IS DISTINCT FROM
      ROUND(100*g.computed_score/NULLIF(g.max_marks,0),2)
ORDER BY a.id;

-- 3. Confirm no live tests are unintentionally published.
SELECT status,COUNT(*) AS test_count FROM public.tests GROUP BY status ORDER BY status;
