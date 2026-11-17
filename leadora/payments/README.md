# LEADORA AI payment integration — preparation

## PayPal Sandbox

The Edge Function source is in `paypal-checkout/index.ts`. It is deliberately **not deployed yet** and does not accept live money.

Before deployment, add these two values in the LEADORA Supabase project only:

- `PAYPAL_CLIENT_ID` — Sandbox app client ID
- `PAYPAL_CLIENT_SECRET` — Sandbox app secret

Use Supabase Dashboard → Edge Functions → Secrets. Do not put the secret in GitHub, HTML, JavaScript, email, or chat.

Then deploy this function as `paypal-checkout` to the LEADORA Supabase project:
`abqgzquhuzxggmgqgcdf`

The function is sandbox-only and has a fixed server-side plan allowlist:
- starter: EUR 9.00
- pro: EUR 19.00
- business: EUR 49.00

It exposes GET configuration (public client ID only), POST `create-order`, and POST `capture-order`. The capture handler checks the order's plan code, amount, and currency before capture.

## Important limitations before launch

- This is a one-time checkout for a plan price. It does **not** create an automatically recurring subscription.
- No production/live credentials are used.
- No PayPal webhook, refund flow, subscription lifecycle, customer billing portal, or payment ledger is implemented yet.
- After deployment, the browser must load the PayPal JavaScript SDK using the public client ID returned by GET, then call the function to create and capture orders.
- Complete sandbox end-to-end tests before considering any live setup.
- Never claim card payments through Paysera are enabled unless Paysera separately approves the merchant and integration.

## Bank transfer

Bank transfer remains a private/manual option. Do not commit IBAN, SWIFT/BIC, account-holder details, or other banking information to this public repository. Share bank details only through a verified private channel after the order and customer are confirmed.
