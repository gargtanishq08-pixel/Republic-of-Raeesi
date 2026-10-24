/* ==========================================================================
   The Newsroom: reads published stories from the database (managed in admin.html).
   You should not need to edit this file.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.RAEESI_SUPABASE || {};
  var grid = document.getElementById("news-grid");
  if (!grid) return;
  var filtersEl = document.getElementById("news-filters"), countEl = document.getElementById("news-count");
  var dlg = document.getElementById("news-dialog"), dlgIn = document.getElementById("nw-in");
  var STORIES = [], current = "All", lastFocus = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }

  function videoEmbed(u) {
    try {
      var x = new URL(u); if (x.protocol !== "https:") return null;
      var h = x.hostname.replace(/^www\./, ""), m;
      if (h === "youtu.be") { m = x.pathname.match(/^\/([A-Za-z0-9_-]{11})/); return m ? "https://www.youtube-nocookie.com/embed/" + m[1] : null; }
      if (h === "youtube.com") {
        if (x.pathname === "/watch") { var v = x.searchParams.get("v") || ""; return /^[A-Za-z0-9_-]{11}$/.test(v) ? "https://www.youtube-nocookie.com/embed/" + v : null; }
        m = x.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/); return m ? "https://www.youtube-nocookie.com/embed/" + m[1] : null;
      }
      if (h === "vimeo.com") { m = x.pathname.match(/^\/(\d+)(?:\/([a-f0-9]+))?/); return m ? "https://player.vimeo.com/video/" + m[1] + (m[2] ? "?h=" + m[2] : "") : null; }
      if (h === "loom.com") { m = x.pathname.match(/^\/share\/([a-f0-9]{32})/); return m ? "https://www.loom.com/embed/" + m[1] : null; }
      if (h === "drive.google.com") { m = x.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/); return m ? "https://drive.google.com/file/d/" + m[1] + "/preview" : null; }
    } catch (e) {}
    return null;
  }

  // turn the story text into safe paragraphs; links starting with https:// become clickable
  function bodyHtml(text) {
    return String(text || "").split(/\n\s*\n/).map(function (p) {
      var safe = esc(p.trim()).replace(/\n/g, "<br>");
      safe = safe.replace(/(https?:\/\/[^\s<]+)/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer nofollow">' + u.replace(/^https?:\/\/(www\.)?/, "") + "</a>"; });
      return "<p>" + safe + "</p>";
    }).join("");
  }

  function badges(s) {
    return '<span class="badge st-under-review">' + esc(s.kind) + "</span>" +
      (s.relationship && s.relationship !== "None" ? ' <span class="badge level">' + esc(s.relationship) + "</span>" : "");
  }
  function byline(s) {
    var bits = [];
    if (s.person_name) bits.push("<strong>" + esc(s.person_name) + "</strong>" + (s.person_role ? ", " + esc(s.person_role) : ""));
    if (s.venture) bits.push(s.venture_url && validUrl(s.venture_url) ? '<a href="' + esc(s.venture_url) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(s.venture) + "</a>" : esc(s.venture));
    return bits.join(" &middot; ");
  }

  function renderFilters() {
    var counts = {}; STORIES.forEach(function (s) { counts[s.kind] = (counts[s.kind] || 0) + 1; });
    var html = '<button type="button" class="chip" data-k="All" aria-pressed="' + (current === "All") + '">All (' + STORIES.length + ")</button>";
    ["Founder story", "Interview", "Republic news", "Announcement"].forEach(function (k) {
      if (counts[k]) html += '<button type="button" class="chip" data-k="' + esc(k) + '" aria-pressed="' + (current === k) + '">' + esc(k) + " (" + counts[k] + ")</button>";
    });
    filtersEl.innerHTML = STORIES.length ? html : "";
  }
  filtersEl.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; current = b.getAttribute("data-k"); renderFilters(); renderGrid(); });

  function renderGrid() {
    var list = STORIES.filter(function (s) { return current === "All" || s.kind === current; });
    countEl.textContent = STORIES.length ? list.length + (list.length === 1 ? " story" : " stories") : "";
    grid.innerHTML = list.length ? list.map(function (s) {
      return '<button type="button" class="news-card" data-slug="' + esc(s.slug) + '" aria-label="Read: ' + esc(s.headline) + '">' +
        (s.cover_image ? '<div class="news-cover"><img src="' + esc(s.cover_image) + '" alt="' + esc(s.cover_alt || "") + '" loading="lazy"></div>' : '<div class="news-cover ph"><span>The Republic</span></div>') +
        '<div class="news-body"><p class="mc-num">' + badges(s) + "</p><h3>" + esc(s.headline) + "</h3>" +
        (s.dek ? "<p>" + esc(s.dek) + "</p>" : "") +
        (byline(s) ? '<p class="file-meta">' + byline(s).replace(/<a [^>]*>|<\/a>/g, "") + "</p>" : "") +
        '<p class="file-meta">' + esc(fmtDate(s.published_at || s.created_at)) + "</p></div></button>";
    }).join("") : '<p class="file-meta">' + (STORIES.length ? "No stories of that type yet." : "The first stories are on their way. Check back soon.") + "</p>";
  }
  grid.addEventListener("click", function (e) { var b = e.target.closest("button[data-slug]"); if (b) openStory(b.getAttribute("data-slug"), b); });

  function openStory(slug, trigger) {
    var s = STORIES.filter(function (x) { return x.slug === slug; })[0]; if (!s) return;
    lastFocus = trigger || document.activeElement;
    var src = s.video_url ? videoEmbed(s.video_url) : null;
    dlgIn.innerHTML = '<button type="button" class="dlg-close" data-close aria-label="Close">&times;</button>' +
      (s.cover_image ? '<img class="story-cover" src="' + esc(s.cover_image) + '" alt="' + esc(s.cover_alt || "") + '">' : "") +
      '<p class="mc-num">' + badges(s) + "</p>" +
      '<h2 id="nw-title" class="md-title">' + esc(s.headline) + "</h2>" +
      (s.dek ? '<p class="headline">' + esc(s.dek) + "</p>" : "") +
      '<p class="file-meta">' + byline(s) + (byline(s) ? " &middot; " : "") + esc(fmtDate(s.published_at || s.created_at)) + "</p>" +
      '<div class="story-text">' + bodyHtml(s.body) + "</div>" +
      (s.video_url ? "<h3>Watch</h3>" + (src ? '<div class="video-frame"><iframe src="' + esc(src) + '" title="Story video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allow="fullscreen; picture-in-picture"></iframe></div>' : "") +
        '<p class="file-meta"><a href="' + esc(s.video_url) + '" target="_blank" rel="noopener noreferrer nofollow">' + (src ? "Video not playing? Open it in a new tab" : "Open the video in a new tab") + "</a></p>" : "") +
      '<p class="file-meta">Published by the Supreme Leader with the featured person’s agreement. Appearing here is not a record of investment.</p>' +
      '<div class="dlg-actions"><button type="button" class="btn btn-line btn-sm" data-share>Share</button><a class="btn btn-line btn-sm" href="network.html">Join the Builders’ Network</a>' +
      '<button type="button" class="btn btn-line btn-sm" data-close>Close</button><span class="dlg-status" id="nw-status" role="status" aria-live="polite"></span></div>';
    dlgIn.setAttribute("data-slug", s.slug);
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    dlg.scrollTop = 0;
    try { history.replaceState(null, "", "#" + s.slug); } catch (e) {}
    var c = dlgIn.querySelector("[data-close]"); if (c) c.focus({ preventScroll: true });
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) return closeDialog();
    var t = e.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-close")) closeDialog();
    else if (t.hasAttribute("data-share")) {
      var slug = dlgIn.getAttribute("data-slug"), s = STORIES.filter(function (x) { return x.slug === slug; })[0];
      var url = location.href.split("#")[0] + "#" + slug, st = document.getElementById("nw-status");
      if (navigator.share) navigator.share({ title: s ? s.headline : "The Newsroom", url: url }).catch(function () {});
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { st.textContent = "Link copied."; }, function () { st.textContent = "Copy this link: " + url; });
      else st.textContent = "Copy this link: " + url;
    }
  });
  dlg.addEventListener("close", function () {
    dlgIn.innerHTML = "";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });
  function fromHash() { var h = (location.hash || "").replace("#", ""); if (h && STORIES.some(function (s) { return s.slug === h; })) openStory(h); }
  window.addEventListener("hashchange", fromHash);

  function msg(html) { grid.innerHTML = '<div class="notice"><p>' + html + "</p></div>"; }
  if (!CFG.url || !CFG.anonKey) return msg("The Newsroom is opening soon.");
  if (!window.supabase || !window.supabase.createClient) return msg("The Newsroom couldn’t load (a needed script was blocked). Please reload.");
  var sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  sb.from("stories").select("*").order("published_at", { ascending: false }).then(function (r) {
    if (r.error) return msg("The stories couldn’t be loaded just now. Please try again in a little while.");
    STORIES = r.data || [];
    renderFilters(); renderGrid(); fromHash();
  }, function () { msg("The stories couldn’t be loaded just now. Please check your connection."); });
})();
