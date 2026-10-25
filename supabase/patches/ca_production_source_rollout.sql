-- Production source rollout, applied on 2026-10-25 after deploying candidate-stage v34.
-- Activates the seven adapters already verified in Testing plus the four explicitly requested sources.
-- All newly synced items enter ca_items as pending; this patch does not publish any news.

select cron.alter_job(
  6,
  command := $job$
    select net.http_post(
      url := 'https://rbdgphbolfyqvmymnoyi.supabase.co/functions/v1/jd-ca-web-candidate-stage',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select token from public.ca_job_auth where id=1)),
      body := jsonb_build_object(
        'dryRun',false,
        'batch',(floor(extract(epoch from now()) / 900)::bigint
          % (select greatest(1,ceil(count(*)::numeric/5)::bigint) from public.ca_sources where integration_type='web_adapter'))::integer
      ),
      timeout_milliseconds := 120000
    );
  $job$
);

insert into public.ca_sources
  (source_key,source_name,feed_url,allowed_host,category,enabled,max_items,integration_type,integration_status,integration_notes)
values
  ('AFC','Asian Football Confederation','https://www.the-afc.com/en/','www.the-afc.com','Sports',true,20,'web_adapter','sync_verified','Production stage and candidate-to-ca_items sync verified: 3 items on 2026-10-25. All items remain pending editorial review.'),
  ('AIFF','All India Football Federation','https://www.the-aiff.com/','www.the-aiff.com','Sports',true,20,'web_adapter','sync_verified','Production stage and candidate-to-ca_items sync verified: 3 items on 2026-10-25. All items remain pending editorial review.')
on conflict (source_key) do update set source_name=excluded.source_name,feed_url=excluded.feed_url,
  allowed_host=excluded.allowed_host,category=excluded.category,enabled=excluded.enabled,
  integration_type=excluded.integration_type,integration_status='pending_validation',
  integration_notes=excluded.integration_notes;

update public.ca_sources as s
set feed_url=v.feed_url,allowed_host=v.allowed_host,category=v.category,enabled=true,
    integration_type='web_adapter',integration_status=v.integration_status,integration_notes=v.integration_notes
from (values
  ('AIR_NEWS','https://newsonair.gov.in/','newsonair.gov.in','National','sync_verified','Production stage and candidate-to-ca_items sync verified: 2 items on 2026-10-25. All items remain pending editorial review.'),
  ('DRDO','https://drdo.gov.in/drdo/what-is-news','drdo.gov.in,www.drdo.gov.in','Defence','pending_validation','Enabled for official-page polling. Latest dry-run timed out on official listing; no item will stage without verifiable article content/date.'),
  ('ESA','https://www.esa.int/','www.esa.int','Science','sync_verified','Production stage and candidate-to-ca_items sync verified: 1 item on 2026-10-25. All items remain pending editorial review.'),
  ('FIFA','https://www.fifa.com/en/news','www.fifa.com','Sports','pending_validation','Enabled for official-page polling. Latest dry-run returned a shell without article links; no item will stage without verifiable article content/date.'),
  ('IP_INDIA','https://ipindia.gov.in/','ipindia.gov.in','GI Tags','sync_verified','Production stage and candidate-to-ca_items sync verified: 1 item on 2026-10-25. All items remain pending editorial review.'),
  ('ISRO','https://www.isro.gov.in/','www.isro.gov.in','Science','sync_verified','Production stage and candidate-to-ca_items sync verified: 1 item on 2026-10-25. All items remain pending editorial review.'),
  ('MOSPI','https://mospi.gov.in/latest-releases','mospi.gov.in,www.mospi.gov.in','Economy','pending_validation','Enabled for official-page polling. Latest dry-run saw a shell without article links; no item will stage without verifiable article content/date.'),
  ('NITI_AAYOG','https://www.niti.gov.in/?type=press_releases','niti.gov.in,www.niti.gov.in','Economy','pending_validation','Enabled for official-page polling. Listing links include PIB/PDF items; source attribution and article content/date must be verified before staging.'),
  ('SEBI','https://www.sebi.gov.in/','www.sebi.gov.in','Economy','sync_verified','Production stage and candidate-to-ca_items sync verified: 1 item on 2026-10-25. All items remain pending editorial review.')
) as v(source_key,feed_url,allowed_host,category,integration_status,integration_notes)
where s.source_key=v.source_key;
