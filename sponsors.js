/* Sponsor form + list of approved sponsors. Used on the home page and on sponsors.html.
   An enquiry only. It never takes money and never shares member details. */
(function () {
  "use strict";
  var root = document.getElementById("sponsor-form-root"); if (!root) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var cfg = window.RAEESI_CONFIG || {}, sbc = window.RAEESI_SUPABASE || {};
  var ENDPOINT = ((cfg.form && cfg.form.endpoint) || "").trim();
  var KINDS = ["Sponsor a Royal Mission or prize", "Sponsor an event", "Tell your builders about an opportunity", "Back the builders (enquiry only: nothing is open yet)", "Something else"];

  root.innerHTML =
    '<form id="sq-form" novalidate class="shell">' +
      '<div class="row-2">' +
        '<div class="field"><label for="sq-org">Organisation or name <span class="req" aria-hidden="true">*</span></label><input type="text" id="sq-org" autocomplete="organization" required maxlength="100"><p class="field-error" id="sqe-org" role="alert"></p></div>' +
        '<div class="field"><label for="sq-contact">Your name <span class="req" aria-hidden="true">*</span></label><input type="text" id="sq-contact" autocomplete="name" required maxlength="100"><p class="field-error" id="sqe-contact" role="alert"></p></div>' +
        '<div class="field"><label for="sq-email">Email <span class="req" aria-hidden="true">*</span></label><input type="email" id="sq-email" autocomplete="email" required maxlength="200"><p class="field-error" id="sqe-email" role="alert"></p></div>' +
        '<div class="field"><label for="sq-web">Website (optional)</label><input type="url" id="sq-web" placeholder="https://" maxlength="300"><p class="field-error" id="sqe-web" role="alert"></p></div>' +
      "</div>" +
      '<div class="field"><label for="sq-kind">I’d like to <span class="req" aria-hidden="true">*</span></label><select id="sq-kind" required><option value="">Choose one</option>' + KINDS.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("") + '</select>' +
        '<p class="sponsor-note" id="sq-invest-note" hidden>Investing alongside the Supreme Leader isn’t open yet. Nothing is being offered or promised, and proper advice will be taken before anything is accepted from anyone. Register your interest and you’ll hear if that changes.</p>' +
        '<p class="field-error" id="sqe-kind" role="alert"></p></div>' +
      '<div class="field"><label for="sq-msg">Tell us more (optional)</label><textarea id="sq-msg" maxlength="1500"></textarea></div>' +
      '<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" id="sq-hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="check"><input type="checkbox" id="sq-consent"><label for="sq-consent">I understand that sending this agrees nothing, and that the Republic does not share members’ details. I’m happy for you to use my details to reply to me. <span class="req" aria-hidden="true">*</span></label></div>' +
      '<p class="field-error" id="sqe-consent" role="alert"></p><p class="field-error" id="sqe-form" role="alert"></p>' +
      '<div class="mc-actions"><button type="submit" class="btn btn-dark" id="sq-send">Send enquiry</button></div>' +
    "</form>";

  // arriving from a mission's "Sponsor this mission" button
  try {
    var q = new URLSearchParams(location.search), mid = q.get("mission");
    if (mid && /^M\d{3}$/.test(mid)) {
      $("sq-kind").value = KINDS[0];
      $("sq-msg").value = "I’d like to talk about sponsoring " + String(q.get("title") || mid).slice(0, 120) + ".";
    }
  } catch (e) {}

  $("sq-kind").addEventListener("change", function () { $("sq-invest-note").hidden = this.value.indexOf("Back the builders") !== 0; });

  /* ---------- real sponsors only (none shown until you add some) ---------- */
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  var grid = $("sp-grid");
  if (grid && sbc.url && sbc.anonKey && window.supabase && window.supabase.createClient) {
    var sb = window.supabase.createClient(sbc.url, sbc.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    sb.from("sponsors").select("*").order("sort_order", { ascending: true }).then(function (r) {
      var rows = (r && !r.error && r.data) || []; if (!rows.length) return;
      grid.innerHTML = rows.map(function (s) {
        var inner = (s.logo ? '<img src="' + esc(s.logo) + '" alt="' + esc(s.name) + '" loading="lazy">' : '<span class="sp-name">' + esc(s.name) + "</span>") + (s.note ? "<small>" + esc(s.note) + "</small>" : "");
        return s.website && validUrl(s.website) ? '<a class="sp-card" href="' + esc(s.website) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + "</a>" : '<div class="sp-card">' + inner + "</div>";
      }).join("");
      $("our-sponsors").hidden = false;
    }, function () {});
  }

  /* ---------- sending ---------- */
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", id = null, busy = false;
  function newId() { var a = new Uint8Array(8), s = ""; (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < 8; i++) s += ALPHA[a[i] % ALPHA.length]; return "SPN-" + s; }
  function err(k, m) { var e = $("sqe-" + k), f = $("sq-" + k); if (e) e.textContent = m || ""; if (f) { if (m) f.setAttribute("aria-invalid", "true"); else f.removeAttribute("aria-invalid"); } }
  $("sq-form").addEventListener("submit", function (ev) {
    ev.preventDefault(); if (busy) return;
    ["org", "contact", "email", "web", "kind", "consent", "form"].forEach(function (k) { err(k, ""); });
    var org = $("sq-org").value.trim(), contact = $("sq-contact").value.trim(), email = $("sq-email").value.trim(), web = $("sq-web").value.trim(), kind = $("sq-kind").value, msg = $("sq-msg").value.trim(), bad = null;
    if (org.length < 2) { err("org", "Please enter your organisation or name."); bad = bad || "sq-org"; }
    if (contact.length < 2) { err("contact", "Please enter your name."); bad = bad || "sq-contact"; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err("email", "Please enter a valid email address."); bad = bad || "sq-email"; }
    if (web && !validUrl(web)) { err("web", "Please enter a full link starting with https://"); bad = bad || "sq-web"; }
    if (!kind) { err("kind", "Please choose one."); bad = bad || "sq-kind"; }
    if (!$("sq-consent").checked) { err("consent", "Please tick this to continue."); bad = bad || "sq-consent"; }
    if (bad) { $(bad).focus(); return; }
    if ($("sq-hp").value) return;
    if (!ENDPOINT) { err("form", "This website isn’t connected to its inbox yet, so your enquiry can’t be received. Please try again later."); return; }
    id = id || newId(); busy = true;
    var btn = $("sq-send"); btn.disabled = true; btn.textContent = "Sending…";
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ action: "sponsor_enquiry", id: id, org: org, contact: contact, email: email, website: web, kind: kind, message: msg, consent: true }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(t); busy = false;
        if (!res || !res.ok) { btn.disabled = false; btn.textContent = "Send enquiry"; err("form", (res && res.error) || "That wasn’t saved. Please try again."); return; }
        root.innerHTML = '<div class="shell" role="status" tabindex="-1" id="sq-done"><h3 class="step-title">Thank you.</h3><p>Your enquiry has been received. The Supreme Leader will reply personally. Nothing has been agreed yet.</p><p>Your reference: <strong>' + esc(res.id) + "</strong></p></div>";
        var d = $("sq-done"); if (d) { d.focus(); d.scrollIntoView({ block: "center", behavior: "smooth" }); }
      })
      .catch(function () { clearTimeout(t); busy = false; btn.disabled = false; btn.textContent = "Send enquiry"; err("form", "We couldn’t reach our inbox. Please check your connection and try again. Your details are still here, and trying again won’t send it twice."); });
  });
})();
