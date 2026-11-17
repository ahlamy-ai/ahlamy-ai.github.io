import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
const SITE_ORIGIN = "https://ahlamy-ai.github.io";
const FUNCTION_URL = "https://abqgzquhuzxggmgqgcdf.supabase.co/functions/v1/paypal-subscriptions";
const CURRENCY = "EUR";
const PLANS = {
  starter: { amount: "9.00", name: "LEADORA AI Starter — Monthly" },
  pro: { amount: "19.00", name: "LEADORA AI Pro — Monthly" },
  business: { amount: "49.00", name: "LEADORA AI Business — Monthly" },
} as const;

type PlanKey = keyof typeof PLANS;

const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envJsonKey(name: string): string | null {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  try {
    const values = JSON.parse(raw);
    return values.default || Object.values(values)[0] || null;
  } catch {
    return null;
  }
}

function supabaseServiceHeaders(prefer?: string): HeadersInit {
  const key = envJsonKey("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVER_KEY_MISSING");
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };
  // Legacy service-role keys are JWTs. New sb_secret keys must only be sent as apikey.
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function dbRequest(path: string, method = "GET", body?: unknown, prefer?: string) {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("SUPABASE_URL_MISSING");
  const response = await fetch(base + "/rest/v1/" + path, {
    method,
    headers: supabaseServiceHeaders(prefer),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    console.error("Supabase billing storage error", response.status, data?.code || "unknown");
    throw new Error("BILLING_STORAGE_FAILED");
  }
  return data;
}

async function authenticate(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const base = Deno.env.get("SUPABASE_URL");
  const publishable = envJsonKey("SUPABASE_PUBLISHABLE_KEYS") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !publishable) return null;
  const response = await fetch(base + "/auth/v1/user", {
    headers: { apikey: publishable, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user.id === "string" ? user.id : null;
}

async function paypalToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) throw new Error("PAYPAL_SANDBOX_CREDENTIALS_MISSING");
  const response = await fetch(PAYPAL_BASE + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(clientId + ":" + secret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("PAYPAL_AUTH_FAILED");
  const data = await response.json();
  return data.access_token;
}

async function paypalApi(path: string, method = "GET", body?: unknown, requestId?: string) {
  const token = await paypalToken();
  const headers: Record<string, string> = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const response = await fetch(PAYPAL_BASE + path, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const detailSummary = Array.isArray(data?.details)
      ? data.details.slice(0, 8).map((item: any) => ({
        field: item.field || null,
        issue: item.issue || null,
        description: item.description || null,
      }))
      : [];
    console.error(
      "PayPal Sandbox API error",
      response.status,
      data?.name || "unknown",
      data?.debug_id || "",
      JSON.stringify(detailSummary),
    );
    throw new Error("PAYPAL_API_" + response.status + "_" + (data?.name || "ERROR"));
  }
  return data;
}

async function getConfig() {
  const rows = await dbRequest("paypal_billing_config?singleton=eq.true&select=*", "GET");
  return rows?.[0] || { singleton: true };
}

async function saveConfig(config: Record<string, unknown>) {
  await dbRequest(
    "paypal_billing_config?on_conflict=singleton",
    "POST",
    { ...config, singleton: true, updated_at: new Date().toISOString() },
    "resolution=merge-duplicates,return=minimal",
  );
}

async function ensureCatalog() {
  const config = await getConfig();
  if (!config.product_id) {
    const product = await paypalApi(
      "/v1/catalogs/products",
      "POST",
      {
        name: "LEADORA AI",
        description: "AI-powered lead management and customer follow-up software",
        type: "SERVICE",
        category: "SOFTWARE",
        home_url: "https://ahlamy-ai.github.io/leadora/",
      },
      "LEADORA-SBX-PRODUCT-V1",
    );
    config.product_id = product.id;
    await saveConfig(config);
  }

  for (const key of Object.keys(PLANS) as PlanKey[]) {
    const field = key + "_plan_id";
    if (!config[field]) {
      const plan = await paypalApi(
        "/v1/billing/plans",
        "POST",
        {
          product_id: config.product_id,
          name: PLANS[key].name,
          description: "Automatically renews every month until cancelled.",
          billing_cycles: [{
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: PLANS[key].amount, currency_code: CURRENCY },
            },
          }],
          payment_preferences: {
            auto_bill_outstanding: true,
            payment_failure_threshold: 1,
          },
        },
        "LEADORA-SBX-PLAN-" + key.toUpperCase() + "-V1",
      );
      config[field] = plan.id;
      await saveConfig(config);
    }
    const planDetails = await paypalApi("/v1/billing/plans/" + encodeURIComponent(config[field]), "GET");
    if (planDetails.status !== "ACTIVE") {
      await paypalApi("/v1/billing/plans/" + encodeURIComponent(config[field]) + "/activate", "POST", {});
    }
  }

  if (!config.webhook_id) {
    try {
      const availableEvents = await paypalApi("/v1/notifications/webhooks-event-types", "GET");
      const availableNames = new Set(
        (availableEvents?.event_types || [])
          .map((event: any) => event.name)
          .filter((name: unknown): name is string => typeof name === "string"),
      );
      const requestedNames = [
        "BILLING.SUBSCRIPTION.CREATED",
        "BILLING.SUBSCRIPTION.ACTIVATED",
        "BILLING.SUBSCRIPTION.UPDATED",
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.SUSPENDED",
        "BILLING.SUBSCRIPTION.EXPIRED",
        "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        "BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED",
        "PAYMENT.SALE.COMPLETED",
        "PAYMENT.SALE.REFUNDED",
        "PAYMENT.SALE.REVERSED",
      ];
      const eventTypes = requestedNames
        .filter((name) => availableNames.has(name))
        .map((name) => ({ name }));
      const requiredEvents = [
        "BILLING.SUBSCRIPTION.ACTIVATED",
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      ];
      if (requiredEvents.some((name) => !availableNames.has(name))) {
        throw new Error("PAYPAL_WEBHOOK_REQUIRED_EVENTS_UNAVAILABLE");
      }

      const webhook = await paypalApi(
        "/v1/notifications/webhooks",
        "POST",
        {
          url: FUNCTION_URL,
          event_types: eventTypes,
        },
        "LEADORA-SBX-WEBHOOK-V2",
      );
      config.webhook_id = webhook.id;
      await saveConfig(config);
    } catch (error) {
      console.error("Webhook registration did not complete", error);
    }
  }

  return config;
}

async function handleWebhook(req: Request, rawBody: string) {
  const event = JSON.parse(rawBody);
  const config = await getConfig();
  if (!config.webhook_id) return reply({ error: "Sandbox webhook is not registered yet" }, 503);

  const verification = await paypalApi("/v1/notifications/verify-webhook-signature", "POST", {
    auth_algo: req.headers.get("paypal-auth-algo"),
    cert_url: req.headers.get("paypal-cert-url"),
    transmission_id: req.headers.get("paypal-transmission-id"),
    transmission_sig: req.headers.get("paypal-transmission-sig"),
    transmission_time: req.headers.get("paypal-transmission-time"),
    webhook_id: config.webhook_id,
    webhook_event: event,
  });
  if (verification.verification_status !== "SUCCESS") {
    return reply({ error: "Invalid PayPal webhook signature" }, 400);
  }

  const prior = await dbRequest(
    "paypal_webhook_events?event_id=eq." + encodeURIComponent(event.id) + "&select=event_id",
    "GET",
  );
  if (prior?.length) return reply({ received: true, duplicate: true });

  const type = String(event.event_type || "");
  const resource = event.resource || {};
  let subscriptionId = resource.id || null;
  let patch: Record<string, unknown> = {};

  if (type === "PAYMENT.SALE.COMPLETED" || type === "BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED") {
    subscriptionId = resource.billing_agreement_id || resource.subscription_id || resource.id || null;
    patch = { last_payment_at: resource.create_time || event.create_time || new Date().toISOString(), status: "ACTIVE" };
  } else if (type === "PAYMENT.SALE.REFUNDED" || type === "PAYMENT.SALE.REVERSED") {
    subscriptionId = resource.billing_agreement_id || resource.subscription_id || null;
    patch = { status: "PAYMENT_FAILED" };
  } else if (type === "BILLING.SUBSCRIPTION.ACTIVATED") {
    patch = {
      status: "ACTIVE",
      started_at: resource.start_time || new Date().toISOString(),
      next_billing_at: resource.billing_info?.next_billing_time || null,
    };
  } else if (type === "BILLING.SUBSCRIPTION.UPDATED") {
    patch = {
      status: resource.status || "UNKNOWN",
      next_billing_at: resource.billing_info?.next_billing_time || null,
    };
  } else if (type === "BILLING.SUBSCRIPTION.CANCELLED") {
    patch = { status: "CANCELLED", cancelled_at: new Date().toISOString() };
  } else if (type === "BILLING.SUBSCRIPTION.SUSPENDED") {
    patch = { status: "SUSPENDED" };
  } else if (type === "BILLING.SUBSCRIPTION.EXPIRED") {
    patch = { status: "EXPIRED" };
  } else if (type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
    patch = { status: "PAYMENT_FAILED" };
  }

  if (subscriptionId && Object.keys(patch).length) {
    await dbRequest(
      "lead_subscriptions?paypal_subscription_id=eq." + encodeURIComponent(subscriptionId),
      "PATCH",
      { ...patch, updated_at: new Date().toISOString() },
      "return=minimal",
    );
  }

  await dbRequest(
    "paypal_webhook_events?on_conflict=event_id",
    "POST",
    {
      event_id: String(event.id),
      event_type: type || "UNKNOWN",
      resource_id: subscriptionId,
    },
    "resolution=ignore-duplicates,return=minimal",
  );
  return reply({ received: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const origin = req.headers.get("origin");
  if (origin && origin !== SITE_ORIGIN && origin !== "http://localhost:3000") {
    return reply({ error: "Origin not allowed" }, 403);
  }

  if (req.method === "GET") {
    return reply({
      service: "LEADORA AI PayPal Subscriptions",
      mode: "sandbox",
      credentialsPresent: Boolean(Deno.env.get("PAYPAL_CLIENT_ID") && Deno.env.get("PAYPAL_CLIENT_SECRET")),
    });
  }
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const rawBody = await req.text();
  if (req.headers.has("paypal-transmission-id")) {
    try { return await handleWebhook(req, rawBody); }
    catch (error) {
      console.error("PayPal webhook processing failed", error);
      return reply({ error: "Webhook verification or processing failed" }, 500);
    }
  }

  let input: any;
  try { input = JSON.parse(rawBody); }
  catch { return reply({ error: "Invalid JSON" }, 400); }

  const userId = await authenticate(req);
  if (!userId) return reply({ error: "Please sign in to your LEADORA account." }, 401);

  try {
    if (input.action === "bootstrap") {
      const config = await ensureCatalog();
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      return reply({
        mode: "sandbox",
        clientId,
        currency: CURRENCY,
        plans: {
          starter: config.starter_plan_id,
          pro: config.pro_plan_id,
          business: config.business_plan_id,
        },
        webhookRegistered: Boolean(config.webhook_id),
        webhookSetupNote: config.webhook_id ? null : "Webhook registration may require additional PayPal account permissions.",
      });
    }

    if (input.action === "confirm") {
      const subscriptionId = String(input.subscriptionId || "");
      if (!/^I-[A-Z0-9]+$/i.test(subscriptionId)) return reply({ error: "Invalid subscription ID" }, 400);
      const config = await getConfig();
      const sub = await paypalApi("/v1/billing/subscriptions/" + encodeURIComponent(subscriptionId), "GET");
      if (sub.custom_id !== userId) return reply({ error: "Subscription does not belong to this LEADORA account." }, 403);

      const planEntry = (Object.keys(PLANS) as PlanKey[]).find((key) => config[key + "_plan_id"] === sub.plan_id);
      if (!planEntry) return reply({ error: "Unknown LEADORA subscription plan." }, 400);
      if (!["ACTIVE", "APPROVAL_PENDING", "APPROVED"].includes(sub.status)) {
        return reply({ error: "PayPal has not approved this subscription.", status: sub.status }, 409);
      }

      const existing = await dbRequest(
        "lead_subscriptions?paypal_subscription_id=eq." + encodeURIComponent(subscriptionId) + "&select=user_id",
        "GET",
      );
      if (existing?.[0]?.user_id && existing[0].user_id !== userId) {
        return reply({ error: "This subscription is already linked to another account." }, 409);
      }

      const row = {
        user_id: userId,
        paypal_subscription_id: subscriptionId,
        paypal_plan_id: sub.plan_id,
        plan_key: planEntry,
        status: sub.status,
        amount: PLANS[planEntry].amount,
        currency: CURRENCY,
        payer_id: sub.subscriber?.payer_id || null,
        started_at: sub.start_time || null,
        next_billing_at: sub.billing_info?.next_billing_time || null,
        updated_at: new Date().toISOString(),
      };
      await dbRequest(
        "lead_subscriptions?on_conflict=paypal_subscription_id",
        "POST",
        row,
        "resolution=merge-duplicates,return=minimal",
      );
      return reply({ success: true, status: sub.status, plan: planEntry });
    }

    if (input.action === "eligibility") {
      const rows = await dbRequest(
        "lead_subscriptions?user_id=eq." + encodeURIComponent(userId) +
        "&billing_type=eq.recurring&status=in.(ACTIVE,APPROVED,APPROVAL_PENDING)&select=paypal_subscription_id,plan_key,status&limit=1",
        "GET",
      );
      return reply({ allowed: !rows?.length, existing: rows?.[0] || null });
    }

    if (input.action === "status") {
      const rows = await dbRequest(
        "lead_subscriptions?user_id=eq." + encodeURIComponent(userId) + "&billing_type=eq.recurring&select=paypal_subscription_id,plan_key,status,amount,currency,started_at,next_billing_at,last_payment_at,cancelled_at,created_at&order=created_at.desc&limit=10",
        "GET",
      );
      const refreshed = [];
      for (const row of rows || []) {
        try {
          const current = await paypalApi("/v1/billing/subscriptions/" + encodeURIComponent(row.paypal_subscription_id), "GET");
          const next = {
            status: current.status || row.status,
            next_billing_at: current.billing_info?.next_billing_time || null,
            updated_at: new Date().toISOString(),
          };
          await dbRequest(
            "lead_subscriptions?paypal_subscription_id=eq." + encodeURIComponent(row.paypal_subscription_id),
            "PATCH",
            next,
            "return=minimal",
          );
          refreshed.push({ ...row, ...next });
        } catch (error) {
          console.error("Subscription status refresh failed", row.paypal_subscription_id, error);
          refreshed.push(row);
        }
      }
      return reply({ subscriptions: refreshed });
    }

    if (input.action === "cancel") {
      const subscriptionId = String(input.subscriptionId || "");
      if (!/^I-[A-Z0-9]+$/i.test(subscriptionId)) return reply({ error: "Invalid subscription ID" }, 400);
      const rows = await dbRequest(
        "lead_subscriptions?user_id=eq." + encodeURIComponent(userId) +
        "&paypal_subscription_id=eq." + encodeURIComponent(subscriptionId) +
        "&select=paypal_subscription_id,status",
        "GET",
      );
      if (!rows?.length) return reply({ error: "Subscription not found for this account." }, 404);
      if (rows[0].status !== "ACTIVE" && rows[0].status !== "APPROVAL_PENDING") {
        return reply({ error: "This subscription cannot be cancelled in its current state." }, 409);
      }
      await paypalApi(
        "/v1/billing/subscriptions/" + encodeURIComponent(subscriptionId) + "/cancel",
        "POST",
        { reason: "Cancelled by the subscriber in LEADORA AI." },
      );
      await dbRequest(
        "lead_subscriptions?paypal_subscription_id=eq." + encodeURIComponent(subscriptionId),
        "PATCH",
        { status: "CANCELLED", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        "return=minimal",
      );
      return reply({ success: true, status: "CANCELLED" });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected billing error";
    const safe = message.includes("CREDENTIALS_MISSING")
      ? "PayPal Sandbox credentials are missing."
      : message.includes("AUTH_FAILED")
      ? "PayPal Sandbox authentication failed. Check the Sandbox Client ID and Secret."
      : message.startsWith("PAYPAL_API_")
      ? "PayPal Sandbox rejected a subscription setup request. Check the PayPal account permissions and Developer Event Logs."
      : message.includes("SUPABASE")
      ? "Supabase server configuration is incomplete."
      : "The billing request could not be completed.";
    return reply({ error: safe }, 502);
  }
});
