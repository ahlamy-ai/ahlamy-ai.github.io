# LEADORA AI payment checkout

## Current implementation: compact PayPal Sandbox checkout

The workspace now uses a small, single-plan checkout instead of three recurring subscription cards.

- Edge Function: `paypal-checkout`
- Project ref: `abqgzquhuzxggmgqgcdf`
- Function URL: `https://abqgzquhuzxggmgqgcdf.supabase.co/functions/v1/paypal-checkout`
- Mode: Sandbox only
- GitHub source: `leadora/payments/paypal-checkout/index.ts`
- Workspace checkout UI: `leadora/dashboard.html#billing`

### Plans and payment model

| Plan | Price | Access |
|---|---:|---|
| Starter | EUR 9 | 30 days |
| Pro | EUR 19 | 30 days |
| Business | EUR 49 | 30 days |

A customer selects one plan and makes one payment. There is no automatic renewal; the customer pays again manually when the 30-day period ends. The page shows a PayPal button and shows a debit/credit card button only if PayPal's SDK marks card funding eligible for the current seller and buyer.

### Security and records

- The Edge Function verifies the Supabase access token against Auth before handling any payment request.
- Plan prices are fixed server-side; the browser cannot set an arbitrary amount.
- The function retrieves the PayPal order and verifies its user reference, plan and exact EUR amount before capturing.
- Captured payments are recorded in `public.lead_subscriptions` with `billing_type='one_time'`, a unique PayPal order ID and an access expiry.
- RLS remains enabled. Authenticated users can read only their own billing rows; all payment writes are server-side.
- PayPal and Supabase secret credentials stay in Edge Function secrets only.

### Test procedure

1. Open `https://ahlamy-ai.github.io/leadora/dashboard.html#billing`.
2. Sign in to the LEADORA workspace.
3. Choose Starter, Pro or Business.
4. Use a PayPal Sandbox buyer account to complete a test payment. If PayPal offers a card option in Sandbox for this buyer/seller combination, it appears as a separate card button.
5. Confirm the success message and the new row under Payment history.

### Important limitations

- This is Sandbox only. No real money is collected.
- Card availability is controlled by PayPal's seller/buyer eligibility and account settings. A card button is not guaranteed to appear.
- This is a one-time payment flow, not a recurring subscription. No automatic monthly charge occurs.
- Plan feature limits are not enforced in the CRM yet; do not advertise features or limits that are not implemented.
- Paysera card collection is not enabled. Its eligibility requirements and the business registration documents still need to be reviewed with Paysera.
- PayPal Live eligibility, withdrawal to Paysera, tax treatment, business registration, customer terms, privacy and refund/cancellation disclosures must be checked before a real-money launch.
- Never commit PayPal secrets, Supabase secret keys, IBAN, SWIFT/BIC or private banking information to this public repository.
