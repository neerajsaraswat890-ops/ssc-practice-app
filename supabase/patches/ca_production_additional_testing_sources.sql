-- Adds the remaining sources from the existing Testing active-source set to Production.
-- Existing disabled/restricted sources are intentionally not included.
-- All rows remain pending_validation until a real production stage and ca_items sync is confirmed.

insert into public.ca_sources
 (source_key,source_name,feed_url,allowed_host,category,enabled,max_items,integration_type,integration_status,integration_notes)
values
 ('AKFI','Amateur Kabaddi Federation of India','https://www.indiankabaddi.org/','www.indiankabaddi.org','Sports',true,20,'web_adapter','pending_validation','Enabled from the existing Testing source set. Date/content eligibility has not yet been verified; manual review required.'),
 ('KHELO_INDIA','Khelo India','https://www.kheloindia.gov.in/latestnews.html','www.kheloindia.gov.in','Sports',true,20,'web_adapter','pending_validation','Enabled from the existing Testing source set. Current dry-runs have not produced an eligible item; manual review required.'),
 ('MIN_SPORTS','Ministry of Youth Affairs and Sports','https://yas.gov.in/latest-news','yas.gov.in,www.yas.gov.in','Sports',true,20,'web_adapter','pending_validation','Enabled from the existing Testing source set. Listing fetch/parse has not produced an eligible item; manual review required.')
on conflict (source_key) do update set
 source_name=excluded.source_name,feed_url=excluded.feed_url,allowed_host=excluded.allowed_host,
 category=excluded.category,enabled=excluded.enabled,max_items=excluded.max_items,
 integration_type=excluded.integration_type,integration_status='pending_validation',
 integration_notes=excluded.integration_notes;

update public.ca_sources as s
set feed_url=v.feed_url,allowed_host=v.allowed_host,category=v.category,enabled=true,
    integration_type='web_adapter',integration_status='pending_validation',integration_notes=v.integration_notes
from (values
 ('APEDA','https://apeda.gov.in/','apeda.gov.in','GI Tags','Enabled from the existing Testing source set. Current dry-runs have not produced an eligible item; only dated official articles can stage.'),
 ('ECI','https://www.eci.gov.in/964-press-releases','www.eci.gov.in','National','Enabled from the existing Testing source set. Current page requires JavaScript rendering; no item stages without accessible article content/date.'),
 ('GI_REGISTRY','https://search.ipindia.gov.in/GIRPublic/','search.ipindia.gov.in','GI Tags','Enabled from the existing Testing source set. Current dry-runs have not produced an eligible item.'),
 ('IMF','https://www.imf.org/','www.imf.org','Economy','Enabled for official-page polling. Existing fetch returned HTTP 403; no access barrier is bypassed and no item stages without a successful official fetch.'),
 ('INDIA_PORTAL','https://www.india.gov.in/','www.india.gov.in','National','Enabled from the existing Testing source set. Current page has not provided an eligible dated article.'),
 ('IOC','https://olympics.com/ioc/theme-press-releases','olympics.com,newsroom.olympics.com','Sports','Enabled from the existing Testing source set. Existing fetch returned HTTP 403; no access barrier is bypassed.'),
 ('MIN_CULTURE','https://www.indiaculture.gov.in/archives-press-release','indiaculture.gov.in,www.indiaculture.gov.in','Culture','Enabled from the existing Testing source set. Current listing fetch has not produced an eligible item.'),
 ('NOBEL','https://www.nobelprize.org/','www.nobelprize.org','Awards','Enabled from the existing Testing source set. Current dry-runs have not produced an eligible dated article.'),
 ('UNFCCC','https://unfccc.int/news?sort_by=created&sort_order=DESC','unfccc.int','Environment','Enabled from the existing Testing source set. Current dry-runs have returned an empty upstream response; no item stages without content.')
) as v(source_key,feed_url,allowed_host,category,integration_notes)
where s.source_key=v.source_key;
