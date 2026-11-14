/* Share your story: a private page reached through a one-time invitation link. You should not need to edit this. */
(function () {
  "use strict";
  var root = document.getElementById("st-root"); if (!root) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  var cfg = window.RAEESI_SUPABASE || {};
  var token = (new URLSearchParams(location.search).get("t") || "").trim();
  function bad(msg) { root.innerHTML = '<div class="notice warn"><p>' + msg + "</p></div>"; }
  if (!/^[a-z0-9]{24}$/.test(token)) return bad("This link isn’t valid. Please use the exact link the Supreme Leader sent you, or ask for a new one.");
  if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) return bad("This page can’t connect right now. Please try again later.");
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  var AGES = ["14–15", "16–17", "18–25", "26 or older"];

  root.innerHTML =
    '<form id="sf" novalidate class="shell">' +
      '<div class="row-2">' +
        '<div class="field"><label for="sf-name">Your name <span class="req" aria-hidden="true">*</span></label><input type="text" id="sf-name" required maxlength="80" autocomplete="name"><p class="field-error" id="sfe-name" role="alert"></p></div>' +
        '<div class="field"><label for="sf-email">Email <span class="req" aria-hidden="true">*</span></label><span class="hint">Private. Only the Supreme Leader sees it.</span><input type="email" id="sf-email" required maxlength="200" autocomplete="email"><p class="field-error" id="sfe-email" role="alert"></p></div>' +
        '<div class="field"><label for="sf-role">Your role</label><input type="text" id="sf-role" maxlength="80" placeholder="e.g. Founder"></div>' +
        '<div class="field"><label for="sf-venture">Your venture or project</label><input type="text" id="sf-venture" maxlength="80"></div>' +
        '<div class="field"><label for="sf-web">Website</label><input type="url" id="sf-web" maxlength="300" placeholder="https://"><p class="field-error" id="sfe-web" role="alert"></p></div>' +
        '<div class="field"><label for="sf-age">Your age <span class="req" aria-hidden="true">*</span></label><select id="sf-age" required><option value="">Choose one</option>' + AGES.map(function (a) { return "<option>" + a + "</option>"; }).join("") + '</select><p class="field-error" id="sfe-age" role="alert"></p></div>' +
      "</div>" +
      '<div id="sf-guard" class="check" hidden><input type="checkbox" id="sf-gok"><label for="sf-gok">My parent or guardian knows about this and agrees to my story being considered.</label></div><p class="field-error" id="sfe-gok" role="alert"></p>' +
      '<div class="field"><label for="sf-story">Your story <span class="req" aria-hidden="true">*</span></label><span class="hint">What you’re building, why, what’s been hard, and what you’ve learned. At least 100 characters, no more than 8000. Be honest: a real story beats a polished one.</span><textarea id="sf-story" required minlength="100" maxlength="8000" style="min-height:14rem"></textarea><div class="counter" id="sf-count">0 / 8000</div><p class="field-error" id="sfe-story" role="alert"></p></div>' +
      '<div class="field"><label for="sf-links">Links to your work (optional)</label><span class="hint">A video, demo, or articles, separated by spaces.</span><input type="text" id="sf-links" maxlength="500"></div>' +
      '<div class="field"><label for="sf-photo">A link to a photo of you or your project (optional)</label><span class="hint">A shared Drive or image link. Only send a picture you’re happy to have published.</span><input type="url" id="sf-photo" maxlength="300" placeholder="https://"><p class="field-error" id="sfe-photo" role="alert"></p></div>' +
      '<div class="check"><input type="checkbox" id="sf-consent"><label for="sf-consent">I agree that the Supreme Leader may edit this for length and clarity and may publish it in the Republic’s Newsroom, with my name, if he chooses. Nothing is published without me being told first. This is true and mine to share. <span class="req" aria-hidden="true">*</span></label></div>' +
      '<p class="field-error" id="sfe-consent" role="alert"></p><p class="field-error" id="sfe-form" role="alert"></p>' +
      '<div class="mc-actions"><button type="submit" class="btn btn-dark" id="sf-send">Send my story</button></div>' +
    "</form>";

  $("sf-age").addEventListener("change", function () { $("sf-guard").hidden = !(this.value === "14–15" || this.value === "16–17"); });
  $("sf-story").addEventListener("input", function () { $("sf-count").textContent = this.value.length + " / 8000"; });
  function err(k, m) { var e = $("sfe-" + k), f = $("sf-" + k); if (e) e.textContent = m || ""; if (f) { if (m) f.setAttribute("aria-invalid", "true"); else f.removeAttribute("aria-invalid"); } }
  var busy = false;
  $("sf").addEventListener("submit", function (ev) {
    ev.preventDefault(); if (busy) return;
    ["name", "email", "web", "age", "gok", "story", "photo", "consent", "form"].forEach(function (k) { err(k, ""); });
    var name = $("sf-name").value.trim(), email = $("sf-email").value.trim(), age = $("sf-age").value, story = $("sf-story").value.trim(), web = $("sf-web").value.trim(), photo = $("sf-photo").value.trim(), minor = age === "14–15" || age === "16–17", first = null;
    if (name.length < 2) { err("name", "Please enter your name."); first = first || "sf-name"; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err("email", "Please enter a valid email address."); first = first || "sf-email"; }
    if (web && !validUrl(web)) { err("web", "Please enter a full link starting with https://"); first = first || "sf-web"; }
    if (!age) { err("age", "Please choose your age range."); first = first || "sf-age"; }
    if (minor && !$("sf-gok").checked) { err("gok", "A parent or guardian needs to agree first."); first = first || "sf-gok"; }
    if (story.length < 100) { err("story", "Please write at least 100 characters. A few honest paragraphs is plenty."); first = first || "sf-story"; }
    if (photo && !validUrl(photo)) { err("photo", "Please enter a full link starting with https://"); first = first || "sf-photo"; }
    if (!$("sf-consent").checked) { err("consent", "Please tick this to send your story."); first = first || "sf-consent"; }
    if (first) { $(first).focus(); return; }
    busy = true; var btn = $("sf-send"); btn.disabled = true; btn.textContent = "Sending…";
    sb.rpc("submit_story", { p_token: token, p_name: name, p_role: $("sf-role").value.trim(), p_venture: $("sf-venture").value.trim(), p_website: web, p_email: email, p_age: age,
      p_guardian: minor ? $("sf-gok").checked : false, p_story: story, p_links: $("sf-links").value.trim(), p_photo: photo, p_consent: true }).then(function (r) {
      busy = false;
      if (r.error) { btn.disabled = false; btn.textContent = "Send my story"; var m = r.error.message || ""; err("form", /valid any more/i.test(m) ? "This link isn’t valid any more. It may already have been used. Please ask the Supreme Leader for a new one." : /guardian/i.test(m) ? "A parent or guardian must agree first." : "That didn’t send: " + esc(m) + ". Your story is still here, so please try again."); return; }
      root.innerHTML = '<div class="shell" role="status" tabindex="-1" id="st-done"><h3 class="step-title">Thank you.</h3><p>Your story has been received. The Supreme Leader will read it personally and be in touch. Nothing is published without you being told first.</p></div>';
      var d = $("st-done"); if (d) { d.focus(); d.scrollIntoView({ block: "center", behavior: "smooth" }); }
    }, function () { busy = false; btn.disabled = false; btn.textContent = "Send my story"; err("form", "We couldn’t reach the Republic just now. Please check your connection and try again. Your story is still here."); });
  });
})();
