import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PLAN_PRICES: Record<string, string> = {
  starter: "9.00",
  pro: "19.00",
  business: "49.00",
};
const CURRENCY = "EUR";
const ORIGIN = "https://ahlamy-ai.github.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function paypalRequest(path: string, method: string, body?: unknown) {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) throw new Error("PAYPAL_SANDBOX_CREDENTIALS_MISSING");

  const tokenResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(clientId + ":" + secret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenResponse.ok) throw new Error("PAYPAL_AUTH_FAILED");
  const tokenData = await tokenResponse.json();

  const response = await fetch("https://api-m.sandbox.paypal.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + tokenData.access_token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error("PAYPAL_API_ERROR:" + response.status);
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const origin = req.headers.get("origin");
  if (origin && origin !== ORIGIN && origin !== "http://localhost:3000") {
    return reply({ error: "Origin not allowed" }, 403);
  }

  if (req.method === "GET") {
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    if (!clientId) return reply({ error: "Sandbox checkout is not configured yet" }, 503);
    return reply({ clientId, currency: CURRENCY, mode: "sandbox" });
  }

  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const input = await req.json();
    if (input.action === "create-order") {
      const plan = String(input.plan || "").toLowerCase();
      const value = PLAN_PRICES[plan];
      if (!value) return reply({ error: "Unknown plan" }, 400);

      const order = await paypalRequest("/v2/checkout/orders", "POST", {
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: "LEADORA_" + plan.toUpperCase(),
          description: "LEADORA AI " + plan + " plan — monthly subscription",
          amount: { currency_code: CURRENCY, value },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "LEADORA AI",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      });
      return reply({ id: order.id });
    }

    if (input.action === "capture-order") {
      const orderId = String(input.orderId || "");
      if (!/^[A-Z0-9-]{8,64}$/i.test(orderId)) return reply({ error: "Invalid order ID" }, 400);

      const order = await paypalRequest("/v2/checkout/orders/" + encodeURIComponent(orderId), "GET");
      const unit = order.purchase_units?.[0];
      const plan = String(unit?.custom_id || "").replace("LEADORA_", "").toLowerCase();
      const expected = PLAN_PRICES[plan];
      if (!expected || unit?.amount?.currency_code !== CURRENCY || unit?.amount?.value !== expected) {
        return reply({ error: "Order details do not match an available LEADORA plan" }, 400);
      }
      if (order.status === "COMPLETED") return reply({ status: "COMPLETED", orderId });
      if (order.status !== "APPROVED") return reply({ error: "Order is not approved" }, 409);

      const captured = await paypalRequest(
        "/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture",
        "POST",
        {},
      );
      if (captured.status !== "COMPLETED") return reply({ error: "Payment was not completed" }, 402);
      return reply({ status: captured.status, orderId });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected payment error";
    const safe = message.includes("CREDENTIALS_MISSING")
      ? "Sandbox credentials are not configured"
      : message.includes("AUTH_FAILED")
      ? "PayPal sandbox authentication failed"
      : "PayPal sandbox request failed";
    return reply({ error: safe }, 502);
  }
});
