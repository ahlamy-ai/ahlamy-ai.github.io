# LEADORA Website Assistant backend draft

These are source drafts only. They are not deployed and do not alter the production database.

## Files
- \`schema.sql\`: tenant-scoped tables, RLS policies, Enterprise entitlement gate, and rate-limit RPC.
- \`supabase/functions/leadora-site-assistant/index.ts\`: server-side Gemini integration.

## Required Edge Function secrets
- \`GEMINI_API_KEY\`: create in Google AI Studio and add only to Supabase Edge Function secrets.
- Optional \`GEMINI_MODEL\`: defaults to \`gemini-2.5-flash\`.
- Supabase hosted Edge Functions provide \`SUPABASE_URL\` and \`SUPABASE_SECRET_KEYS\`. Never expose the secret key in the browser.

## Deployment sequence
1. Create a separate development database or safe test project.
2. Review and apply \`schema.sql\` there; verify all tables have RLS.
3. Add an assistant config and approved website origin for a test tenant.
4. Set the Gemini key as an Edge Function secret.
5. Deploy with JWT verification disabled only after reviewing the public-ID, origin, Enterprise-plan, and rate-limit checks.
6. Test tenant isolation, unauthorized origins, non-Enterprise subscriptions, rate limits, empty knowledge, and provider failures.
7. Consider production rollout only after tests pass.

## Current limits
- Text knowledge only.
- No visitor contact capture or CRM lead creation yet.
- No assistant settings page yet.
- Google states that free-tier Gemini content may be used to improve its products. Do not send confidential client data through the free tier without reviewing current terms and obtaining appropriate consent.
- The widget is not ready for customer use until backend setup and end-to-end tests are complete.
