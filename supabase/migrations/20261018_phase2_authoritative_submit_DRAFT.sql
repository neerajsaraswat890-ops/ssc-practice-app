-- PHASE 2 DRAFT. DO NOT APPLY TO PRODUCTION UNTIL INTEGRATION TESTS PASS.
-- Uses authoritative server-saved answers. Client p_answers and p_review
-- remain in the signature for backwards compatibility but are NOT trusted.
-- Requires coordinated save_test_response expiry-lock migration and frontend QA.
CREATE OR REPLACE FUNCTION public.submit_test(
  p_test_id bigint, p_answers jsonb, p_review jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_test record;
  v_stage record;
  v_attempt record;
  v_state jsonb;
  v_total integer;
  v_correct integer := 0;
  v_wrong integer := 0;
  v_unanswered integer := 0;
  v_review integer := 0;
  v_score numeric := 0;
  v_max_marks numeric := 0;
  v_percentage numeric := 0;
  v_expired boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT t.id, t.status, t.exam_stage_id, t.attempt_until
    INTO v_test FROM public.tests t WHERE t.id = p_test_id;
  IF v_test.id IS NULL OR v_test.status <> 'published' THEN
    RAISE EXCEPTION 'Test is not published';
  END IF;

  SELECT es.id, es.timer_type, es.marks_per_question,
         es.negative_mark, es.duration_minutes
    INTO v_stage
    FROM public.exam_stages es
   WHERE es.id = v_test.exam_stage_id AND es.is_active = true;
  IF v_stage.id IS NULL THEN
    RAISE EXCEPTION 'Active exam stage not found';
  END IF;

  -- Do not create a new attempt from submit_test.
  -- A legitimate attempt must have been created by get_test_state.
  SELECT a.id, a.status, a.current_section
    INTO v_attempt
    FROM public.attempts a
   WHERE a.user_id = v_user AND a.test_id = p_test_id
   ORDER BY a.id DESC LIMIT 1 FOR UPDATE;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Active attempt not found';
  END IF;
  IF v_attempt.status IN ('submitted','auto_submitted') THEN
    RAISE EXCEPTION 'Test already submitted';
  END IF;
  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Attempt is not active';
  END IF;

  -- This refreshes the server timer and advances expired sections.
  v_state := public.get_test_state(p_test_id);
  v_expired := COALESCE((v_state ->> 'expired')::boolean, false);

  -- A sectional test may be submitted early only in its final section.
  IF v_stage.timer_type = 'sectional'
     AND NOT v_expired
     AND COALESCE((v_state ->> 'current_section')::integer, -1) <
       (SELECT count(*) - 1 FROM public.exam_sections s
         WHERE s.stage_id = v_stage.id AND s.is_active = true)
  THEN
    RAISE EXCEPTION 'Complete the current sections before final submission';
  END IF;

  SELECT count(*) INTO v_total FROM public.test_questions tq
   WHERE tq.test_id = p_test_id;
  IF v_total = 0 THEN
    RAISE EXCEPTION 'Test has no questions';
  END IF;

  -- Never delete saved answers and never copy untrusted client answers.
  -- Section marking overrides stage marking where configured.
  WITH ordered_sections AS (
    SELECT s.id, s.marks_per_question, s.negative_mark,
           COALESCE(SUM(s.question_count) OVER (
             ORDER BY s.display_order ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
           ), 0)::integer + 1 AS start_order,
           SUM(s.question_count) OVER (
             ORDER BY s.display_order ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           )::integer AS end_order
      FROM public.exam_sections s
     WHERE s.stage_id = v_stage.id AND s.is_active = true
  ), grading AS (
    SELECT tq.question_id, q.correct_answer,
           sa.selected_answer, sa.marked_for_review,
           COALESCE(sec.marks_per_question, v_stage.marks_per_question, 1)::numeric AS positive,
           COALESCE(sec.negative_mark, v_stage.negative_mark, 0)::numeric AS negative
      FROM public.test_questions tq
      JOIN public.questions q ON q.id = tq.question_id
      LEFT JOIN public.student_answers sa
        ON sa.attempt_id = v_attempt.id AND sa.question_id = tq.question_id
      LEFT JOIN ordered_sections sec
        ON tq.question_order BETWEEN sec.start_order AND sec.end_order
     WHERE tq.test_id = p_test_id
  ), updated AS (
    UPDATE public.student_answers sa
       SET is_correct = CASE
         WHEN g.selected_answer IS NULL THEN NULL
         ELSE upper(g.selected_answer::text) = upper(g.correct_answer::text)
       END
      FROM grading g
     WHERE sa.attempt_id = v_attempt.id AND sa.question_id = g.question_id
    RETURNING sa.question_id
  )
  SELECT count(*) FILTER (WHERE g.selected_answer IS NOT NULL
                            AND upper(g.selected_answer::text) = upper(g.correct_answer::text)),
         count(*) FILTER (WHERE g.selected_answer IS NOT NULL
                            AND upper(g.selected_answer::text) <> upper(g.correct_answer::text)),
         count(*) FILTER (WHERE g.selected_answer IS NULL),
         count(*) FILTER (WHERE g.marked_for_review IS TRUE),
         COALESCE(sum(CASE
           WHEN g.selected_answer IS NULL THEN 0
           WHEN upper(g.selected_answer::text) = upper(g.correct_answer::text) THEN g.positive
           ELSE -g.negative END), 0),
         COALESCE(sum(g.positive), 0)
    INTO v_correct, v_wrong, v_unanswered, v_review, v_score, v_max_marks
    FROM grading g;

  -- NOTE: The preceding CTE's grading is statement-scoped and cannot be
  -- reused after a separate statement. Keep grading + update + aggregate
  -- in the same WITH statement, as written above.
  IF v_max_marks > 0 THEN
    v_percentage := (v_score / v_max_marks) * 100;
  END IF;

  UPDATE public.attempts SET
    submitted_at = now(),
    status = CASE WHEN v_expired THEN 'auto_submitted' ELSE 'submitted' END,
    correct_count = v_correct,
    wrong_count = v_wrong,
    unanswered_count = v_unanswered,
    score = v_score,
    percentage = v_percentage
  WHERE id = v_attempt.id;

  RETURN jsonb_build_object(
    'attempt_id',v_attempt.id,'total',v_total,
    'attempted',v_correct+v_wrong,'correct',v_correct,
    'wrong',v_wrong,'unanswered',v_unanswered,
    'marked_for_review',v_review,
    'score',v_score,'percentage',round(v_percentage,2),
    'maximum_marks',v_max_marks,
    'status',CASE WHEN v_expired THEN 'auto_submitted' ELSE 'submitted' END
  );
END;
$function$;
