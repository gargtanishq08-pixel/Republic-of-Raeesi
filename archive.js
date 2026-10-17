/* ==========================================================================
   The Royal Archives — gallery behaviour.
   Reads the list from archive-data.js. You should not need to edit this file.
   ========================================================================== */
(function () {
  "use strict";
  var DATA = window.RAEESI_ARCHIVE || { categories: [], items: [] };
  var ITEMS = DATA.items || [];
  var grid = document.getElementById("archive-grid");
  if (!grid) return;

  var filtersEl = document.getElementById("archive-filters");
  var countEl = document.getElementById("archive-count");
  var featuredEl = document.getElementById("archive-featured");
  var dlg = document.getElementById("arch-dialog");
  var dlgIn = document.getElementById("dlg-in");
  var current = "All";
  var openIndex = -1;       // index inside the currently filtered list
  var lastFocus = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function byNumber(n) { return ITEMS.filter(function (i) { return i.number === n; })[0]; }
  function visible() { return ITEMS.filter(function (i) { return current === "All" || i.category === current; }); }

  /* ---------- filters ---------- */
  function categoriesInUse() {
    var used = {};
    ITEMS.forEach(function (i) { used[i.category] = (used[i.category] || 0) + 1; });
    var ordered = (DATA.categories || []).filter(function (c) { return used[c]; });
    Object.keys(used).forEach(function (c) { if (ordered.indexOf(c) === -1) ordered.push(c); });
    return ordered.map(function (c) { return { name: c, n: used[c] }; });
  }
  function renderFilters() {
    var cats = categoriesInUse();
    var html = '<button type="button" class="chip" data-cat="All" aria-pressed="' + (current === "All") + '">All (' + ITEMS.length + ")</button>";
    cats.forEach(function (c) {
      html += '<button type="button" class="chip" data-cat="' + esc(c.name) + '" aria-pressed="' + (current === c.name) + '">' + esc(c.name) + " (" + c.n + ")</button>";
    });
    filtersEl.innerHTML = html;
  }
  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-cat]");
    if (!b) return;
    current = b.getAttribute("data-cat");
    renderFilters(); renderGrid();
  });

  /* ---------- featured ---------- */
  function renderFeatured() {
    var f = ITEMS.filter(function (i) { return i.featured && !i.pending; })[0];
    if (!f) { featuredEl.innerHTML = ""; return; }
    featuredEl.innerHTML =
      '<article class="arch-featured">' +
        '<button type="button" class="feat-img" data-open="' + f.number + '" aria-label="Open archive number ' + esc(f.number) + ': ' + esc(f.title) + '">' +
          '<img src="' + esc(f.image) + '" alt="' + esc(f.alt) + '" width="1200" height="896">' +
        "</button>" +
        '<div class="feat-copy">' +
          '<p class="arch-tag">Featured Archive</p>' +
          '<p class="arch-no">Archive No. ' + esc(f.number) + "</p>" +
          '<h2 class="feat-title">' + esc(f.title) + "</h2>" +
          '<p class="arch-caption">' + esc(f.caption) + "</p>" +
          '<p class="arch-meta"><strong>Classification:</strong> ' + esc(f.classification) + "</p>" +
          '<p class="arch-meta"><strong>Official statement:</strong> ' + esc(f.statement) + "</p>" +
          '<button type="button" class="btn btn-gold" data-open="' + f.number + '">View the record</button>' +
        "</div></article>";
  }
  featuredEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-open]"); if (b) openByNumber(b.getAttribute("data-open"), b);
  });

  /* ---------- grid ---------- */
  function renderGrid() {
    var list = visible();
    countEl.textContent = list.length + (list.length === 1 ? " record" : " records") + (current === "All" ? "" : " in “" + current + "”");
    grid.innerHTML = list.map(function (i) {
      if (i.pending) {
        return '<div class="arch-card pending" role="group" aria-label="Archive number ' + esc(i.number) + ', awaiting photograph">' +
          '<div class="pending-frame"><span class="pending-stamp">Awaiting the<br>Royal Photographer</span></div>' +
          '<div class="arch-card-body"><p class="arch-no">Archive No. ' + esc(i.number) + '</p><p class="arch-caption">' + esc(i.caption) + '</p></div></div>';
      }
      return '<button type="button" class="arch-card" data-open="' + esc(i.number) + '" aria-label="Open archive number ' + esc(i.number) + ': ' + esc(i.title) + '">' +
        '<div class="arch-thumb"><img src="' + esc(i.thumb || i.image) + '" alt="' + esc(i.alt) + '" loading="lazy" width="640" height="480"></div>' +
        '<div class="arch-card-body"><p class="arch-no">Archive No. ' + esc(i.number) + '</p><p class="arch-caption">' + esc(i.caption) + "</p></div></button>";
    }).join("");
  }
  grid.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-open]"); if (b) openByNumber(b.getAttribute("data-open"), b);
  });

  /* ---------- detail dialog ---------- */
  function openByNumber(n, trigger) {
    var item = byNumber(n);
    if (!item || item.pending) return;
    // make sure the item is in the filtered list; if not, reset the filter
    if (visible().indexOf(item) === -1) { current = "All"; renderFilters(); renderGrid(); }
    openIndex = visible().indexOf(item);
    lastFocus = trigger || document.activeElement;
    fillDialog();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    try { history.replaceState(null, "", "#" + n); } catch (e) {}
    var c = dlgIn.querySelector("[data-close]"); if (c) c.focus();
  }

  function navigable() { return visible().filter(function (i) { return !i.pending; }); }

  function fillDialog() {
    var list = navigable();
    var item = visible()[openIndex];
    var pos = list.indexOf(item);
    var dl = item.downloadable !== false;
    dlgIn.innerHTML =
      '<button type="button" class="dlg-close" data-close aria-label="Close">&times;</button>' +
      '<figure class="dlg-fig"><img src="' + esc(item.image) + '" alt="' + esc(item.alt) + '"></figure>' +
      '<div class="dlg-copy">' +
        '<p class="arch-no" id="dlg-title">Archive No. ' + esc(item.number) + " &middot; " + esc(item.title) + "</p>" +
        '<p class="dlg-caption">' + esc(item.caption) + "</p>" +
        '<dl class="dlg-meta">' +
          "<dt>Classification</dt><dd>" + esc(item.classification) + "</dd>" +
          "<dt>Official statement</dt><dd>" + esc(item.statement) + "</dd>" +
          (item.event ? "<dt>Event</dt><dd>" + esc(item.event) + "</dd>" : "") +
          (item.date ? "<dt>Date</dt><dd>" + esc(item.date) + "</dd>" : "") +
          "<dt>Category</dt><dd>" + esc(item.category) + "</dd>" +
        "</dl>" +
        '<p class="dlg-satire">Fictional, staged or digitally edited for satire. Not a real event.</p>' +
        '<div class="dlg-actions">' +
          (dl ? '<a class="btn btn-line btn-sm" href="' + esc(item.image) + '" download>Download</a>' : "") +
          '<button type="button" class="btn btn-line btn-sm" data-share>Share</button>' +
          '<span class="dlg-status" id="dlg-status" role="status" aria-live="polite"></span>' +
        "</div>" +
        '<div class="dlg-nav">' +
          '<button type="button" class="btn btn-ghost-dark btn-sm" data-prev' + (pos <= 0 ? " disabled" : "") + ">Previous</button>" +
          '<span class="dlg-pos">' + (pos + 1) + " of " + list.length + "</span>" +
          '<button type="button" class="btn btn-ghost-dark btn-sm" data-next' + (pos >= list.length - 1 ? " disabled" : "") + ">Next</button>" +
        "</div>" +
      "</div>";
  }

  function step(delta) {
    var list = navigable();
    var item = visible()[openIndex];
    var pos = list.indexOf(item) + delta;
    if (pos < 0 || pos >= list.length) return;
    var next = list[pos];
    openIndex = visible().indexOf(next);
    fillDialog();
    try { history.replaceState(null, "", "#" + next.number); } catch (e) {}
    var btn = dlgIn.querySelector(delta > 0 ? "[data-next]:not([disabled])" : "[data-prev]:not([disabled])") || dlgIn.querySelector("[data-close]");
    if (btn) btn.focus();
  }

  function closeDialog() {
    if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
  }

  function share() {
    var item = visible()[openIndex];
    var url = location.href.split("#")[0] + "#" + item.number;
    var status = document.getElementById("dlg-status");
    var text = "Archive No. " + item.number + ": " + item.caption;
    if (navigator.share) {
      navigator.share({ title: "The Royal Archives", text: text, url: url }).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { status.textContent = "Link copied."; },
        function () { status.textContent = "Couldn’t copy. The link is " + url; });
    } else {
      status.textContent = "Copy this link: " + url;
    }
  }

  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) return closeDialog();          // click on the backdrop
    var t = e.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-close")) closeDialog();
    else if (t.hasAttribute("data-prev")) step(-1);
    else if (t.hasAttribute("data-next")) step(1);
    else if (t.hasAttribute("data-share")) share();
  });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  });
  dlg.addEventListener("close", function () {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });

  function fromHash() {
    var n = (location.hash || "").replace("#", "");
    if (/^\d{4}$/.test(n) && byNumber(n) && !byNumber(n).pending) openByNumber(n);
  }
  window.addEventListener("hashchange", fromHash);

  renderFeatured(); renderFilters(); renderGrid(); fromHash();
})();
