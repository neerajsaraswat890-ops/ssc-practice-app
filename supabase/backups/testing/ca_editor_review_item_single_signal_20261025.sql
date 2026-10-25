-- Testing-only backup and update for public.ca_editor_review_item.
-- A single topical indicator is sufficient after official-source and bilingual evidence checks.
create or replace function public.ca_editor_review_item(
  p_item_id bigint,
  p_approve boolean,
  p_evidence_url text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_row public.ca_items%rowtype;
begin
  if auth.uid() is null
     or coalesce(auth.jwt()->'app_metadata'->>'role','') not in ('admin','editor')
  then raise exception 'not authorized'; end if;

  if length(trim(coalesce(p_notes,''))) < 8
     or length(trim(coalesce(p_evidence_url,''))) < 12
  then raise exception 'source and review notes required'; end if;

  select * into v_row
  from public.ca_items
  where id = p_item_id
  for update;

  if not found then raise exception 'not found'; end if;
  if p_evidence_url <> v_row.canonical_url
  then raise exception 'evidence must equal canonical primary source URL'; end if;

  if p_approve and not exists (
    select 1
    from public.ca_article_analyses a
    where a.item_id = p_item_id
      and a.exam_score >= 33
      and a.analysis_status in ('bilingual_grounded','needs_review')
  )
  then raise exception 'news is filtered: no qualifying current-affairs relevance score'; end if;

  if p_approve and (
    nullif(trim(v_row.headline_hi),'') is null
    or nullif(trim(v_row.summary_hi),'') is null
    or nullif(trim(v_row.summary_en),'') is null
  )
  then raise exception 'reviewed bilingual content required'; end if;

  update public.ca_items
  set status = case when p_approve then 'approved' else 'rejected' end,
      evidence_checked = p_approve,
      approved_at = case when p_approve then now() else null end,
      visible_at = case when p_approve then now() else null end,
      review_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_item_id;

  insert into public.ca_reviews(item_id,reviewer_id,action,evidence_url,notes)
  values(
    p_item_id,
    auth.uid(),
    case when p_approve then 'approve_news' else 'reject_news' end,
    p_evidence_url,
    p_notes
  );

  return jsonb_build_object('ok',true,'approved',p_approve);
end;
$function$;
