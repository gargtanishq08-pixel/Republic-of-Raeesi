/* ==========================================================================
   Royal Missions — page behaviour.
   Missions and scoring rules come from missions-data.js.
   Public ledger and showcase come from your Google Sheet (via Apps Script).
   You should not need to edit this file.
   ========================================================================== */
(function () {
  "use strict";
  var M = window.RAEESI_MISSIONS;
  if (!M) return;
  var CFG = window.RAEESI_CONFIG || {};
  var ENDPOINT = ((CFG.form && CFG.form.endpoint) || "").trim();

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ======================================================================
     SCORING (exposed on window.RaeesiScoring so it can be tested)
     ====================================================================== */
  function weighted(scores) {
    var t = 0;
    M.criteria.forEach(function (c) {
      var s = Number(scores && scores[c.key]);
      if (!isFinite(s)) s = 0;
      s = Math.max(0, Math.min(5, s));
      t += s / 5 * c.weight;
    });
    return Math.round(t * 10) / 10;
  }
  function entryPoints(e) {
    var w = weighted(e.scores);
    var mult = M.difficultyMultiplier[e.difficulty] || 1;
    var passed = w >= M.passMark;
    var base = passed ? Math.round(w * mult) : 0;
    var adj = Math.round(Number(e.adj) || 0);
    return { weighted: w, mult: mult, passed: passed, base: base, adj: adj, total: Math.max(0, base + adj) };
  }
  function levelFor(p) {
    var lv = M.levels[0];
    M.levels.forEach(function (l) { if (p >= l.min) lv = l; });
    return lv.name;
  }
  // Group entries by builder; only the best entry per mission counts.
  function aggregate(entries) {
    var by = {};
    entries.forEach(function (e) {
      var r = entryPoints(e);
      var o = by[e.bk] || (by[e.bk] = { bk: e.bk, name: e.builder, entries: [], best: {} });
      var item = { e: e, r: r, counts: false };
      o.entries.push(item);
      var cur = o.best[e.mission];
      if (!cur || r.total > cur.r.total) o.best[e.mission] = item;
      o.name = e.builder || o.name;
    });
    return Object.keys(by).map(function (k) {
      var o = by[k], pts = 0, done = 0;
      Object.keys(o.best).forEach(function (m) {
        o.best[m].counts = true;
        pts += o.best[m].r.total;
        if (o.best[m].r.base > 0) done++;
      });
      o.points = pts; o.completed = done; o.level = levelFor(pts);
      return o;
    }).sort(function (a, b) { return b.points - a.points || String(a.name).localeCompare(String(b.name)); });
  }
  window.RaeesiScoring = { weighted: weighted, entryPoints: entryPoints, aggregate: aggregate, levelFor: levelFor };

  /* ======================================================================
     MISSIONS
     ====================================================================== */
  var STATUS_ORDER = ["Open", "In Progress", "Under Review", "Completed", "Archived"];
  var PUBLIC = M.missions.filter(function (m) { return m.status && m.status !== "Draft"; });
  function missionById(id) { return M.missions.filter(function (m) { return m.id === id; })[0]; }
  function missionLabel(id) { var m = missionById(id); return m ? "Mission " + m.number + ": " + m.title : (id || ""); }

  function parseDate(iso) { if (!iso) return null; var d = new Date(iso + "T23:59:59"); return isNaN(d) ? null : d; }
  function fmtDate(iso) {
    var d = parseDate(iso); if (!d) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }
  function daysLeft(iso) {
    var d = parseDate(iso); if (!d) return "";
    var diff = Math.ceil((d - new Date()) / 86400000);
    if (diff < 0) return "deadline passed";
    if (diff === 0) return "last day";
    return diff + (diff === 1 ? " day left" : " days left");
  }
  function acceptsSubmissions(m) {
    if (m.status !== "Open" && m.status !== "In Progress") return false;
    var d = parseDate(m.deadline);
    return !d || d >= new Date();
  }
  function stClass(s) { return "st-" + String(s).toLowerCase().replace(/\s+/g, "-"); }

  function missionCard(m, big) {
    var mult = M.difficultyMultiplier[m.difficulty] || 1;
    var dates = [];
    if (m.opens) dates.push("Opens " + fmtDate(m.opens));
    if (m.deadline) dates.push("Deadline " + fmtDate(m.deadline) + (acceptsSubmissions(m) ? " (" + daysLeft(m.deadline) + ")" : ""));
    if (m.reviewBy) dates.push("Results by " + fmtDate(m.reviewBy));
    var actions = '<button type="button" class="btn ' + (big ? "btn-dark" : "btn-line") + ' btn-sm" data-brief="' + esc(m.id) + '">Read the full brief</button>';
    if (acceptsSubmissions(m)) {
      actions += '<button type="button" class="btn btn-line btn-sm" data-desk-tab="interest" data-mission="' + esc(m.id) + '">Register interest</button>' +
                 '<button type="button" class="btn btn-gold btn-sm" data-desk-tab="submit" data-mission="' + esc(m.id) + '">Submit your project</button>';
    } else if (m.status === "Completed" || m.status === "Archived" || m.status === "Under Review") {
      actions += '<button type="button" class="btn btn-line btn-sm" data-results="' + esc(m.id) + '">See the results</button>';
    }
    return '<article class="mission-card' + (big ? " big" : "") + '">' +
      '<div class="mc-head"><span class="mc-num">Mission ' + esc(m.number) + '</span><span class="badge ' + stClass(m.status) + '">' + esc(m.status) + "</span></div>" +
      "<h3>" + esc(m.title) + "</h3>" +
      '<p class="mc-meta">Difficulty: <strong>' + esc(m.difficulty) + "</strong> (×" + mult + " points) &middot; " + esc((m.categories || []).join(", ")) + "</p>" +
      "<p>" + esc(m.summary) + "</p>" +
      (dates.length ? '<p class="mc-dates">' + esc(dates.join(" · ")) + "</p>" : "") +
      ((m.skills || []).length ? '<p class="mc-skills"><strong>Skills:</strong> ' + esc(m.skills.join(", ")) + "</p>" : "") +
      '<div class="mc-actions">' + actions + "</div></article>";
  }

  function renderCurrent() {
    var host = $("#current-missions");
    var open = PUBLIC.filter(function (m) { return m.status === "Open" || m.status === "In Progress"; });
    if (!open.length) {
      host.innerHTML = '<div class="notice"><p><strong>No mission is open right now.</strong> The next Royal Mission will be announced here. In the meantime you can read past missions below, or <a href="index.html#petition" data-apply>submit your petition</a> to be ready.</p></div>';
      return;
    }
    host.innerHTML = open.map(function (m) { return missionCard(m, true); }).join("");
  }

  var statusFilter = "All";
  function renderMissionList() {
    var counts = {};
    PUBLIC.forEach(function (m) { counts[m.status] = (counts[m.status] || 0) + 1; });
    var f = $("#mission-filters");
    var html = '<button type="button" class="chip" data-st="All" aria-pressed="' + (statusFilter === "All") + '">All (' + PUBLIC.length + ")</button>";
    STATUS_ORDER.forEach(function (s) {
      if (counts[s]) html += '<button type="button" class="chip" data-st="' + s + '" aria-pressed="' + (statusFilter === s) + '">' + s + " (" + counts[s] + ")</button>";
    });
    f.innerHTML = html;
    var list = PUBLIC.filter(function (m) { return statusFilter === "All" || m.status === statusFilter; });
    $("#mission-grid").innerHTML = list.length ? list.map(function (m) { return missionCard(m, false); }).join("")
      : '<p class="file-meta">No missions to show here yet.</p>';
  }
  $("#mission-filters").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-st]"); if (!b) return;
    statusFilter = b.getAttribute("data-st"); renderMissionList();
  });

  /* ---------- Brief dialog ---------- */
  var md = $("#mission-dialog"), mdIn = $("#md-in"), mdFocus = null;
  function li(arr) { return (arr || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); }
  function openBrief(id, trigger) {
    var m = missionById(id);
    if (!m || m.status === "Draft") return;
    mdFocus = trigger || document.activeElement;
    var mult = M.difficultyMultiplier[m.difficulty] || 1;
    mdIn.innerHTML =
      '<button type="button" class="dlg-close" data-close aria-label="Close">&times;</button>' +
      '<p class="mc-num">Mission ' + esc(m.number) + ' &middot; <span class="badge ' + stClass(m.status) + '">' + esc(m.status) + "</span></p>" +
      '<h2 id="md-title" class="md-title">' + esc(m.title) + "</h2>" +
      '<p class="mc-meta">Difficulty: <strong>' + esc(m.difficulty) + "</strong> (×" + mult + " points) &middot; " + esc((m.categories || []).join(", ")) + "</p>" +
      "<p>" + esc(m.summary) + "</p>" +
      (m.opens || m.deadline || m.reviewBy ? '<p class="mc-dates">' + esc([m.opens && "Opens " + fmtDate(m.opens), m.deadline && "Deadline " + fmtDate(m.deadline), m.reviewBy && "Results by " + fmtDate(m.reviewBy)].filter(Boolean).join(" · ")) + "</p>" : "") +
      "<h3>Objectives</h3><ul>" + li(m.objectives) + "</ul>" +
      "<h3>What to hand in</h3><ul>" + li(m.deliverables) + "</ul>" +
      "<h3>Skills that help</h3><ul>" + li(m.skills) + "</ul>" +
      "<h3>How to take part</h3><ol>" + li(m.instructions) + "</ol>" +
      '<h3>How it’s scored</h3><p>Six criteria, out of 100, shown in full under <a href="#scoring" data-close-link>How scoring works</a>. You need at least ' + M.passMark + " to earn points.</p>" +
      '<div class="mc-actions">' +
        (acceptsSubmissions(m) ? '<button type="button" class="btn btn-line btn-sm" data-desk-tab="interest" data-mission="' + esc(m.id) + '">Register interest</button><button type="button" class="btn btn-gold btn-sm" data-desk-tab="submit" data-mission="' + esc(m.id) + '">Submit your project</button>' : "") +
        '<button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>';
    if (!md.open) { if (md.showModal) md.showModal(); else md.setAttribute("open", ""); }
    try { history.replaceState(null, "", "#" + m.id); } catch (e) {}
    var c = mdIn.querySelector("[data-close]"); if (c) c.focus();
  }
  function closeBrief() { if (md.close) md.close(); else md.removeAttribute("open"); }
  md.addEventListener("click", function (e) {
    if (e.target === md) return closeBrief();
    var t = e.target.closest("button, a"); if (!t) return;
    if (t.hasAttribute("data-close") || t.hasAttribute("data-close-link")) closeBrief();
  });
  md.addEventListener("close", function () {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (mdFocus && mdFocus.focus) mdFocus.focus();
  });

  /* ======================================================================
     SCORING SECTION
     ====================================================================== */
  function renderScoring() {
    $("#scale-text").textContent = M.scale;
    $("#criteria-body").innerHTML = M.criteria.map(function (c) {
      return "<tr><th scope=\"row\">" + esc(c.name) + "</th><td>" + c.weight + "</td><td>" + esc(c.desc) + "</td></tr>";
    }).join("");
    $("#rules-list").innerHTML = li(M.rules);
    var ex = { execution: 4, originality: 3, quality: 4, documentation: 3, collaboration: 5, improvement: 4 };
    var r = entryPoints({ scores: ex, difficulty: "Medium", adj: 0 });
    $("#sums-text").innerHTML = "Weighted score = each score ÷ 5 × its weight, added up, out of 100. If it reaches " + M.passMark +
      ", points = weighted score × the difficulty multiplier, rounded. <strong>Example:</strong> scores of 4, 3, 4, 3, 5, 4 give " +
      r.weighted + " out of 100. On a Medium mission (×" + r.mult + ") that’s " + r.base + " points.";
    $("#levels-list").innerHTML = M.levels.map(function (l) { return "<li><strong>" + esc(l.name) + "</strong>: " + l.min + "+ points</li>"; }).join("");
  }

  /* ======================================================================
     THE MISSION DESK (forms)
     ====================================================================== */
  var DRAFT_KEY = "raeesi.missions.drafts.v1";
  var REF_RE = /^RAE-\d{4}-[A-Z2-9]{6}$/;
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function newId(prefix) {
    var a = new Uint8Array(8), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 8; i++) s += ALPHA[a[i] % ALPHA.length];
    return prefix + "-" + s;
  }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }

  var REF_FIELD = { k: "ref", label: "Your member key", type: "ref", req: true, hint: "Your petition reference, like RAE-2026-ABC234. Never shown publicly." };
  var NAME_FIELD = { k: "displayName", label: "Display name", type: "text", req: true, min: 2, max: 60, hint: "The name others will see. It doesn’t have to be your real name." };

  var FORMS = {
    interest: {
      tab: "Register interest", action: "mission_interest", prefix: "INT", submit: "Register interest",
      intro: "Tell me you’re in. It’s optional, but it helps me plan and helps you find teammates.",
      fields: [REF_FIELD, NAME_FIELD,
        { k: "missionId", label: "Which mission?", type: "mission", req: true, scope: "open" },
        { k: "mode", label: "How will you work?", type: "select", req: true, options: ["On my own", "With a team I already have", "I’m looking for teammates"] },
        { k: "teammates", label: "Teammates or the skills you need (optional)", type: "textarea", max: 400 },
        { k: "note", label: "Anything else (optional)", type: "textarea", max: 500 }],
      done: "Interest registered. Good luck."
    },
    submit: {
      tab: "Submit a project", action: "mission_submit", prefix: "SUB", submit: "Submit your project",
      intro: "Send in your work. Be specific: reviewers score what they can see and check.",
      warn: "Anything you allow to be shown publicly can be seen and copied by anyone. Don’t make a confidential idea public, and remember that posting an idea here does not legally protect it.",
      fields: [REF_FIELD, NAME_FIELD,
        { k: "missionId", label: "Which mission is this for?", type: "mission", req: true, scope: "submit" },
        { k: "projectName", label: "Project name", type: "text", req: true, min: 2, max: 100 },
        { k: "description", label: "Short description", type: "textarea", req: true, min: 20, max: 800 },
        { k: "problem", label: "Problem being solved", type: "textarea", req: true, min: 10, max: 800 },
        { k: "approach", label: "Approach and technologies used", type: "textarea", req: true, min: 10, max: 1000 },
        { k: "links", label: "Links to your work", type: "links", req: true, max: 800, hint: "A repository, live demo, document or portfolio. One or more, separated by spaces or new lines. Make sure sharing is set so I can open them." },
        { k: "imageLinks", label: "Screenshot or image links (optional)", type: "links", max: 800, hint: "Links to images (for example, a shared Drive file or an image link ending in .png or .jpg)." },
        { k: "collaborators", label: "Collaborators and what each did (optional)", type: "textarea", max: 600 },
        { k: "learned", label: "What did you learn?", type: "textarea", req: true, min: 10, max: 800 },
        { k: "progress", label: "Progress updates (optional)", type: "textarea", max: 1000, hint: "What you changed after feedback or along the way." },
        { k: "publicConsent", label: "After review, you may show my project, my display name and the reviewer’s comment publicly.", type: "checkbox" },
        { k: "honesty", label: "This work is mine (and my team’s) to share, and I’ve credited everyone who helped.", type: "checkbox", req: true }],
      done: "Submission received. Reviewers will score it against the published criteria."
    },
    appeal: {
      tab: "Request reassessment", action: "appeal", prefix: "APL", submit: "Send my request",
      intro: "Think a score is wrong, or have something that wasn’t considered? Tell me and I’ll look again. Any change is recorded in the Ledger.",
      fields: [REF_FIELD,
        { k: "ledgerEntryId", label: "Ledger entry ID", type: "text", req: true, min: 2, max: 40, hint: "Shown on your entry in the Royal Ledger, like L-001." },
        { k: "reason", label: "What should be looked at again, and why?", type: "textarea", req: true, min: 20, max: 1000 },
        { k: "evidenceLink", label: "A link to supporting evidence (optional)", type: "url", max: 400 }],
      done: "Request received. I’ll respond and record any change in the Ledger."
    },
    feedback: {
      tab: "Give feedback", action: "feedback", prefix: "FBK", submit: "Send feedback",
      intro: "Constructive feedback helps builders improve. Keep it about the work, not the person. Feedback is checked before it appears publicly.",
      fields: [REF_FIELD, NAME_FIELD,
        { k: "submissionId", label: "Submission ID", type: "text", req: true, min: 4, max: 30, hint: "Shown on the project card, like SUB-ABCD2345." },
        { k: "comment", label: "Your feedback", type: "textarea", req: true, min: 20, max: 800 }],
      done: "Feedback received. It will appear after it’s been checked."
    },
    intro: {
      tab: "Ask for an introduction", action: "introduction", prefix: "ITR", submit: "Send request",
      intro: "Want to work with a builder you found here? I’ll pass your message on. No contact details are shared unless they agree.",
      fields: [REF_FIELD, NAME_FIELD,
        { k: "submissionId", label: "Submission ID of the project", type: "text", req: true, min: 4, max: 30, hint: "Shown on the project card." },
        { k: "message", label: "Your message", type: "textarea", req: true, min: 20, max: 600, hint: "Who you are, what you can offer, and what you’d like to build together." }],
      done: "Request received. I’ll pass your message on."
    }
  };
  var TAB_ORDER = ["interest", "submit", "appeal", "feedback", "intro"];
  var desk = { tab: "submit", values: {}, ids: {}, busy: false, message: null, errors: {} };

  function loadDrafts() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      desk.values = d.values || {}; desk.ids = d.ids || {};
    } catch (e) {}
    try {
      var ref = localStorage.getItem("raeesi.memberRef");
      if (ref) TAB_ORDER.forEach(function (t) { desk.values[t] = desk.values[t] || {}; if (!desk.values[t].ref) desk.values[t].ref = ref; });
    } catch (e) {}
  }
  var saveT = null;
  function saveDrafts() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: desk.values, ids: desk.ids })); } catch (e) {}
    }, 300);
  }
  function vals(t) { return desk.values[t] || (desk.values[t] = {}); }

  function missionOptions(scope) {
    var list = M.missions.filter(function (m) {
      if (scope === "submit") return acceptsSubmissions(m);
      return m.status === "Open" && acceptsSubmissions(m);
    });
    return list;
  }

  function fieldHtml(t, f) {
    var id = "df-" + t + "-" + f.k, v = vals(t)[f.k], err = (desk.errors[t] || {})[f.k];
    var hint = f.hint ? '<span class="hint" id="' + id + '-h">' + esc(f.hint) + "</span>" : "";
    var describedby = ' aria-describedby="' + (f.hint ? id + "-h " : "") + id + '-e"';
    var inv = err ? ' aria-invalid="true"' : "";
    var req = f.req ? ' <span class="req" aria-hidden="true">*</span>' : "";
    var control;
    if (f.type === "checkbox") {
      return '<div class="field"><div class="check"><input type="checkbox" id="' + id + '" data-f="' + f.k + '"' + (v ? " checked" : "") + inv + describedby + '><label for="' + id + '">' + esc(f.label) + req + "</label></div>" +
        '<p class="field-error" id="' + id + '-e" role="alert">' + esc(err || "") + "</p></div>";
    }
    if (f.type === "textarea" || f.type === "links") {
      control = '<textarea id="' + id + '" data-f="' + f.k + '" rows="' + (f.type === "links" ? 3 : 4) + '" maxlength="' + (f.max || 1000) + '"' + inv + describedby + ' style="min-height:' + (f.type === "links" ? "5" : "6.5") + 'rem">' + esc(v || "") + "</textarea>";
    } else if (f.type === "select") {
      control = '<select id="' + id + '" data-f="' + f.k + '"' + inv + describedby + '><option value="">Choose one</option>' +
        f.options.map(function (o) { return "<option" + (v === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
    } else if (f.type === "mission") {
      var opts = missionOptions(f.scope);
      control = '<select id="' + id + '" data-f="' + f.k + '"' + inv + describedby + (opts.length ? "" : " disabled") + '><option value="">' + (opts.length ? "Choose a mission" : "No mission is open") + "</option>" +
        opts.map(function (m) { return '<option value="' + esc(m.id) + '"' + (v === m.id ? " selected" : "") + ">" + esc(missionLabel(m.id)) + "</option>"; }).join("") + "</select>";
    } else {
      control = '<input type="' + (f.type === "url" ? "url" : "text") + '" id="' + id + '" data-f="' + f.k + '" maxlength="' + (f.max || 200) + '" value="' + esc(v || "") + '"' +
        (f.type === "ref" ? ' autocapitalize="characters" autocomplete="off" placeholder="RAE-2026-ABC234"' : "") + inv + describedby + ">";
    }
    return '<div class="field"><label for="' + id + '">' + esc(f.label) + req + "</label>" + hint + control +
      '<p class="field-error" id="' + id + '-e" role="alert">' + esc(err || "") + "</p></div>";
  }

  function renderDesk() {
    var root = $("#desk-root");
    var spec = FORMS[desk.tab];
    var tabs = TAB_ORDER.map(function (t) {
      return '<button type="button" role="tab" id="tab-' + t + '" class="tab" data-tab="' + t + '" aria-selected="' + (t === desk.tab) + '" aria-controls="desk-panel" tabindex="' + (t === desk.tab ? 0 : -1) + '">' + esc(FORMS[t].tab) + "</button>";
    }).join("");
    var noOpen = (desk.tab === "submit" || desk.tab === "interest") && !missionOptions(desk.tab === "submit" ? "submit" : "open").length;
    var msg = "";
    if (desk.message) msg = '<div class="notice' + (desk.message.bad ? " warn" : "") + '" role="' + (desk.message.bad ? "alert" : "status") + '" tabindex="-1" id="desk-msg"><p>' + desk.message.html + "</p></div>";
    root.innerHTML =
      '<div class="tabs" role="tablist" aria-label="Mission Desk">' + tabs + "</div>" +
      '<div class="tab-panel" id="desk-panel" role="tabpanel" aria-labelledby="tab-' + desk.tab + '">' +
        msg + "<p>" + esc(spec.intro) + "</p>" +
        (spec.warn ? '<div class="panel"><p>' + esc(spec.warn) + "</p></div>" : "") +
        (noOpen ? '<div class="notice"><p>No mission is open for this right now. Check “The current Royal Mission” above.</p></div>' : "") +
        spec.fields.map(function (f) { return fieldHtml(desk.tab, f); }).join("") +
        '<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" id="df-hp" tabindex="-1" autocomplete="off"></label></div>' +
        '<button type="button" class="btn btn-dark" id="desk-send"' + (desk.busy || noOpen ? " disabled" : "") + ">" + (desk.busy ? "Sending…" : esc(spec.submit)) + "</button>" +
      "</div>";
  }

  function setTab(t, prefill, focusFirst) {
    desk.tab = t; desk.message = null; desk.errors = {};
    if (prefill) Object.keys(prefill).forEach(function (k) { vals(t)[k] = prefill[k]; });
    renderDesk(); saveDrafts();
    if (focusFirst) {
      $("#desk").scrollIntoView({ behavior: "smooth", block: "start" });
      var f = $$("#desk-panel [data-f]").filter(function (el) { return !el.value && el.type !== "checkbox" && !el.disabled; })[0] || $("#desk-panel [data-f]");
      if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 350);
    }
  }

  function validateDesk() {
    var spec = FORMS[desk.tab], v = vals(desk.tab), errs = {};
    spec.fields.forEach(function (f) {
      var x = v[f.k];
      var s = typeof x === "string" ? x.trim() : x;
      if (f.type === "checkbox") { if (f.req && !x) errs[f.k] = "Please tick this to continue."; return; }
      if (f.req && !s) { errs[f.k] = "This one is needed."; return; }
      if (!s) return;
      if (f.type === "ref" && !REF_RE.test(String(s).toUpperCase())) errs[f.k] = "That doesn’t look like a member key. It should look like RAE-2026-ABC234.";
      else if (f.min && s.length < f.min) errs[f.k] = "Please write a little more (at least " + f.min + " characters).";
      else if (f.type === "url" && !validUrl(s)) errs[f.k] = "Please paste a full link starting with https://";
      else if (f.type === "links") {
        var toks = s.split(/[\s,]+/).filter(Boolean);
        if (toks.some(function (u) { return !validUrl(u); })) errs[f.k] = "Each link should start with https:// (separate several with spaces or new lines).";
      }
    });
    desk.errors[desk.tab] = errs;
    return errs;
  }

  function sendDesk() {
    if (desk.busy) return;
    if ($("#df-hp") && $("#df-hp").value) return;
    var t = desk.tab, spec = FORMS[t];
    var errs = validateDesk();
    var keys = Object.keys(errs);
    if (keys.length) {
      desk.message = { bad: true, html: "Please fix the highlighted fields." };
      renderDesk();
      var first = $("#df-" + t + "-" + keys[0]); if (first) first.focus();
      return;
    }
    if (!ENDPOINT) {
      desk.message = { bad: true, html: "This website isn’t connected to its Google Sheet yet, so nothing can be received. Your answers are kept in this browser. (Site owner: see the setup guide.)" };
      renderDesk(); return;
    }
    desk.ids[t] = desk.ids[t] || newId(spec.prefix);
    var payload = { action: spec.action, id: desk.ids[t], page: location.href.split("#")[0] };
    var v = vals(t);
    spec.fields.forEach(function (f) {
      var x = v[f.k];
      payload[f.k] = f.type === "checkbox" ? !!x : (typeof x === "string" ? x.trim() : (x || ""));
    });
    payload.ref = String(payload.ref).toUpperCase();
    desk.busy = true; desk.message = null; renderDesk();

    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 45000);
    fetch(ENDPOINT, { method: "POST", body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(timer);
        desk.busy = false;
        if (!res || !res.ok) {
          desk.message = { bad: true, html: esc((res && res.error) || "That wasn’t saved.") + " Your answers are kept, so you can fix it and try again." };
        } else {
          var keep = { ref: v.ref, displayName: v.displayName };
          try { localStorage.setItem("raeesi.memberRef", String(payload.ref)); } catch (e) {}
          desk.values[t] = keep; delete desk.ids[t]; desk.errors[t] = {};
          desk.message = { bad: false, html: "<strong>" + esc(spec.done) + "</strong> Your reference: <code>" + esc(payload.id) + "</code>" };
        }
        renderDesk(); saveDrafts();
        var m = $("#desk-msg"); if (m) { m.focus({ preventScroll: true }); m.scrollIntoView({ block: "center", behavior: "smooth" }); }
      })
      .catch(function () {
        clearTimeout(timer);
        desk.busy = false;
        desk.message = { bad: true, html: "We couldn’t reach the Republic’s mailroom. Check your connection and try again. Your answers are still here, and retrying won’t create a duplicate." };
        renderDesk();
        var m = $("#desk-msg"); if (m) m.focus({ preventScroll: true });
      });
  }

  var deskRoot = $("#desk-root");
  deskRoot.addEventListener("input", function (e) {
    var el = e.target; var k = el.getAttribute && el.getAttribute("data-f"); if (!k) return;
    vals(desk.tab)[k] = el.type === "checkbox" ? el.checked : el.value;
    if ((desk.errors[desk.tab] || {})[k]) { delete desk.errors[desk.tab][k]; el.removeAttribute("aria-invalid"); var er = $("#" + el.id + "-e"); if (er) er.textContent = ""; }
    saveDrafts();
  });
  deskRoot.addEventListener("change", function (e) {
    var el = e.target; var k = el.getAttribute && el.getAttribute("data-f"); if (!k) return;
    vals(desk.tab)[k] = el.type === "checkbox" ? el.checked : el.value; saveDrafts();
  });
  deskRoot.addEventListener("click", function (e) {
    var tab = e.target.closest("button[data-tab]");
    if (tab) { setTab(tab.getAttribute("data-tab")); var nt = $("#tab-" + desk.tab); if (nt) nt.focus(); return; }
    if (e.target.closest("#desk-send")) sendDesk();
  });
  deskRoot.addEventListener("keydown", function (e) {
    if (!e.target.closest || !e.target.closest(".tabs")) return;
    var i = TAB_ORDER.indexOf(desk.tab);
    if (e.key === "ArrowRight") i = (i + 1) % TAB_ORDER.length;
    else if (e.key === "ArrowLeft") i = (i + TAB_ORDER.length - 1) % TAB_ORDER.length;
    else return;
    e.preventDefault(); setTab(TAB_ORDER[i]); var nt = $("#tab-" + desk.tab); if (nt) nt.focus();
  });

  /* ======================================================================
     PUBLIC DATA: SHOWCASE + LEDGER
     ====================================================================== */
  var PUB = { state: "loading", ledger: [], showcase: [] };
  var query = "";
  var ledgerMission = "";

  function loadPublic() {
    if (!ENDPOINT) { PUB.state = "unconfigured"; renderPublic(); return; }
    PUB.state = "loading"; renderPublic();
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    fetch(ENDPOINT + (ENDPOINT.indexOf("?") > -1 ? "&" : "?") + "action=public", { signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        if (!d || !d.ok) throw new Error("bad");
        PUB.ledger = d.ledger || []; PUB.showcase = d.showcase || []; PUB.state = "ready"; renderPublic();
      })
      .catch(function () { clearTimeout(timer); PUB.state = "error"; renderPublic(); });
  }

  function stateBox(which) {
    if (PUB.state === "loading") return '<p class="file-meta">Loading the ' + which + "…</p>";
    if (PUB.state === "unconfigured") return '<div class="notice"><p>The live ' + which + " isn’t switched on yet. It appears here once the site is connected to its Google Sheet.</p></div>";
    return '<div class="notice warn"><p>The ' + which + ' couldn’t be loaded just now. <button type="button" class="linkish" data-reload>Try again</button></p></div>';
  }

  function matches(text) { return !query || String(text).toLowerCase().indexOf(query) > -1; }
  function safeLinks(arr) { return (arr || []).filter(validUrl); }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }
  function isImg(u) { return /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(u); }

  function showCard(s) {
    var links = safeLinks(s.links), imgs = safeLinks(s.images);
    var direct = imgs.filter(isImg).slice(0, 3);
    var otherImgs = imgs.filter(function (u) { return !isImg(u); });
    var fb = (s.feedback || []).map(function (f) { return '<li><strong>' + esc(f.by) + ":</strong> " + esc(f.comment) + "</li>"; }).join("");
    return '<article class="show-card">' +
      (direct.length ? '<div class="show-imgs">' + direct.map(function (u) { return '<img src="' + esc(u) + '" alt="Screenshot from ' + esc(s.project) + '" loading="lazy" referrerpolicy="no-referrer">'; }).join("") + "</div>" : "") +
      '<p class="mc-num">' + esc(missionLabel(s.mission)) + "</p>" +
      "<h3>" + esc(s.project) + "</h3>" +
      '<p class="by">by <strong>' + esc(s.builder) + "</strong></p>" +
      "<p>" + esc(s.description) + "</p>" +
      '<dl class="show-dl"><dt>Problem</dt><dd>' + esc(s.problem) + "</dd><dt>Approach</dt><dd>" + esc(s.approach) + "</dd>" +
        (s.collaborators ? "<dt>Collaborators</dt><dd>" + esc(s.collaborators) + "</dd>" : "") +
        "<dt>What they learned</dt><dd>" + esc(s.learned) + "</dd></dl>" +
      (s.progress ? "<details><summary>Progress updates</summary><p>" + esc(s.progress) + "</p></details>" : "") +
      (links.length || otherImgs.length ? '<p class="show-links">' + links.concat(otherImgs).map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow ugc">' + esc(hostOf(u)) + "</a>"; }).join("") + "</p>" : "") +
      (s.reviewerComment ? '<p class="why"><strong>Reviewer’s comment:</strong> ' + esc(s.reviewerComment) + "</p>" : "") +
      (fb ? '<div class="fb"><strong>Community feedback</strong><ul>' + fb + "</ul></div>" : "") +
      '<p class="file-meta">Submitted by the builder. Not independently verified. Submission ID: <code>' + esc(s.id) + "</code></p>" +
      '<div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-desk-tab="feedback" data-sub="' + esc(s.id) + '">Give feedback</button>' +
      '<button type="button" class="btn btn-line btn-sm" data-desk-tab="intro" data-sub="' + esc(s.id) + '">Ask for an introduction</button></div>' +
      "</article>";
  }

  function renderShowcase() {
    var host = $("#showcase-grid");
    if (PUB.state !== "ready") { host.innerHTML = stateBox("project showcase"); return; }
    var mission = $("#show-mission").value;
    var list = PUB.showcase.filter(function (s) {
      return (!mission || s.mission === mission) &&
        matches([s.project, s.builder, s.description, s.problem, s.approach, s.collaborators].join(" "));
    });
    host.innerHTML = list.length ? list.map(showCard).join("")
      : '<p class="file-meta">' + (PUB.showcase.length ? "No projects match that search." : "No projects have been shown yet. Submit yours, and tick the box to allow it to be shown after review.") + "</p>";
  }

  function entryHtml(item) {
    var e = item.e, r = item.r;
    var scores = M.criteria.map(function (c) {
      var s = Math.max(0, Math.min(5, Number(e.scores && e.scores[c.key]) || 0));
      return '<li><span>' + esc(c.name) + '</span><span class="sc"><span class="sc-bar" aria-hidden="true"><i style="width:' + (s * 20) + '%"></i></span><b>' + s + "/5</b></span></li>";
    }).join("");
    var sum = "Weighted score <b>" + r.weighted + "/100</b>. " +
      (r.passed ? "That passes the " + M.passMark + " mark, so points are " + r.weighted + " × " + r.mult + " = <b>" + r.base + "</b>."
                : "That is under the " + M.passMark + " pass mark, so it earns <b>0</b> points. The feedback still counts.") +
      (r.adj ? " Adjustment <b>" + (r.adj > 0 ? "+" : "") + r.adj + "</b>" + (e.adjReason ? " (" + esc(e.adjReason) + ")" : "") + "." : "") +
      " Total for this entry: <b>" + r.total + " points</b>. " +
      (item.counts ? "<em>This is the entry that counts for this mission.</em>" : "<em>Not counted: a higher-scoring entry exists for this mission.</em>");
    return '<div class="entry">' +
      "<h4>" + esc(missionLabel(e.mission)) + " &middot; " + esc(e.project) + "</h4>" +
      '<p class="file-meta">Ledger entry <code>' + esc(e.id) + "</code> &middot; Difficulty " + esc(e.difficulty || "n/a") + (e.date ? " &middot; " + esc(e.date) : "") + "</p>" +
      '<ul class="score-list">' + scores + "</ul>" +
      '<p class="entry-sum">' + sum + "</p>" +
      (e.comment ? '<p class="why"><strong>Why:</strong> ' + esc(e.comment) + "</p>" : "") +
      (e.revision ? '<p class="rev"><strong>Revision record:</strong> ' + esc(e.revision) + "</p>" : "") +
      '<button type="button" class="linkish" data-desk-tab="appeal" data-entry="' + esc(e.id) + '">Request a reassessment of this entry</button></div>';
  }

  function renderLedger() {
    var host = $("#ledger-root");
    if (PUB.state !== "ready") { host.innerHTML = stateBox("Royal Ledger"); return; }
    var builders = aggregate(PUB.ledger).filter(function (b) { return matches(b.name); });
    var opts = '<option value="">All missions</option>' + PUBLIC.map(function (m) {
      return '<option value="' + esc(m.id) + '"' + (ledgerMission === m.id ? " selected" : "") + ">" + esc(missionLabel(m.id)) + "</option>"; }).join("");
    var toolbar = '<div class="toolbar"><label class="sr-only" for="ledger-mission">Show entries for</label><select id="ledger-mission">' + opts + "</select></div>";
    var shown = builders.filter(function (b) { return !ledgerMission || b.entries.some(function (i) { return i.e.mission === ledgerMission; }); });
    if (!shown.length) {
      host.innerHTML = toolbar + '<p class="file-meta">' + (PUB.ledger.length ? "No builders match." : "The Ledger is empty for now. Entries appear here after reviewers score a mission.") + "</p>";
      return;
    }
    host.innerHTML = toolbar + '<div class="builder-list">' + shown.map(function (b) {
      var entries = b.entries.filter(function (i) { return !ledgerMission || i.e.mission === ledgerMission; });
      return '<article class="builder-card"><div class="bc-head"><h3>' + esc(b.name) + '</h3><span class="badge level">' + esc(b.level) + "</span></div>" +
        '<p class="bc-stats"><strong>' + b.points + "</strong> points &middot; " + b.completed + " mission" + (b.completed === 1 ? "" : "s") + " completed &middot; " + b.entries.length + " scored " + (b.entries.length === 1 ? "entry" : "entries") + "</p>" +
        "<details><summary>See exactly why</summary>" + entries.map(entryHtml).join("") + "</details></article>";
    }).join("") + "</div>" +
    '<p class="file-meta">Builders are listed by points only to show the record. Points never decide funding on their own.</p>';
  }

  function renderPublic() {
    // fill the mission filter in the showcase toolbar once
    var sel = $("#show-mission");
    if (sel.options.length <= 1) {
      PUBLIC.forEach(function (m) { var o = document.createElement("option"); o.value = m.id; o.textContent = missionLabel(m.id); sel.appendChild(o); });
    }
    renderShowcase(); renderLedger();
  }

  $("#show-search").addEventListener("input", function (e) { query = e.target.value.trim().toLowerCase(); renderShowcase(); if (PUB.state === "ready") renderLedger(); });
  $("#show-mission").addEventListener("change", renderShowcase);
  $("#ledger-root").addEventListener("change", function (e) { if (e.target.id === "ledger-mission") { ledgerMission = e.target.value; renderLedger(); } });

  /* ---------- global click routing ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-brief],[data-desk-tab],[data-results],[data-reload]");
    if (!t) return;
    if (t.hasAttribute("data-reload")) return loadPublic();
    if (t.hasAttribute("data-brief")) return openBrief(t.getAttribute("data-brief"), t);
    if (t.hasAttribute("data-results")) {
      ledgerMission = t.getAttribute("data-results");
      if (md.open) closeBrief();
      renderLedger();
      return $("#ledger").scrollIntoView({ behavior: "smooth" });
    }
    if (t.hasAttribute("data-desk-tab")) {
      var tab = t.getAttribute("data-desk-tab"), pre = {};
      if (t.getAttribute("data-mission")) pre.missionId = t.getAttribute("data-mission");
      if (t.getAttribute("data-sub")) pre.submissionId = t.getAttribute("data-sub");
      if (t.getAttribute("data-entry")) pre.ledgerEntryId = t.getAttribute("data-entry");
      if (md.open) closeBrief();
      setTab(tab, pre, true);
    }
  });

  // hide broken screenshots instead of showing a broken icon
  document.addEventListener("error", function (e) {
    var el = e.target;
    if (el && el.tagName === "IMG" && el.closest(".show-imgs")) el.style.display = "none";
  }, true);

  /* ---------- start ---------- */
  renderCurrent(); renderMissionList(); renderScoring();
  loadDrafts(); renderDesk(); loadPublic();
  var h = (location.hash || "").replace("#", "");
  if (/^M\d{3}$/.test(h)) openBrief(h);
})();
