import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PAYPAL_ENV = (Deno.env.get("PAYPAL_ENV") || "").trim().toLowerCase();
const PAYPAL_BASE = "https://api-m.paypal.com";
const SITE_ORIGIN = "https://ahlamy-ai.github.io";
const CURRENCY = "EUR";
const PLANS = {
  starter: { amount: "9.00", label: "Starter" },
  pro: { amount: "19.00", label: "Pro" },
  business: { amount: "49.00", label: "Business" },
} as const;

type PlanKey = keyof typeof PLANS;
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function envJsonKey(name: string): string | null {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  try { const values = JSON.parse(raw); return values.default || Object.values(values)[0] || null; } catch { return null; }
}
function supabaseServiceHeaders(prefer?: string): HeadersInit {
  const key = envJsonKey("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVER_KEY_MISSING");
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  if (prefer) headers.Prefer = prefer;
  return headers;
}
async function dbRequest(path: string, method = "GET", body?: unknown, prefer?: string) {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("SUPABASE_URL_MISSING");
  const response = await fetch(base + "/rest/v1/" + path, { method, headers: supabaseServiceHeaders(prefer), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text(); let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) { console.error("Payment storage error", response.status, data?.code || "unknown"); throw new Error("PAYMENT_STORAGE_FAILED"); }
  return data;
}
async function authenticate(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const base = Deno.env.get("SUPABASE_URL");
  const publishable = envJsonKey("SUPABASE_PUBLISHABLE_KEYS") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !publishable) return null;
  const response = await fetch(base + "/auth/v1/user", { headers: { apikey: publishable, Authorization: authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user.id === "string" ? user.id : null;
}
async function paypalToken(): Promise<string> {
  if (PAYPAL_ENV !== "live") throw new Error("PAYPAL_LIVE_MODE_REQUIRED");
  const clientId = Deno.env.get("PAYPAL_LIVE_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_LIVE_CLIENT_SECRET");
  if (!clientId || !secret) throw new Error("PAYPAL_LIVE_CREDENTIALS_MISSING");
  const response = await fetch(PAYPAL_BASE + "/v1/oauth2/token", {
    method: "POST", headers: { Authorization: "Basic " + btoa(clientId + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("PAYPAL_AUTH_FAILED");
  return (await response.json()).access_token;
}
async function paypalApi(path: string, method = "GET", body?: unknown, requestId?: string) {
  const token = await paypalToken();
  const headers: Record<string, string> = { Authorization: "Bearer " + token, "Content-Type": "application/json", Accept: "application/json" };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const response = await fetch(PAYPAL_BASE + path, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text(); let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const details = Array.isArray(data?.details) ? data.details.slice(0, 5).map((item: any) => ({ field: item.field || null, issue: item.issue || null })) : [];
    console.error("PayPal Live checkout error", response.status, data?.name || "unknown", JSON.stringify(details));
    throw new Error("PAYPAL_API_" + response.status);
  }
  return data;
}
function addOneMonth(from: Date): Date {
  const result = new Date(from), day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay)); return result;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const origin = req.headers.get("origin");
  if (origin && origin !== SITE_ORIGIN && origin !== "http://localhost:3000") return reply({ error: "Origin not allowed" }, 403);
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const userId = await authenticate(req);
  if (!userId) return reply({ error: "Please sign in to your LEADORA account." }, 401);
  let input: any;
  try { input = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  try {
    if (PAYPAL_ENV !== "live") return reply({ error: "Live PayPal mode is not enabled. Set PAYPAL_ENV to live." }, 503);
    if (input.action === "bootstrap") {
      const clientId = Deno.env.get("PAYPAL_LIVE_CLIENT_ID");
      const secret = Deno.env.get("PAYPAL_LIVE_CLIENT_SECRET");
      if (!clientId || !secret) return reply({ error: "Live PayPal credentials are not configured." }, 503);
      await paypalToken();
      return reply({ mode: "live", clientId, currency: CURRENCY, billingType: "one_time_monthly" });
    }
    if (input.action === "create-order") {
      const plan = String(input.plan || "").toLowerCase() as PlanKey, selected = PLANS[plan];
      if (!selected) return reply({ error: "Choose a valid LEADORA plan." }, 400);
      const order = await paypalApi("/v2/checkout/orders", "POST", {
        intent: "CAPTURE",
        purchase_units: [{ custom_id: userId + ":" + plan, invoice_id: "LD-" + crypto.randomUUID(), description: "LEADORA AI " + selected.label + " plan — 30-day plan period", amount: { currency_code: CURRENCY, value: selected.amount } }],
        application_context: { brand_name: "LEADORA AI", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" },
      }, crypto.randomUUID());
      return reply({ id: order.id });
    }
    if (input.action === "capture-order") {
      const orderId = String(input.orderId || "");
      if (!/^[A-Z0-9-]{8,64}$/i.test(orderId)) return reply({ error: "Invalid payment reference." }, 400);
      const order = await paypalApi("/v2/checkout/orders/" + encodeURIComponent(orderId));
      const unit = order.purchase_units?.[0], customId = String(unit?.custom_id || "");
      const [orderUserId, planText] = customId.split(":");
      const plan = planText as PlanKey, selected = PLANS[plan];
      if (orderUserId !== userId) return reply({ error: "This payment belongs to a different LEADORA account." }, 403);
      if (!selected || unit?.amount?.currency_code !== CURRENCY || unit?.amount?.value !== selected.amount) return reply({ error: "The payment amount does not match the selected LEADORA plan." }, 400);
      const existing = await dbRequest("lead_subscriptions?paypal_order_id=eq." + encodeURIComponent(orderId) + "&user_id=eq." + encodeURIComponent(userId) + "&select=plan_key,status,access_until,amount,currency&limit=1");
      if (existing?.length) return reply({ status: "COMPLETED", plan: existing[0].plan_key, accessUntil: existing[0].access_until, alreadyRecorded: true });
      let captured = order;
      if (order.status === "APPROVED") captured = await paypalApi("/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture", "POST", {}, "LD-CAP-" + orderId);
      if (captured.status !== "COMPLETED") return reply({ error: "PayPal has not confirmed the payment yet." }, 409);
      const paidAt = new Date().toISOString();
      const latest = await dbRequest("lead_subscriptions?user_id=eq." + encodeURIComponent(userId) + "&billing_type=eq.one_time&status=eq.ACTIVE&access_until=gt." + encodeURIComponent(paidAt) + "&select=access_until&order=access_until.desc&limit=1");
      const previousExpiry = latest?.[0]?.access_until ? new Date(latest[0].access_until) : null;
      const startFrom = previousExpiry && previousExpiry.getTime() > Date.now() ? previousExpiry : new Date(paidAt);
      const accessUntil = addOneMonth(startFrom).toISOString();
      const payerId = captured.payer?.payer_id || order.payer?.payer_id || null;
      await dbRequest("lead_subscriptions?on_conflict=paypal_order_id", "POST", {
        user_id: userId, paypal_subscription_id: null, paypal_plan_id: null, paypal_order_id: orderId, billing_type: "one_time",
        plan_key: plan, status: "ACTIVE", amount: selected.amount, currency: CURRENCY, payer_id: payerId,
        started_at: paidAt, last_payment_at: paidAt, access_until: accessUntil, updated_at: paidAt,
      }, "resolution=ignore-duplicates,return=minimal");
      return reply({ status: "COMPLETED", plan, accessUntil, alreadyRecorded: false });
    }
    if (input.action === "status") {
      const rows = await dbRequest("lead_subscriptions?user_id=eq." + encodeURIComponent(userId) + "&billing_type=eq.one_time&select=paypal_order_id,plan_key,status,amount,currency,started_at,last_payment_at,access_until,created_at&order=created_at.desc&limit=10");
      return reply({ payments: rows || [] });
    }
    return reply({ error: "Unknown payment action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected checkout error";
    const safe = message.includes("CREDENTIALS_MISSING") ? "Live PayPal credentials are missing."
      : message.includes("LIVE_MODE_REQUIRED") ? "Live PayPal mode is not enabled."
      : message.includes("AUTH_FAILED") ? "Live PayPal authentication failed."
      : message.startsWith("PAYPAL_API_") ? "Live PayPal could not complete this checkout. Check the merchant account and payment settings."
      : message.includes("SUPABASE") ? "Secure payment storage is not configured."
      : "The payment request could not be completed.";
    console.error("LEADORA live one-time checkout failed", message);
    return reply({ error: safe }, 502);
  }
});
