-- Testing Current Affairs question-draft schedule.
-- Apply only after OPENAI_API_KEY is configured in Testing.
-- This is a distinct missing stage; the existing ingestion, study, sync, and batch jobs stay unchanged.
-- Idempotent: it will not create a duplicate job with this name.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'jd-ca-question-draft-testing') then
    perform cron.schedule(
      'jd-ca-question-draft-testing',
      '12,27,42,57 * * * *',
      $job$
        select net.http_post(
          url := 'https://gfoyzlbehikcxfluznvq.supabase.co/functions/v1/jd-ca-question-draft',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select token from public.ca_job_auth where id = 1)
          ),
          body := '{"limit":2}'::jsonb,
          timeout_milliseconds := 30000
        );
      $job$
    );
  end if;
end
$$;
