/* The anthem sing-along. Lyrics and timings come from the database if you have synced them in the desk,
   otherwise from anthem-data.js. You should not need to edit this. */
(function () {
  "use strict";
  var root = document.getElementById("an-root"); if (!root) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var DATA = window.RAEESI_ANTHEM || { lines: [] }, cfg = window.RAEESI_SUPABASE || {};
  var video = $("an-video"), box = $("an-lyrics"), lines = DATA.lines.slice(), baseOffset = 0, nudge = 0, idx = -1, lyricsOnly = false;
  try { nudge = Number(localStorage.getItem("raeesi.anthem.nudge") || 0) || 0; } catch (e) {}
  video.src = DATA.video; if (DATA.poster) video.poster = DATA.poster;
  if (DATA.title) { $("an-title").textContent = DATA.title + "."; }

  function render() {
    var html = "", sec = null;
    lines.forEach(function (l, i) {
      if (l.section && l.section !== sec) { sec = l.section; html += '<p class="ly-section">' + esc(sec) + "</p>"; }
      html += '<p class="ly-line" data-i="' + i + '" role="button" tabindex="0">' + esc(l.text) + "</p>";
    });
    box.innerHTML = html || '<p class="file-meta">The lyrics aren’t available just now.</p>';
    idx = -2; update(true);
  }
  function offset() { return baseOffset + nudge; }
  function indexAt(time) {
    var t = time - offset(), lo = 0, hi = lines.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (Number(lines[mid].t) <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }
  function update(force) {
    var i = indexAt(video.currentTime || 0);
    if (i === idx && !force) return; idx = i;
    var els = box.querySelectorAll(".ly-line");
    Array.prototype.forEach.call(els, function (el, k) { el.classList.toggle("now", k === i); el.classList.toggle("past", k < i); if (k === i) el.setAttribute("aria-current", "true"); else el.removeAttribute("aria-current"); });
    $("k-now").textContent = i >= 0 ? lines[i].text : (lines.length ? "♛" : "");
    $("k-next").textContent = i + 1 < lines.length ? lines[i + 1].text : "";
    var cur = box.querySelector(".ly-line.now");
    if (cur && !lyricsOnly) { var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; box.scrollTo({ top: cur.offsetTop - box.clientHeight / 2 + cur.clientHeight / 2, behavior: reduce ? "auto" : "smooth" }); }
  }
  video.addEventListener("timeupdate", function () { update(false); });
  video.addEventListener("seeked", function () { update(false); });
  (function loop() { if (!video.paused && !video.ended) update(false); requestAnimationFrame(loop); })();
  video.addEventListener("error", function () { $("an-msg").innerHTML = "The video couldn’t be played here. You can still read the lyrics below, or <a href=\"" + esc(DATA.video) + "\">open the video file</a>."; });

  function seekTo(i) { if (!lines[i]) return; video.currentTime = Math.max(0, Number(lines[i].t) + offset()); var p = video.play && video.play(); if (p && p.catch) p.catch(function () {}); }
  box.addEventListener("click", function (e) { var el = e.target.closest(".ly-line"); if (el) seekTo(Number(el.getAttribute("data-i"))); });
  box.addEventListener("keydown", function (e) { var el = e.target.closest(".ly-line"); if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); seekTo(Number(el.getAttribute("data-i"))); } });

  function showNudge() { $("an-off").textContent = (nudge > 0 ? "+" : "") + nudge.toFixed(2).replace(/0$/, "") + "s"; }
  function setNudge(v) { nudge = Math.max(-5, Math.min(5, Math.round(v * 100) / 100)); try { localStorage.setItem("raeesi.anthem.nudge", String(nudge)); } catch (e) {} showNudge(); update(true); }
  $("an-early").addEventListener("click", function () { setNudge(nudge - 0.25); });   // lyrics appear earlier
  $("an-late").addEventListener("click", function () { setNudge(nudge + 0.25); });
  showNudge();

  $("an-mode").addEventListener("click", function () {
    lyricsOnly = !lyricsOnly; this.setAttribute("aria-pressed", String(lyricsOnly)); this.textContent = lyricsOnly ? "Show the video" : "Lyrics only";
    $("an-stage").hidden = lyricsOnly; root.classList.toggle("lyrics-only", lyricsOnly); if (lyricsOnly) video.pause(); box.scrollTop = 0;
  });
  $("an-full").addEventListener("click", function () {
    var st = $("an-stage");
    if (st.requestFullscreen) st.requestFullscreen().catch(function () { $("an-msg").textContent = "Full screen isn’t available in this browser."; });
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else $("an-msg").textContent = "Full screen isn’t available in this browser.";
  });
  $("an-share").addEventListener("click", function () {
    var url = location.href.split("#")[0], data = { title: DATA.title || "The Empire Needs Builders", text: "Sing the anthem of the Republic of Raeesi", url: url };
    if (navigator.share) navigator.share(data).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { $("an-msg").textContent = "Link copied."; }, function () { $("an-msg").textContent = url; });
    else $("an-msg").textContent = url;
  });

  render();

  // If you've synced the lyrics in the desk, use that version.
  if (cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient) {
    var sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    Promise.all([sb.from("anthem_lines").select("*").order("idx", { ascending: true }), sb.from("anthem_settings").select("*").eq("id", 1).maybeSingle()]).then(function (rs) {
      var rows = rs[0] && !rs[0].error ? rs[0].data || [] : [], st = rs[1] && !rs[1].error ? rs[1].data : null;
      if (st) { if (st.video_url) { video.src = st.video_url; DATA.video = st.video_url; } if (st.poster_url) video.poster = st.poster_url; if (st.title) $("an-title").textContent = st.title + "."; baseOffset = Number(st.time_offset) || 0; }
      if (rows.length) { lines = rows.map(function (r) { return { t: Number(r.t), text: r.text, section: r.section || "" }; }); render(); }
    }, function () {});
  }
})();
