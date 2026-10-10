/* ==========================================================================
   The Republic of Raeesi — site script
   Reads settings from config.js. You should not need to edit this file.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.RAEESI_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function get(path) {
    return path.split(".").reduce(function (o, k) { return o && o[k] != null ? o[k] : undefined; }, CFG);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------------ */
  /* 1. Apply settings to the page                                      */
  /* ------------------------------------------------------------------ */
  function formatPool() {
    var amt = Number(get("fundingPool.amount"));
    var sym = get("fundingPool.currencySymbol") || "₹";
    if (!isFinite(amt) || amt <= 0) return null;
    return sym + amt.toLocaleString("en-IN");
  }

  function applyConfig() {
    $$("[data-cfg]").forEach(function (el) {
      var v = get(el.getAttribute("data-cfg"));
      if (v) el.textContent = v;
    });
    $$("[data-cfg-src]").forEach(function (el) {
      var v = get(el.getAttribute("data-cfg-src"));
      if (v) el.setAttribute("src", v);
    });
    $$("[data-cfg-alt]").forEach(function (el) {
      var v = get(el.getAttribute("data-cfg-alt"));
      if (v) el.setAttribute("alt", v);
    });
    var pool = formatPool();
    if (pool) {
      $$("[data-pool], [data-pool-words]").forEach(function (el) { el.textContent = pool; });
      document.title = "Pitch to Raeesi — " + pool + " seed pool, free mentorship";
    }
    if (get("brand.siteName")) document.title = document.title.replace("Pitch to Raeesi", get("brand.siteName"));

    // contact email
    var email = get("contact.email");
    $$("[data-cfg-mailto]").forEach(function (a) {
      if (email) { a.href = "mailto:" + email; a.textContent = email; }
      else { var wrap = a.closest(".if-email"); if (wrap) wrap.remove(); }
    });

    // footer contact line
    var fc = $("#footer-contact");
    if (fc && email) {
      fc.innerHTML = 'Contact the Supreme Leader: <a href="mailto:' + esc(email) + '">' + esc(email) + "</a>";
      fc.hidden = false;
    }

    // community join
    var jn = get("community.joinNote");
    if (jn && $("#join-note")) $("#join-note").textContent = jn;

    // academy extra commitments
    var extra = get("academy.extraCommitments");
    if (extra && $("#academy-extra")) { $("#academy-extra").textContent = extra; $("#academy-extra").hidden = false; }

    // open / closed
    var open = get("applications.open") !== false;
    if (!open) {
      $("#hero-stamp-text").textContent = "Petitions closed";
      $$("[data-apply]").forEach(function (a) { a.textContent = "Petitions Closed"; });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 2. Pitch video                                                     */
  /* ------------------------------------------------------------------ */
  function parseYouTubeId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function showVideoFallback(id) {
    var f = $("#video-frame"), fb = $("#video-fallback"), img = $("#video-poster");
    if (f) f.hidden = true;
    if (fb) fb.hidden = false;
    if (img && id) {
      img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
      img.onerror = function () { img.hidden = true; };
    }
  }
  function initVideo() {
    var url = get("video.url");
    var id = parseYouTubeId(url);
    var link = $("#video-link"), fbLink = $("#video-fallback");
    if (!id) {
      showVideoFallback();
      if (url) { if (link) link.href = url; if (fbLink) fbLink.href = url; }
      else { if (link) link.hidden = true; if (fbLink) fbLink.hidden = true; }
      return;
    }
    var watch = "https://youtu.be/" + id;
    if (link) link.href = watch;
    if (fbLink) fbLink.href = watch;

    // YouTube refuses embeds opened from a local file (no website address to check).
    if (location.protocol === "file:") { showVideoFallback(id); return; }

    var frame = $("#video-frame");
    var triedStandard = false;
    var q = "?rel=0&playsinline=1&enablejsapi=1&origin=" + encodeURIComponent(location.origin);

    function build(domain) {
      frame.innerHTML = "";
      var ifr = document.createElement("iframe");
      ifr.id = "video-iframe";
      ifr.src = "https://" + domain + "/embed/" + id + q;
      ifr.title = "Raeesi’s original startup pitch video";
      ifr.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      ifr.setAttribute("allowfullscreen", "");
      ifr.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      frame.appendChild(ifr);
      return ifr;
    }
    function onErr() {
      if (!triedStandard) {               // privacy domain failed: try the standard YouTube domain once
        triedStandard = true;
        build("www.youtube.com");
        attach();
      } else {
        showVideoFallback(id);            // embedding is blocked: show poster + link
      }
    }
    function attach() {
      try { new window.YT.Player("video-iframe", { events: { onError: onErr } }); } catch (e) {}
    }

    build("www.youtube-nocookie.com");
    window.onYouTubeIframeAPIReady = attach;
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------ */
  /* 3. The Royal Petition                                              */
  /* ------------------------------------------------------------------ */
  var QUESTIONS = [
    "Tell me about yourself beyond your education, job, or startup.",
    "What problem in your own life or the lives of people around you frustrates you the most?",
    "What are you trying to build, in simple language?",
    "What made you think this problem was worth solving?",
    "What is different about your approach compared with existing alternatives?",
    "What is the smallest version of your idea that you could test?",
    "What have you actually done so far to move this idea forward?",
    "What could you build or test in the next 30 days with almost no money?",
    "What is the biggest obstacle stopping you from making progress right now?",
    "How much time can you realistically commit each week, given your current responsibilities?",
    "Tell me about a time you worked with someone who disagreed with you.",
    "What would make someone want to work with you, and what might make working with you difficult?",
    "What would you do if your idea became less relevant because technology changed?",
    "Who would be the first person or organization to benefit from your solution?",
    "How could this become financially sustainable?",
    "What would success look like for this project in one year?",
    "What could another founder realistically ask you for help with today?",
    "How would you contribute to the community even if you never received investment?",
    "What would you want from me as a mentor, and what should I reasonably expect from you?",
    "If you were offered funding later, what would you use it for, and what evidence would you want to show first?"
  ];
  // Optional gentle hints (the questions themselves are unchanged)
  var HINTS = {
    7:  "It’s fine if the honest answer is “nothing yet”. Say so, and say what you’ll do next.",
    8:  "Think free tools, a prototype, a conversation, a landing page, a survey.",
    10: "A rough number of hours is perfect.",
    15: "An early guess is fine. Show how you’re thinking.",
    20: "If the answer is “I’d want to show you something real first”, say what that something is."
  };

  var STEPS = [
    { key: "you",      title: "Who is petitioning?",             intro: "The basics, so the Republic knows who to talk to." },
    { key: "q1",       title: "You and the problem",             intro: "Questions 1 to 5.",   q: [0, 5] },
    { key: "q2",       title: "Moving the idea forward",         intro: "Questions 6 to 10. It’s fine if you’re at the idea stage.", q: [5, 10] },
    { key: "q3",       title: "People and prospects",            intro: "Questions 11 to 15.", q: [10, 15] },
    { key: "q4",       title: "The year ahead and the Republic", intro: "Questions 16 to 20.", q: [15, 20] },
    { key: "evidence", title: "Supporting evidence",             intro: "Optional. Show, don’t just tell. Up to five items." },
    { key: "seal",     title: "Seal your petition",              intro: "Almost there. Two confirmations and you’re done." }
  ];

  var AGE_BANDS = ["13 or younger", "14–15", "16–17", "18–25", "26 or older"];
  var CONTACT_METHODS = ["Email", "WhatsApp", "Phone call", "Telegram", "Instagram", "Other"];
  var DRAFT_KEY = "raeesi.petition.draft.v1";
  var MAX_ANSWER = 2000;
  var ALLOWED_EXT = ["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "csv", "txt", "png", "jpg", "jpeg", "webp", "gif", "mp4", "mov"];

  var ENDPOINT = (get("form.endpoint") || "").trim();
  var MAX_MB = Number(get("form.maxFileMB")) || 8;
  var MAX_ITEMS = Number(get("form.maxEvidenceItems")) || 5;
  var UPLOADS_ON = !!ENDPOINT && get("form.uploadsEnabled") !== false;

  var state = null;
  var root = null;
  var saveTimer = null;
  var restored = false;

  function newRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    var arr = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    for (var i = 0; i < 6; i++) s += chars[arr[i] % chars.length];
    return "RAE-" + new Date().getFullYear() + "-" + s;
  }

  function freshState() {
    return {
      ref: newRef(),
      step: 0,
      d: {
        name: "", email: "", country: "", ageBand: "", contactMethod: "Email", contactDetail: "",
        links: "", guardianName: "", guardianContact: "", guardianOk: false,
        answers: QUESTIONS.map(function () { return ""; }),
        consentPrivacy: false, consentTruth: false
      },
      evidence: [],
      submitting: false,
      done: false
    };
  }

  /* ---------- draft persistence ---------- */
  function saveDraft() {
    if (state && state.done) return;       // never re-save after a successful submit
    try {
      var copy = {
        ref: state.ref, step: state.step, d: state.d,
        evidence: state.evidence.map(function (e) {
          return { id: e.id, title: e.title, kind: e.kind, url: e.url, fileName: e.fileName, driveUrl: e.driveUrl, status: e.status === "done" ? "done" : "idle" };
        })
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(copy));
      var n = $("#draft-status");
      if (n) n.textContent = "Draft saved on this device.";
    } catch (e) { /* storage may be unavailable; the form still works */ }
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 400); }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.d || !o.ref) return null;
      return o;
    } catch (e) { return null; }
  }
  function clearDraft() { clearTimeout(saveTimer); try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  /* ---------- helpers ---------- */
  function isUnder18() { return state.d.ageBand === "14–15" || state.d.ageBand === "16–17"; }
  function isTooYoung() { return state.d.ageBand === "13 or younger"; }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function isHttpUrl(v) {
    try { var u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch (e) { return false; }
  }
  function extOf(name) { var m = /\.([A-Za-z0-9]+)$/.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

  /* ---------- rendering ---------- */
  function renderShell() {
    var open = get("applications.open") !== false;
    if (!open) {
      root.innerHTML = '<div class="shell"><h3 class="step-title">' + esc(get("applications.closedTitle") || "Petitions are closed.") +
        '</h3><p>' + esc(get("applications.closedMessage") || "") + "</p></div>";
      return;
    }
    root.innerHTML =
      '<div class="shell" id="shell">' +
        '<div class="progress" id="progress" aria-live="polite"></div>' +
        '<div id="step-body"></div>' +
      "</div>";
    renderStep();
  }

  function renderProgress() {
    var total = STEPS.length, n = state.step + 1;
    var pct = Math.round((state.step / (total - 1)) * 100);
    $("#progress").innerHTML =
      '<div class="progress-top"><span>Step <strong>' + n + "</strong> of " + total + ": " + esc(STEPS[state.step].title) + "</span><span>" + pct + "% complete</span></div>" +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Petition progress"><span style="width:' + pct + '%"></span></div>' +
      '<p class="draft-note"><span id="draft-status">Your draft saves on this device as you type.</span> ' +
      '<button type="button" id="clear-draft">Start over</button></p>';
    $("#clear-draft").addEventListener("click", function () {
      if (confirm("Clear everything you’ve written and start again?")) {
        clearDraft(); state = freshState(); renderShell();
      }
    });
  }

  function renderStep() {
    var s = STEPS[state.step];
    renderProgress();
    var html = '<h3 class="step-title" id="step-heading" tabindex="-1">' + esc(s.title) + '</h3><p class="step-intro">' + esc(s.intro) + "</p>";
    if (restored && state.step >= 0) {
      html = '<p class="notice" id="restored-note">Welcome back. Your saved draft has been restored.</p>' + html;
      restored = false;
    }
    if (s.key === "you") html += stepYou();
    else if (s.q) html += stepQuestions(s.q[0], s.q[1]);
    else if (s.key === "evidence") html += stepEvidence();
    else html += stepSeal();
    html += navHtml();
    $("#step-body").innerHTML = html;
    bindStep();
    if (s.key === "evidence") renderEvidenceList();
  }

  function navHtml() {
    var last = state.step === STEPS.length - 1;
    return '<div class="form-nav">' +
      (state.step > 0 ? '<button type="button" class="btn btn-line" id="btn-back">Back</button>' : '<span class="spacer"></span>') +
      (last
        ? '<button type="button" class="btn btn-dark" id="btn-submit">Submit Your Petition</button>'
        : '<button type="button" class="btn btn-dark" id="btn-next">Next</button>') +
      "</div>";
  }

  function field(id, label, input, hint, extra) {
    return '<div class="field" data-field="' + id + '">' +
      '<label for="' + id + '">' + label + "</label>" +
      (hint ? '<span class="hint" id="' + id + '-hint">' + hint + "</span>" : "") +
      input + (extra || "") +
      '<p class="field-error" id="' + id + '-err" role="alert"></p></div>';
  }

  function stepYou() {
    var d = state.d;
    var ageOpts = '<option value="">Choose one</option>' + AGE_BANDS.map(function (a) {
      return '<option' + (d.ageBand === a ? " selected" : "") + ">" + a + "</option>"; }).join("");
    var cmOpts = CONTACT_METHODS.map(function (a) {
      return '<option' + (d.contactMethod === a ? " selected" : "") + ">" + a + "</option>"; }).join("");
    var h = '<div class="row-2">' +
      field("f-name", 'Your name <span class="req" aria-hidden="true">*</span>', '<input type="text" id="f-name" data-bind="name" autocomplete="name" value="' + esc(d.name) + '" aria-required="true">') +
      field("f-email", 'Email <span class="req" aria-hidden="true">*</span>', '<input type="email" id="f-email" data-bind="email" autocomplete="email" inputmode="email" value="' + esc(d.email) + '" aria-required="true">') +
      field("f-country", 'Country <span class="req" aria-hidden="true">*</span>', '<input type="text" id="f-country" data-bind="country" autocomplete="country-name" value="' + esc(d.country) + '" aria-required="true">') +
      field("f-age", 'Your age <span class="req" aria-hidden="true">*</span>', '<select id="f-age" data-bind="ageBand" aria-required="true">' + ageOpts + "</select>", "A range is enough. No date of birth needed.") +
      field("f-method", 'Best way to reach you <span class="req" aria-hidden="true">*</span>', '<select id="f-method" data-bind="contactMethod">' + cmOpts + "</select>") +
      '<div id="detail-wrap">' + contactDetailField() + "</div>" +
      "</div>" +
      '<div id="age-extra">' + ageExtra() + "</div>" +
      field("f-links", "Links (optional)", '<textarea id="f-links" data-bind="links" rows="3" style="min-height:5rem" maxlength="1000">' + esc(d.links) + "</textarea>",
        "A website, GitHub, portfolio, Instagram, LinkedIn, anything that helps me understand you or your project. Not required.");
    return h;
  }
  function contactDetailField() {
    var d = state.d;
    if (d.contactMethod === "Email" || !d.contactMethod) return "";
    var lbl = d.contactMethod === "Other" ? "How should I reach you? (name the app and your username or number)" : "Your " + esc(d.contactMethod) + " number or username";
    return field("f-detail", lbl + ' <span class="req" aria-hidden="true">*</span>', '<input type="text" id="f-detail" data-bind="contactDetail" value="' + esc(d.contactDetail) + '" aria-required="true" maxlength="120">');
  }
  function ageExtra() {
    var d = state.d;
    if (isTooYoung()) {
      return '<div class="notice warn" role="status"><p><strong>Come back at 14.</strong> The Republic is open to builders aged 14 and over right now. Keep building in the meantime. Your first project can be a very good one.</p></div>';
    }
    if (isUnder18()) {
      return '<div class="panel"><h3>A parent or guardian, please</h3>' +
        "<p>Because you’re under 18, I need a parent or guardian to know about your petition. Mentorship is free and separate from any investment talk. Any real investment or contract would need your parent or guardian, proper legal paperwork, and professional legal advice.</p></div>" +
        '<div class="row-2">' +
        field("f-gname", 'Parent or guardian’s name <span class="req" aria-hidden="true">*</span>', '<input type="text" id="f-gname" data-bind="guardianName" value="' + esc(d.guardianName) + '" aria-required="true" maxlength="120">') +
        field("f-gcontact", 'Their email or phone <span class="req" aria-hidden="true">*</span>', '<input type="text" id="f-gcontact" data-bind="guardianContact" value="' + esc(d.guardianContact) + '" aria-required="true" maxlength="120">') +
        "</div>" +
        '<div class="field" data-field="f-gok"><div class="check"><input type="checkbox" id="f-gok" data-bind="guardianOk"' + (d.guardianOk ? " checked" : "") + ">" +
        '<label for="f-gok">My parent or guardian knows I’m applying and agrees to me sharing this information with the Republic.</label></div>' +
        '<p class="field-error" id="f-gok-err" role="alert"></p></div>';
    }
    return "";
  }

  function stepQuestions(a, b) {
    var h = "";
    for (var i = a; i < b; i++) {
      var n = i + 1, id = "q" + n;
      var hint = HINTS[n] || "";
      h += field(id, '<span class="q-num">' + n + '.</span>' + esc(QUESTIONS[i]) + ' <span class="req" aria-hidden="true">*</span>',
        '<textarea id="' + id + '" data-q="' + i + '" maxlength="' + MAX_ANSWER + '" aria-required="true"' + (hint ? ' aria-describedby="' + id + '-hint ' + id + '-err"' : "") + ">" + esc(state.d.answers[i]) + "</textarea>",
        hint, '<div class="counter" id="' + id + '-count">' + state.d.answers[i].length + " / " + MAX_ANSWER + "</div>");
    }
    return h;
  }

  function stepEvidence() {
    var note = UPLOADS_ON
      ? "<p>You can upload up to " + MAX_ITEMS + " files (each up to " + MAX_MB + " MB), or paste links. For long videos, paste a YouTube or cloud-storage link instead of uploading. Files go to a private folder that only I can open.</p>"
      : "<p>File uploads aren’t switched on for this site yet, so please paste links instead (YouTube, Google Drive, Dropbox, a website, a demo). For Google Drive links, set sharing to “Anyone with the link” so I can open it" + (get("contact.email") ? ", or share it with " + esc(get("contact.email")) : "") + ".</p>";
    return '<div class="panel"><h3>What to include</h3>' + note +
      "<p>Good examples: a pitch deck, screenshots, a demo, a prototype link, or numbers showing traction. None of it is required, and nothing needs to be expensive or polished.</p></div>" +
      '<div id="evidence-list"></div>' +
      '<p><button type="button" class="btn btn-line" id="add-evidence">Add an evidence item</button></p>' +
      '<p class="field-error" id="evidence-err" role="alert"></p>';
  }

  function renderEvidenceList() {
    var host = $("#evidence-list");
    if (!host) return;
    if (!state.evidence.length) {
      host.innerHTML = '<p class="file-meta">No evidence added. That’s fine. You can continue without it.</p>';
    } else {
      host.innerHTML = state.evidence.map(function (e, i) { return evidenceItemHtml(e, i); }).join("");
    }
    var add = $("#add-evidence");
    if (add) { add.disabled = state.evidence.length >= MAX_ITEMS; add.textContent = state.evidence.length >= MAX_ITEMS ? "Maximum of " + MAX_ITEMS + " items reached" : "Add an evidence item"; }
  }

  function evidenceItemHtml(e, i) {
    var id = "ev" + e.id;
    var accept = ALLOWED_EXT.map(function (x) { return "." + x; }).join(",");
    var fileBlock = "";
    if (e.kind === "file") {
      var meta = e.file ? esc(e.file.name) + " (" + fmtSize(e.file.size) + ")" :
        (e.fileName ? "Previously chosen: " + esc(e.fileName) + (e.status === "done" ? " (already uploaded)" : ". Please choose the file again, because browsers can’t keep files in a draft.") : "");
      fileBlock = '<div class="field"><label for="' + id + '-file">File</label>' +
        '<input type="file" id="' + id + '-file" data-ev-file="' + e.id + '" accept="' + accept + '">' +
        '<p class="file-meta" id="' + id + '-meta">' + (meta || "PDF, Office documents, images, or short videos, up to " + MAX_MB + " MB.") + "</p>" +
        '<p class="field-error" id="' + id + '-file-err" role="alert"></p></div>';
    } else {
      fileBlock = '<div class="field"><label for="' + id + '-url">Link</label>' +
        '<span class="hint" id="' + id + '-hint">YouTube, Google Drive, Dropbox, OneDrive, Figma, Loom, a live site, anything I can open. For Google Drive, set sharing to “Anyone with the link”.</span>' +
        '<input type="url" id="' + id + '-url" data-ev-url="' + e.id + '" inputmode="url" placeholder="https://" value="' + esc(e.url) + '">' +
        '<p class="field-error" id="' + id + '-url-err" role="alert"></p></div>';
    }
    return '<div class="evidence-item" data-ev="' + e.id + '">' +
      '<header><h3>Evidence item ' + (i + 1) + '</h3><button type="button" class="linkish" data-ev-remove="' + e.id + '">Remove</button></header>' +
      '<div class="field"><label for="' + id + '-title">Short title (optional)</label>' +
      '<input type="text" id="' + id + '-title" data-ev-title="' + e.id + '" maxlength="100" value="' + esc(e.title) + '" placeholder="e.g. Pitch deck, App prototype, First 10 survey replies"></div>' +
      (UPLOADS_ON ? '<div class="seg" role="radiogroup" aria-label="Evidence type">' +
        '<label><input type="radio" name="' + id + '-kind" value="link" data-ev-kind="' + e.id + '"' + (e.kind === "link" ? " checked" : "") + "> Paste a link</label>" +
        '<label><input type="radio" name="' + id + '-kind" value="file" data-ev-kind="' + e.id + '"' + (e.kind === "file" ? " checked" : "") + "> Upload a file</label></div>" : "") +
      fileBlock + "</div>";
  }

  function stepSeal() {
    var d = state.d;
    var fileCount = state.evidence.filter(function (e) { return e.kind === "file"; }).length;
    var h = '<div class="panel"><h3>Before you seal it</h3>' +
      "<p>Your answers go to a private Google Sheet and any files to a private Google Drive folder. Only I can open them, and I use them just to review petitions, reply to you, and invite you into the Republic. I don’t publish ideas, emails, phone numbers or files. Applying is free, and so is the mentorship. Applying doesn’t guarantee funding, and mentorship doesn’t make me anyone’s co-founder.</p></div>" +
      '<div class="field" data-field="f-privacy"><div class="check"><input type="checkbox" id="f-privacy" data-bind="consentPrivacy"' + (d.consentPrivacy ? " checked" : "") + ">" +
      '<label for="f-privacy">I’ve read how my petition is used and who can see it, and I agree to it being used for that. <span class="req" aria-hidden="true">*</span></label></div>' +
      '<p class="field-error" id="f-privacy-err" role="alert"></p></div>' +
      '<div class="field" data-field="f-truth"><div class="check"><input type="checkbox" id="f-truth" data-bind="consentTruth"' + (d.consentTruth ? " checked" : "") + ">" +
      '<label for="f-truth">What I’ve written is honest, and the work and files I’m sharing are mine to share. <span class="req" aria-hidden="true">*</span></label></div>' +
      '<p class="field-error" id="f-truth-err" role="alert"></p></div>' +
      '<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" id="f-hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<div id="send-area" class="sending" aria-live="polite"></div>';
    if (fileCount && !UPLOADS_ON) h += '<p class="notice warn">File uploads aren’t switched on. Please go back and use links instead.</p>';
    return h;
  }

  /* ---------- binding ---------- */
  function bindStep() {
    var body = $("#step-body");
    var heading = $("#step-heading");

    $$("[data-bind]", body).forEach(function (el) {
      var key = el.getAttribute("data-bind");
      var handler = function () {
        state.d[key] = el.type === "checkbox" ? el.checked : el.value;
        clearErr(el);
        if (key === "ageBand") { $("#age-extra").innerHTML = ageExtra(); bindAgeExtra(); }
        if (key === "contactMethod") { $("#detail-wrap").innerHTML = contactDetailField(); bindDetail(); }
        scheduleSave();
      };
      el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", handler);
    });
    $$("textarea[data-q]", body).forEach(function (el) {
      var i = Number(el.getAttribute("data-q"));
      el.addEventListener("input", function () {
        state.d.answers[i] = el.value;
        var c = $("#q" + (i + 1) + "-count"); if (c) c.textContent = el.value.length + " / " + MAX_ANSWER;
        clearErr(el); scheduleSave();
      });
    });

    var back = $("#btn-back"), next = $("#btn-next"), sub = $("#btn-submit"), add = $("#add-evidence");
    if (back) back.addEventListener("click", function () { go(state.step - 1); });
    if (next) next.addEventListener("click", function () { if (validateStep(state.step)) go(state.step + 1); });
    if (sub) sub.addEventListener("click", submitPetition);
    if (add) add.addEventListener("click", function () {
      if (state.evidence.length >= MAX_ITEMS) return;
      state.evidence.push(newEvidence());
      renderEvidenceList(); scheduleSave();
      var last = $$(".evidence-item").pop(); if (last) { var t = $("input", last); if (t) t.focus(); }
    });
    if (state.step === 5) bindEvidenceDelegates();
    if (state.step === 0) { bindAgeExtra(); bindDetail(); }
    if (heading && state.step > 0) { /* focus handled in go() */ }
  }
  function bindDetail() { var el = $("#f-detail"); if (el) el.addEventListener("input", function () { state.d.contactDetail = el.value; clearErr(el); scheduleSave(); }); }
  function bindAgeExtra() {
    $$("#age-extra [data-bind]").forEach(function (el) {
      el.addEventListener(el.type === "checkbox" ? "change" : "input", function () {
        state.d[el.getAttribute("data-bind")] = el.type === "checkbox" ? el.checked : el.value;
        clearErr(el); scheduleSave();
      });
    });
  }

  var evCounter = 0;
  function newEvidence() {
    evCounter++;
    return { id: Date.now().toString(36) + evCounter, title: "", kind: "link", url: "", file: null, fileName: "", status: "idle", progress: 0, error: "", driveUrl: "" };
  }
  function findEv(id) { return state.evidence.filter(function (e) { return e.id === id; })[0]; }

  var evBound = false;
  function bindEvidenceDelegates() {
    var host = $("#evidence-list");
    host.addEventListener("input", function (ev) {
      var t = ev.target, id;
      if ((id = t.getAttribute("data-ev-title"))) { findEv(id).title = t.value; scheduleSave(); }
      else if ((id = t.getAttribute("data-ev-url"))) { var e = findEv(id); e.url = t.value; clearErr(t); scheduleSave(); }
    });
    host.addEventListener("change", function (ev) {
      var t = ev.target, id, e;
      if ((id = t.getAttribute("data-ev-kind"))) {
        e = findEv(id); e.kind = t.value; e.status = "idle"; e.driveUrl = ""; renderEvidenceList(); scheduleSave();
      } else if ((id = t.getAttribute("data-ev-file"))) {
        e = findEv(id);
        var f = t.files && t.files[0];
        var errEl = $("#ev" + id + "-file-err");
        errEl.textContent = "";
        if (!f) { e.file = null; return; }
        var ext = extOf(f.name);
        if (ALLOWED_EXT.indexOf(ext) === -1) { errEl.textContent = "That file type isn’t accepted. Try PDF, Office, image, or a short video, or paste a link."; t.value = ""; e.file = null; return; }
        if (f.size > MAX_MB * 1048576) { errEl.textContent = "That file is " + fmtSize(f.size) + ", and the limit is " + MAX_MB + " MB. For large files or videos, upload to YouTube or Google Drive and paste the link."; t.value = ""; e.file = null; return; }
        e.file = f; e.fileName = f.name; e.status = "idle"; e.driveUrl = ""; e.error = "";
        $("#ev" + id + "-meta").textContent = f.name + " (" + fmtSize(f.size) + ")";
        scheduleSave();
      }
    });
    host.addEventListener("click", function (ev) {
      var id = ev.target.getAttribute && ev.target.getAttribute("data-ev-remove");
      if (id) { state.evidence = state.evidence.filter(function (e) { return e.id !== id; }); renderEvidenceList(); scheduleSave(); }
    });
  }

  function go(n) {
    state.step = Math.max(0, Math.min(STEPS.length - 1, n));
    saveDraft();
    renderStep();
    var h = $("#step-heading");
    var shell = $("#shell");
    if (shell) shell.scrollIntoView({ block: "start", behavior: "smooth" });
    if (h) h.focus({ preventScroll: true });
  }

  /* ---------- validation ---------- */
  function setErr(id, msg) {
    var err = $("#" + id + "-err"), el = $("#" + id);
    if (err) err.textContent = msg;
    if (el) { el.setAttribute("aria-invalid", "true"); }
  }
  function clearErr(el) {
    el.removeAttribute("aria-invalid");
    var err = $("#" + el.id + "-err"); if (err) err.textContent = "";
  }

  function validateStep(i) {
    var s = STEPS[i], d = state.d, bad = [];
    function need(id, cond, msg) { if (!cond) { setErr(id, msg); bad.push(id); } }
    $$(".field-error").forEach(function (e) { e.textContent = ""; });
    $$("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); });

    if (s.key === "you") {
      need("f-name", d.name.trim().length >= 2, "Please enter your name.");
      need("f-email", isEmail(d.email.trim()), "Please enter a valid email address, like name@example.com.");
      need("f-country", d.country.trim().length >= 2, "Please enter your country.");
      need("f-age", !!d.ageBand, "Please choose your age range.");
      if (isTooYoung()) { need("f-age", false, "The Republic is open to builders aged 14 and over right now."); }
      if (d.contactMethod && d.contactMethod !== "Email") need("f-detail", d.contactDetail.trim().length >= 3, "Please tell me how to reach you on " + d.contactMethod + ".");
      if (isUnder18()) {
        need("f-gname", d.guardianName.trim().length >= 2, "Please enter a parent or guardian’s name.");
        need("f-gcontact", d.guardianContact.trim().length >= 5, "Please enter a parent or guardian’s email or phone number.");
        need("f-gok", d.guardianOk, "A parent or guardian needs to agree before you can continue.");
      }
    } else if (s.q) {
      for (var q = s.q[0]; q < s.q[1]; q++) {
        need("q" + (q + 1), d.answers[q].trim().length >= 3, "Please answer this one. “Not yet” plus what you’d do next is a real answer.");
      }
    } else if (s.key === "evidence") {
      state.evidence.forEach(function (e) {
        var id = "ev" + e.id;
        if (e.kind === "link") {
          var u = e.url.trim();
          if (!isHttpUrl(u)) { setErr(id + "-url", "Please paste a full link that starts with https://"); bad.push(id + "-url"); }
        } else {
          if (!UPLOADS_ON) { setErr(id + "-file", "File uploads aren’t switched on. Choose “Paste a link”."); bad.push(id + "-file"); }
          else if (!e.file && e.status !== "done") { setErr(id + "-file", "Please choose a file, or switch to “Paste a link”."); bad.push(id + "-file"); }
        }
      });
    } else if (s.key === "seal") {
      need("f-privacy", d.consentPrivacy, "Please confirm this to submit.");
      need("f-truth", d.consentTruth, "Please confirm this to submit.");
    }
    if (bad.length) {
      var first = $("#" + bad[0]);
      if (first) { first.scrollIntoView({ block: "center", behavior: "smooth" }); first.focus({ preventScroll: true }); }
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Sending to Google (Apps Script)                                 */
  /* ------------------------------------------------------------------ */
  function post(payload, onProgress, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT);
      // No custom headers: this keeps it a "simple" request that Apps Script accepts from any website.
      xhr.timeout = timeoutMs || 60000;
      xhr.onload = function () {
        var json;
        try { json = JSON.parse(xhr.responseText); } catch (e) { return reject({ type: "bad_response" }); }
        resolve(json);
      };
      xhr.onerror = function () { reject({ type: "network" }); };
      xhr.ontimeout = function () { reject({ type: "timeout" }); };
      if (onProgress && xhr.upload) xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.send(JSON.stringify(payload));
    });
  }
  function toBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { reject({ type: "read" }); };
      r.readAsDataURL(file);
    });
  }

  function renderSendList(note, failed) {
    var area = $("#send-area"); if (!area) return;
    var files = state.evidence.map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.kind === "file"; });
    var html = "";
    if (note) html += '<p class="notice' + (failed ? " warn" : "") + '" role="' + (failed ? "alert" : "status") + '">' + note + "</p>";
    if (files.length) {
      html += '<ul class="send-list">' + files.map(function (x) {
        var e = x.e, label = e.title || e.fileName || "File";
        var st = e.status === "done" ? '<span class="send-state ok">Uploaded</span>' :
          e.status === "uploading" ? '<span class="send-state">Uploading… ' + Math.round(e.progress * 100) + "%</span>" :
          e.status === "error" ? '<span class="send-state bad">Failed: ' + esc(e.error) + "</span>" : '<span class="send-state">Waiting</span>';
        return "<li><div class=\"send-row\"><span>" + esc(label) + "</span>" + st + "</div>" +
          '<div class="mini-bar"><span style="width:' + Math.round((e.status === "done" ? 1 : e.progress) * 100) + '%"></span></div></li>';
      }).join("") + "</ul>";
    }
    area.innerHTML = html;
  }

  function setBusy(b) {
    var sub = $("#btn-submit"), back = $("#btn-back");
    if (sub) { sub.disabled = b; sub.textContent = b ? "Sending your petition…" : (state.lastFailed ? "Try again" : "Submit Your Petition"); sub.setAttribute("aria-busy", b ? "true" : "false"); }
    if (back) back.disabled = b;
  }

  function friendly(err) {
    if (err && err.type === "network") return "We couldn’t reach the Republic’s mailroom. Check your internet connection and try again. Your answers are safe on this device.";
    if (err && err.type === "timeout") return "That took too long, so nothing was confirmed. Your answers are safe on this device. Please try again.";
    if (err && err.type === "bad_response") return "The Republic’s mailroom replied in a way we didn’t expect, so we can’t be sure your petition arrived. Your answers are safe on this device. Please try again; it won’t create a duplicate.";
    if (err && err.type === "not_configured") return "This website isn’t connected to its Google Sheet yet, so your petition can’t be received. Your answers are saved on this device. If you run this site, follow Part 3 of SETUP-GUIDE.md and paste your Web app URL into config.js.";
    if (err && err.type === "server") return esc(err.message || "Something went wrong on the server.") + " Your answers are safe on this device. Please try again.";
    return "Something went wrong. Your answers are safe on this device. Please try again.";
  }

  function submitPetition() {
    if (state.submitting || state.done) return;           // blocks double-clicks
    // Re-validate every earlier step so nothing slips through
    var wasStep = state.step;
    for (var s = 0; s < STEPS.length - 1; s++) {
      if (!validateQuiet(s)) {
        go(s); setTimeout(function () { validateStep(s); }, 50);
        return;
      }
    }
    if (!validateStep(wasStep)) return;
    if ($("#f-hp") && $("#f-hp").value) return;           // honeypot

    state.submitting = true; state.lastFailed = false; setBusy(true);
    renderSendList("Sending your petition. Please keep this page open.");

    sendAll().then(function (res) {
      state.done = true; state.submitting = false;
      clearDraft();
      renderWelcome(res.ref || state.ref, res.duplicate, res.joinUrl);
    }).catch(function (err) {
      state.submitting = false; state.lastFailed = true; setBusy(false);
      renderSendList(friendly(err), true);
      saveDraft();
      var n = $("#send-area"); if (n) n.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function validateQuiet(i) {
    var s = STEPS[i], d = state.d;
    if (s.key === "you") {
      if (d.name.trim().length < 2 || !isEmail(d.email.trim()) || d.country.trim().length < 2 || !d.ageBand || isTooYoung()) return false;
      if (d.contactMethod !== "Email" && d.contactDetail.trim().length < 3) return false;
      if (isUnder18() && (d.guardianName.trim().length < 2 || d.guardianContact.trim().length < 5 || !d.guardianOk)) return false;
    } else if (s.q) {
      for (var q = s.q[0]; q < s.q[1]; q++) if (d.answers[q].trim().length < 3) return false;
    } else if (s.key === "evidence") {
      for (var k = 0; k < state.evidence.length; k++) {
        var e = state.evidence[k];
        if (e.kind === "link" && !isHttpUrl(e.url.trim())) return false;
        if (e.kind === "file" && (!UPLOADS_ON || (!e.file && e.status !== "done"))) return false;
      }
    }
    return true;
  }

  function sendAll() {
    if (!ENDPOINT) return Promise.reject({ type: "not_configured" });
    var chain = Promise.resolve();
    // 1) upload files one by one (already-uploaded files are skipped on retry)
    state.evidence.forEach(function (e) {
      if (e.kind !== "file" || e.status === "done") return;
      chain = chain.then(function () {
        e.status = "uploading"; e.progress = 0; e.error = ""; renderSendList("Uploading your files…");
        return toBase64(e.file).then(function (b64) {
          return post({
            action: "upload", ref: state.ref, index: state.evidence.indexOf(e) + 1,
            fileName: e.file.name, mimeType: e.file.type || "application/octet-stream", data: b64
          }, function (p) { e.progress = p; renderSendList("Uploading your files…"); }, 180000);
        }).then(function (res) {
          if (!res || !res.ok) { throw { type: "server", message: (res && res.error) || "Upload failed." }; }
          e.status = "done"; e.progress = 1; e.driveUrl = res.url; renderSendList("Uploading your files…");
        }).catch(function (err) {
          e.status = "error"; e.error = (err && err.message) || (err && err.type === "network" ? "connection problem" : err && err.type === "timeout" ? "timed out" : "upload failed");
          throw err;
        });
      });
    });
    // 2) save the application (one row; the reference makes retries safe)
    chain = chain.then(function () {
      renderSendList("Saving your petition…");
      var d = state.d;
      var payload = {
        action: "submit", ref: state.ref, submittedFrom: location.href.split("#")[0],
        name: d.name.trim(), email: d.email.trim(), country: d.country.trim(), ageBand: d.ageBand,
        contactMethod: d.contactMethod, contactDetail: d.contactMethod === "Email" ? "" : d.contactDetail.trim(),
        links: d.links.trim(),
        guardianName: isUnder18() ? d.guardianName.trim() : "", guardianContact: isUnder18() ? d.guardianContact.trim() : "",
        guardianOk: isUnder18() ? !!d.guardianOk : false,
        answers: d.answers.map(function (a) { return a.trim(); }),
        evidence: state.evidence.map(function (e) {
          var link = e.kind === "file" ? e.driveUrl : e.url.trim();
          var title = e.title.trim() || (e.kind === "file" ? e.fileName : hostOf(link));
          return { title: title, type: e.kind === "file" ? "Uploaded file" : "Link", link: link };
        }),
        consentPrivacy: !!d.consentPrivacy, consentTruth: !!d.consentTruth
      };
      return post(payload, null, 60000);
    }).then(function (res) {
      if (!res || !res.ok) throw { type: "server", message: (res && res.error) || "The petition wasn’t saved." };
      return res;      // success is only reported after the server confirms the save
    });
    return chain;
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "Link"; } }

  /* ---------- Welcome screen ---------- */
  function renderWelcome(ref, duplicate, serverJoinUrl) {
    var joinUrl = serverJoinUrl || get("community.joinUrl");
    var timeline = get("review.expectedTimeline");
    var contactWay = state.d.contactMethod === "Email" ? "email" : state.d.contactMethod;
    var h = '<div class="shell welcome" id="shell">' +
      '<div class="big-stamp"><svg class="seal" aria-hidden="true"><use href="#seal"/></svg>Petition received</div>' +
      '<h3 class="step-title" id="step-heading" tabindex="-1">Welcome to the Republic, ' + esc(state.d.name.trim().split(" ")[0]) + ".</h3>" +
      "<p>Your petition has been saved" + (duplicate ? " (it had already arrived, so nothing was duplicated)" : "") + ". Keep your reference number:</p>" +
      '<div class="ref-box" aria-label="Petition reference">' + esc(ref) + "</div>" +
      '<div class="welcome-body">' +
      "<h3>What happens next</h3><ol>" +
      "<li><strong>I read your petition myself.</strong> It’s in a private sheet that only I can open." + (timeline ? " " + esc(timeline) : " I can’t promise how fast, so thank you for your patience.") + "</li>" +
      "<li><strong>I’ll reach out by " + esc(contactWay) + ".</strong> If your petition is Granted an Audience, that means I’d like to talk with you properly. It isn’t a funding decision.</li>" +
      "<li><strong>Join the community.</strong> " + (joinUrl ? 'Tap the button below to join the Republic’s WhatsApp group. That’s where the mentorship community lives.' : "I’m onboarding people personally to begin with, so I’ll tell you how to join when I get in touch.") + "</li>" +
      "<li><strong>Keep building meanwhile.</strong> Pick the 30-day test you described in question 8 and start it. It’s the best thing you can bring to our first conversation.</li></ol>" +
      (joinUrl ? '<p style="text-align:center"><a class="btn btn-gold" href="' + esc(joinUrl) + '" target="_blank" rel="noopener">' + esc(get("community.joinLabel") || "Join the Republic’s WhatsApp group") + "</a></p>" : "") +
      "<h3>Please remember</h3><ul>" +
      "<li>The Academy of Builders is free. It doesn’t guarantee one-to-one time, a set number of sessions, or funding.</li>" +
      "<li>The " + esc(formatPool() || "seed") + " pool is a total I’m considering across ventures, not an amount owed to anyone.</li>" +
      "<li>I’m your mentor, not automatically your co-founder.</li>" +
      (isUnder18() ? "<li>The group chat includes other people you haven’t met. Show it to your parent or guardian before you join.</li><li>Because you’re under 18, any investment or contract would involve your parent or guardian and professional legal advice.</li>" : "") +
      "</ul></div></div>";
    root.innerHTML = h;
    var shell = $("#shell"); if (shell) shell.scrollIntoView({ block: "start", behavior: "smooth" });
    var hh = $("#step-heading"); if (hh) hh.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Start                                                           */
  /* ------------------------------------------------------------------ */
  function initForm() {
    root = $("#petition-root");
    if (!root) return;
    var draft = loadDraft();
    state = freshState();
    if (draft) {
      state.ref = draft.ref;
      state.step = Math.min(draft.step || 0, STEPS.length - 1);
      Object.keys(state.d).forEach(function (k) { if (draft.d[k] !== undefined) state.d[k] = draft.d[k]; });
      if (!Array.isArray(state.d.answers) || state.d.answers.length !== 20) state.d.answers = QUESTIONS.map(function () { return ""; });
      state.evidence = (draft.evidence || []).map(function (e) {
        var n = newEvidence(); n.id = e.id || n.id; n.title = e.title || ""; n.kind = e.kind === "file" ? "file" : "link";
        n.url = e.url || ""; n.fileName = e.fileName || ""; n.driveUrl = e.driveUrl || ""; n.status = e.status === "done" ? "done" : "idle";
        if (n.kind === "file" && !UPLOADS_ON) n.kind = "link";
        return n;
      });
      var hasText = state.d.name || state.d.answers.some(function (a) { return a; });
      restored = !!hasText;
    }
    renderShell();
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyConfig();
    initVideo();
    initForm();
  });
})();
