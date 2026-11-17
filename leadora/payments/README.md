# LEADORA AI billing integration

## Current implementation: PayPal Sandbox subscriptions

The recurring billing backend is deployed to the **LEADORA AI Supabase project only**.

- Edge Function: `paypal-subscriptions`
- Project ref: `abqgzquhuzxggmgqgcdf`
- Function URL: `https://abqgzquhuzxggmgqgcdf.supabase.co/functions/v1/paypal-subscriptions`
- Mode: Sandbox only
- GitHub source: `leadora/payments/paypal-subscriptions/index.ts`
- Workspace checkout UI: `leadora/dashboard.html#billing`

The public function GET health response has confirmed that both Sandbox credential variables are present. It does not expose the secret.

### Sandbox plans

The first authenticated workspace visit calls the `bootstrap` action. The function creates the LEADORA product, creates and activates three monthly plans if missing, and attempts to register the PayPal webhook.

| Plan | Recurring price |
|---|---:|
| Starter | EUR 9.00 / month |
| Pro | EUR 19.00 / month |
| Business | EUR 49.00 / month |

Each plan uses an unlimited monthly regular billing cycle. The PayPal JavaScript SDK uses `vault=true` and `intent=subscription`.

### Implemented actions

- `bootstrap`: create/activate Sandbox catalog plans and register webhook.
- `eligibility`: prevent a second active/pending subscription for the same LEADORA user.
- `confirm`: retrieve the subscription from PayPal, verify its plan and custom user ID, then link it to the signed-in Supabase user.
- `status`: refresh status from PayPal and return the user's subscriptions.
- `cancel`: cancel the subscriber's own PayPal subscription.
- Webhook receiver: verifies PayPal signatures and handles subscription activation, update, cancellation, suspension, expiry and payment events.

Subscription records are stored in `public.lead_subscriptions`; webhook event IDs are deduplicated in `public.paypal_webhook_events`. RLS is enabled, and the user-facing subscription table only grants authenticated users read access to their own rows. Server-side writes use the Supabase secret key.

### Sandbox test procedure

1. Open `https://ahlamy-ai.github.io/leadora/dashboard.html#billing`.
2. Sign in with a real LEADORA test account (or create your own account).
3. Wait for the dashboard to create/activate the Sandbox plans and register the webhook.
4. Choose one plan and approve it using a **Sandbox personal/buyer account**, not the Sandbox merchant account.
5. Confirm the subscription appears under “Your subscriptions” and its status changes to ACTIVE.
6. In PayPal Developer Dashboard → Sandbox → Event Logs, verify the subscription and payment events.
7. Test cancellation and confirm future billing is stopped.

No customer account has been created or used by the implementation team, and no purchase has been made on your behalf. A human Sandbox approval is still required to prove end-to-end checkout.

### Important limitations

- This is not Live billing. No real money can be collected through this Sandbox integration.
- A successful deployment and presence of credentials do not prove that the PayPal merchant account is eligible for Live subscriptions.
- The GitHub Pages checkout and the Edge Function must both be tested in a signed-in browser before launch.
- Feature limits and plan entitlements are not yet enforced in the CRM. Do not advertise AI functionality or plan limits that have not been built.
- No card collection through Paysera is enabled. Paysera requires its own merchant eligibility review and supporting company documents.
- Refunds and a complete accounting/payment ledger are not implemented. Handle refunds only through PayPal until a reviewed refund workflow is built.
- A legal business registration, tax compliance, customer terms, privacy notice and refund/cancellation disclosures still need to be completed before taking real payments.
- Never commit PayPal secrets, Supabase secret keys, IBAN, SWIFT/BIC or private banking information to this public repository.

## Secrets

Keep these only in the LEADORA Supabase project's Edge Function Secrets:

- `PAYPAL_CLIENT_ID` — Sandbox app client ID
- `PAYPAL_CLIENT_SECRET` — Sandbox app secret

Never place the Secret in GitHub, HTML, JavaScript, email or chat. Do not replace these with Live credentials until the legal and PayPal eligibility checks are complete and the owner explicitly approves a separate Live launch.
