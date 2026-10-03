# SSC Practice App
Next.js + Supabase SSC Stenographer practice platform.

## Environment variables
Create `.env.local` locally or configure these in hosting:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not commit service-role keys or database passwords.

## Current V1
- Landing page
- Supabase email/password authentication
- Student dashboard
- Published-test listing
- Test question UI
- Result/solution-lock shell

## Next backend step
Create/publish a daily test and populate `test_questions`, then add secure attempt scoring and solution-release RPCs.
