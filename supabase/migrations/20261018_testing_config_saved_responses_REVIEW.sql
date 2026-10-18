-- JD Exambook TESTING ONLY. Review before applying; do not run on production.
-- Security definer functions never expose the answer key.
create or replace function public.get_saved_test_responses(p_test_id bigint)
returns table(question_id bigint, selected_answer character(1), marked_for_review boolean)
language sql security definer set search_path = public, pg_temp
as $$
  select sa.question_id, sa.selected_answer, coalesce(sa.marked_for_review,false)
  from public.student_answers sa
  join public.attempts a on a.id=sa.attempt_id
  where a.user_id=auth.uid() and a.test_id=p_test_id and a.status='in_progress'
$$;
revoke all on function public.get_saved_test_responses(bigint) from public, anon;
grant execute on function public.get_saved_test_responses(bigint) to authenticated;

create or replace function public.get_test_exam_config(p_test_id bigint)
returns jsonb language sql security definer set search_path=public, pg_temp
as $$
select jsonb_build_object(
 'exam',to_jsonb(e),
 'stage',to_jsonb(s),
 'sections',coalesce((select jsonb_agg(to_jsonb(sec) order by sec.display_order) from public.exam_sections sec where sec.stage_id=s.id and sec.is_active=true),'[]'::jsonb)
)
from public.tests t
join public.exam_stages s on s.id=t.exam_stage_id
join public.exams e on e.id=s.exam_id
where t.id=p_test_id and t.status='published'
$$;
revoke all on function public.get_test_exam_config(bigint) from public, anon;
grant execute on function public.get_test_exam_config(bigint) to authenticated;
