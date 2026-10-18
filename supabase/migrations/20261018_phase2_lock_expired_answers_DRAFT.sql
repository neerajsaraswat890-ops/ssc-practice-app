-- DRAFT ONLY: coordinated server-side expiry finalization required before deployment.
-- Prevent post-expiry edits and auto-submitted edits. Review section mapping separately.

CREATE OR REPLACE FUNCTION public.save_test_response(p_test_id bigint, p_question_id bigint, p_selected_answer text DEFAULT NULL::text, p_marked_for_review boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_state jsonb;

  v_attempt_id bigint;
  v_attempt_status text;
  v_current_section integer;

  v_stage_id bigint;
  v_timer_type text;

  v_question_order integer;

  v_question_section integer;

  v_section_count integer;

  v_running_total integer := 0;

  v_sec record;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;


  if p_selected_answer is not null
     and upper(
       p_selected_answer
     ) not in (
       'A',
       'B',
       'C',
       'D'
     ) then

    raise exception 'Invalid answer option';

  end if;


  v_state := public.get_test_state(p_test_id);

  if coalesce((v_state ->> 'expired')::boolean, false) then
    raise exception 'Test timer expired; answers are locked';
  end if;


  select
    a.id,
    a.status,
    a.current_section
  into
    v_attempt_id,
    v_attempt_status,
    v_current_section

  from public.attempts a

  where
    a.test_id = p_test_id
    and a.user_id = v_user_id

  order by a.id desc
  limit 1;


  if v_attempt_id is null then
    raise exception 'Active attempt not found';
  end if;


  if v_attempt_status in ('submitted', 'auto_submitted') then
    raise exception 'Test already submitted';
  end if;


  select
    t.exam_stage_id,
    es.timer_type
  into
    v_stage_id,
    v_timer_type

  from public.tests t

  join public.exam_stages es
    on es.id = t.exam_stage_id

  where t.id = p_test_id
  limit 1;


  if v_stage_id is null then
    raise exception 'Exam stage not found';
  end if;


  select
    tq.question_order
  into
    v_question_order

  from public.test_questions tq

  where
    tq.test_id =
      p_test_id

    and tq.question_id =
      p_question_id

  limit 1;


  if v_question_order is null then
    raise exception 'Question does not belong to this test';
  end if;


  -- =======================================================
  -- SECTIONAL EXAM:
  -- Find which dynamic section owns the question
  -- =======================================================

  if v_timer_type = 'sectional' then

    v_question_section := null;


    for v_sec in

      select
        s.question_count,
        s.display_order

      from public.exam_sections s

      where
        s.stage_id =
          v_stage_id

        and s.is_active =
          true

      order by
        s.display_order

    loop

      if
        v_question_order >
          v_running_total

        and

        v_question_order <=
          v_running_total +
          v_sec.question_count
      then

        v_question_section :=
          v_sec.display_order - 1;

        exit;

      end if;


      v_running_total :=
        v_running_total +
        v_sec.question_count;

    end loop;


    if v_question_section is null then
      raise exception 'Question section could not be determined';
    end if;


    if
      v_question_section <>
      v_current_section
    then
      raise exception 'This section is locked';
    end if;

  end if;


  -- =======================================================
  -- OVERALL TIMER EXAM:
  -- Any question in the test can be edited until final submit
  -- =======================================================


  update public.student_answers

  set
    selected_answer =
      case
        when p_selected_answer is null
          then null
        else upper(
          p_selected_answer
        )
      end,

    marked_for_review =
      coalesce(
        p_marked_for_review,
        false
      ),

    is_correct = null

  where
    attempt_id =
      v_attempt_id

    and question_id =
      p_question_id;


  if not found then

    insert into public.student_answers (
      attempt_id,
      question_id,
      selected_answer,
      marked_for_review,
      is_correct
    )

    values (
      v_attempt_id,

      p_question_id,

      case
        when p_selected_answer is null
          then null
        else upper(
          p_selected_answer
        )
      end,

      coalesce(
        p_marked_for_review,
        false
      ),

      null
    );

  end if;


  return jsonb_build_object(
    'success', true,

    'question_id',
      p_question_id,

    'selected_answer',
      case
        when p_selected_answer is null
          then null
        else upper(
          p_selected_answer
        )
      end,

    'marked_for_review',
      coalesce(
        p_marked_for_review,
        false
      )
  );

end;
$function$
;
