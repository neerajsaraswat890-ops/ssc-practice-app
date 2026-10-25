-- Testing Current Affairs adapter configuration patch.
-- Apply only to Supabase Testing project gfoyzlbehikcxfluznvq.
-- Official fallback domains use exact-host allowlist entries; redirects and access controls remain enforced.
-- Existing enabled flags, schedules, candidate rows, and review states are preserved.
update public.ca_sources
set allowed_host = case source_key
  when 'DRDO' then 'drdo.gov.in,www.drdo.gov.in,pib.gov.in'
  when 'FIFA' then 'www.fifa.com,inside.fifa.com'
  when 'MOSPI' then 'mospi.gov.in,www.mospi.gov.in,pib.gov.in'
  when 'NITI_AAYOG' then 'niti.gov.in,www.niti.gov.in,pib.gov.in'
  else allowed_host
end,
integration_notes = case source_key
  when 'DRDO' then 'Testing only; never auto-publish. Official DRDO pages primary; PIB Defence releases are an official fallback.'
  when 'FIFA' then 'Testing only; never auto-publish. FIFA news primary; Inside FIFA media releases are an official fallback.'
  when 'MOSPI' then 'Testing only; never auto-publish. Official MoSPI pages primary; PIB statistics releases fallback with MoSPI headline filter.'
  when 'NITI_AAYOG' then 'Testing only; never auto-publish. Official NITI Aayog pages primary; PIB NITI Aayog releases are an official fallback.'
  else integration_notes
end
where source_key in ('DRDO','FIFA','MOSPI','NITI_AAYOG');
