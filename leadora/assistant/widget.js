(() => {
  "use strict";
  const script = document.currentScript;
  if (!script || script.dataset.leadoraLoaded === "true") return;
  script.dataset.leadoraLoaded = "true";
  const assistantId = (script.dataset.assistantId || "").trim();
  const endpoint = (script.dataset.endpoint || "https://abqgzquhuzxggmgqgcdf.supabase.co/functions/v1/leadora-site-assistant").trim();
  if (!assistantId) { console.error("[LEADORA Assistant] Missing data-assistant-id."); return; }
  const rawLang = (script.dataset.language || navigator.language || "en").toLowerCase();
  const language = rawLang.startsWith("ar") ? "ar" : rawLang.startsWith("fr") ? "fr" : "en";
  const copy = {
    en:{open:"Chat with us",title:"LEADORA Assistant",intro:"Hello! How can we help you?",placeholder:"Write your message…",send:"Send",waiting:"Thinking…",error:"Sorry, we could not send that. Please try again."},
    fr:{open:"Discuter avec nous",title:"Assistant LEADORA",intro:"Bonjour ! Comment pouvons-nous vous aider ?",placeholder:"Écrivez votre message…",send:"Envoyer",waiting:"Réflexion…",error:"Désolé, votre message n’a pas été envoyé. Réessayez."},
    ar:{open:"تحدث معنا",title:"مساعد LEADORA",intro:"مرحباً! كيف يمكننا مساعدتك؟",placeholder:"اكتب رسالتك…",send:"إرسال",waiting:"جارٍ التفكير…",error:"تعذر إرسال رسالتك. حاول مرة أخرى."}
  }[language];
  const host=document.createElement("div");
  host.id="leadora-assistant-widget";
  host.style.cssText="position:fixed;z-index:2147483000;right:20px;bottom:20px;font-family:Inter,system-ui,sans-serif";
  document.body.appendChild(host);
  const root=host.attachShadow({mode:"open"});
  const style=document.createElement("style");
  style.textContent="*{box-sizing:border-box}.launcher{border:0;border-radius:999px;padding:14px 19px;background:linear-gradient(110deg,#9bb7ff,#7debd4);color:#07111c;font:700 14px system-ui;box-shadow:0 12px 35px #0005;cursor:pointer}.panel{display:none;width:min(360px,calc(100vw - 28px));height:min(520px,calc(100dvh - 105px));margin-bottom:12px;border:1px solid #2a3d58;border-radius:18px;overflow:hidden;background:#0b1423;color:#f5f8ff;box-shadow:0 20px 60px #0008}.panel.open{display:flex;flex-direction:column}.head{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;background:linear-gradient(120deg,#172b49,#102a2b);border-bottom:1px solid #2a3d58}.brand{font:800 13px system-ui;letter-spacing:.08em}.sub{font:11px system-ui;color:#a9b8ce;margin-top:3px}.close{border:0;background:transparent;color:#dce7f7;font-size:23px;cursor:pointer}.messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}.bubble{max-width:86%;padding:10px 12px;border-radius:13px;font:13px/1.5 system-ui;white-space:pre-wrap;overflow-wrap:anywhere}.bot{align-self:flex-start;background:#172943;border:1px solid #2b405e}.user{align-self:flex-end;background:#d4e5ff;color:#101b2d}.status{font:11px system-ui;color:#9eacc3;padding:0 14px 7px;min-height:20px}.form{display:flex;gap:8px;padding:11px;border-top:1px solid #2a3d58;background:#0e1a2c}.input{flex:1;min-width:0;border:1px solid #344a68;border-radius:11px;background:#08111e;color:#f5f8ff;padding:11px;font:13px system-ui;outline:none}.input:focus{border-color:#9bb7ff}.send{border:0;border-radius:11px;padding:0 14px;background:#8ce4d2;color:#07111c;font:700 13px system-ui;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:480px){.panel{width:calc(100vw - 24px);height:min(520px,calc(100dvh - 92px))}.launcher{padding:13px 16px}}";
  root.appendChild(style);
  const panel=document.createElement("section");
  panel.className="panel";
  panel.setAttribute("aria-label",copy.title);
  panel.innerHTML='<div class="head"><div><div class="brand"></div><div class="sub">Powered by LEADORA</div></div><button class="close" type="button" aria-label="Close">×</button></div><div class="messages" aria-live="polite"></div><div class="status" role="status"></div><form class="form"><input class="input" maxlength="2000" autocomplete="off"><button class="send" type="submit"></button></form>';
  root.appendChild(panel);
  const launcher=document.createElement("button");
  launcher.type="button";launcher.className="launcher";launcher.textContent=copy.open;root.appendChild(launcher);
  const $=s=>panel.querySelector(s),messages=$(".messages"),status=$(".status");
  $(".brand").textContent=copy.title;$(".input").placeholder=copy.placeholder;$(".input").setAttribute("aria-label",copy.placeholder);$(".send").textContent=copy.send;
  let conversationId=null,sending=false;
  function addMessage(text,role){const item=document.createElement("div");item.className="bubble "+role;item.textContent=String(text||"");messages.appendChild(item);messages.scrollTop=messages.scrollHeight;}
  function setOpen(open){panel.classList.toggle("open",open);launcher.hidden=open;if(open)$(".input").focus();}
  addMessage(copy.intro,"bot");
  launcher.addEventListener("click",()=>setOpen(true));
  $(".close").addEventListener("click",()=>setOpen(false));
  panel.querySelector("form").addEventListener("submit",async event=>{
    event.preventDefault();if(sending)return;
    const input=$(".input"),message=input.value.trim();if(!message)return;
    addMessage(message,"user");input.value="";sending=true;$(".send").disabled=true;status.textContent=copy.waiting;
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assistant_id:assistantId,message,conversation_id:conversationId,language})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||typeof data.reply!=="string")throw new Error("assistant_request_failed");
      if(data.conversation_id)conversationId=data.conversation_id;
      addMessage(data.reply,"bot");status.textContent="";
    }catch(_){status.textContent=copy.error;}
    finally{sending=false;$(".send").disabled=false;input.focus();}
  });
})();