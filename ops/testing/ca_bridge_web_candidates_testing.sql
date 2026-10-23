-- JD Exambook Testing ONLY: candidate discovery -> pending editorial queue.
-- Safe to rerun. Does not approve/publish news or change Production.
-- Schedule 50 minutes past UTC hour, after adapters and before article study.
CREATE OR REPLACE FUNCTION public.ca_bridge_web_candidates_testing(p_limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $func$
DECLARE
  v_inserted integer := 0;
  v_eligible integer := 0;
BEGIN
  IF session_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION 'ca_bridge_web_candidates_testing is restricted to the testing scheduler';
  END IF;

  SELECT count(*) INTO v_eligible
  FROM public.ca_web_adapter_candidates c
  JOIN public.ca_sources s ON s.source_key = c.source_key
  WHERE c.status = 'needs_review'
    AND c.source_key <> 'PIB_HI'
    AND lower(split_part(c.article_url, '/', 1)) = 'https:'
    AND lower(regexp_replace(split_part(c.article_url, '/', 3), '^www\.', '')) =
        lower(regexp_replace(s.allowed_host, '^www\.', ''))
    AND split_part(c.article_url, '/', 3) !~ '[:@]'
    AND char_length(btrim(c.headline)) BETWEEN 15 AND 400
    AND c.headline !~ '[ऀ-ॿ]'
    AND char_length(btrim(coalesce(c.description,''))) >= 30
    AND c.published_at BETWEEN now()-interval '8 days' AND now()+interval '2 hours'
    AND NOT EXISTS (SELECT 1 FROM public.ca_items i WHERE i.canonical_url = c.article_url);

  WITH eligible AS (
    SELECT c.*,s.id AS valid_source_id,s.source_name AS valid_source_name,s.category AS valid_category
    FROM public.ca_web_adapter_candidates c
    JOIN public.ca_sources s ON s.source_key = c.source_key
    WHERE c.status='needs_review'
      AND c.source_key <> 'PIB_HI'
      AND lower(split_part(c.article_url, '/', 1))='https:'
      AND lower(regexp_replace(split_part(c.article_url, '/', 3), '^www\.', '')) =
          lower(regexp_replace(s.allowed_host, '^www\.', ''))
      AND split_part(c.article_url, '/', 3) !~ '[:@]'
      AND char_length(btrim(c.headline)) BETWEEN 15 AND 400
      AND c.headline !~ '[ऀ-ॿ]'
      AND char_length(btrim(coalesce(c.description,''))) >= 30
      AND c.published_at BETWEEN now()-interval '8 days' AND now()+interval '2 hours'
    ORDER BY c.published_at DESC,c.id DESC
    LIMIT least(greatest(coalesce(p_limit,40),1),100)
  ),
  inserted AS (
    INSERT INTO public.ca_items
      (canonical_url,source_name,headline_en,summary_en,published_at,event_date,
       topics,status,evidence_checked,source_id,exam_category,review_notes)
    SELECT c.article_url,c.valid_source_name,btrim(c.headline),left(btrim(c.description),2000),
           c.published_at,(c.published_at AT TIME ZONE 'Asia/Kolkata')::date,
           ARRAY[c.valid_category]::text[],'pending',false,c.valid_source_id,
           c.valid_category,
           format('Web adapter candidate %s (%s). Official source and facts must be independently verified before approval.',c.id,c.source_key)
    FROM eligible c
    ON CONFLICT (canonical_url) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  RETURN jsonb_build_object('inserted_pending',v_inserted,
    'remaining_eligible',greatest(0,v_eligible-v_inserted),
    'auto_published',0,'ran_at',now());
END;
$func$;

REVOKE ALL ON FUNCTION public.ca_bridge_web_candidates_testing(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ca_bridge_web_candidates_testing(integer) TO postgres;

SELECT cron.schedule(
  'jd-ca-bridge-web-candidates-testing',
  '50 * * * *',
  $$select public.ca_bridge_web_candidates_testing(40);$$
);
