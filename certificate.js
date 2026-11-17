/* A printable certificate. Only the person it was granted to (and the admin) can open it. */
(function () {
  "use strict";
  var root = document.getElementById("ct-root"); if (!root) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var CFG = window.RAEESI_SUPABASE || {}, id = (new URLSearchParams(location.search).get("id") || "").trim();
  function msg(t) { root.innerHTML = '<div class="notice"><p>' + t + "</p></div>"; }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return msg("This certificate link isn’t valid.");
  if (!CFG.url || !CFG.anonKey || !window.supabase) return msg("The certificate couldn’t load right now.");
  var sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  sb.auth.getSession().then(function (r) {
    if (!(r.data && r.data.session)) return msg("Please <a href=\"wallet.html\">sign in on your wallet page</a> first, then open the certificate from there.");
    return sb.from("certificates").select("*").eq("id", id).maybeSingle().then(function (r2) {
      var c = r2.data; if (!c) return msg("We couldn’t find that certificate. It may belong to someone else.");
      var date = new Date(c.issued_at + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      root.innerHTML = '<div class="cert"><img class="seal" src="images/crest-small.png" alt=""><p class="cert-kicker">The Republic of Raeesi</p><h1>Certificate of Recognition</h1><p>This is awarded to</p><p class="cert-name">' + esc(c.holder_name) + "</p>" +
        '<p class="cert-title">' + esc(c.title) + "</p>" + (c.reason ? "<p>" + esc(c.reason) + "</p>" : "") + '<div class="cert-sign"><span>The Supreme Leader</span><span>' + esc(date) + "</span></div>" +
        '<p class="cert-fine">Certificate number ' + esc(c.number) + ". The Republic of Raeesi is a fictional, satirical republic. This certificate recognises taking part and real work in the community. It is not an academic qualification or an official credential.</p></div>" +
        '<p class="cert-actions"><button type="button" class="btn btn-dark" onclick="window.print()">Print or save as PDF</button></p>';
    });
  }).catch(function () { msg("The certificate couldn’t load right now."); });
})();
