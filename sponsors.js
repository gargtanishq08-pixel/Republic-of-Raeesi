/* Sponsors page: lists sponsors you have approved (from the database) and sends enquiries.
   An enquiry only. It never takes money and never shares member details. */
(function () {
  "use strict";
  var form = document.getElementById("enq"); if (!form) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var cfg = window.RAEESI_CONFIG || {}, sbc = window.RAEESI_SUPABASE || {};
  var ENDPOINT = ((cfg.form && cfg.form.endpoint) || "").trim();

  /* ---------- real sponsors only (none shown until you add some) ---------- */
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  if (sbc.url && sbc.anonKey && window.supabase && window.supabase.createClient) {
    var sb = window.supabase.createClient(sbc.url, sbc.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    sb.from("sponsors").select("*").order("sort_order", { ascending: true }).then(function (r) {
      var rows = (r && !r.error && r.data) || []; if (!rows.length) return;
      $("sp-grid").innerHTML = rows.map(function (s) {
        var inner = (s.logo ? '<img src="' + esc(s.logo) + '" alt="' + esc(s.name) + '" loading="lazy">' : '<span class="sp-name">' + esc(s.name) + "</span>") +
          (s.note ? '<small>' + esc(s.note) + "</small>" : "");
        return s.website && validUrl(s.website) ? '<a class="sp-card" href="' + esc(s.website) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + "</a>" : '<div class="sp-card">' + inner + "</div>";
      }).join("");
      $("our-sponsors").hidden = false;
    }, function () {});
  }

  /* ---------- enquiry form ---------- */
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", id = null, busy = false;
  function newId() { var a = new Uint8Array(8), s = ""; (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < 8; i++) s += ALPHA[a[i] % ALPHA.length]; return "SPN-" + s; }
  function err(k, m) { var e = $("e-" + k), f = $("f-" + k); if (e) e.textContent = m || ""; if (f) { if (m) f.setAttribute("aria-invalid", "true"); else f.removeAttribute("aria-invalid"); } }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault(); if (busy) return;
    ["org", "contact", "email", "web", "kind", "consent", "form"].forEach(function (k) { err(k, ""); });
    var org = $("f-org").value.trim(), contact = $("f-contact").value.trim(), email = $("f-email").value.trim(), web = $("f-web").value.trim(), kind = $("f-kind").value, msg = $("f-msg").value.trim(), bad = null;
    if (org.length < 2) { err("org", "Please enter your organisation."); bad = bad || "f-org"; }
    if (contact.length < 2) { err("contact", "Please enter your name."); bad = bad || "f-contact"; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err("email", "Please enter a valid email address."); bad = bad || "f-email"; }
    if (web && !validUrl(web)) { err("web", "Please enter a full link starting with https://"); bad = bad || "f-web"; }
    if (!kind) { err("kind", "Please choose one."); bad = bad || "f-kind"; }
    if (!$("f-consent").checked) { err("consent", "Please tick this to continue."); bad = bad || "f-consent"; }
    if (bad) { $(bad).focus(); return; }
    if ($("f-hp").value) return;
    if (!ENDPOINT) { err("form", "This website isn’t connected to its inbox yet, so your enquiry can’t be received. Please try again later."); return; }
    id = id || newId(); busy = true;
    var btn = $("f-send"); btn.disabled = true; btn.textContent = "Sending…";
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ action: "sponsor_enquiry", id: id, org: org, contact: contact, email: email, website: web, kind: kind, message: msg, consent: true }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(t); busy = false;
        if (!res || !res.ok) { btn.disabled = false; btn.textContent = "Send enquiry"; err("form", (res && res.error) || "That wasn’t saved. Please try again."); return; }
        $("form-root").innerHTML = '<div class="shell" role="status" tabindex="-1" id="done"><h3 class="step-title">Thank you.</h3><p>Your enquiry has been received. The Supreme Leader will reply personally. Nothing has been agreed yet.</p><p>Your reference: <strong>' + esc(res.id) + "</strong></p></div>";
        var d = $("done"); if (d) { d.focus(); d.scrollIntoView({ block: "center", behavior: "smooth" }); }
      })
      .catch(function () { clearTimeout(t); busy = false; btn.disabled = false; btn.textContent = "Send enquiry"; err("form", "We couldn’t reach our inbox. Please check your connection and try again. Your details are still here, and trying again won’t send it twice."); });
  });
})();
