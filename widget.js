(() => {
  const script = document.currentScript;
  const widgetKey = script?.dataset?.widgetKey;
  if (!widgetKey || !/^[a-f0-9]{48}$/.test(widgetKey)) {
    console.error("Ahlamy widget: missing or invalid data-widget-key.");
    return;
  }
  if (window.__ahlamyWidgetLoaded) return;
  window.__ahlamyWidgetLoaded = true;

  const API = "https://ucrzvevcrsnakwfcimdn.supabase.co/functions/v1/ahlamy-widget";
  const PUBLIC_KEY = "sb_publishable_T0VEJa4zxZzXNh2yUsDUVQ_CHRITxda";
  const host = document.createElement("div");
  host.id = "ahlamy-ai-widget";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      :host{all:initial;font-family:Arial,sans-serif;color:#102033}
      *{box-sizing:border-box}
      .launcher{position:fixed;right:22px;bottom:22px;z-index:2147483000;border:0;border-radius:999px;background:#0ea5e9;color:#062033;padding:14px 19px;font-size:15px;font-weight:700;box-shadow:0 8px 28px #0003;cursor:pointer}
      .panel{position:fixed;right:22px;bottom:82px;z-index:2147483000;width:min(360px,calc(100vw - 28px));height:min(520px,calc(100vh - 120px));background:#fff;border:1px solid #dbe4ee;border-radius:16px;box-shadow:0 18px 55px #0003;display:none;overflow:hidden;flex-direction:column}
      .panel.open{display:flex}
      .head{background:#10233c;color:#fff;padding:15px 16px;display:flex;align-items:center;justify-content:space-between}
      .head strong{font-size:15px}.head small{display:block;color:#cbd5e1;font-size:11px;margin-top:3px}
      .close{background:transparent;color:#fff;border:0;font-size:24px;cursor:pointer}
      .messages{flex:1;overflow:auto;padding:14px;background:#f5f8fc;display:flex;flex-direction:column;gap:9px}
      .msg{max-width:88%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
      .assistant{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;color:#172b45}
      .customer{align-self:flex-end;background:#d8f2ff;color:#102b40}
      .notice{font-size:12px;color:#64748b;text-align:center;padding:5px}
      .composer{display:flex;gap:8px;padding:11px;border-top:1px solid #e2e8f0;background:#fff}
      textarea{font:14px Arial,sans-serif;resize:none;flex:1;min-width:0;max-height:90px;border:1px solid #cbd5e1;border-radius:9px;padding:10px;color:#102033;outline:none}
      .send{border:0;border-radius:9px;background:#0ea5e9;color:#062033;padding:0 14px;font-weight:700;cursor:pointer}
      .send:disabled,textarea:disabled{opacity:.55;cursor:not-allowed}
      @media(max-width:480px){.launcher{right:14px;bottom:14px}.panel{right:8px;bottom:72px;width:calc(100vw - 16px);height:min(70vh,560px)}}
    </style>
    <button class="launcher" type="button" aria-expanded="false">Chat with us</button>
    <section class="panel" aria-label="Company AI assistant">
      <header class="head"><div><strong>Customer assistant</strong><small>Powered by Ahlamy AI</small></div><button class="close" type="button" aria-label="Close chat">×</button></header>
      <div class="messages" aria-live="polite"><div class="notice">Connecting to the assistant…</div></div>
      <form class="composer"><textarea rows="1" maxlength="2000" placeholder="Write your message…" aria-label="Your message"></textarea><button class="send" type="submit">Send</button></form>
    </section>`;
  const $ = (selector) => root.querySelector(selector);
  const launcher = $(".launcher");
  const panel = $(".panel");
  const messages = $(".messages");
  const form = $(".composer");
  const input = $("textarea");
  const send = $(".send");
  let sessionToken = null;
  let opened = false;
  let polling = false;
  let waitingSince = 0;
  let lastRendered = "";

  function line(sender, content) {
    const node = document.createElement("div");
    node.className = "msg " + (sender === "customer" ? "customer" : "assistant");
    node.textContent = content;
    messages.appendChild(node);
  }
  function notice(content) {
    const node = document.createElement("div");
    node.className = "notice";
    node.textContent = content;
    messages.appendChild(node);
  }
  async function call(action, extra = {}) {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": PUBLIC_KEY },
      body: JSON.stringify({ action, widget_key: widgetKey, session_token: sessionToken, ...extra })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The assistant is temporarily unavailable.");
    return data;
  }
  async function initialize() {
    messages.replaceChildren();
    notice("Connecting…");
    try {
      const data = await call("init");
      sessionToken = data.session_token;
      messages.replaceChildren();
      line("assistant", data.welcome_message || "Hello! How can I help you today?");
      poll();
    } catch (error) {
      messages.replaceChildren();
      notice(error.message);
    }
  }
  async function poll() {
    if (!opened || !sessionToken || polling) return;
    polling = true;
    try {
      const data = await call("poll");
      const rows = data.messages || [];
      const signature = JSON.stringify(rows);
      if (signature !== lastRendered) {
        lastRendered = signature;
        messages.replaceChildren();
        if (!rows.length) line("assistant", "Hello! How can I help you today?");
        rows.forEach(row => line(row.sender_type, row.content));
        if (waitingSince && !rows.some(row => row.sender_type === "assistant" && Date.parse(row.created_at) >= waitingSince)) {
          if (Date.now() - waitingSince > 45000) notice("Our team assistant is taking longer than usual. Your message has been saved.");
        } else if (rows.some(row => row.sender_type === "assistant" && Date.parse(row.created_at) >= waitingSince)) {
          waitingSince = 0;
        }
      }
      messages.scrollTop = messages.scrollHeight;
    } catch (error) {
      if (error.message.includes("expired")) {
        sessionToken = null;
        notice("Your chat session expired. Close and reopen the chat to continue.");
      }
    } finally {
      polling = false;
      if (opened) window.setTimeout(poll, 3000);
    }
  }
  launcher.addEventListener("click", async () => {
    opened = !opened;
    panel.classList.toggle("open", opened);
    launcher.setAttribute("aria-expanded", String(opened));
    launcher.textContent = opened ? "Close chat" : "Chat with us";
    if (opened && !sessionToken) await initialize();
    else if (opened) poll();
  });
  $(".close").addEventListener("click", () => {
    opened = false;
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.textContent = "Chat with us";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || !sessionToken || send.disabled) return;
    send.disabled = true;
    input.disabled = true;
    try {
      await call("send", { content });
      input.value = "";
      waitingSince = Date.now();
      lastRendered = "";
      await poll();
    } catch (error) {
      notice(error.message);
    } finally {
      send.disabled = false;
      input.disabled = false;
      input.focus();
    }
  });
})();