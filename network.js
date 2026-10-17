/* ==========================================================================
   The Builders' Network: page behaviour (talks to Supabase).
   Connection values live in supabase-config.js. You should not need to edit this.
   The privacy rules are enforced by the database (supabase-setup.sql), not by
   this file, so changing this file cannot expose anyone's private information.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.RAEESI_SUPABASE || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var CATEGORIES = ["Technology", "AI", "Blockchain", "Consumer Products", "Design", "Marketing", "Finance", "Operations", "Other"];
  var STATUSES = ["Idea", "Prototype", "Building", "Launched"];
  var ROLES = ["Developer", "Designer", "Marketer", "Founder / product", "Finance / operations", "Researcher", "Writer / content", "Other"];
  var AVAIL = ["Not available right now", "A few hours a week", "Part-time", "Full-time"];
  var AGE_BANDS = ["13 or younger", "14–15", "16–17", "18–25", "26 or older"];
  var MINOR = ["14–15", "16–17"];
  var GOALS = [
    ["publicity", "Free publicity: show me on the Republic’s website"],
    ["cofounder", "Find co-founders and collaborators"],
    ["pitch", "Pitch my ideas and get feedback"],
    ["offer", "Offer my skills or help other builders"],
    ["learn", "Learn and meet other builders"]
  ];
  var TABS = [["pitches", "Pitch Hall"], ["builders", "Builders"], ["matches", "Matches"], ["inbox", "Inbox"], ["profile", "My profile"]];

  var S = {
    sb: null, user: null, member: null, profile: null, tab: "pitches",
    pitches: [], profiles: [], interest: [], commentRows: [], saves: {}, blocked: {}, requests: [],
    f: { q: "", cat: "", status: "", mine: false, saved: false },
    bf: { q: "", role: "", open: false },
    loaded: false, errors: []
  };

  /* ---------- small helpers ---------- */
  function approved() { return !!(S.member && S.member.approved && !S.member.suspended); }
  function isMinor() { return !!(S.member && MINOR.indexOf(S.member.age_band) > -1); }
  function say(text, bad) {
    var el = $("#net-status");
    el.innerHTML = text ? '<div class="notice' + (bad ? " warn" : "") + '"><p>' + text + "</p></div>" : "";
  }
  function friendly(err) {
    var m = (err && (err.message || err.msg)) || "";
    if (/Adults cannot/i.test(m)) return "Adults can’t send direct requests to members under 18. You can comment on their pitch instead.";
    if (/Daily request limit/i.test(m)) return "You’ve reached today’s limit of 10 requests. Please try again tomorrow.";
    if (/under 18 cannot/i.test(m)) return "Members under 18 can’t be listed or post publicly. Choose “members only” instead.";
    if (/row-level security|permission denied/i.test(m)) return "That isn’t allowed right now. If you’re new, you can do it once the Supreme Leader approves your profile.";
    if (/duplicate key/i.test(m)) return "You’ve already done that.";
    if (/check constraint/i.test(m)) return "One of your answers is too short or too long. Please check the lengths.";
    if (/rate limit|too many/i.test(m)) return "Too many emails were requested. Please wait a few minutes and try again.";
    return "Something went wrong" + (m ? " (" + m + ")" : "") + ". Please try again.";
  }
  function splitList(str, max) {
    var out = [], seen = {};
    String(str || "").split(/[,\n]+/).forEach(function (x) {
      x = x.trim().slice(0, 40);
      var k = x.toLowerCase();
      if (x && !seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out.slice(0, max);
  }
  function lower(a) { return (a || []).map(function (x) { return String(x).toLowerCase(); }); }
  function inter(a, b) { var lb = lower(b); return (a || []).filter(function (x) { return lb.indexOf(String(x).toLowerCase()) > -1; }); }
  function tags(arr) { return (arr || []).length ? '<p class="tags">' + arr.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</p>" : ""; }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  function linksHtml(text) {
    var toks = String(text || "").split(/\s+/).filter(Boolean);
    var parts = toks.map(function (t) { return validUrl(t) ? '<a href="' + esc(t) + '" target="_blank" rel="noopener noreferrer nofollow ugc">' + esc(t.replace(/^https?:\/\/(www\.)?/, "")) + "</a>" : esc(t); });
    return parts.length ? '<p class="show-links">' + parts.join(" ") + "</p>" : "";
  }
  function result(r) { if (r && r.error) { S.errors.push(r.error); return []; } return (r && r.data) || []; }
  function nameOfProfile(id) { var p = S.profiles.filter(function (x) { return x.id === id; })[0]; return p ? p.display_name : "a builder"; }

  /* ---------- loading ---------- */
  var refreshing = false, again = false;
  function refresh() {
    if (refreshing) { again = true; return; }
    refreshing = true;
    loadAll().then(function () {
      S.loaded = true; render();
      if (S.errors.length) say(esc(friendly(S.errors[0])) + " (If you run this site: has supabase-setup.sql been run?)", true);
    }).catch(function () {
      S.loaded = true; render(); say("We couldn’t reach the network just now. Please check your connection and reload.", true);
    }).then(function () { refreshing = false; if (again) { again = false; refresh(); } });
  }

  function loadAll() {
    var sb = S.sb, uid = S.user && S.user.id;
    S.errors = []; S.member = null; S.profile = null;
    var p = Promise.resolve();
    if (uid) {
      p = p.then(function () { return sb.from("members").select("*").eq("id", uid).maybeSingle(); }).then(function (r) { S.member = r.data || null; })
        .then(function () { return sb.from("profiles").select("*").eq("id", uid).maybeSingle(); }).then(function (r) { S.profile = r.data || null; });
    }
    p = p.then(function () { return sb.from("pitches").select("*").order("created_at", { ascending: false }).limit(200); }).then(function (r) { S.pitches = result(r); })
      .then(function () { return sb.from("profiles").select("*").order("updated_at", { ascending: false }).limit(300); }).then(function (r) { S.profiles = result(r); });
    // These depend on the member record, so they must run AFTER it has loaded.
    p = p.then(function () {
      S.interest = []; S.commentRows = []; S.saves = {}; S.blocked = {}; S.requests = [];
      if (!(uid && S.member)) return null;
      var q = Promise.resolve()
        .then(function () { return sb.from("blocks").select("blocked").eq("blocker", uid); })
        .then(function (r) { result(r).forEach(function (b) { S.blocked[b.blocked] = true; }); });
      if (approved()) {
        q = q.then(function () { return sb.from("pitch_interest").select("pitch_id,user_id"); }).then(function (r) { S.interest = result(r); })
          .then(function () { return sb.from("pitch_comments").select("pitch_id,author").limit(2000); }).then(function (r) { S.commentRows = result(r); })
          .then(function () { return sb.from("pitch_saves").select("pitch_id").eq("user_id", uid); }).then(function (r) { result(r).forEach(function (x) { S.saves[x.pitch_id] = true; }); })
          .then(function () { return sb.from("collab_requests").select("*").order("created_at", { ascending: false }); }).then(function (r) { S.requests = result(r); });
      }
      return q;
    });
    return p;
  }

  /* ---------- top-level render ---------- */
  function render() {
    var app = $("#net-app");
    var html = authBar() + banner() + tabsHtml() + '<div class="tab-panel" id="net-panel" role="tabpanel"></div>';
    app.innerHTML = html;
    renderPanel();
  }

  function authBar() {
    if (!S.user) {
      return '<form data-form="signin" class="authbar"><label for="si-email">Sign in or join with your email</label>' +
        '<div class="inline"><input type="email" id="si-email" required autocomplete="email" placeholder="you@example.com">' +
        '<button type="submit" class="btn btn-dark btn-sm">Email me a sign-in link</button></div>' +
        '<p class="hint">Use the email you petitioned with. No password needed: we email you a one-time link.</p></form>';
    }
    return '<div class="authbar signed"><span>Signed in as <strong>' + esc(S.user.email || "member") + '</strong></span> <button type="button" class="linkish" data-act="signout">Sign out</button></div>';
  }

  function banner() {
    if (!S.user) return "";
    if (!S.member) return '<div class="notice"><p><strong>Welcome.</strong> Finish your profile under “My profile” to join. It takes about two minutes.</p></div>';
    if (S.member.suspended) return '<div class="notice warn"><p>Your membership is paused. Please contact the Supreme Leader.</p></div>';
    if (!S.member.approved) return '<div class="notice"><p><strong>Waiting for approval.</strong> The Supreme Leader approves members personally, so please be patient. Use the email you petitioned with. You can edit your profile meanwhile, and you can browse what’s public.</p></div>';
    return "";
  }

  function tabsHtml() {
    var pending = S.requests.filter(function (r) { return r.to_user === (S.user && S.user.id) && r.status === "pending"; }).length;
    return '<div class="tabs" role="tablist" aria-label="Network sections">' + TABS.map(function (t) {
      var label = t[1] + (t[0] === "inbox" && pending ? " (" + pending + ")" : "");
      return '<button type="button" role="tab" class="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '" tabindex="' + (S.tab === t[0] ? 0 : -1) + '">' + esc(label) + "</button>";
    }).join("") + "</div>";
  }

  function renderPanel() {
    var host = $("#net-panel"); if (!host) return;
    if (S.tab === "pitches") { host.innerHTML = pitchesShell(); renderPitchList(); }
    else if (S.tab === "builders") { host.innerHTML = buildersShell(); renderBuilderList(); }
    else if (S.tab === "matches") host.innerHTML = needMember() || matchesHtml();
    else if (S.tab === "inbox") host.innerHTML = needMember() || inboxHtml();
    else host.innerHTML = profileHtml();
  }
  function needMember() {
    if (!S.user) return '<div class="notice"><p>Please sign in (above) to use this part of the network.</p></div>';
    if (!approved()) return '<div class="notice"><p>This opens once the Supreme Leader has approved your profile.</p></div>';
    return "";
  }
  function visibleToMe(userId) { return !S.blocked[userId]; }

  /* ======================================================================
     PITCH HALL
     ====================================================================== */
  function pitchesShell() {
    var f = S.f;
    return '<div class="toolbar">' +
      '<label class="sr-only" for="pf-q">Search pitches</label><input type="search" id="pf-q" data-filter="q" placeholder="Search pitches, skills, builders…" value="' + esc(f.q) + '">' +
      '<label class="sr-only" for="pf-cat">Category</label><select id="pf-cat" data-filter="cat"><option value="">All categories</option>' + CATEGORIES.map(function (c) { return "<option" + (f.cat === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>" +
      '<label class="sr-only" for="pf-status">Stage</label><select id="pf-status" data-filter="status"><option value="">Any stage</option>' + STATUSES.map(function (c) { return "<option" + (f.status === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>" +
      '</div><div class="toolbar">' +
      (S.user && approved() ? '<label class="inline-check"><input type="checkbox" data-filter="mine"' + (f.mine ? " checked" : "") + '> My pitches</label>' +
        '<label class="inline-check"><input type="checkbox" data-filter="saved"' + (f.saved ? " checked" : "") + '> Saved</label>' +
        '<button type="button" class="btn btn-gold btn-sm" data-act="new-pitch">Post a pitch</button>' : "") +
      "</div>" +
      (!S.user ? '<p class="file-meta">You’re seeing pitches that builders chose to make public. Sign in and get approved to see members’ pitches, comment, and ask to collaborate.</p>' : "") +
      '<div id="pitch-list" class="show-grid" aria-live="polite"></div>';
  }

  function countFor(arr, pitchId) { return arr.filter(function (x) { return x.pitch_id === pitchId; }).length; }

  function renderPitchList() {
    var host = $("#pitch-list"); if (!host) return;
    var f = S.f, q = f.q.trim().toLowerCase(), uid = S.user && S.user.id;
    var list = S.pitches.filter(function (p) {
      if (uid !== p.author && S.blocked[p.author]) return false;
      if (f.cat && p.category !== f.cat) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.mine && p.author !== uid) return false;
      if (f.saved && !S.saves[p.id]) return false;
      if (q && [p.title, p.description, p.author_name, p.next_step, (p.skills_needed || []).join(" "), (p.roles_needed || []).join(" ")].join(" ").toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    host.innerHTML = list.length ? list.map(pitchCard).join("") :
      '<p class="file-meta">' + (S.pitches.length ? "No pitches match that." : "No pitches yet. Be the first to post one.") + "</p>";
  }

  function visBadge(v) { return v === "public" ? "Public" : v === "draft" ? "Draft (only you)" : "Members"; }

  function pitchCard(p) {
    var uid = S.user && S.user.id, mine = uid === p.author;
    var ic = countFor(S.interest, p.id), cc = countFor(S.commentRows, p.id);
    var interested = S.interest.some(function (i) { return i.pitch_id === p.id && i.user_id === uid; });
    var acts = '<button type="button" class="btn btn-line btn-sm" data-act="open-pitch" data-id="' + esc(p.id) + '">' + (approved() ? "Open &amp; discuss" : "Read more") + "</button>";
    if (approved() && !mine) {
      acts += '<button type="button" class="btn btn-line btn-sm" data-act="interest" data-id="' + esc(p.id) + '" aria-pressed="' + interested + '">' + (interested ? "Interested ✓" : "I’m interested") + "</button>" +
              '<button type="button" class="btn btn-line btn-sm" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + !!S.saves[p.id] + '">' + (S.saves[p.id] ? "Saved ✓" : "Save") + "</button>";
    }
    if (mine) acts += '<button type="button" class="btn btn-line btn-sm" data-act="edit-pitch" data-id="' + esc(p.id) + '">Edit</button>';
    return '<article class="show-card pitch-card">' +
      '<p class="mc-num">' + esc(p.category) + ' &middot; ' + esc(p.status) + ' &middot; <span class="badge ' + (p.visibility === "public" ? "st-open" : "st-archived") + '">' + visBadge(p.visibility) + "</span>" + (p.hidden ? ' <span class="badge st-under-review">Hidden</span>' : "") + "</p>" +
      "<h3>" + esc(p.title) + "</h3>" +
      '<p class="by">by <strong>' + esc(p.author_name || "a builder") + "</strong></p>" +
      "<p>" + esc(p.description.length > 260 ? p.description.slice(0, 260) + "…" : p.description) + "</p>" +
      ((p.roles_needed || []).length ? '<p class="mini"><strong>Looking for:</strong></p>' + tags(p.roles_needed) : "") +
      ((p.skills_needed || []).length ? '<p class="mini"><strong>Skills needed:</strong></p>' + tags(p.skills_needed) : "") +
      (p.next_step ? '<p class="why"><strong>Next step:</strong> ' + esc(p.next_step) + "</p>" : "") +
      (approved() ? '<p class="file-meta">' + ic + " interested &middot; " + cc + (cc === 1 ? " comment" : " comments") + "</p>" : "") +
      '<div class="mc-actions">' + acts + "</div></article>";
  }

  /* ---------- pitch form ---------- */
  function pitchForm(p) {
    p = p || { title: "", description: "", category: "Technology", status: "Idea", skills_needed: [], roles_needed: [], next_step: "", visibility: "members" };
    var vis = [["members", "Members only (approved members of the Republic)"], ["draft", "Draft (only you can see it)"]];
    if (!isMinor()) vis.push(["public", "Public on the website (free publicity)"]);
    return '<h2 id="nd-title" class="md-title">' + (p.id ? "Edit your pitch" : "Post a pitch") + "</h2>" +
      '<form data-form="pitch" data-id="' + esc(p.id || "") + '">' +
      '<div class="field"><label for="pt-title">Title *</label><input type="text" id="pt-title" required minlength="4" maxlength="100" value="' + esc(p.title) + '"></div>' +
      '<div class="field"><label for="pt-desc">Describe it *</label><span class="hint">What is it, what problem does it solve, and who is it for? (20 to 1500 characters)</span><textarea id="pt-desc" required minlength="20" maxlength="1500" style="min-height:8rem">' + esc(p.description) + "</textarea></div>" +
      '<div class="row-2"><div class="field"><label for="pt-cat">Category *</label><select id="pt-cat">' + CATEGORIES.map(function (c) { return "<option" + (p.category === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="pt-status">Where is it now? *</label><select id="pt-status">' + STATUSES.map(function (c) { return "<option" + (p.status === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div></div>" +
      '<fieldset class="field"><legend class="label">Roles you’re looking for</legend><div class="checks">' + ROLES.map(function (r) { return '<label class="inline-check"><input type="checkbox" name="pt-role" value="' + esc(r) + '"' + ((p.roles_needed || []).indexOf(r) > -1 ? " checked" : "") + "> " + esc(r) + "</label>"; }).join("") + "</div></fieldset>" +
      '<div class="field"><label for="pt-skills">Skills needed</label><span class="hint">Separate with commas, like “React, copywriting, Figma”.</span><input type="text" id="pt-skills" maxlength="300" value="' + esc((p.skills_needed || []).join(", ")) + '"></div>' +
      '<div class="field"><label for="pt-next">Desired next step</label><input type="text" id="pt-next" maxlength="300" value="' + esc(p.next_step || "") + '" placeholder="e.g. Find a designer to help me make a prototype this month"></div>' +
      '<div class="field"><label for="pt-vis">Who can see it?</label><select id="pt-vis">' + vis.map(function (v) { return '<option value="' + v[0] + '"' + (p.visibility === v[0] ? " selected" : "") + ">" + v[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="panel"><p>Anything other people can see can be copied. Posting here does <strong>not</strong> legally protect your idea. Leave out anything confidential. Public pitches can be seen by anyone on the internet.</p></div>' +
      '<div class="mc-actions"><button type="submit" class="btn btn-dark">' + (p.id ? "Save changes" : "Post pitch") + '</button>' +
      (p.id ? '<button type="button" class="btn btn-line" data-act="delete-pitch" data-id="' + esc(p.id) + '">Delete this pitch</button>' : "") +
      '<button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ---------- pitch detail + discussion ---------- */
  function openPitch(id) {
    var p = S.pitches.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var uid = S.user && S.user.id, mine = uid === p.author;
    var base = '<p class="mc-num">' + esc(p.category) + " &middot; " + esc(p.status) + "</p>" +
      '<h2 id="nd-title" class="md-title">' + esc(p.title) + "</h2>" +
      '<p class="by">by <strong>' + esc(p.author_name || "a builder") + "</strong></p>" +
      "<p>" + esc(p.description).replace(/\n/g, "<br>") + "</p>" +
      ((p.roles_needed || []).length ? "<h3>Looking for</h3>" + tags(p.roles_needed) : "") +
      ((p.skills_needed || []).length ? "<h3>Skills needed</h3>" + tags(p.skills_needed) : "") +
      (p.next_step ? "<h3>Desired next step</h3><p>" + esc(p.next_step) + "</p>" : "");
    if (!approved()) {
      showDialog(base + '<p class="file-meta">Sign in and get approved to comment, ask questions, or request to collaborate.</p><div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>');
      return;
    }
    showDialog(base + '<h3>Discussion</h3><div id="comments"><p class="file-meta">Loading comments…</p></div>' +
      '<form data-form="comment" data-id="' + esc(p.id) + '"><div class="field"><label for="cm-body">Add a comment, question or useful resource</label>' +
      '<span class="hint">Be constructive and kind: talk about the work, not the person.</span>' +
      '<textarea id="cm-body" required minlength="3" maxlength="1000" style="min-height:5rem"></textarea></div>' +
      '<button type="submit" class="btn btn-dark btn-sm">Post comment</button></form>' +
      '<div class="mc-actions">' +
      (!mine ? '<button type="button" class="btn btn-gold btn-sm" data-act="collab" data-to="' + esc(p.author) + '" data-pitch="' + esc(p.id) + '">Request to collaborate</button>' +
               '<button type="button" class="btn btn-line btn-sm" data-act="report" data-type="pitch" data-id="' + esc(p.id) + '">Report this pitch</button>' +
               '<button type="button" class="btn btn-line btn-sm" data-act="block" data-id="' + esc(p.author) + '">Block this builder</button>' : "") +
      '<button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>');
    S.sb.from("pitch_comments").select("*").eq("pitch_id", id).order("created_at", { ascending: true }).then(function (r) {
      var host = $("#comments"); if (!host) return;
      var rows = result(r).filter(function (c) { return c.author === uid || !S.blocked[c.author]; });
      host.innerHTML = rows.length ? rows.map(function (c) {
        return '<div class="why"><strong>' + esc(c.author_name || "a builder") + ":</strong> " + esc(c.body) +
          (c.author === uid ? ' <button type="button" class="linkish" data-act="del-comment" data-id="' + esc(c.id) + '" data-pitch="' + esc(p.id) + '">Delete</button>'
                            : ' <button type="button" class="linkish" data-act="report" data-type="comment" data-id="' + esc(c.id) + '">Report</button>') + "</div>";
      }).join("") : '<p class="file-meta">No comments yet.</p>';
    });
  }

  /* ======================================================================
     BUILDERS DIRECTORY
     ====================================================================== */
  function buildersShell() {
    var f = S.bf;
    return '<div class="toolbar"><label class="sr-only" for="bf-q">Search builders</label><input type="search" id="bf-q" data-bfilter="q" placeholder="Search by name, skill or what they offer…" value="' + esc(f.q) + '">' +
      '<label class="sr-only" for="bf-role">Role</label><select id="bf-role" data-bfilter="role"><option value="">Any role</option>' + ROLES.map(function (r) { return "<option" + (f.role === r ? " selected" : "") + ">" + r + "</option>"; }).join("") + "</select>" +
      '<label class="inline-check"><input type="checkbox" data-bfilter="open"' + (f.open ? " checked" : "") + '> Open to collaborate</label></div>' +
      (!S.user ? '<p class="file-meta">These are builders who chose to be listed publicly. Sign in and get approved to see members-only profiles.</p>' : "") +
      '<div id="builder-list" class="show-grid" aria-live="polite"></div>';
  }

  function renderBuilderList() {
    var host = $("#builder-list"); if (!host) return;
    var f = S.bf, q = f.q.trim().toLowerCase(), uid = S.user && S.user.id;
    var list = S.profiles.filter(function (p) {
      if (p.id !== uid && S.blocked[p.id]) return false;
      if (f.role && (p.role_tags || []).indexOf(f.role) === -1) return false;
      if (f.open && !p.open_to_collab) return false;
      if (q && [p.display_name, p.bio, p.offering, p.looking_for, (p.skills || []).join(" ")].join(" ").toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    host.innerHTML = list.length ? list.map(profileCard).join("") : '<p class="file-meta">' + (S.profiles.length ? "No builders match that." : "No builders are listed yet.") + "</p>";
  }

  function profileCard(p) {
    var uid = S.user && S.user.id, me = uid === p.id;
    var acts = "";
    if (approved() && !me) {
      acts = '<button type="button" class="btn btn-gold btn-sm" data-act="collab" data-to="' + esc(p.id) + '">Request to collaborate</button>' +
             '<button type="button" class="btn btn-line btn-sm" data-act="report" data-type="profile" data-id="' + esc(p.id) + '">Report</button>' +
             '<button type="button" class="btn btn-line btn-sm" data-act="block" data-id="' + esc(p.id) + '">Block</button>';
    }
    return '<article class="show-card"><p class="mc-num">' + (p.open_to_collab ? "Open to collaborate" : "Builder") + (p.availability ? " &middot; " + esc(p.availability) : "") +
      " &middot; " + '<span class="badge ' + (p.visibility === "public" ? "st-open" : "st-archived") + '">' + (p.visibility === "public" ? "Public" : "Members") + "</span></p>" +
      "<h3>" + esc(p.display_name) + (me ? " (you)" : "") + "</h3>" +
      (p.bio ? "<p>" + esc(p.bio) + "</p>" : "") +
      ((p.role_tags || []).length ? '<p class="mini"><strong>Can be a:</strong></p>' + tags(p.role_tags) : "") +
      ((p.skills || []).length ? '<p class="mini"><strong>Skills:</strong></p>' + tags(p.skills) : "") +
      (p.offering ? '<p class="why"><strong>Can contribute:</strong> ' + esc(p.offering) + "</p>" : "") +
      (p.looking_for ? '<p class="why"><strong>Looking for:</strong> ' + esc(p.looking_for) + "</p>" : "") +
      (p.links ? linksHtml(p.links) : "") +
      '<div class="mc-actions">' + acts + "</div></article>";
  }

  /* ======================================================================
     MATCHES (simple, honest suggestions)
     ====================================================================== */
  function scorePerson(me, p) {
    var s = 0, why = [], x;
    x = inter(me.roles_wanted, p.role_tags); if (x.length) { s += 3 * x.length; why.push("could be your " + x.join(" / ")); }
    x = inter(me.skills_wanted, p.skills); if (x.length) { s += 2 * x.length; why.push("knows " + x.join(", ")); }
    x = inter(p.roles_wanted, me.role_tags); if (x.length) { s += 2 * x.length; why.push("is looking for a " + x.join(" / ") + ", which you can be"); }
    x = inter(p.skills_wanted, me.skills); if (x.length) { s += x.length; why.push("wants " + x.join(", ") + ", which you know"); }
    return { s: s, why: why };
  }
  function candidates() {
    var uid = S.user.id;
    return S.profiles.filter(function (p) { return p.id !== uid && p.open_to_collab && !S.blocked[p.id]; });
  }
  function matchesHtml() {
    if (!S.profile) return '<div class="notice"><p>Create your profile first (“My profile”) and add the roles and skills you’re looking for.</p></div>';
    var me = S.profile;
    var people = candidates().map(function (p) { var r = scorePerson(me, p); return { p: p, s: r.s, why: r.why }; })
      .filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
    var html = '<p class="file-meta">Suggestions come only from what members wrote in their profiles. A match doesn’t mean you’ll get along or succeed together. It’s a starting point for a conversation.</p>' +
      "<h3>Builders who might fit you</h3>";
    html += people.length ? '<div class="show-grid">' + people.map(function (x) {
      return '<article class="show-card"><h3>' + esc(x.p.display_name) + "</h3>" + (x.p.bio ? "<p>" + esc(x.p.bio) + "</p>" : "") +
        '<p class="why"><strong>Why:</strong> ' + esc(x.why.join("; ")) + ".</p>" + tags(x.p.role_tags) +
        '<div class="mc-actions"><button type="button" class="btn btn-gold btn-sm" data-act="collab" data-to="' + esc(x.p.id) + '">Request to collaborate</button></div></article>';
    }).join("") + "</div>" : '<p class="file-meta">No suggestions yet. Add the roles and skills you’re looking for in “My profile”, and tick “open to collaborate” so others can find you too.</p>';
    var mine = S.pitches.filter(function (p) { return p.author === S.user.id && p.visibility !== "draft"; });
    if (mine.length) {
      html += "<h3>People who might help with your pitches</h3>";
      mine.forEach(function (p) {
        var ppl = candidates().map(function (c) {
          var rs = inter(p.roles_needed, c.role_tags), sk = inter(p.skills_needed, c.skills);
          return { c: c, s: 3 * rs.length + 2 * sk.length, why: rs.concat(sk) };
        }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4);
        html += '<div class="why"><strong>' + esc(p.title) + ":</strong> " + (ppl.length ? ppl.map(function (x) {
          return esc(x.c.display_name) + " (" + esc(x.why.join(", ")) + ') <button type="button" class="linkish" data-act="collab" data-to="' + esc(x.c.id) + '" data-pitch="' + esc(p.id) + '">Request</button>';
        }).join("; ") : "no suggestions yet") + "</div>";
      });
    }
    return html;
  }

  /* ======================================================================
     INBOX
     ====================================================================== */
  function inboxHtml() {
    var uid = S.user.id;
    var rec = S.requests.filter(function (r) { return r.to_user === uid && !S.blocked[r.from_user]; });
    var sent = S.requests.filter(function (r) { return r.from_user === uid; });
    var html = '<div class="panel"><p>Requests are the Republic’s only form of messaging. Only the two of you, and the Supreme Leader as moderator, can see them. <strong>Never share a phone number, address, school or passwords</strong> unless you are sure you trust the person, and if you’re under 18, talk to a parent or guardian first.</p></div>';
    html += "<h3>Requests to you</h3>" + (rec.length ? rec.map(function (r) {
      var pitch = r.pitch_id ? S.pitches.filter(function (p) { return p.id === r.pitch_id; })[0] : null;
      var inner = "<p><strong>" + esc(r.from_name || "A builder") + "</strong>" + (r.role_offered ? " offers: " + esc(r.role_offered) : "") + (pitch ? ", about your pitch “" + esc(pitch.title) + "”" : "") + "</p><p>" + esc(r.message) + "</p>";
      if (r.status === "pending") {
        inner += '<form data-form="respond" data-id="' + esc(r.id) + '"><div class="field"><label for="rp-' + esc(r.id) + '">Your reply (optional)</label>' +
          '<span class="hint">If you accept, you can say how to continue (for example, which app to use). Only share what you’re comfortable with.</span>' +
          '<textarea id="rp-' + esc(r.id) + '" maxlength="600" style="min-height:4.5rem"></textarea></div>' +
          '<div class="mc-actions"><button type="submit" name="answer" value="accepted" class="btn btn-dark btn-sm">Accept</button>' +
          '<button type="submit" name="answer" value="declined" class="btn btn-line btn-sm">Decline</button>' +
          '<button type="button" class="btn btn-line btn-sm" data-act="report" data-type="request" data-id="' + esc(r.id) + '">Report</button>' +
          '<button type="button" class="btn btn-line btn-sm" data-act="block" data-id="' + esc(r.from_user) + '">Block</button></div></form>';
      } else inner += '<p class="file-meta">You ' + esc(r.status) + " this request." + (r.reply ? " Your reply: " + esc(r.reply) : "") + "</p>";
      return '<div class="entry">' + inner + "</div>";
    }).join("") : '<p class="file-meta">No requests yet.</p>');
    html += "<h3>Requests you sent</h3>" + (sent.length ? sent.map(function (r) {
      return '<div class="entry"><p>To <strong>' + esc(nameOfProfile(r.to_user)) + "</strong>" + (r.role_offered ? " (" + esc(r.role_offered) + ")" : "") + ": " + esc(r.message) + '</p><p class="file-meta">Status: <strong>' + esc(r.status) + "</strong>" +
        (r.reply ? ". Their reply: " + esc(r.reply) : "") + (r.status === "pending" ? ' <button type="button" class="linkish" data-act="withdraw" data-id="' + esc(r.id) + '">Withdraw</button>' : "") + "</p></div>";
    }).join("") : '<p class="file-meta">You haven’t sent any requests.</p>');
    var bl = Object.keys(S.blocked);
    html += "<h3>People you’ve blocked</h3>" + (bl.length ? bl.map(function (id) {
      return '<p>' + esc(nameOfProfile(id) === "a builder" ? "A blocked member" : nameOfProfile(id)) + ' <button type="button" class="linkish" data-act="unblock" data-id="' + esc(id) + '">Unblock</button></p>';
    }).join("") : '<p class="file-meta">Nobody.</p>');
    return html;
  }

  /* ======================================================================
     MY PROFILE
     ====================================================================== */
  function profileHtml() {
    if (!S.user) return '<div class="notice"><p>Please sign in (above) to create your profile.</p></div>';
    var m = S.member || { age_band: "", guardian_ok: false };
    var p = S.profile || { display_name: "", bio: "", skills: [], skills_wanted: [], role_tags: [], roles_wanted: [], offering: "", looking_for: "", availability: "", links: "", goals: [], visibility: "private", open_to_collab: false };
    function chk(name, list, val) { return '<label class="inline-check"><input type="checkbox" name="' + name + '" value="' + esc(val) + '"' + (list.indexOf(val) > -1 ? " checked" : "") + "> " + esc(val) + "</label>"; }
    return '<h3>' + (S.profile ? "Your profile" : "Create your profile") + "</h3>" +
      '<form data-form="profile">' +
      '<div class="row-2"><div class="field"><label for="pr-name">Display name *</label><span class="hint">What others see. It doesn’t have to be your real name.</span><input type="text" id="pr-name" required minlength="2" maxlength="50" value="' + esc(p.display_name) + '"></div>' +
      '<div class="field"><label for="pr-age">Your age *</label><span class="hint">Only a range, kept private. It’s used for safety rules.</span><select id="pr-age" required><option value="">Choose one</option>' + AGE_BANDS.map(function (a) { return "<option" + (m.age_band === a ? " selected" : "") + ">" + a + "</option>"; }).join("") + "</select></div></div>" +
      '<div id="pr-guardian" class="field"' + (MINOR.indexOf(m.age_band) > -1 ? "" : " hidden") + '><div class="check"><input type="checkbox" id="pr-gok"' + (m.guardian_ok ? " checked" : "") + '><label for="pr-gok">My parent or guardian knows I’m joining the Builders’ Network and agrees.</label></div></div>' +
      '<fieldset class="field"><legend class="label">How do you want to take part?</legend><div class="checks">' + GOALS.map(function (g) {
        return '<label class="inline-check"><input type="checkbox" name="pr-goal" value="' + g[0] + '"' + (p.goals.indexOf(g[0]) > -1 ? " checked" : "") + "> " + esc(g[1]) + "</label>"; }).join("") + "</div></fieldset>" +
      '<div class="field"><label for="pr-vis">Who can see your profile?</label><select id="pr-vis">' +
        '<option value="private"' + (p.visibility === "private" ? " selected" : "") + ">Only me</option>" +
        '<option value="members"' + (p.visibility === "members" ? " selected" : "") + ">Approved members of the Republic</option>" +
        '<option value="public"' + (p.visibility === "public" ? " selected" : "") + (MINOR.indexOf(m.age_band) > -1 ? " disabled" : "") + ">Everyone, on the Republic’s website (free publicity)</option></select>" +
        '<span class="hint" id="pr-vis-hint">Members under 18 are never listed publicly. A public profile can be seen by anyone on the internet, so leave out anything private.</span></div>' +
      '<div class="field"><label for="pr-bio">Short bio</label><textarea id="pr-bio" maxlength="500" style="min-height:5rem">' + esc(p.bio || "") + "</textarea></div>" +
      '<fieldset class="field"><legend class="label">Roles you can fill</legend><div class="checks">' + ROLES.map(function (r) { return chk("pr-role", p.role_tags, r); }).join("") + "</div></fieldset>" +
      '<div class="field"><label for="pr-skills">Your skills</label><span class="hint">Separate with commas.</span><input type="text" id="pr-skills" maxlength="400" value="' + esc(p.skills.join(", ")) + '"></div>' +
      '<fieldset class="field"><legend class="label">Roles you’re looking for</legend><div class="checks">' + ROLES.map(function (r) { return chk("pr-want", p.roles_wanted, r); }).join("") + "</div></fieldset>" +
      '<div class="field"><label for="pr-swant">Skills you’re looking for</label><input type="text" id="pr-swant" maxlength="400" value="' + esc(p.skills_wanted.join(", ")) + '"></div>' +
      '<div class="field"><label for="pr-offer">What you can contribute</label><input type="text" id="pr-offer" maxlength="300" value="' + esc(p.offering || "") + '"></div>' +
      '<div class="field"><label for="pr-look">The kind of collaborator you want</label><input type="text" id="pr-look" maxlength="300" value="' + esc(p.looking_for || "") + '"></div>' +
      '<div class="field"><label for="pr-avail">Availability</label><select id="pr-avail"><option value="">Not stated</option>' + AVAIL.map(function (a) { return "<option" + (p.availability === a ? " selected" : "") + ">" + a + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="pr-links">Links (optional)</label><span class="hint">Portfolio, GitHub or demos, separated by spaces. Shown to whoever can see your profile.</span><textarea id="pr-links" maxlength="500" style="min-height:4rem">' + esc(p.links || "") + "</textarea></div>" +
      '<div class="check"><input type="checkbox" id="pr-open"' + (p.open_to_collab ? " checked" : "") + '><label for="pr-open">Show me in collaborator matches and “open to collaborate” searches</label></div>' +
      '<div class="mc-actions"><button type="submit" class="btn btn-dark">' + (S.profile ? "Save profile" : "Join the Republic") + "</button>" +
      (S.member ? '<button type="button" class="btn btn-line" data-act="delete-account">Delete my profile and posts</button>' : "") + "</div></form>";
  }

  /* ======================================================================
     DIALOG
     ====================================================================== */
  var dlg = $("#net-dialog"), dlgIn = $("#nd-in"), lastFocus = null;
  function showDialog(html) {
    lastFocus = document.activeElement;
    dlgIn.innerHTML = '<button type="button" class="dlg-close" data-close aria-label="Close">&times;</button>' + html;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    var first = dlgIn.querySelector("input:not([type=checkbox]), textarea, select") || dlgIn.querySelector("[data-close]");
    if (first) first.focus();
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  dlg.addEventListener("close", function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(); });

  function simpleForm(title, intro, fields, formKey, data, submitLabel) {
    return '<h2 id="nd-title" class="md-title">' + esc(title) + "</h2><p>" + intro + "</p>" +
      '<form data-form="' + formKey + '"' + Object.keys(data || {}).map(function (k) { return " data-" + k + '="' + esc(data[k]) + '"'; }).join("") + ">" + fields +
      '<p class="field-error" id="dlg-error" role="alert"></p>' +
      '<div class="mc-actions"><button type="submit" class="btn btn-dark">' + esc(submitLabel) + '</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ======================================================================
     ACTIONS
     ====================================================================== */
  function needApproval() {
    if (!S.user) { say("Please sign in first.", true); return true; }
    if (!approved()) { say("You can do that once the Supreme Leader approves your profile.", true); return true; }
    return false;
  }
  function fail(err) { say(esc(friendly(err)), true); var d = $("#dlg-error"); if (d) d.textContent = friendly(err); }

  function onClick(e) {
    var el = e.target.closest("[data-act],[data-close]"); if (!el) return;
    if (el.hasAttribute("data-close")) return closeDialog();
    var act = el.getAttribute("data-act"), id = el.getAttribute("data-id"), sb = S.sb, uid = S.user && S.user.id;
    if (act === "tab") { S.tab = el.getAttribute("data-tab"); say(""); render(); return; }
    if (act === "signout") { sb.auth.signOut().then(function () { S.user = null; refresh(); }); return; }
    if (act === "new-pitch") { if (needApproval()) return; return showDialog(pitchForm()); }
    if (act === "edit-pitch") { var p = S.pitches.filter(function (x) { return x.id === id; })[0]; if (p) showDialog(pitchForm(p)); return; }
    if (act === "open-pitch") return openPitch(id);
    if (act === "delete-pitch") {
      if (!confirm("Delete this pitch and its comments?")) return;
      sb.from("pitches").delete().eq("id", id).then(function (r) { if (r.error) return fail(r.error); closeDialog(); say("Pitch deleted."); refresh(); }); return;
    }
    if (act === "interest" || act === "save") {
      if (needApproval()) return;
      var tbl = act === "interest" ? "pitch_interest" : "pitch_saves";
      var has = act === "interest" ? S.interest.some(function (i) { return i.pitch_id === id && i.user_id === uid; }) : !!S.saves[id];
      var q = has ? sb.from(tbl).delete().eq("pitch_id", id).eq("user_id", uid) : sb.from(tbl).insert({ pitch_id: id, user_id: uid });
      q.then(function (r) { if (r.error) return fail(r.error); refresh(); }); return;
    }
    if (act === "del-comment") {
      sb.from("pitch_comments").delete().eq("id", id).then(function (r) { if (r.error) return fail(r.error); openPitch(el.getAttribute("data-pitch")); refresh(); }); return;
    }
    if (act === "collab") {
      if (needApproval()) return;
      return showDialog(simpleForm("Request to collaborate",
        "Say who you are and what you’d like to build together. They’ll see your name and message, and decide whether to reply. No contact details are shared unless they choose to.",
        '<div class="field"><label for="cr-role">The role you’d play (optional)</label><input type="text" id="cr-role" maxlength="80" placeholder="e.g. Front-end developer"></div>' +
        '<div class="field"><label for="cr-msg">Your message *</label><textarea id="cr-msg" required minlength="20" maxlength="800" style="min-height:6rem"></textarea></div>',
        "collab", { to: el.getAttribute("data-to"), pitch: el.getAttribute("data-pitch") || "" }, "Send request"));
    }
    if (act === "report") {
      if (needApproval()) return;
      return showDialog(simpleForm("Report this", "Tell the Supreme Leader what’s wrong (spam, harassment, impersonation, a scam, or anything unsafe). Reports are private.",
        '<div class="field"><label for="rp-reason">What happened? *</label><textarea id="rp-reason" required minlength="10" maxlength="600" style="min-height:5rem"></textarea></div>',
        "report", { type: el.getAttribute("data-type"), id: id }, "Send report"));
    }
    if (act === "block") {
      if (needApproval()) return;
      if (!confirm("Block this person? You won’t see their pitches or comments, and they won’t be able to send you requests.")) return;
      sb.from("blocks").insert({ blocker: uid, blocked: id }).then(function (r) { if (r.error) return fail(r.error); closeDialog(); say("Blocked."); refresh(); }); return;
    }
    if (act === "unblock") { sb.from("blocks").delete().eq("blocker", uid).eq("blocked", id).then(function (r) { if (r.error) return fail(r.error); refresh(); }); return; }
    if (act === "withdraw") { sb.from("collab_requests").delete().eq("id", id).then(function (r) { if (r.error) return fail(r.error); refresh(); }); return; }
    if (act === "delete-account") {
      if (!confirm("Delete your profile, pitches, comments and requests? This can’t be undone.")) return;
      sb.from("members").delete().eq("id", uid).then(function (r) {
        if (r.error) return fail(r.error);
        say("Your profile and posts have been deleted. To remove your sign-in email as well, ask the Supreme Leader.");
        sb.auth.signOut().then(function () { S.user = null; refresh(); });
      });
    }
  }

  function onSubmit(e) {
    var form = e.target.closest("form[data-form]"); if (!form) return;
    e.preventDefault();
    var kind = form.getAttribute("data-form"), sb = S.sb, uid = S.user && S.user.id;
    var btn = e.submitter || $("button[type=submit]", form);
    function busy(b) { $$("button", form).forEach(function (x) { x.disabled = b; }); }
    function val(id) { var el = $("#" + id, form) || $("#" + id); return el ? el.value.trim() : ""; }

    if (kind === "signin") {
      var email = val("si-email");
      busy(true);
      sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        busy(false);
        if (r.error) return fail(r.error);
        say("Check your email. We’ve sent a sign-in link to <strong>" + esc(email) + "</strong>. Open it on this device.");
      }); return;
    }

    if (kind === "profile") {
      var age = val("pr-age");
      if (age === "13 or younger") return say("The Republic is open to builders aged 14 and over right now. Keep building, and come back at 14.", true);
      var minor = MINOR.indexOf(age) > -1;
      if (minor && !$("#pr-gok").checked) return say("A parent or guardian needs to know and agree before you can join.", true);
      var vis = val("pr-vis"); if (minor && vis === "public") vis = "members";
      var checked = function (name) { return $$("input[name=" + name + "]:checked", form).map(function (x) { return x.value; }); };
      var memberRow = { age_band: age, guardian_ok: minor ? $("#pr-gok").checked : false };
      var prof = {
        display_name: val("pr-name"), bio: val("pr-bio"), skills: splitList(val("pr-skills"), 15), skills_wanted: splitList(val("pr-swant"), 15),
        role_tags: checked("pr-role"), roles_wanted: checked("pr-want"), offering: val("pr-offer"), looking_for: val("pr-look"),
        availability: val("pr-avail") || null, links: val("pr-links"), goals: checked("pr-goal"), visibility: vis, open_to_collab: $("#pr-open").checked
      };
      busy(true);
      var step1 = S.member ? sb.from("members").update(memberRow).eq("id", uid) : sb.from("members").insert(Object.assign({ id: uid }, memberRow));
      step1.then(function (r) {
        if (r.error) throw r.error;
        return S.profile ? sb.from("profiles").update(prof).eq("id", uid) : sb.from("profiles").insert(Object.assign({ id: uid }, prof));
      }).then(function (r) {
        busy(false);
        if (r.error) throw r.error;
        say(S.profile ? "Profile saved." : "Welcome to the Republic. Your profile is saved. The Supreme Leader will approve it soon.");
        S.tab = S.profile ? "profile" : "pitches"; refresh();
      }).catch(function (err) { busy(false); fail(err); });
      return;
    }

    if (kind === "pitch") {
      var pid = form.getAttribute("data-id");
      var row = {
        title: val("pt-title"), description: val("pt-desc"), category: val("pt-cat"), status: val("pt-status"),
        roles_needed: $$("input[name=pt-role]:checked", form).map(function (x) { return x.value; }),
        skills_needed: splitList(val("pt-skills"), 12), next_step: val("pt-next"), visibility: val("pt-vis")
      };
      busy(true);
      var q = pid ? sb.from("pitches").update(row).eq("id", pid) : sb.from("pitches").insert(Object.assign({ author: uid }, row));
      q.then(function (r) { busy(false); if (r.error) return fail(r.error); closeDialog(); say(pid ? "Pitch updated." : "Pitch posted."); refresh(); }); return;
    }

    if (kind === "comment") {
      busy(true);
      sb.from("pitch_comments").insert({ pitch_id: form.getAttribute("data-id"), author: uid, body: val("cm-body") }).then(function (r) {
        busy(false); if (r.error) return fail(r.error); openPitch(form.getAttribute("data-id")); refresh();
      }); return;
    }

    if (kind === "collab") {
      var pitch = form.getAttribute("data-pitch");
      busy(true);
      sb.from("collab_requests").insert({ from_user: uid, to_user: form.getAttribute("data-to"), pitch_id: pitch || null, role_offered: val("cr-role") || null, message: val("cr-msg") }).then(function (r) {
        busy(false); if (r.error) return fail(r.error);
        closeDialog(); say("Request sent. They’ll see it in their inbox and decide whether to reply."); refresh();
      }); return;
    }

    if (kind === "report") {
      busy(true);
      sb.from("reports").insert({ reporter: uid, target_type: form.getAttribute("data-type"), target_id: form.getAttribute("data-id"), reason: val("rp-reason") }).then(function (r) {
        busy(false); if (r.error) return fail(r.error); closeDialog(); say("Report sent. Thank you. The Supreme Leader will look at it.");
      }); return;
    }

    if (kind === "respond") {
      var answer = btn && btn.value, rid = form.getAttribute("data-id");
      if (answer !== "accepted" && answer !== "declined") return;
      busy(true);
      sb.from("collab_requests").update({ status: answer, reply: val("rp-" + rid) || null }).eq("id", rid).then(function (r) {
        busy(false); if (r.error) return fail(r.error); say(answer === "accepted" ? "Accepted. Your reply has been sent." : "Declined."); refresh();
      });
    }
  }

  function onInput(e) {
    var t = e.target, k;
    if ((k = t.getAttribute && t.getAttribute("data-filter"))) { S.f[k] = t.type === "checkbox" ? t.checked : t.value; renderPitchList(); }
    else if ((k = t.getAttribute && t.getAttribute("data-bfilter"))) { S.bf[k] = t.type === "checkbox" ? t.checked : t.value; renderBuilderList(); }
    else if (t.id === "pr-age") {
      var minor = MINOR.indexOf(t.value) > -1;
      var g = $("#pr-guardian"); if (g) g.hidden = !minor;
      var opt = $("#pr-vis option[value=public]"); if (opt) { opt.disabled = minor; if (minor && $("#pr-vis").value === "public") $("#pr-vis").value = "members"; }
    }
  }

  /* ---------- start ---------- */
  function start() {
    var app = $("#net-app");
    if (!CFG.url || !CFG.anonKey) {
      app.innerHTML = '<div class="notice"><p><strong>The Builders’ Network is opening soon.</strong> It isn’t switched on yet. <a href="index.html#petition" data-apply>Submit your petition</a> and you’ll be among the first to hear.</p></div>';
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      app.innerHTML = '<div class="notice warn"><p>The network couldn’t load (a needed script was blocked). Please reload, or try another browser or connection.</p></div>';
      return;
    }
    S.sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onInput);
    S.sb.auth.onAuthStateChange(function (ev, session) {
      var u = session ? session.user : null;
      if ((u && u.id) !== (S.user && S.user.id) || !S.loaded) { S.user = u; refresh(); }
    });
    S.sb.auth.getSession().then(function (r) {
      var u = r.data && r.data.session ? r.data.session.user : null;
      if (!S.loaded) { S.user = u; refresh(); }
    });
  }
  start();
})();
