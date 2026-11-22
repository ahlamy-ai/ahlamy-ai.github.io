# LEADORA Website Assistant — isolated development branch

This is a development-only scaffold. It does not change the live LEADORA site, production database, billing, or AHLAMY.

## Current file
- \`leadora/assistant/widget.js\`: standalone, dependency-free chat launcher with Arabic/French/English UI, Shadow DOM isolation, safe text rendering, and a POST contract for the future LEADORA Edge Function.

## Embed contract (inactive until backend deployment)
\`\`\`html
<script src="https://ahlamy-ai.github.io/leadora/assistant/widget.js"
        data-assistant-id="PUBLIC_ASSISTANT_ID"
        data-language="en" defer></script>
\`\`\`
The assistant ID must be a random public identifier, not a tenant UUID or secret.

Request body:
\`\`\`json
{"assistant_id":"PUBLIC_ASSISTANT_ID","message":"Visitor message","conversation_id":null,"language":"en"}
\`\`\`
Expected response:
\`\`\`json
{"reply":"Assistant response","conversation_id":"opaque-conversation-id"}
\`\`\`

## Required backend before customer use
1. Add tenant-scoped assistant configuration, knowledge, conversations, and messages with RLS.
2. Resolve the public assistant ID server-side; never trust a tenant ID supplied by the browser.
3. Check an active Enterprise subscription on every request using existing workspace entitlement logic.
4. Add server-side rate limits, input limits, origin controls, and abuse protection.
5. Keep AI provider and Supabase secret keys in Edge Function secrets only.
6. Save visitor leads through a validated server-side path.
7. Configure an AI provider. The widget alone does not provide AI responses.

## Free-first plan
Use existing GitHub Pages and Supabase Free while within current quotas. AI inference may require a provider account/key and is subject to that provider's free-tier limits; unlimited free AI usage is not promised.

## Verification
- Widget source committed to this branch only.
- Not deployed to GitHub Pages.
- Edge Function not created or deployed.
- No database schema changed.
- No AI provider key configured.
- Not yet end-to-end tested.
