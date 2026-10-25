-- Production Current Affairs adapter configuration patch.
-- Apply only to Supabase Production project rbdgphbolfyqvmymnoyi.
-- Official fallback domains are exact-host allowlist entries; no redirects/access controls are bypassed.
-- Existing source rows, enabled flags, schedules, and candidate review statuses are preserved.
update public.ca_sources
set allowed_host = case source_key
  when 'DRDO' then 'drdo.gov.in,www.drdo.gov.in,pib.gov.in'
  when 'MOSPI' then 'mospi.gov.in,www.mospi.gov.in,pib.gov.in'
  when 'NITI_AAYOG' then 'niti.gov.in,www.niti.gov.in,pib.gov.in'
  when 'FIFA' then 'www.fifa.com,inside.fifa.com'
end,
integration_notes = case source_key
  when 'DRDO' then 'Official DRDO pages remain primary; PIB Ministry of Defence listing added as same-host-validated fallback. Await live stage and candidate sync verification.'
  when 'MOSPI' then 'Official MoSPI pages remain primary; PIB official release listing added as same-host-validated fallback with MoSPI topic headline filter. Await live stage and candidate sync verification.'
  when 'NITI_AAYOG' then 'Official NITI Aayog pages remain primary; PIB NITI Aayog releases added as same-host-validated fallback with title filter. Await live stage and candidate sync verification.'
  when 'FIFA' then 'FIFA.com news remains primary; Inside FIFA official media releases added as same-host-validated fallback. Await live stage and candidate sync verification.'
end
where source_key in ('DRDO','MOSPI','NITI_AAYOG','FIFA');
