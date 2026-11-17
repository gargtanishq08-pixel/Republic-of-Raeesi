/* Funding and schemes page: schemes you publish in admin.html, plus a free news feed. You should not need to edit this. */
(function () {
  "use strict";
  var grid = document.getElementById("fs-grid"); if (!grid) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  function fmt(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  var cfg = window.RAEESI_CONFIG || {}, sbc = window.RAEESI_SUPABASE || {};
  var SCHEMES = [];

  /* A starter list of official sites, shown only until you have published checked schemes in the admin desk (Schemes tab).
     These are links to the official websites, nothing more: no amounts, no deadlines, no promises. */
  var STARTER = [
    { name: "Startup India portal", agency: "Department for Promotion of Industry and Internal Trade (DPIIT)", level: "Central", kind: "Other", link: "https://www.startupindia.gov.in", summary: "The official portal for startup recognition, schemes, funding information and events." },
    { name: "Startup India Seed Fund Scheme", agency: "DPIIT", level: "Central", kind: "Grant", link: "https://seedfund.startupindia.gov.in", summary: "Seed support for early-stage startups, routed through selected incubators." },
    { name: "Fund of Funds for Startups", agency: "SIDBI", level: "Central", kind: "Equity / fund", link: "https://www.sidbi.in", summary: "Government-backed funds that invest in venture funds, which in turn invest in startups." },
    { name: "Biotechnology Ignition Grant (BIG)", agency: "BIRAC", level: "Central", kind: "Grant", link: "https://www.birac.nic.in", summary: "Early-stage support for biotechnology ideas." },
    { name: "Atal Innovation Mission", agency: "NITI Aayog", level: "Central", kind: "Incubation", link: "https://aim.gov.in", summary: "Programmes for students, innovators and incubators." },
    { name: "Department of Science and Technology programmes", agency: "Department of Science and Technology", level: "Central", kind: "Incubation", link: "https://dst.gov.in", summary: "Science and technology innovation, incubation and entrepreneurship programmes." },
    { name: "MeitY Startup Hub", agency: "Ministry of Electronics and IT", level: "Central", kind: "Incubation", link: "https://msh.meity.gov.in", summary: "Support for technology startups." },
    { name: "Ministry of MSME schemes", agency: "Ministry of MSME", level: "Central", kind: "Subsidy", link: "https://msme.gov.in", summary: "Support and subsidy schemes for micro, small and medium enterprises." },
    { name: "Stand-Up India", agency: "SIDBI / Department of Financial Services", level: "Central", kind: "Loan", link: "https://www.standupmitra.in", summary: "Bank loans for women and SC/ST entrepreneurs setting up new enterprises." },
    { name: "MUDRA loans", agency: "MUDRA", level: "Central", kind: "Loan", link: "https://www.mudra.org.in", summary: "Small business loans through banks and other lenders." },
    { name: "Credit guarantee for micro and small enterprises (CGTMSE)", agency: "CGTMSE", level: "Central", kind: "Loan", link: "https://www.cgtmse.in", summary: "Guarantee cover that helps small businesses get collateral-free loans." },
    { name: "Kerala Startup Mission", agency: "Government of Kerala", level: "State", state: "Kerala", kind: "Incubation", link: "https://startupmission.kerala.gov.in", summary: "Startup support in Kerala. Many other states run their own startup missions too: search your state’s name with “startup policy”." }
  ].map(function (s, i) { return { id: "starter" + i, name: s.name, agency: s.agency, level: s.level, state: s.state || null, kind: s.kind, stage: [], summary: s.summary, eligibility: "", amount_text: "", deadline: null, status: "Check official site", link: s.link, last_verified: null, tags: [], published: true, starter: true }; });


  function stale(s) { if (!s.last_verified) return true; return (Date.now() - new Date(s.last_verified + "T00:00:00")) > 90 * 864e5; }
  function statusClass(st) { return st === "Open" || st === "Rolling" ? "st-open" : st === "Upcoming" ? "st-in-progress" : st === "Closed" ? "st-archived" : "st-under-review"; }

  function card(s) {
    var passed = s.deadline && new Date(s.deadline + "T23:59:59") < new Date();
    return '<article class="show-card"><p class="mc-num">' + esc(s.kind) + " &middot; " + esc(s.level === "State" && s.state ? "State: " + s.state : s.level) +
      ' &middot; <span class="badge ' + statusClass(s.status) + '">' + esc(s.status) + "</span></p>" +
      "<h3>" + esc(s.name) + "</h3>" + (s.agency ? '<p class="by">' + esc(s.agency) + "</p>" : "") +
      (s.summary ? "<p>" + esc(s.summary) + "</p>" : "") +
      '<dl class="show-dl">' + (s.amount_text ? "<dt>Amount</dt><dd>" + esc(s.amount_text) + "</dd>" : "") + (s.eligibility ? "<dt>Who can apply</dt><dd>" + esc(s.eligibility) + "</dd>" : "") +
        (s.deadline ? "<dt>Deadline</dt><dd>" + esc(fmt(s.deadline)) + (passed ? " (passed: check the official site)" : "") + "</dd>" : "") + "</dl>" +
      ((s.stage || []).length ? '<p class="tags">' + s.stage.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</p>" : "") +
      '<p class="file-meta">' + (s.last_verified ? "Last checked " + esc(fmt(s.last_verified)) + (stale(s) ? ". <strong>This may be out of date.</strong>" : ".") : "<strong>Not verified yet.</strong> Please confirm everything on the official site.") + "</p>" +
      (validUrl(s.link) ? '<div class="mc-actions"><a class="btn btn-gold btn-sm" href="' + esc(s.link) + '" target="_blank" rel="noopener noreferrer nofollow">Go to the official site</a></div>' : "") + "</article>";
  }

  function render() {
    var q = $("fs-q").value.trim().toLowerCase(), kind = $("fs-kind").value, level = $("fs-level").value, st = $("fs-status").value;
    var list = SCHEMES.filter(function (s) {
      return (!kind || s.kind === kind) && (!level || s.level === level) && (!st || s.status === st) &&
        (!q || [s.name, s.agency, s.summary, s.eligibility, (s.tags || []).join(" "), (s.stage || []).join(" ")].join(" ").toLowerCase().indexOf(q) > -1);
    });
    $("fs-count").textContent = SCHEMES.length ? list.length + (list.length === 1 ? " scheme" : " schemes") : "";
    grid.innerHTML = list.length ? list.map(card).join("") : '<p class="file-meta">' + (SCHEMES.length ? "Nothing matches that. Try clearing a filter." : "No schemes have been published yet. Check back soon.") + "</p>";
  }
  ["fs-q", "fs-kind", "fs-level", "fs-status"].forEach(function (id) { $(id).addEventListener("input", render); $(id).addEventListener("change", render); });

  /* ---------- schemes from the database ---------- */
  function notice(html) { grid.innerHTML = '<div class="notice"><p>' + html + "</p></div>"; }
  function useStarter() {
    var kinds = STARTER.map(function (s) { return s.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort();
    $("fs-kind").innerHTML = '<option value="">Any type</option>' + kinds.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("");
    var note = document.createElement("div"); note.className = "notice"; note.innerHTML = "<p><strong>Starter list.</strong> These are links to official government sites to help you start. Detailed, checked entries (amounts, who can apply, deadlines) are added here by the Supreme Leader. Always confirm everything on the official site.</p>";
    grid.parentNode.insertBefore(note, grid); render();
  }
  if (!sbc.url || !sbc.anonKey) { SCHEMES = STARTER; useStarter(); }
  else if (!window.supabase || !window.supabase.createClient) { SCHEMES = STARTER; useStarter(); }
  else {
    var sb = window.supabase.createClient(sbc.url, sbc.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    sb.from("schemes").select("*").order("name", { ascending: true }).then(function (r) {
      if (r.error) { SCHEMES = STARTER; useStarter(); return; }
      SCHEMES = r.data || []; if (!SCHEMES.length) { SCHEMES = STARTER; useStarter(); return; }
      var kinds = SCHEMES.map(function (s) { return s.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort();
      $("fs-kind").innerHTML = '<option value="">Any type</option>' + kinds.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("");
      render();
    }, function () { SCHEMES = STARTER; useStarter(); });
  }

  /* ---------- live notifications (free, from official feeds) ---------- */
  var box = $("feed-box"), ep = ((cfg.form && cfg.form.endpoint) || "").trim();
  if (!ep) { box.innerHTML = '<p class="file-meta">The live feed isn’t switched on yet.</p>'; return; }
  var ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
  fetch(ep + (ep.indexOf("?") > -1 ? "&" : "?") + "action=feed", { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (d) {
    clearTimeout(t);
    if (!d || !d.ok) throw new Error("bad");
    var items = (d.items || []).filter(function (i) { return validUrl(i.link); });
    box.innerHTML = items.length ? '<ul class="feed-list">' + items.map(function (i) {
      return "<li><a href=\"" + esc(i.link) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(i.title) + '</a><span class="file-meta">' + esc(i.source) + (i.date ? " &middot; " + esc(fmt(i.date)) : "") + "</span></li>";
    }).join("") + '</ul><p class="file-meta">Updated ' + esc(fmt(d.updated)) + ". Headlines are collected automatically, so always read the original notice.</p>"
      : '<p class="file-meta">No matching notifications right now.</p>';
  }).catch(function () { clearTimeout(t); box.innerHTML = '<p class="file-meta">The notifications couldn’t be loaded just now. Please try again later.</p>'; });
})();
