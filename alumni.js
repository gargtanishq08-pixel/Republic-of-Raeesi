/* The Alumni Body: lists alumni you have published in admin.html. You should not need to edit this. */
(function () {
  "use strict";
  var grid = document.getElementById("al-grid"); if (!grid) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  var cfg = window.RAEESI_SUPABASE || {}, ALUMNI = [], cohort = "All";
  function initials(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase(); }

  function render() {
    var list = ALUMNI.filter(function (a) { return cohort === "All" || a.cohort === cohort; });
    grid.innerHTML = list.length ? list.map(function (a) {
      var links = String(a.links || "").split(/\s+/).filter(validUrl);
      return '<article class="show-card alumni-card"><div class="pc-head">' +
        (a.photo && validUrl(a.photo) ? '<img class="avatar md" src="' + esc(a.photo) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="avatar md ph" aria-hidden="true">' + esc(initials(a.name)) + "</span>") +
        "<div><h3>" + esc(a.name) + "</h3>" + (a.cohort ? '<p class="file-meta">' + esc(a.cohort) + "</p>" : "") + "</div></div>" +
        (a.headline ? '<p class="headline">' + esc(a.headline) + "</p>" : "") + (a.story ? "<p>" + esc(a.story) + "</p>" : "") +
        (a.venture ? '<p class="file-meta"><strong>Now:</strong> ' + (a.website && validUrl(a.website) ? '<a href="' + esc(a.website) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(a.venture) + "</a>" : esc(a.venture)) + "</p>" : "") +
        (links.length ? '<p class="show-links">' + links.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(u.replace(/^https?:\/\/(www\.)?/, "")) + "</a>"; }).join(" ") + "</p>" : "") + "</article>";
    }).join("") : '<p class="file-meta">' + (ALUMNI.length ? "No alumni in that cohort." : "The first alumni will be listed here as they graduate. Check back soon.") + "</p>";
  }
  function filters() {
    var cs = ALUMNI.map(function (a) { return a.cohort; }).filter(function (c, i, arr) { return c && arr.indexOf(c) === i; });
    $("al-filters").innerHTML = cs.length > 1 ? ["All"].concat(cs).map(function (c) { return '<button type="button" class="chip" data-c="' + esc(c) + '" aria-pressed="' + (cohort === c) + '">' + esc(c) + "</button>"; }).join("") : "";
  }
  $("al-filters").addEventListener("click", function (e) { var b = e.target.closest("button[data-c]"); if (!b) return; cohort = b.getAttribute("data-c"); filters(); render(); });

  function msg(h) { grid.innerHTML = '<div class="notice"><p>' + h + "</p></div>"; }
  if (!cfg.url || !cfg.anonKey) return msg("The Alumni Body is opening soon.");
  if (!window.supabase || !window.supabase.createClient) return msg("The page couldn’t load (a needed script was blocked). Please reload.");
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  sb.from("alumni").select("*").order("sort_order", { ascending: true }).then(function (r) {
    if (r.error) return msg("The alumni couldn’t be loaded just now. Please try again in a little while.");
    ALUMNI = r.data || []; filters(); render();
  }, function () { msg("The alumni couldn’t be loaded just now. Please check your connection."); });
})();
