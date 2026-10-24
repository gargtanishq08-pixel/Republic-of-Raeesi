/* ==========================================================================
   The Supreme Leader's Desk: private admin page.
   It only works for the admin email. Every action is also checked by the database,
   so nobody else can use these buttons even if they find this page.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.RAEESI_SUPABASE || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function say(t, bad) { var el = $("#adm-status"); el.innerHTML = t ? '<div class="notice' + (bad ? " warn" : "") + '"><p>' + t + "</p></div>" : ""; if (t && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  function errText(e) { return esc((e && (e.message || e.msg)) || "Something went wrong."); }
  function fmt(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  function uuid() { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function lines(t) { return String(t || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function list(t) { return String(t || "").split(/[,\n]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function roman(n) { var m = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], s = ""; m.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } }); return s; }
  function slugify(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }

  var TABS = [["review", "Review"], ["members", "Members"], ["pitches", "Pitches"], ["missions", "Missions"], ["archive", "Archive"], ["stories", "Stories"]];
  var S = { sb: null, user: null, admin: false, tab: "review", checked: false, memberQ: "" };
  var CATEGORIES = ["Official Portraits", "State Symbols", "Military Ceremonies", "State Banquets", "Foreign Diplomacy", "Supreme Leader's Decrees", "National Achievements", "Royal Palace Life", "Royal Holidays", "The Supreme Leader's Personal Opinions", "Classified Affairs"];

  /* ---------- pictures ---------- */
  function mediaUrl(path) { return String(CFG.url).replace(/\/$/, "") + "/storage/v1/object/public/media/" + path; }
  function pathFromUrl(u) { var m = String(u || "").match(/\/storage\/v1\/object\/public\/media\/(.+)$/); return m ? m[1] : null; }
  function resizeToBlob(file, maxEdge, quality) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Please choose a JPG, PNG or WebP picture."));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, maxEdge / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("Couldn’t process that picture.")); }, "image/jpeg", quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Couldn’t read that picture.")); };
      img.src = url;
    });
  }
  function upload(path, blob) {
    return S.sb.storage.from("media").upload(path, blob, { contentType: "image/jpeg", upsert: false }).then(function (r) { if (r.error) throw r.error; return mediaUrl(path); });
  }
  function removeFiles(urls) {
    var paths = urls.map(pathFromUrl).filter(Boolean);
    if (paths.length && S.sb.storage.from("media").remove) S.sb.storage.from("media").remove(paths).then(function () {}, function () {});
  }

  /* ---------- start + sign in ---------- */
  function start() {
    var app = $("#adm-app");
    if (!CFG.url || !CFG.anonKey) { app.innerHTML = '<div class="notice"><p>The database isn’t connected yet (supabase-config.js is empty).</p></div>'; return; }
    if (!window.supabase || !window.supabase.createClient) { app.innerHTML = '<div class="notice warn"><p>A needed script was blocked. Please reload.</p></div>'; return; }
    S.sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    document.addEventListener("click", onClick); document.addEventListener("submit", onSubmit); document.addEventListener("input", onInput); document.addEventListener("change", onInput);
    S.sb.auth.onAuthStateChange(function (ev, session) { var u = session ? session.user : null; if ((u && u.id) !== (S.user && S.user.id) || !S.checked) { S.user = u; verify(); } });
    S.sb.auth.getSession().then(function (r) { var u = r.data && r.data.session ? r.data.session.user : null; if (!S.checked) { S.user = u; verify(); } });
  }
  function verify() {
    S.checked = true; S.admin = false;
    if (!S.user) return render();
    S.sb.rpc("is_admin").then(function (r) { S.admin = !!(r && r.data === true); render(); }, function () { S.admin = false; render(); });
  }
  function render() {
    var app = $("#adm-app");
    if (!S.user) {
      app.innerHTML = '<form data-form="signin" class="authbar"><label for="si-email">Admin sign-in: enter your email</label><div class="inline"><input type="email" id="si-email" required autocomplete="email" placeholder="you@example.com"><button type="submit" class="btn btn-dark btn-sm">Email me a sign-in link</button></div><p class="hint">We’ll email you a one-time link. Only the admin email can use this page.</p></form>';
      return;
    }
    if (!S.admin) { app.innerHTML = '<div class="notice warn"><p>This area is only for the Supreme Leader. You’re signed in as <strong>' + esc(S.user.email || "") + '</strong>, which isn’t the admin email. <button type="button" class="linkish" data-act="signout">Sign out</button></p></div>'; return; }
    app.innerHTML = '<div class="authbar signed"><span class="who">Signed in as <strong>' + esc(S.user.email) + '</strong></span> <button type="button" class="linkish" data-act="signout">Sign out</button></div>' +
      '<div class="tabs" role="tablist" aria-label="Admin sections">' + TABS.map(function (t) { return '<button type="button" role="tab" class="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>" +
      '<div class="tab-panel" id="adm-panel"><p class="file-meta">Loading…</p></div>';
    loadTab();
  }

  /* ---------- tabs ---------- */
  function loadTab() {
    var host = $("#adm-panel"); if (!host) return;
    host.innerHTML = '<p class="file-meta">Loading…</p>';
    var fn = { review: tabReview, members: tabMembers, pitches: tabPitches, missions: tabMissions, archive: tabArchive, stories: tabStories }[S.tab];
    fn(host);
  }
  function btn(act, id, label, cls, extra) { return '<button type="button" class="btn ' + (cls || "btn-line") + ' btn-sm" data-act="' + act + '" data-id="' + esc(id) + '"' + (extra || "") + ">" + label + "</button>"; }
  function changed(live, pend) { return Object.keys(pend || {}).filter(function (k) { return JSON.stringify(pend[k]) !== JSON.stringify(live[k]); }); }

  function tabReview(host) {
    var sb = S.sb;
    Promise.all([sb.rpc("admin_members"), sb.from("profiles").select("*"), sb.from("pitches").select("*").order("created_at", { ascending: false }), sb.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false })]).then(function (rs) {
      for (var i = 0; i < rs.length; i++) if (rs[i].error) throw rs[i].error;
      var members = rs[0].data || [], profiles = rs[1].data || [], pitches = rs[2].data || [], reports = rs[3].data || [];
      var wm = members.filter(function (m) { return !m.approved && !m.suspended; });
      var pe = profiles.filter(function (p) { return p.approved && p.pending; });
      var np = pitches.filter(function (p) { return !p.approved; });
      var ne = pitches.filter(function (p) { return p.approved && p.pending; });
      var html = '<p class="file-meta">Everything here is hidden from other people until you approve it. Nothing happens if you leave it.</p>';
      html += "<h3>New members waiting (" + wm.length + ")</h3>" + (wm.length ? wm.map(function (m) {
        var minor = /^1[46]/.test(m.age_band);
        return '<div class="entry"><p><strong>' + esc(m.display_name || "(no profile yet)") + "</strong> &middot; " + esc(m.email) + " &middot; " + esc(m.age_band) + (minor ? ' <span class="badge st-under-review">Under 18: check with a parent or guardian first</span>' : "") + " &middot; joined " + fmt(m.created_at) + "</p>" +
          '<div class="mc-actions">' + btn("approve-member", m.id, "Approve member and their posts", "btn-dark") + btn("member-action", m.id, "Delete", "btn-line", ' data-do="delete"') + "</div></div>";
      }).join("") : '<p class="file-meta">Nobody waiting.</p>');
      html += "<h3>New pitches waiting (" + np.length + ")</h3>" + (np.length ? np.map(function (p) { return pitchRow(p, true); }).join("") : '<p class="file-meta">None.</p>');
      html += "<h3>Pitch edits waiting (" + ne.length + ")</h3>" + (ne.length ? ne.map(function (p) { return pitchRow(p, true); }).join("") : '<p class="file-meta">None.</p>');
      html += "<h3>Profile edits waiting (" + pe.length + ")</h3>" + (pe.length ? pe.map(function (p) {
        return '<div class="entry"><p><strong>' + esc(p.display_name) + "</strong> changed: " + esc(changed(p, p.pending).join(", ")) + "</p>" +
          '<div class="mc-actions">' + btn("view-profile", p.id, "View", "btn-line") + btn("approve-profile", p.id, "Approve edit", "btn-dark") + btn("reject-profile", p.id, "Reject edit") + "</div></div>"; }).join("") : '<p class="file-meta">None.</p>');
      html += "<h3>Open reports (" + reports.length + ")</h3>" + (reports.length ? reports.map(function (r) {
        return '<div class="entry"><p><strong>' + esc(r.target_type) + "</strong> <code>" + esc(r.target_id) + "</code> &middot; " + fmt(r.created_at) + "</p><p>" + esc(r.reason) + "</p>" +
          '<div class="mc-actions">' + (r.target_type === "pitch" ? btn("hide-pitch", r.target_id, "Hide that pitch", "btn-line") : "") + (r.target_type === "comment" ? btn("hide-comment", r.target_id, "Hide that comment", "btn-line") : "") +
          btn("report-done", r.id, "Mark handled", "btn-dark", ' data-do="actioned"') + btn("report-done", r.id, "Dismiss", "btn-line", ' data-do="dismissed"') + "</div></div>"; }).join("") : '<p class="file-meta">No open reports.</p>');
      host.innerHTML = html; S.cache = { profiles: profiles, pitches: pitches };
    }).catch(function (e) { host.innerHTML = '<div class="notice warn"><p>' + errText(e) + " (If you haven’t yet: re-run supabase-setup.sql in Supabase.)</p></div>"; });
  }

  function pitchRow(p, review) {
    var live = !p.approved ? "new" : p.pending ? "edit: " + changed(p, p.pending).join(", ") : "live";
    return '<div class="entry"><p><strong>' + esc(p.title) + "</strong> by " + esc(p.author_name) + " &middot; " + esc(p.visibility) + " &middot; " + esc(live) + (p.hidden ? ' <span class="badge st-under-review">Hidden</span>' : "") + "</p>" +
      '<div class="mc-actions">' + btn("view-pitch", p.id, "View") +
      (review ? ((!p.approved || p.pending) ? btn("approve-pitch", p.id, p.pending ? "Approve edit" : "Approve", "btn-dark") : "") + (p.pending ? btn("reject-pitch", p.id, "Reject edit") : "")
              : ((!p.approved || p.pending) ? btn("approve-pitch", p.id, "Approve", "btn-dark") : "")) +
      btn("hide-pitch", p.id, p.hidden ? "Unhide" : "Hide", "btn-line", ' data-do="' + (p.hidden ? "unhide" : "hide") + '"') + btn("delete-pitch", p.id, "Delete") + "</div></div>";
  }

  function tabMembers(host) {
    S.sb.rpc("admin_members").then(function (r) {
      if (r.error) throw r.error;
      S.cache = { members: r.data || [] }; paintMembers(host);
    }).catch(function (e) { host.innerHTML = '<div class="notice warn"><p>' + errText(e) + "</p></div>"; });
  }
  function paintMembers(host) {
    host = host || $("#adm-panel"); var q = S.memberQ.toLowerCase();
    var rows = (S.cache.members || []).filter(function (m) { return !q || [m.email, m.display_name].join(" ").toLowerCase().indexOf(q) > -1; });
    host.innerHTML = '<div class="toolbar"><label class="sr-only" for="mem-q">Search members</label><input type="search" id="mem-q" data-search="member" placeholder="Search by name or email…" value="' + esc(S.memberQ) + '"></div>' +
      '<p class="file-meta">' + rows.length + " of " + S.cache.members.length + " members. “Delete” removes the person, their profile, pitches and their sign-in for good.</p>" +
      (rows.length ? rows.map(function (m) {
        return '<div class="entry"><p><strong>' + esc(m.display_name || "(no profile)") + "</strong> &middot; " + esc(m.email) + " &middot; " + esc(m.age_band) + " &middot; joined " + fmt(m.created_at) +
          (m.approved ? ' <span class="badge st-open">Approved</span>' : ' <span class="badge st-in-progress">Waiting</span>') + (m.suspended ? ' <span class="badge st-under-review">Suspended</span>' : "") + (m.has_pending ? ' <span class="badge st-in-progress">Edits waiting</span>' : "") +
          ((m.goals || []).indexOf("publicity") > -1 ? ' <span class="badge level">Wants publicity</span>' : "") + "</p>" +
          '<div class="mc-actions">' + (!m.approved ? btn("approve-member", m.id, "Approve", "btn-dark") : "") + (m.suspended ? btn("member-action", m.id, "Restore", "btn-line", ' data-do="unsuspend"') : btn("member-action", m.id, "Suspend", "btn-line", ' data-do="suspend"')) + btn("member-action", m.id, "Delete", "btn-line", ' data-do="delete"') + "</div></div>";
      }).join("") : '<p class="file-meta">No members match.</p>');
  }

  function tabPitches(host) {
    S.sb.from("pitches").select("*").order("created_at", { ascending: false }).then(function (r) {
      if (r.error) throw r.error; S.cache = { pitches: r.data || [] };
      host.innerHTML = '<p class="file-meta">' + (r.data || []).length + " pitches.</p>" + ((r.data || []).length ? r.data.map(function (p) { return pitchRow(p, false); }).join("") : '<p class="file-meta">None yet.</p>');
    }).catch(function (e) { host.innerHTML = '<div class="notice warn"><p>' + errText(e) + "</p></div>"; });
  }

  function tabMissions(host) {
    S.sb.from("missions").select("*").order("id", { ascending: true }).then(function (r) {
      if (r.error) throw r.error; S.cache = { missions: r.data || [] };
      host.innerHTML = '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-mission">Add a mission</button></div>' +
        '<p class="file-meta">Draft missions are hidden from the public. Set a mission to Open to publish it.</p>' +
        (r.data.length ? r.data.map(function (m) {
          return '<div class="entry"><p><strong>Mission ' + esc(m.number) + ": " + esc(m.title) + '</strong> <span class="badge ' + stClass(m.status) + '">' + esc(m.status) + "</span> &middot; " + esc(m.difficulty) +
            (m.deadline ? " &middot; deadline " + esc(m.deadline) : "") + '</p><div class="mc-actions">' + btn("edit-mission", m.id, "Edit") + btn("delete-mission", m.id, "Delete") + "</div></div>";
        }).join("") : '<p class="file-meta">No missions yet.</p>');
    }).catch(function (e) { host.innerHTML = '<div class="notice warn"><p>' + errText(e) + "</p></div>"; });
  }
  function stClass(s) { return "st-" + String(s).toLowerCase().replace(/\s+/g, "-"); }

  function tabArchive(host) {
    S.sb.from("archive_items").select("*").order("number", { ascending: true }).then(function (r) {
      if (r.error) throw r.error; S.cache = { archive: r.data || [] };
      host.innerHTML = '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-archive">Add an archive photo</button></div>' +
        (r.data.length ? '<div class="adm-grid">' + r.data.map(function (a) {
          return '<div class="adm-card">' + (a.thumb || a.image ? '<img src="' + esc(a.thumb || a.image) + '" alt="" loading="lazy">' : '<div class="adm-ph">No image</div>') +
            "<p><strong>" + esc(a.number) + "</strong> " + esc(a.title) + '</p><p class="file-meta">' + esc(a.category) + (a.featured ? " &middot; Featured" : "") + (a.pending ? " &middot; Placeholder" : "") + (a.published ? "" : " &middot; Unpublished") + '</p><div class="mc-actions">' + btn("edit-archive", a.number, "Edit") + btn("delete-archive", a.number, "Delete") + "</div></div>";
        }).join("") + "</div>" : '<p class="file-meta">No archive items yet.</p>');
    }).catch(function (e) { host.innerHTML = '<div class="notice warn"><p>' + errText(e) + "</p></div>"; });
  }

  function tabStories(host) {
    S.sb.from("stories").select("*").order("created_at", { ascending: false }).then(function (r) {
      if (r.error) throw r.error; S.cache = { stories: r.data || [] };
      host.innerHTML = '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-story">Write a story</button></div>' +
        '<p class="file-meta">Stories go on the public Newsroom once Published. Founder stories and interviews can only be published after you confirm the person agreed.</p>' +
        (r.data.length ? r.data.map(function (s) {
          return '<div class="entry"><p><strong>' + esc(s.headline) + "</strong> &middot; " + esc(s.kind) + (s.published ? ' <span class="badge st-open">Published</span>' : ' <span class="badge st-archived">Draft</span>') + "</p>" +
            '<div class="mc-actions">' + btn("edit-story", s.id, "Edit") + btn("toggle-story", s.id, s.published ? "Unpublish" : "Publish", "btn-line") + btn("delete-story", s.id, "Delete") + "</div></div>";
        }).join("") : '<p class="file-meta">No stories yet. Write the first one.</p>');
    }).catch(function (e) { host.innerHTML = '<div class="notice warn"><p>' + errText(e) + "</p></div>"; });
  }

  /* ---------- dialog ---------- */
  var dlg = $("#adm-dialog"), dlgIn = $("#ad-in");
  function showDialog(html) {
    dlgIn.innerHTML = '<button type="button" class="dlg-close" data-close aria-label="Close">&times;</button>' + html;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    dlg.scrollTop = 0; var c = dlgIn.querySelector("input:not([type=checkbox]):not([type=file]), textarea, select") || dlgIn.querySelector("[data-close]"); if (c) c.focus({ preventScroll: true });
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); dlgIn.innerHTML = ""; }
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(); });
  function done(msg) { closeDialog(); say(msg); loadTab(); }
  function fld(id, label, input, hint) { return '<div class="field"><label for="' + id + '">' + label + "</label>" + (hint ? '<span class="hint">' + hint + "</span>" : "") + input + "</div>"; }
  function inp(id, v, extra) { return '<input type="text" id="' + id + '" value="' + esc(v == null ? "" : v) + '" ' + (extra || "") + ">"; }
  function ta(id, v, rows) { return '<textarea id="' + id + '" style="min-height:' + (rows || 5) + 'rem">' + esc(v == null ? "" : v) + "</textarea>"; }
  function chkb(id, label, on) { return '<div class="check"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '><label for="' + id + '">' + label + "</label></div>"; }

  /* ---------- mission form ---------- */
  function missionForm(m) {
    var all = (S.cache && S.cache.missions) || [];
    var n = all.reduce(function (a, x) { return Math.max(a, parseInt(String(x.id).slice(1), 10) || 0); }, 0) + 1;
    m = m || { id: "M" + ("00" + n).slice(-3), number: roman(n), title: "", status: "Draft", difficulty: "Medium", categories: [], skills: [], summary: "", objectives: [], deliverables: [], instructions: [], opens: "", deadline: "", review_by: "" };
    var isNew = !m.created_at && !all.some(function (x) { return x.id === m.id; });
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Add a mission" : "Edit " + esc(m.id)) + '</h2><form data-form="mission" data-new="' + isNew + '">' +
      '<div class="row-2">' + fld("mi-id", "Mission ID", inp("mi-id", m.id, "required pattern=\"M[0-9]{3}\"" + (isNew ? "" : " readonly")), "Like M008. Can’t be changed later.") + fld("mi-num", "Number (shown as “Mission …”)", inp("mi-num", m.number, "maxlength=\"6\"")) + "</div>" +
      fld("mi-title", "Title *", inp("mi-title", m.title, "required minlength=\"3\" maxlength=\"120\"")) +
      '<div class="row-2">' + fld("mi-status", "Status", '<select id="mi-status">' + ["Draft", "Open", "In Progress", "Under Review", "Completed", "Archived"].map(function (s) { return "<option" + (m.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>", "Draft = hidden from the public.") +
      fld("mi-diff", "Difficulty", '<select id="mi-diff">' + ["Easy", "Medium", "Hard"].map(function (s) { return "<option" + (m.difficulty === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>") + "</div>" +
      fld("mi-sum", "Summary *", ta("mi-sum", m.summary, 4)) +
      fld("mi-cat", "Categories", inp("mi-cat", (m.categories || []).join(", ")), "Separate with commas.") + fld("mi-skills", "Skills that help", inp("mi-skills", (m.skills || []).join(", ")), "Separate with commas.") +
      fld("mi-obj", "Objectives", ta("mi-obj", (m.objectives || []).join("\n"), 5), "One per line.") + fld("mi-del", "What to hand in", ta("mi-del", (m.deliverables || []).join("\n"), 4), "One per line.") + fld("mi-ins", "How to take part", ta("mi-ins", (m.instructions || []).join("\n"), 4), "One per line.") +
      '<div class="row-2">' + fld("mi-opens", "Opens", '<input type="date" id="mi-opens" value="' + esc(m.opens || "") + '">') + fld("mi-dead", "Deadline", '<input type="date" id="mi-dead" value="' + esc(m.deadline || "") + '">') + "</div>" +
      fld("mi-rev", "Results by", '<input type="date" id="mi-rev" value="' + esc(m.review_by || "") + '">') +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save mission</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ---------- archive form ---------- */
  function archiveForm(a) {
    var all = (S.cache && S.cache.archive) || [];
    var n = all.reduce(function (x, i) { return Math.max(x, parseInt(i.number, 10) || 0); }, 0) + 1;
    var isNew = !a;
    a = a || { number: ("000" + n).slice(-4), title: "", category: "", classification: "", caption: "", statement: "", event: "", item_date: "", image: "", thumb: "", alt: "", featured: false, downloadable: true, pending: false, published: true };
    var cats = CATEGORIES.concat(all.map(function (x) { return x.category; })).filter(function (c, i, arr) { return arr.indexOf(c) === i; });
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Add an archive photo" : "Edit archive " + esc(a.number)) + '</h2><form data-form="archive" data-new="' + isNew + '" data-old-image="' + esc(a.image || "") + '" data-old-thumb="' + esc(a.thumb || "") + '">' +
      '<div class="row-2">' + fld("ar-num", "Archive number", inp("ar-num", a.number, "required pattern=\"[0-9]{4}\"" + (isNew ? "" : " readonly")), "Four digits.") + fld("ar-title", "Event name *", inp("ar-title", a.title, "required maxlength=\"120\"")) + "</div>" +
      fld("ar-img", "Photo", '<input type="file" id="ar-img" accept="image/jpeg,image/png,image/webp">' + (a.image ? '<p class="file-meta">Current photo is kept unless you choose a new one.</p>' : ""), "JPG, PNG or WebP. It’s resized for you. Leave empty for a “photographer wanted” placeholder.") +
      fld("ar-alt", "Describe the photo (for screen readers)", inp("ar-alt", a.alt, "maxlength=\"300\"")) +
      '<div class="row-2">' + fld("ar-cat", "Category *", inp("ar-cat", a.category, "required list=\"ar-cats\" maxlength=\"60\"") + '<datalist id="ar-cats">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>") + fld("ar-class", "Classification", inp("ar-class", a.classification, "maxlength=\"60\"")) + "</div>" +
      fld("ar-cap", "Deadpan caption *", inp("ar-cap", a.caption, "required maxlength=\"200\"")) + fld("ar-stmt", "Official statement", inp("ar-stmt", a.statement, "maxlength=\"200\"")) +
      '<div class="row-2">' + fld("ar-event", "Fictional event name (optional)", inp("ar-event", a.event, "maxlength=\"120\"")) + fld("ar-date", "Fictional date (optional)", inp("ar-date", a.item_date, "maxlength=\"60\"")) + "</div>" +
      chkb("ar-pub", "Published (visible on the website)", a.published) + chkb("ar-feat", "Featured at the top of the archive (only one at a time)", a.featured) + chkb("ar-dl", "Allow downloads", a.downloadable) + chkb("ar-pend", "Placeholder: “awaiting the Royal Photographer”", a.pending) +
      '<div class="panel"><p>Keep everything clearly fictional. Don’t use pictures of real people unless you have their permission and the rights to the image.</p></div>' +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ---------- story form ---------- */
  function storyForm(s) {
    var isNew = !s;
    s = s || { id: "", slug: "", kind: "Founder story", headline: "", dek: "", body: "", cover_image: "", cover_alt: "", video_url: "", person_name: "", person_role: "", venture: "", venture_url: "", relationship: "Member of the Republic", consent_confirmed: false, person_is_minor: false, guardian_consent: false, published: false };
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Write a story" : "Edit story") + '</h2><form data-form="story" data-id="' + esc(s.id) + '" data-old-cover="' + esc(s.cover_image || "") + '" data-published-at="' + esc(s.published_at || "") + '">' +
      '<div class="row-2">' + fld("st-kind", "Type", '<select id="st-kind">' + ["Founder story", "Interview", "Republic news", "Announcement"].map(function (k) { return "<option" + (s.kind === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select>") +
      fld("st-rel", "How are they connected to the Republic?", '<select id="st-rel">' + ["Member of the Republic", "Mentored by the Supreme Leader", "Partner", "None"].map(function (k) { return "<option" + (s.relationship === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select>", "Shown on the story. Only choose what is true. “None” for general news.") + "</div>" +
      fld("st-head", "Headline *", inp("st-head", s.headline, "required minlength=\"5\" maxlength=\"140\"")) +
      fld("st-slug", "Web address ending", inp("st-slug", s.slug, "maxlength=\"80\" placeholder=\"filled in from the headline\""), "Lowercase letters, numbers and hyphens.") +
      fld("st-dek", "One-line summary", inp("st-dek", s.dek, "maxlength=\"300\"")) +
      fld("st-body", "The story *", ta("st-body", s.body, 12), "Leave a blank line between paragraphs. Links starting with https:// become clickable.") +
      fld("st-cover", "Cover picture", '<input type="file" id="st-cover" accept="image/jpeg,image/png,image/webp">' + (s.cover_image ? '<p class="file-meta">Current picture is kept unless you choose a new one.</p>' : "")) +
      fld("st-calt", "Describe the cover picture", inp("st-calt", s.cover_alt, "maxlength=\"300\"")) +
      fld("st-video", "Video link (optional)", '<input type="url" id="st-video" maxlength="300" placeholder="https://" value="' + esc(s.video_url || "") + '">', "YouTube, Vimeo, Loom or Google Drive. It plays inside the story.") +
      '<div class="row-2">' + fld("st-pn", "Person’s name", inp("st-pn", s.person_name, "maxlength=\"80\"")) + fld("st-pr", "Their role", inp("st-pr", s.person_role, "maxlength=\"80\" placeholder=\"e.g. Founder\"")) + "</div>" +
      '<div class="row-2">' + fld("st-v", "Venture or project", inp("st-v", s.venture, "maxlength=\"80\"")) + fld("st-vu", "Venture website", '<input type="url" id="st-vu" maxlength="300" placeholder="https://" value="' + esc(s.venture_url || "") + '">') + "</div>" +
      '<div class="panel"><h3>Before you publish</h3>' + chkb("st-consent", "This person has agreed to be featured, and what I’ve written about them (and how they’re connected to the Republic) is accurate.", s.consent_confirmed) +
      chkb("st-minor", "The person is under 18", s.person_is_minor) + chkb("st-guard", "A parent or guardian has agreed to this story", s.guardian_consent) +
      "<p>Don’t publish anyone’s story, photo or name without their agreement. Don’t claim investment or results that aren’t real.</p></div>" +
      chkb("st-pub", "Published (visible on the public Newsroom)", s.published) +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save story</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ---------- clicks ---------- */
  function onClick(e) {
    var el = e.target.closest("[data-act],[data-close]"); if (!el) return;
    if (el.hasAttribute("data-close")) return closeDialog();
    var act = el.getAttribute("data-act"), id = el.getAttribute("data-id"), what = el.getAttribute("data-do"), sb = S.sb;
    function run(p, ok) { p.then(function (r) { if (r.error) return say(errText(r.error), true); say(ok || (r.data && typeof r.data === "string" ? esc(r.data) : "Done.")); loadTab(); }, function (er) { say(errText(er), true); }); }
    var C = S.cache || {};
    if (act === "signout") { sb.auth.signOut().then(function () { S.user = null; S.admin = false; render(); }); return; }
    if (act === "tab") { S.tab = el.getAttribute("data-tab"); say(""); render(); return; }
    if (act === "approve-member") return run(sb.rpc("admin_approve", { p_kind: "member", p_id: id }));
    if (act === "approve-profile") return run(sb.rpc("admin_approve", { p_kind: "profile", p_id: id }));
    if (act === "approve-pitch") return run(sb.rpc("admin_approve", { p_kind: "pitch", p_id: id }));
    if (act === "reject-profile") { if (confirm("Reject this edit? The approved version stays as it is.")) run(sb.from("profiles").update({ pending: null }).eq("id", id), "Edit rejected."); return; }
    if (act === "reject-pitch") { if (confirm("Reject this edit? The approved version stays as it is.")) run(sb.from("pitches").update({ pending: null }).eq("id", id), "Edit rejected."); return; }
    if (act === "member-action") {
      var warn = what === "delete" ? "Delete this person, their profile, pitches and sign-in for good? This can’t be undone." : what === "suspend" ? "Suspend this member?" : "Restore this member?";
      if (confirm(warn)) run(sb.rpc("admin_member_action", { p_id: id, p_action: what })); return;
    }
    if (act === "hide-pitch") { run(sb.from("pitches").update({ hidden: what !== "unhide" }).eq("id", id), what === "unhide" ? "Pitch is visible again." : "Pitch hidden."); return; }
    if (act === "hide-comment") { run(sb.from("pitch_comments").update({ hidden: true }).eq("id", id), "Comment hidden."); return; }
    if (act === "delete-pitch") { if (confirm("Delete this pitch and its comments for good?")) run(sb.from("pitches").delete().eq("id", id), "Pitch deleted."); return; }
    if (act === "report-done") { run(sb.from("reports").update({ status: what }).eq("id", id), "Report updated."); return; }
    if (act === "view-pitch") {
      var p = ((C.pitches || []).filter(function (x) { return x.id === id; })[0]); if (!p) return; var v = Object.assign({}, p, p.pending || {});
      return showDialog('<h2 id="ad-title" class="md-title">' + esc(v.title) + "</h2><p class=\"file-meta\">by " + esc(p.author_name) + " &middot; " + esc(v.category) + " &middot; " + esc(v.status) + " &middot; shows as: " + esc(v.visibility) + (p.pending ? " (this is the EDIT awaiting approval)" : "") + "</p><p>" + esc(v.description) + "</p>" +
        (v.video_url ? '<p><a href="' + esc(v.video_url) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(v.video_url) + "</a></p>" : "") + (v.next_step ? "<p><strong>Next step:</strong> " + esc(v.next_step) + "</p>" : "") +
        '<div class="mc-actions">' + ((!p.approved || p.pending) ? btn("approve-pitch", p.id, "Approve", "btn-dark") : "") + '<button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>');
    }
    if (act === "view-profile") {
      var pr = ((C.profiles || []).filter(function (x) { return x.id === id; })[0]); if (!pr) return; var pv = Object.assign({}, pr, pr.pending || {});
      return showDialog('<h2 id="ad-title" class="md-title">' + esc(pv.display_name) + "</h2><p class=\"file-meta\">" + esc(pv.headline || "") + " &middot; " + esc(pv.city || "") + " &middot; shows as: " + esc(pv.visibility) + "</p>" +
        (pv.avatar_path ? '<img class="avatar lg" alt="" src="' + esc(String(CFG.url).replace(/\/$/, "") + "/storage/v1/object/public/avatars/" + pv.avatar_path) + '">' : "") +
        "<p>" + esc(pv.bio || "") + "</p><p><strong>Skills:</strong> " + esc((pv.skills || []).join(", ")) + "</p><p><strong>Offers:</strong> " + esc(pv.offering || "") + "</p><p><strong>Looking for:</strong> " + esc(pv.looking_for || "") + "</p>" +
        '<div class="mc-actions">' + btn("approve-profile", pr.id, "Approve", "btn-dark") + '<button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>');
    }
    if (act === "new-mission") return showDialog(missionForm());
    if (act === "edit-mission") return showDialog(missionForm((C.missions || []).filter(function (x) { return x.id === id; })[0]));
    if (act === "delete-mission") { if (confirm("Delete mission " + id + " for good? (Set it to Draft instead if you only want to hide it.)")) run(sb.from("missions").delete().eq("id", id), "Mission deleted."); return; }
    if (act === "new-archive") return showDialog(archiveForm());
    if (act === "edit-archive") return showDialog(archiveForm((C.archive || []).filter(function (x) { return x.number === id; })[0]));
    if (act === "delete-archive") {
      var it = (C.archive || []).filter(function (x) { return x.number === id; })[0];
      if (confirm("Delete archive " + id + " for good?")) sb.from("archive_items").delete().eq("number", id).then(function (r) { if (r.error) return say(errText(r.error), true); if (it) removeFiles([it.image, it.thumb]); say("Archive item deleted."); loadTab(); }); return;
    }
    if (act === "new-story") return showDialog(storyForm());
    if (act === "edit-story") return showDialog(storyForm((C.stories || []).filter(function (x) { return x.id === id; })[0]));
    if (act === "toggle-story") {
      var st = (C.stories || []).filter(function (x) { return x.id === id; })[0]; if (!st) return;
      var now = !st.published; run(sb.from("stories").update({ published: now, published_at: now ? (st.published_at || new Date().toISOString()) : st.published_at }).eq("id", id), now ? "Published." : "Unpublished."); return;
    }
    if (act === "delete-story") {
      var sv = (C.stories || []).filter(function (x) { return x.id === id; })[0];
      if (confirm("Delete this story for good?")) sb.from("stories").delete().eq("id", id).then(function (r) { if (r.error) return say(errText(r.error), true); if (sv) removeFiles([sv.cover_image]); say("Story deleted."); loadTab(); });
    }
  }

  /* ---------- form submits ---------- */
  function onSubmit(e) {
    var form = e.target.closest("form[data-form]"); if (!form) return; e.preventDefault();
    var kind = form.getAttribute("data-form"), sb = S.sb;
    function v(id) { var el = $("#" + id, form); return el ? el.value.trim() : ""; }
    function c(id) { var el = $("#" + id, form); return !!(el && el.checked); }
    function busy(b) { $$("button", form).forEach(function (x) { x.disabled = b; }); }
    function fail(er) { busy(false); var d = $("#dlg-error"); if (d) d.textContent = (er && (er.message || er.msg)) || "Something went wrong."; }

    if (kind === "signin") {
      var email = v("si-email"); busy(true);
      sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        busy(false); if (r.error) return say(errText(r.error), true); say("Check your email. We’ve sent a sign-in link to <strong>" + esc(email) + "</strong>. Open it on this device.");
      }); return;
    }

    if (kind === "mission") {
      var row = { id: v("mi-id"), number: v("mi-num"), title: v("mi-title"), status: v("mi-status"), difficulty: v("mi-diff"), summary: v("mi-sum"), categories: list(v("mi-cat")), skills: list(v("mi-skills")),
        objectives: lines($("#mi-obj", form).value), deliverables: lines($("#mi-del", form).value), instructions: lines($("#mi-ins", form).value), opens: v("mi-opens") || null, deadline: v("mi-dead") || null, review_by: v("mi-rev") || null };
      if (!row.summary) return fail({ message: "Please add a short summary." });
      busy(true);
      var q = form.getAttribute("data-new") === "true" ? sb.from("missions").insert(row) : sb.from("missions").update(row).eq("id", row.id);
      q.then(function (r) { if (r.error) return fail(r.error); done("Mission saved."); }, fail); return;
    }

    if (kind === "archive") {
      var num = v("ar-num"), isNew = form.getAttribute("data-new") === "true", file = $("#ar-img", form).files[0], pending = c("ar-pend");
      var item = { number: num, title: v("ar-title"), category: v("ar-cat"), classification: v("ar-class"), caption: v("ar-cap"), statement: v("ar-stmt"), event: v("ar-event") || null, item_date: v("ar-date") || null,
        alt: v("ar-alt") || v("ar-title"), featured: c("ar-feat"), downloadable: c("ar-dl"), pending: pending, published: c("ar-pub"), image: form.getAttribute("data-old-image") || null, thumb: form.getAttribute("data-old-thumb") || null };
      if (!file && !item.image && !pending) return fail({ message: "Please choose a photo, or tick “Placeholder”." });
      busy(true);
      var step = Promise.resolve();
      if (file) {
        var base = "archive/" + num + "-" + uuid().slice(0, 8);
        step = Promise.all([resizeToBlob(file, 1600, 0.86), resizeToBlob(file, 640, 0.82)]).then(function (bl) {
          return Promise.all([upload(base + ".jpg", bl[0]), upload(base + "-thumb.jpg", bl[1])]);
        }).then(function (urls) { var olds = [item.image, item.thumb]; item.image = urls[0]; item.thumb = urls[1]; removeFiles(olds); });
      }
      step.then(function () {
        var q = isNew ? sb.from("archive_items").insert(item) : sb.from("archive_items").update(item).eq("number", num);
        return q;
      }).then(function (r) {
        if (r.error) throw r.error;
        return item.featured ? sb.from("archive_items").update({ featured: false }).neq("number", num) : null;
      }).then(function () { done("Archive item saved."); }).catch(fail); return;
    }

    if (kind === "story") {
      var sid = form.getAttribute("data-id"), cover = $("#st-cover", form).files[0], headline = v("st-head"), slug = slugify(v("st-slug") || headline);
      var published = c("st-pub"), storyKind = v("st-kind");
      var needsConsent = storyKind === "Founder story" || storyKind === "Interview";
      if (published && needsConsent && !c("st-consent")) return fail({ message: "To publish a founder story or interview, please confirm the person agreed to be featured." });
      if (published && c("st-minor") && !c("st-guard")) return fail({ message: "For anyone under 18, a parent or guardian must have agreed before you publish." });
      if (slug.length < 3) return fail({ message: "The web address ending needs at least 3 letters or numbers." });
      var sr = { slug: slug, kind: storyKind, headline: headline, dek: v("st-dek") || null, body: $("#st-body", form).value.trim(), cover_alt: v("st-calt") || null, video_url: v("st-video") || null,
        person_name: v("st-pn") || null, person_role: v("st-pr") || null, venture: v("st-v") || null, venture_url: v("st-vu") || null, relationship: v("st-rel"),
        consent_confirmed: c("st-consent"), person_is_minor: c("st-minor"), guardian_consent: c("st-guard"), published: published, cover_image: form.getAttribute("data-old-cover") || null };
      if (published) sr.published_at = form.getAttribute("data-published-at") || new Date().toISOString();
      busy(true);
      var s1 = Promise.resolve();
      if (cover) { s1 = resizeToBlob(cover, 1400, 0.85).then(function (b) { return upload("stories/" + uuid().slice(0, 12) + ".jpg", b); }).then(function (u) { var old = sr.cover_image; sr.cover_image = u; removeFiles([old]); }); }
      s1.then(function () { return sid ? sb.from("stories").update(sr).eq("id", sid) : sb.from("stories").insert(sr); }).then(function (r) { if (r.error) throw r.error; done("Story saved."); }).catch(fail);
    }
  }

  function onInput(e) { var t = e.target; if (t.getAttribute && t.getAttribute("data-search") === "member") { S.memberQ = t.value; paintMembers(); var el = $("#mem-q"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } }

  start();
})();
