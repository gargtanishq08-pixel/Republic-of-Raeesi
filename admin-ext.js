/* The Supreme Leader's Desk: extra sections (funding schemes, founder links, Ad Bureau, competitions).
   Loaded after admin.js. Only works for the admin email, and the database checks every action too. */
(function () {
  "use strict";
  var A = window.RaeesiAdmin; if (!A) return;
  var esc = A.esc, btn = A.btn, fld = A.fld, inp = A.inp, ta = A.ta, chkb = A.chkb, fmt = A.fmt;
  function sb() { return A.S.sb; }
  function $(s, r) { return (r || document).querySelector(s); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function warn(host, e) { host.innerHTML = '<div class="notice warn"><p>' + A.errText(e) + " (If you haven’t yet: re-run supabase-setup.sql.)</p></div>"; }
  function sel(id, opts, cur) { return '<select id="' + id + '">' + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? " selected" : "") + ">" + esc(l) + "</option>"; }).join("") + "</select>"; }
  function act(label, name, id, cls, extra) { return btn(name, id, label, cls, extra); }
  function members() { return sb().rpc("admin_members").then(function (r) { if (r.error) throw r.error; return r.data || []; }); }
  function memberName(list, id) { var m = list.filter(function (x) { return x.id === id; })[0]; return m ? (m.display_name || "(no profile)") + " · " + m.email : id; }
  function levels() { return ((window.RAEESI_MISSIONS || {}).levels) || [{ name: "Newcomer", min: 0 }, { name: "Apprentice Builder", min: 40 }, { name: "Journeyman Builder", min: 150 }, { name: "Master Builder", min: 350 }]; }
  function levelFor(p) { var lv = levels()[0].name; levels().forEach(function (l) { if (p >= l.min) lv = l.name; }); return lv; }
  var C = {};   // small cache for the current section

  /* ======================================================================
     SCHEMES
     ====================================================================== */
  A.addTab("schemes", "Schemes", function (host) {
    sb().from("schemes").select("*").order("name", { ascending: true }).then(function (r) {
      if (r.error) throw r.error; C.schemes = r.data || [];
      host.innerHTML = '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-scheme">Add a scheme</button></div>' +
        '<p class="file-meta">Only publish a scheme after you have checked the details on the official site and set “Last checked”. The page warns visitors when a scheme hasn’t been checked for 90 days.</p>' +
        (C.schemes.length ? C.schemes.map(function (s) {
          return '<div class="entry"><p><strong>' + esc(s.name) + "</strong> &middot; " + esc(s.agency) + " &middot; " + esc(s.kind) + " &middot; " + esc(s.status) +
            (s.published ? ' <span class="badge st-open">Published</span>' : ' <span class="badge st-archived">Hidden</span>') + (s.last_verified ? " &middot; checked " + esc(s.last_verified) : ' <span class="badge st-in-progress">Not verified</span>') + "</p>" +
            '<div class="mc-actions">' + act("Edit", "edit-scheme", s.id) + act("Checked today", "scheme-today", s.id) + act(s.published ? "Unpublish" : "Publish", "toggle-scheme", s.id) + act("Delete", "delete-scheme", s.id) + "</div></div>";
        }).join("") : '<p class="file-meta">No schemes yet.</p>');
    }).catch(function (e) { warn(host, e); });
  });

  function schemeForm(s) {
    var isNew = !s;
    s = s || { id: "", name: "", agency: "", level: "Central", state: "", kind: "Grant", stage: [], summary: "", eligibility: "", amount_text: "", deadline: "", status: "Check official site", link: "", last_verified: "", tags: [], published: false };
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Add a scheme" : "Edit scheme") + '</h2><form data-form="scheme" data-id="' + esc(s.id) + '">' +
      fld("sc-name", "Name *", inp("sc-name", s.name, 'required maxlength="140"')) + fld("sc-agency", "Agency or department", inp("sc-agency", s.agency, 'maxlength="120"')) +
      '<div class="row-2">' + fld("sc-level", "Level", sel("sc-level", ["Central", "State", "Other"], s.level)) + fld("sc-state", "State (if a state scheme)", inp("sc-state", s.state, 'maxlength="60"')) + "</div>" +
      '<div class="row-2">' + fld("sc-kind", "Type", sel("sc-kind", ["Grant", "Loan", "Equity / fund", "Incubation", "Competition", "Subsidy", "Other"], s.kind)) + fld("sc-status", "Status", sel("sc-status", ["Open", "Rolling", "Upcoming", "Closed", "Check official site"], s.status)) + "</div>" +
      fld("sc-summary", "What it is (short)", ta("sc-summary", s.summary, 4)) + fld("sc-elig", "Who can apply", ta("sc-elig", s.eligibility, 3)) +
      '<div class="row-2">' + fld("sc-amount", "Amount (as the official site words it)", inp("sc-amount", s.amount_text, 'maxlength="120"')) + fld("sc-deadline", "Deadline", '<input type="date" id="sc-deadline" value="' + esc(s.deadline || "") + '">') + "</div>" +
      fld("sc-stage", "Stage (idea, prototype, early revenue…)", inp("sc-stage", (s.stage || []).join(", ")), "Separate with commas.") + fld("sc-tags", "Tags (students, women, deep-tech…)", inp("sc-tags", (s.tags || []).join(", ")), "Separate with commas.") +
      fld("sc-link", "Official link *", '<input type="url" id="sc-link" required maxlength="400" placeholder="https://" value="' + esc(s.link || "") + '">', "Link to the official page, not a news article.") +
      fld("sc-ver", "Last checked on the official site", '<input type="date" id="sc-ver" value="' + esc(s.last_verified || "") + '">') +
      '<div class="panel"><p>Copy details accurately from the official page. Don’t use any government emblem or logo, and don’t suggest the Republic is connected to the agency.</p></div>' +
      chkb("sc-pub", "Published (visible on the Funding page)", s.published) +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save scheme</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ======================================================================
     FOUNDER LINKS (private story invitations + submissions)
     ====================================================================== */
  function token() { var a = new Uint8Array(24), s = "", al = "abcdefghijklmnopqrstuvwxyz0123456789"; crypto.getRandomValues(a); for (var i = 0; i < 24; i++) s += al[a[i] % al.length]; return s; }
  function baseUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
  A.addTab("founders", "Founder links", function (host) {
    Promise.all([sb().from("story_invites").select("*").order("created_at", { ascending: false }), sb().from("story_submissions").select("*").order("created_at", { ascending: false })]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; if (rs[1].error) throw rs[1].error;
      C.invites = rs[0].data || []; C.subs = rs[1].data || [];
      host.innerHTML = '<h3>Invite a founder to share their story</h3><p class="file-meta">Create a private one-time link and send it to them. They fill in a form here on the site and their story lands below. Links expire after 60 days.</p>' +
        '<form data-form="invite" class="toolbar"><label class="sr-only" for="iv-label">Who is it for?</label><input type="text" id="iv-label" placeholder="Who is this link for? (e.g. Maya, Crop Doctor)" maxlength="80" required><button type="submit" class="btn btn-gold btn-sm">Create link</button></form><div id="iv-new"></div>' +
        "<h3>Links you’ve made</h3>" + (C.invites.length ? C.invites.map(function (i) {
          var expired = new Date(i.expires_at) < new Date(), link = baseUrl() + "share-story.html?t=" + i.token;
          return '<div class="entry"><p><strong>' + esc(i.label) + "</strong> " + (i.used ? '<span class="badge st-open">Used</span>' : expired ? '<span class="badge st-archived">Expired</span>' : '<span class="badge st-in-progress">Waiting</span>') + " &middot; made " + fmt(i.created_at) + "</p>" +
            (!i.used && !expired ? '<p class="file-meta"><code>' + esc(link) + '</code></p><div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-act="copy-invite" data-id="' + esc(link) + '">Copy link</button>' + act("Delete", "delete-invite", i.token) + "</div>" : '<div class="mc-actions">' + act("Delete", "delete-invite", i.token) + "</div>") + "</div>";
        }).join("") : '<p class="file-meta">No links yet.</p>') +
        "<h3>Stories sent to you (" + C.subs.filter(function (x) { return x.status === "New"; }).length + " new)</h3>" + (C.subs.length ? C.subs.map(function (x) {
          return '<div class="entry"><p><strong>' + esc(x.name) + "</strong>" + (x.venture ? " &middot; " + esc(x.venture) : "") + " &middot; " + esc(x.email) + " &middot; " + esc(x.age_band) + (/^1[46]/.test(x.age_band) ? ' <span class="badge st-under-review">Under 18: guardian agreed</span>' : "") + ' <span class="badge ' + (x.status === "New" ? "st-in-progress" : "st-archived") + '">' + esc(x.status) + "</span></p>" +
            '<div class="mc-actions">' + act("Read", "view-sub", x.id) + (x.status !== "Drafted" ? act("Make a draft story", "draft-sub", x.id, "btn-dark") : "") + (x.status === "New" ? act("Decline", "decline-sub", x.id) : "") + act("Delete", "delete-sub", x.id) + "</div></div>";
        }).join("") : '<p class="file-meta">Nothing yet.</p>');
    }).catch(function (e) { warn(host, e); });
  });

  /* ======================================================================
     AD BUREAU
     ====================================================================== */
  A.addTab("adbureau", "Ad Bureau", function (host) {
    var view = C.adview || "pitches";
    var nav = '<div class="filters" role="group" aria-label="Ad Bureau sections">' + [["pitches", "Pitches"], ["campaigns", "Campaigns"], ["credits", "Crowns"], ["levels", "Levels and perks"]].map(function (t) {
      return '<button type="button" class="chip" data-act="ad-view" data-id="' + t[0] + '" aria-pressed="' + (view === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
    var body = document.createElement("div"); host.innerHTML = nav; host.appendChild(body);
    ({ pitches: adPitches, campaigns: adCampaigns, credits: adCredits, levels: adLevels }[view])(body);
  });

  function adPitches(host) {
    Promise.all([sb().from("ad_pitches").select("*").order("created_at", { ascending: false }), members()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; C.adp = rs[0].data || []; C.mem = rs[1];
      var live = C.adp.filter(function (p) { return ["Declined", "Withdrawn"].indexOf(p.status) === -1; });
      function tally(key, multi) { var t = {}; live.forEach(function (p) { (multi ? p[key] : [p[key]]).forEach(function (v) { if (v) t[v] = (t[v] || 0) + 1; }); }); return Object.keys(t).sort(function (a, b) { return t[b] - t[a]; }).map(function (k) { return esc(k) + " (" + t[k] + ")"; }).join(", ") || "none yet"; }
      host.innerHTML = '<p class="file-meta">Ads submitted by approved adult members. Approve a pitch to let its owner join campaigns.</p>' +
        '<div class="panel"><p><strong>What people want:</strong> Channels: ' + tally("channels", true) + ". Business types: " + tally("category") + ". Regions: " + tally("region") + ".</p></div>" +
        (C.adp.length ? C.adp.map(function (p) {
          return '<div class="entry"><p><strong>' + esc(p.venture) + "</strong> &middot; " + esc(p.category) + " &middot; " + esc(memberName(C.mem, p.owner)) + ' <span class="badge ' + (p.status === "Approved" ? "st-open" : p.status === "Declined" || p.status === "Withdrawn" ? "st-archived" : "st-in-progress") + '">' + esc(p.status) + "</span></p><p>" + esc(p.headline) + "</p>" +
            '<div class="mc-actions">' + act("Review", "review-adp", p.id, "btn-dark") + "</div></div>";
        }).join("") : '<p class="file-meta">No ad pitches yet.</p>');
    }).catch(function (e) { warn(host, e); });
  }

  function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  function adCampaigns(host) {
    sb().from("ad_campaigns").select("*").order("created_at", { ascending: false }).then(function (r) {
      if (r.error) throw r.error; C.camps = r.data || [];
      host.innerHTML = '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-campaign">Add a campaign</button></div>' +
        '<p class="file-meta">A campaign is one shared placement: a billboard or prime-location banner, metro or transit panels, gyms, cafés, malls, campuses, schools, an event, anywhere. Members who join split it by contribution. Open it for pitches to let approved members join.</p>' +
        (C.camps.length ? C.camps.map(function (c) {
          return '<div class="entry"><p><strong>' + esc(c.title) + "</strong> &middot; " + esc(c.channel) + (c.venue ? " &middot; " + esc(c.venue) : "") + ' <span class="badge st-in-progress">' + esc(c.status) + "</span>" +
            (c.cost_inr != null ? " &middot; cost " + money(c.cost_inr) : "") + (c.area_sqft ? " &middot; " + esc(c.area_sqft) + " sq ft" : "") + "</p>" +
            '<div class="mc-actions">' + act("Entries and shares", "camp-entries", c.id, "btn-dark") + act("Edit", "edit-campaign", c.id) + act("Delete", "delete-campaign", c.id) + "</div></div>";
        }).join("") : '<p class="file-meta">No campaigns yet.</p>');
    }).catch(function (e) { warn(host, e); });
  }

  function campaignForm(c) {
    var isNew = !c;
    c = c || { id: "", title: "", channel: "Billboard", venue: "", description: "", area_sqft: "", cost_inr: "", credit_value_inr: 5, min_entry_inr: 500, status: "Draft", closes_on: "" };
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Add a campaign" : "Edit campaign") + '</h2><form data-form="campaign" data-id="' + esc(c.id) + '">' +
      fld("cm-title", "Title *", inp("cm-title", c.title, 'required maxlength="120" placeholder="e.g. Gym banners in Koramangala, or Blue Line metro panels"')) +
      '<div class="row-2">' + fld("cm-channel", "Channel", sel("cm-channel", ["Billboard", "Prime-location banner", "Metro / transit", "Gym / fitness centre", "School display", "College campus", "Coaching centre", "Cafe / restaurant", "Mall / retail", "Residential society", "Print / flyers", "Digital / social", "Event / exhibition", "Other"], c.channel)) + fld("cm-status", "Status", sel("cm-status", ["Draft", "Open for pitches", "Matching", "Confirmed", "Live", "Done", "Cancelled"], c.status), "Members see everything except Draft. Only “Open for pitches” lets them join.") + "</div>" +
      fld("cm-venue", "Where", inp("cm-venue", c.venue, 'maxlength="160"')) + fld("cm-desc", "What members should know", ta("cm-desc", c.description, 4)) +
      '<div class="row-2">' + fld("cm-area", "Space (sq ft)", '<input type="number" id="cm-area" min="0" step="0.5" value="' + esc(c.area_sqft || "") + '">') + fld("cm-cost", "Cost to the Republic (₹)", '<input type="number" id="cm-cost" min="0" value="' + esc(c.cost_inr == null ? "" : c.cost_inr) + '">') + "</div>" +
      '<div class="row-2">' + fld("cm-cv", "Value of 1 Crown in this campaign (₹)", '<input type="number" id="cm-cv" min="0" value="' + esc(c.credit_value_inr || 0) + '">', "How much a Crown counts toward a member’s share here. 0 means Crowns don’t count.") + fld("cm-close", "Closes on", '<input type="date" id="cm-close" value="' + esc(c.closes_on || "") + '">') + "</div>" +
      fld("cm-min", "Smallest entry (₹, cash plus Crowns)", '<input type="number" id="cm-min" min="0" value="' + esc(c.min_entry_inr == null ? 500 : c.min_entry_inr) + '">', "500 is the default: 100 Crowns at ₹5 each. Shared placements keep it affordable: many small entries add up.") +
      '<div class="panel"><p>Be clear with members what is and isn’t agreed. Nothing is binding until it’s in writing, and every ad must be truthful. Take extra care with anything shown to children, and with education or coaching claims.</p></div>' +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save campaign</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  function entriesDialog(campId) {
    var camp = C.camps.filter(function (c) { return c.id === campId; })[0]; if (!camp) return;
    Promise.all([sb().from("ad_entries").select("*").eq("campaign_id", campId), sb().from("ad_pitches").select("*"), members()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; var es = rs[0].data || [], ps = rs[1].data || [], mem = rs[2];
      var cv = camp.credit_value_inr || 0, active = es.filter(function (e) { return ["Interested", "Confirmed", "On hold"].indexOf(e.status) > -1; });
      function eff(e) { return (e.cash_inr || 0) + (e.credits || 0) * cv; }
      var total = active.reduce(function (a, e) { return a + eff(e); }, 0);
      function pitch(e) { return ps.filter(function (p) { return p.id === e.pitch_id; })[0] || {}; }
      var groups = {}; active.forEach(function (e) { var k = pitch(e).category || "?"; (groups[k] = groups[k] || []).push(e); });
      var conflicts = Object.keys(groups).filter(function (k) { return groups[k].length > 1; });
      C.entries = es; C.entryCamp = camp;
      A.showDialog('<h2 id="ad-title" class="md-title">' + esc(camp.title) + '</h2><p class="file-meta">' + esc(camp.channel) + (camp.area_sqft ? " &middot; " + esc(camp.area_sqft) + " sq ft" : "") + " &middot; pool " + money(total) + " &middot; 1 Crown = " + money(cv) + "</p>" +
        (conflicts.length ? '<div class="panel"><h3>Conflicts of interest</h3>' + conflicts.map(function (k) {
          var rank = groups[k].slice().sort(function (a, b) { return eff(b) - eff(a) || (b.credits || 0) - (a.credits || 0); });
          var tie = rank.length > 1 && eff(rank[0]) === eff(rank[1]) && (rank[0].credits || 0) === (rank[1].credits || 0);
          return "<p><strong>" + esc(k) + "</strong> has " + rank.length + " entries. Ask them personally whether they’re happy to share. If both stay, the higher contribution leads: " +
            rank.map(function (e, i) { return (i + 1) + ". " + esc(pitch(e).venture) + " (" + money(eff(e)) + ", " + (e.credits || 0) + " Crowns)"; }).join("; ") + "." + (tie ? " <strong>It’s a tie: run a tiebreaker round.</strong>" : "") + "</p>";
        }).join("") + "</div>" : "") +
        (es.length ? es.map(function (e) {
          var p = pitch(e), share = total && ["Interested", "Confirmed", "On hold"].indexOf(e.status) > -1 ? (eff(e) / total * 100) : 0;
          return '<div class="entry"><p><strong>' + esc(p.venture || "?") + "</strong> &middot; " + esc(p.category || "") + " &middot; " + esc(memberName(mem, e.owner)) + ' <span class="badge st-in-progress">' + esc(e.status) + "</span></p>" +
            "<p>Cash " + money(e.cash_inr) + " + " + (e.credits || 0) + " Crowns = <strong>" + money(eff(e)) + "</strong> &middot; share <strong>" + share.toFixed(1) + "%</strong>" + (camp.area_sqft && share ? " (about " + (camp.area_sqft * share / 100).toFixed(1) + " sq ft)" : "") + "</p>" +
            (e.decision_note ? '<p class="why">' + esc(e.decision_note) + "</p>" : "") +
            '<div class="mc-actions">' + act("Confirm", "entry-confirm", e.id, "btn-dark") + act("Hold", "entry-set", e.id, "btn-line", ' data-do="On hold"') + act("Decline", "entry-set", e.id, "btn-line", ' data-do="Declined"') + act("Note", "entry-note", e.id) + "</div></div>";
        }).join("") : '<p class="file-meta">No entries yet.</p>') + '<div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>');
    }).catch(function (e) { A.say(A.errText(e), true); });
  }

  function adCredits(host) {
    Promise.all([sb().from("credit_entries").select("*").order("created_at", { ascending: false }).limit(300), members()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; var es = rs[0].data || []; C.mem = rs[1];
      var bal = {}, earned = {}; es.forEach(function (e) { bal[e.member] = (bal[e.member] || 0) + e.amount; if (e.amount > 0 && ["Mission", "Helped a builder", "Participation"].indexOf(e.kind) > -1) earned[e.member] = (earned[e.member] || 0) + e.amount; });
      host.innerHTML = '<p class="file-meta">Crowns are the Republic’s points. They’re earned through real work, have no cash value, and can’t be transferred. “Earned” points decide a member’s level; the spendable balance can go down.</p>' +
        '<form data-form="credit" class="shell"><div class="row-2">' + fld("cr-member", "Member", sel("cr-member", C.mem.map(function (m) { return [m.id, (m.display_name || "(no profile)") + " · " + m.email]; }), "")) +
        fld("cr-kind", "Why", sel("cr-kind", ["Mission", "Helped a builder", "Participation", "Adjustment"], "Mission")) + "</div>" +
        '<div class="row-2">' + fld("cr-amt", "Crowns (negative to take away)", '<input type="number" id="cr-amt" required step="1">') + fld("cr-reason", "Reason (the member sees this)", inp("cr-reason", "", 'maxlength="200" placeholder="e.g. Mission I, scored 78"')) + "</div>" +
        '<p class="field-error" id="dlg-error" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Record</button></form>' +
        "<h3>Balances</h3>" + (Object.keys(bal).length ? Object.keys(bal).sort(function (a, b) { return (earned[b] || 0) - (earned[a] || 0); }).map(function (id) {
          return "<p><strong>" + esc(memberName(C.mem, id)) + "</strong>: " + bal[id] + " Crowns, earned " + (earned[id] || 0) + " (" + esc(levelFor(earned[id] || 0)) + ")</p>"; }).join("") : '<p class="file-meta">No entries yet.</p>') +
        "<h3>Recent entries</h3>" + (es.slice(0, 40).map(function (e) { return '<p class="file-meta">' + fmt(e.created_at) + " · " + esc(memberName(C.mem, e.member)) + " · " + (e.amount > 0 ? "+" : "") + e.amount + " · " + esc(e.kind) + (e.reason ? " · " + esc(e.reason) : "") + "</p>"; }).join("") || '<p class="file-meta">None.</p>');
    }).catch(function (e) { warn(host, e); });
  }

  function adLevels(host) {
    sb().from("level_perks").select("*").then(function (r) {
      if (r.error) throw r.error; var by = {}; (r.data || []).forEach(function (x) { by[x.level] = x; });
      host.innerHTML = '<p class="file-meta">What each level gets. Members see this on their profile. <strong>Only write perks you will really deliver.</strong> A discount of 100 means ads are free for that level (your confirmation is still needed for each campaign). The level thresholds come from the Royal Missions scoring rules.</p>' +
        levels().map(function (l, i) {
          var x = by[l.name] || { perks: [], ad_discount_pct: 0 };
          return '<form data-form="level" data-level="' + esc(l.name) + '" class="shell" style="margin-bottom:1rem"><h3>' + esc(l.name) + " (from " + l.min + " earned Crowns)</h3>" +
            fld("lv-perks-" + i, "Perks (one per line)", ta("lv-perks-" + i, (x.perks || []).join("\n"), 4)) + fld("lv-disc-" + i, "Ad discount %", '<input type="number" id="lv-disc-' + i + '" min="0" max="100" value="' + esc(x.ad_discount_pct || 0) + '">') +
            '<button type="submit" class="btn btn-dark btn-sm">Save ' + esc(l.name) + "</button></form>";
        }).join("");
    }).catch(function (e) { warn(host, e); });
  }

  /* ======================================================================
     COMPETITIONS: winners, gifts, leaderboard
     ====================================================================== */
  A.addTab("competitions", "Competitions", function (host) {
    Promise.all([sb().rpc("admin_leaderboard"), sb().from("missions").select("*").order("id", { ascending: true }), sb().from("mission_winners").select("*").order("created_at", { ascending: false }), members()]).then(function (rs) {
      for (var i = 0; i < 3; i++) if (rs[i].error) throw rs[i].error;
      var lb = rs[0].data || [], ms = (rs[1].data || []), ws = rs[2].data || []; C.mem = rs[3]; C.lb = lb; C.ms = ms;
      var comps = ms.filter(function (m) { return m.is_competition; });
      host.innerHTML = "<h3>Competition winners and gifts</h3>" + (comps.length ? comps.map(function (m) {
        var mine = ws.filter(function (w) { return w.mission_id === m.id; });
        return '<div class="entry"><p><strong>Mission ' + esc(m.number) + ": " + esc(m.title) + "</strong> &middot; " + esc(m.prize_note || "") + '</p><p class="file-meta">Gifts on offer: ' + esc((m.gift_options || []).join(" | ") || "none listed") + "</p>" +
          (mine.length ? mine.map(function (w) {
            return "<p>" + w.place + ". <strong>" + esc(memberName(C.mem, w.member)) + "</strong>: " + (w.chosen_gift ? "chose <strong>" + esc(w.chosen_gift) + "</strong>, send to " + esc(w.gift_email || "?") : "<em>hasn’t chosen yet</em>") + (w.fulfilled ? ' <span class="badge st-open">Fulfilled</span>' : "") + "</p>" +
              '<div class="mc-actions">' + (w.chosen_gift && !w.fulfilled ? act("Mark fulfilled", "winner-done", w.id, "btn-dark") : "") + act("Remove", "winner-del", w.id) + "</div>";
          }).join("") : '<p class="file-meta">No winners yet.</p>') +
          '<form data-form="winner" data-mission="' + esc(m.id) + '" class="toolbar"><label class="sr-only" for="wn-m-' + esc(m.id) + '">Winner</label>' + sel("wn-m-" + esc(m.id), C.mem.map(function (x) { return [x.id, (x.display_name || "(no profile)") + " · " + x.email]; }), "") +
          '<input type="number" id="wn-p-' + esc(m.id) + '" min="1" max="20" value="' + (mine.length + 1) + '" aria-label="Place" style="max-width:5rem"><button type="submit" class="btn btn-gold btn-sm">Add winner</button></form></div>';
      }).join("") : '<p class="file-meta">No competitions yet. In the Missions tab, edit a mission and tick “competition”, then list the gift options.</p>') +
        "<h3>Leaderboard (earned Crowns)</h3><div class=\"mc-actions\" style=\"margin-top:0\">" + act("Publish the leaderboard to the Newsroom", "lb-publish", "x", "btn-gold") + "</div><p class=\"file-meta\">For you only. Not shown to members. Click a name to read their pitches.</p>" +
        (lb.length ? lb.map(function (x, i) { return '<div class="entry"><p><strong>' + (i + 1) + ". " + esc(x.display_name || "(no profile)") + "</strong> &middot; " + esc(x.email) + " &middot; earned " + x.earned + " &middot; balance " + x.balance + " &middot; " + esc(levelFor(x.earned)) +
          " &middot; " + x.pitches + " pitch(es), " + x.ad_pitches + " ad pitch(es)</p><div class=\"mc-actions\">" + act("Read their pitches", "lb-pitches", x.id) + act("Grant Crowns", "lb-grant", x.id, "btn-dark") + act("Grant certificate", "lb-cert", x.id) + "</div></div>"; }).join("") : '<p class="file-meta">Nobody has earned any Crowns yet.</p>');
    }).catch(function (e) { warn(host, e); });
  });


  /* ======================================================================
     ALUMNI
     ====================================================================== */
  A.addTab("alumni", "Alumni", function (host) {
    sb().from("alumni").select("*").order("sort_order", { ascending: true }).then(function (r) {
      if (r.error) throw r.error; C.alumni = r.data || [];
      host.innerHTML = '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-alumnus">Add an alumnus</button></div>' +
        '<p class="file-meta">Listed on the Alumni Body page only once published. You must confirm they agreed to be listed, and nobody under 18 can be listed publicly.</p>' +
        (C.alumni.length ? '<div class="adm-grid">' + C.alumni.map(function (x) {
          return '<div class="adm-card">' + (x.photo ? '<img src="' + esc(x.photo) + '" alt="" loading="lazy">' : '<div class="adm-ph">No photo</div>') + "<p><strong>" + esc(x.name) + '</strong></p><p class="file-meta">' + esc(x.cohort || "") + (x.published ? " &middot; Published" : " &middot; Hidden") + '</p><div class="mc-actions">' + act("Edit", "edit-alumnus", x.id) + act("Delete", "delete-alumnus", x.id) + "</div></div>";
        }).join("") + "</div>" : '<p class="file-meta">No alumni yet.</p>');
    }).catch(function (e) { warn(host, e); });
  });
  function alumnusForm(x) {
    var isNew = !x; x = x || { id: "", name: "", cohort: "", headline: "", story: "", venture: "", website: "", links: "", photo: "", permission_confirmed: false, is_minor: false, published: false, sort_order: 0 };
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Add an alumnus" : "Edit alumnus") + '</h2><form data-form="alumnus" data-id="' + esc(x.id) + '" data-old-photo="' + esc(x.photo || "") + '">' +
      '<div class="row-2">' + fld("al-name", "Name *", inp("al-name", x.name, 'required maxlength="80"')) + fld("al-cohort", "Cohort", inp("al-cohort", x.cohort, 'maxlength="40" placeholder="e.g. Cohort 1, 2026"')) + "</div>" +
      fld("al-head", "One-line headline", inp("al-head", x.headline, 'maxlength="120" placeholder="e.g. Built a tutoring app for village schools"')) +
      fld("al-story", "Their story in the Republic (short, factual)", ta("al-story", x.story, 4), "Only things that are true and that they are happy to have shown.") +
      '<div class="row-2">' + fld("al-venture", "What they do now", inp("al-venture", x.venture, 'maxlength="80"')) + fld("al-web", "Website", '<input type="url" id="al-web" maxlength="300" placeholder="https://" value="' + esc(x.website || "") + '">') + "</div>" +
      fld("al-links", "Other links (LinkedIn, Instagram…)", inp("al-links", x.links, 'maxlength="300"'), "Separate with spaces. Only links they asked you to show.") +
      fld("al-photo", "Photo", '<input type="file" id="al-photo" accept="image/jpeg,image/png,image/webp">' + (x.photo ? '<p class="file-meta">Current photo is kept unless you choose a new one.</p>' : ""), "Only a photo they sent you and are happy to have published.") +
      fld("al-order", "Order (smaller first)", '<input type="number" id="al-order" value="' + esc(x.sort_order || 0) + '">') +
      '<div class="panel"><h3>Before you list them</h3>' + chkb("al-perm", "They have agreed to be listed here, including their name, photo and links.", x.permission_confirmed) + chkb("al-minor", "This person is under 18 (they can’t be listed publicly)", x.is_minor) + "</div>" +
      chkb("al-pub", "Published (visible on the Alumni Body page)", x.published) +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }


  /* ======================================================================
     ANTHEM: lyrics and the tap-to-sync tool
     ====================================================================== */
  var SYNC = { pos: -1 };
  function anthemVideo() { return document.getElementById("an-adm-video"); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function anthemRows() {
    var prev = null;
    return C.anthem.map(function (l, i) {
      var head = l.section && l.section !== prev ? '<span class="file-meta an-sec">' + esc(l.section) + "</span>" : ""; prev = l.section;
      return '<div class="an-row" data-row="' + i + '">' + head +
        '<label class="sr-only" for="an-t-' + i + '">Start time of line ' + (i + 1) + '</label><input type="number" class="an-t" id="an-t-' + i + '" data-i="' + i + '" step="0.1" min="0" value="' + esc(Number(l.t).toFixed(1)) + '">' +
        '<button type="button" class="btn btn-line btn-sm" data-act="an-play-at" data-id="' + i + '" aria-label="Play from line ' + (i + 1) + '">▶</button><span class="an-text">' + esc(l.text) + "</span></div>";
    }).join("");
  }
  function anthemText() { var sec = null, out = []; C.anthem.forEach(function (l) { if (l.section && l.section !== sec) { sec = l.section; out.push((out.length ? "\n" : "") + "[" + sec + "]"); } out.push(l.text); }); return out.join("\n"); }
  function parseAnthem(text) {
    var sec = "", out = [];
    String(text).split(/\r?\n/).forEach(function (ln) { ln = ln.trim(); if (!ln) return; var m = /^\[(.{1,40})\]$/.exec(ln); if (m) { sec = m[1]; return; } out.push({ t: 0, text: ln.slice(0, 200), section: sec }); });
    return out;
  }
  function autoSpace(start, end) {
    var w = C.anthem.map(function (l) { return Math.max(10, l.text.length); }), tot = w.reduce(function (a, b) { return a + b; }, 0), t = start;
    C.anthem.forEach(function (l, i) { l.t = r1(t); t += (end - start) * w[i] / tot; });
  }
  function syncStatus() {
    var el = document.getElementById("an-sync-status"); if (!el) return;
    el.innerHTML = SYNC.pos < 0 ? "Not syncing." : SYNC.pos >= C.anthem.length ? "<strong>All lines marked.</strong> Check them, then save." : "Next to mark: <strong>line " + (SYNC.pos + 1) + " of " + C.anthem.length + "</strong> &ldquo;" + esc(C.anthem[SYNC.pos].text) + "&rdquo;";
  }
  function drawAnthem(host) {
    var s = C.anthemSettings;
    host.innerHTML = '<p class="file-meta">The page already works with built-in estimated timings. Syncing makes the highlighted line match the singing exactly, and takes a few minutes. Your version is saved to the database and replaces the built-in one.</p>' +
      '<div class="panel"><h3>How to sync</h3><ol class="rule-list dark"><li>Click <strong>Start syncing</strong>. The video starts from the beginning.</li><li>Each time a new line begins to be sung, press <strong>This line starts now</strong>.</li><li>Missed one? Press <strong>Undo</strong> or <strong>Back 3 seconds</strong>. You can also fix any time by typing it below.</li><li>Press <strong>Save</strong>.</li></ol></div>' +
      '<video id="an-adm-video" controls playsinline preload="metadata" src="' + esc(s.video_url || (window.RAEESI_ANTHEM || {}).video || "media/anthem.mp4") + '" style="width:100%;max-width:640px;background:#000"></video>' +
      '<div class="mc-actions"><button type="button" class="btn btn-gold btn-sm" data-act="an-start">Start syncing</button><button type="button" class="btn btn-dark btn-sm" data-act="an-mark">This line starts now</button><button type="button" class="btn btn-line btn-sm" data-act="an-undo">Undo</button><button type="button" class="btn btn-line btn-sm" data-act="an-back">Back 3 seconds</button></div>' +
      '<p id="an-sync-status" class="file-meta" role="status" aria-live="polite"></p>' +
      '<details class="panel"><summary>Edit the lyrics text</summary><p class="file-meta">One line per row. Put a section name on its own line in square brackets, like [Verse 1] or [Chorus]. Changing the text re-spaces the timings, so sync again afterwards.</p><textarea id="an-text" style="min-height:14rem">' + esc(anthemText()) + '</textarea><div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-act="an-apply">Apply text</button></div></details>' +
      '<div class="toolbar"><label for="an-a0">Singing starts at (seconds)</label><input type="number" id="an-a0" value="14" step="0.5" min="0" style="max-width:6rem"><label for="an-a1">ends at</label><input type="number" id="an-a1" value="192" step="0.5" min="1" style="max-width:6rem"><button type="button" class="btn btn-line btn-sm" data-act="an-auto">Spread the lines evenly</button></div>' +
      '<div id="an-rows">' + anthemRows() + "</div>" +
      '<form data-form="anthem" class="shell" style="margin-top:1rem"><div class="row-2">' + fld("an-title-i", "Title", inp("an-title-i", s.title, 'maxlength="80" placeholder="The Empire Needs Builders"')) + fld("an-off-i", "Overall shift (seconds)", '<input type="number" id="an-off-i" step="0.1" min="-10" max="10" value="' + esc(s.time_offset || 0) + '">', "Positive makes every line appear later.") + "</div>" +
      fld("an-vid-i", "Video address (optional)", inp("an-vid-i", s.video_url, 'maxlength="400" placeholder="Leave blank to use media/anthem.mp4"'), "Only change this if you host the video somewhere else (https://…).") +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save the anthem</button><button type="button" class="btn btn-line" data-act="an-reset">Go back to the built-in lyrics</button></div></form>';
    SYNC.pos = -1; syncStatus();
  }
  A.addTab("anthem", "Anthem", function (host) {
    Promise.all([sb().from("anthem_lines").select("*").order("idx", { ascending: true }), sb().from("anthem_settings").select("*").eq("id", 1).maybeSingle()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error;
      var rows = rs[0].data || [], st = rs[1] && !rs[1].error ? rs[1].data : null;
      var src = rows.length ? rows : ((window.RAEESI_ANTHEM || {}).lines || []);
      C.anthem = src.map(function (l) { return { t: Number(l.t), text: l.text, section: l.section || "" }; });
      C.anthemSettings = st || { title: "", video_url: "", poster_url: "", time_offset: 0 };
      drawAnthem(host);
    }).catch(function (er) { warn(host, er); });
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target; if (!el || !el.classList || !el.classList.contains("an-t") || !C.anthem) return;
    var i = Number(el.getAttribute("data-i")); if (C.anthem[i]) C.anthem[i].t = Math.max(0, Number(el.value) || 0);
  });


  /* ======================================================================
     CROWN SHOP: offers and purchases
     ====================================================================== */
  A.addTab("shop", "Crown Shop", function (host) {
    Promise.all([sb().from("crown_offers").select("*").order("sort_order", { ascending: true }), sb().from("crown_purchases").select("*").order("created_at", { ascending: false }), members(), sb().from("app_settings").select("*").eq("id", 1).maybeSingle(), sb().from("crown_exchange").select("*").order("created_at", { ascending: false })]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; if (rs[1].error) throw rs[1].error;
      C.offers = rs[0].data || []; C.purch = rs[1].data || []; C.mem = rs[2];
      C.settings = (rs[3] && rs[3].data) || { crown_rate_inr: 5, exchange_enabled: false, exchange_min_inr: 100, ad_min_inr: 500, auto_approve_adults: false, exchange_instructions: "" }; C.exch = (rs[4] && rs[4].data) || [];
      var open = C.purch.filter(function (p) { return p.status === "Requested"; });
      host.innerHTML = settingsPanel() + exchangePanel() + '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-act="new-offer">Add an offer</button></div>' +
        '<p class="file-meta">Offers members can buy with Crowns. Only offer things you will really deliver. Members see an offer only while it is switched on. Crowns have no cash value.</p>' +
        (C.offers.length ? C.offers.map(function (o) {
          return '<div class="entry"><p><strong>' + esc(o.name) + "</strong> &middot; " + esc(o.kind) + " &middot; " + o.cost + " Crowns" + (o.stock != null ? " &middot; " + o.stock + " left" : "") + (o.adults_only ? " &middot; 18+" : "") + (o.active ? ' <span class="badge st-open">On</span>' : ' <span class="badge st-archived">Off</span>') + "</p>" +
            '<div class="mc-actions">' + act("Edit", "edit-offer", o.id) + act(o.active ? "Switch off" : "Switch on", "toggle-offer", o.id) + act("Delete", "delete-offer", o.id) + "</div></div>";
        }).join("") : '<p class="file-meta">No offers yet.</p>') +
        "<h3>Purchases to deliver (" + open.length + ")</h3>" + (C.purch.length ? C.purch.map(function (p) {
          return '<div class="entry"><p><strong>' + esc(p.offer_name) + "</strong> &middot; " + p.cost + " Crowns &middot; " + esc(memberName(C.mem, p.member)) + ' <span class="badge ' + (p.status === "Fulfilled" ? "st-open" : p.status === "Refunded" ? "st-archived" : "st-in-progress") + '">' + esc(p.status) + "</span> &middot; " + fmt(p.created_at) + "</p>" + (p.note ? '<p class="why">' + esc(p.note) + "</p>" : "") +
            '<div class="mc-actions">' + (p.status === "Requested" ? act("Mark delivered", "purch-done", p.id, "btn-dark") : "") + (p.status !== "Refunded" ? act("Refund Crowns", "purch-refund", p.id) : "") + act("Add a note", "purch-note", p.id) + "</div></div>";
        }).join("") : '<p class="file-meta">No purchases yet.</p>');
    }).catch(function (er) { warn(host, er); });
  });

  function settingsPanel() {
    var s = C.settings;
    return '<details class="panel" open><summary><strong>Currency Exchange and joining settings</strong></summary><form data-form="settings" class="shell">' +
      '<div class="row-2">' + fld("sx-rate", "Rupees per Crown", '<input type="number" id="sx-rate" min="1" max="1000" value="' + esc(s.crown_rate_inr) + '">', "5 means ₹500 = 100 Crowns.") + fld("sx-min", "Smallest exchange (₹)", '<input type="number" id="sx-min" min="1" value="' + esc(s.exchange_min_inr) + '">') + "</div>" +
      fld("sx-admin", "Smallest value of one ad entry (₹)", '<input type="number" id="sx-admin" min="0" value="' + esc(s.ad_min_inr) + '">', "Used as the starting minimum for new campaigns (you can set each campaign's own minimum too). ₹500 = 100 Crowns at the default rate.") +
      fld("sx-ins", "How to pay (shown to members when the Exchange is open)", ta("sx-ins", s.exchange_instructions || "", 3), "For example your UPI ID or bank details. Only put this in once you have a proper account for it.") +
      chkb("sx-on", "<strong>Open the Currency Exchange.</strong> Leave this OFF until your current account and registered business are ready.", s.exchange_enabled) +
      chkb("sx-auto", "Approve adults automatically when they join the Network. Leave this OFF to approve everyone yourself (under-18s always wait for you and a guardian).", s.auto_approve_adults) +
      '<p class="field-error" id="dlg-error" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Save settings</button></form></details>';
  }
  function exchangePanel() {
    var open = C.exch.filter(function (x) { return x.status === "Requested"; });
    return "<h3>Exchange requests (" + open.length + " waiting)</h3><p class=\"file-meta\">A member asked to exchange rupees for Crowns. Check that the payment really arrived (in your account), then confirm. The Crowns are added once, at the rate that applied when they asked.</p>" +
      (C.exch.length ? C.exch.map(function (x) {
        return '<div class="entry"><p><strong>₹' + x.amount_inr + " &rarr; " + x.crowns + " Crowns</strong> &middot; " + esc(memberName(C.mem, x.member)) + (x.reference ? " &middot; ref: " + esc(x.reference) : "") + ' <span class="badge ' + (x.status === "Confirmed" ? "st-open" : x.status === "Rejected" ? "st-archived" : "st-in-progress") + '">' + esc(x.status) + "</span> &middot; " + fmt(x.created_at) + "</p>" +
          (x.status === "Requested" ? '<div class="mc-actions">' + act("Payment received: confirm", "ex-confirm", x.id, "btn-dark") + act("Reject", "ex-reject", x.id) + "</div>" : "") + "</div>"; }).join("") : '<p class="file-meta">No requests yet.</p>');
  }

  function offerForm(o) {
    var isNew = !o; o = o || { id: "", name: "", description: "", kind: "Perk", cost: 10, adults_only: false, stock: null, active: false, sort_order: 0 };
    return '<h2 id="ad-title" class="md-title">' + (isNew ? "Add an offer" : "Edit offer") + '</h2><form data-form="offer" data-id="' + esc(o.id) + '">' +
      fld("of-name", "Name *", inp("of-name", o.name, 'required maxlength="80" placeholder="e.g. Priority review of one ad pitch"')) + fld("of-desc", "What the member gets", ta("of-desc", o.description, 4), "Be specific about what you will deliver and when.") +
      '<div class="row-2">' + fld("of-kind", "Type", sel("of-kind", ["Perk", "Access", "Gift", "Service", "Other"], o.kind)) + fld("of-cost", "Cost in Crowns *", '<input type="number" id="of-cost" required min="1" max="100000" value="' + esc(o.cost) + '">') + "</div>" +
      '<div class="row-2">' + fld("of-stock", "How many are available (leave blank for unlimited)", '<input type="number" id="of-stock" min="0" value="' + esc(o.stock == null ? "" : o.stock) + '">') + fld("of-order", "Order (smaller first)", '<input type="number" id="of-order" value="' + esc(o.sort_order || 0) + '">') + "</div>" +
      chkb("of-adults", "Only for members aged 18 and over", o.adults_only) + chkb("of-active", "Switched on (visible in the shop)", o.active) +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save offer</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }


  /* ======================================================================
     COMMUNITY: moderation, gatherings, rooms, stamps
     ====================================================================== */
  A.addTab("community", "Community", function (host) {
    var view = C.cview || "reports";
    var nav = '<div class="filters" role="group" aria-label="Community sections">' + [["reports", "Reports"], ["messages", "Messages"], ["wall", "Recognition Wall"], ["events", "Gatherings"], ["games", "Games"], ["challenges", "Challenges"], ["seed", "Seed Month"], ["rooms", "Rooms"], ["stamps", "Stamps"]].map(function (t) {
      return '<button type="button" class="chip" data-act="cm-view" data-id="' + t[0] + '" aria-pressed="' + (view === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
    var body = document.createElement("div"); host.innerHTML = nav; host.appendChild(body);
    ({ reports: cmReports, messages: cmMessages, wall: cmWall, events: cmEvents, games: cmGames, challenges: cmChallenges, seed: cmSeed, rooms: cmRooms, stamps: cmStamps }[view])(body);
  });
  function snip(t) { t = String(t || ""); return esc(t.length > 160 ? t.slice(0, 160) + "…" : t); }
  function cmReports(host) {
    Promise.all([sb().from("reports").select("*").eq("status", "open").order("created_at", { ascending: false }), sb().from("messages").select("*"), sb().from("recognitions").select("*"), sb().from("events").select("*"), members()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; var rep = (rs[0].data || []).filter(function (r) { return ["message", "event", "recognition"].indexOf(r.target_type) > -1; });
      var map = { message: rs[1].data || [], recognition: rs[2].data || [], event: rs[3].data || [] }; C.mem = rs[4]; C.reps = rep;
      host.innerHTML = '<p class="file-meta">Open reports about messages, the wall and gatherings. Reports about pitches and profiles are in the Review tab.</p>' + (rep.length ? rep.map(function (r) {
        var t = map[r.target_type].filter(function (x) { return x.id === r.target_id; })[0];
        return '<div class="entry"><p><strong>' + esc(r.target_type) + "</strong> reported by " + esc(memberName(C.mem, r.reporter)) + " &middot; " + fmt(r.created_at) + '</p><p class="why">' + esc(r.reason) + "</p>" +
          (t ? "<p>&ldquo;" + snip(t.body || t.title) + "&rdquo; by " + esc(t.author_name || t.creator_name || "?") + (t.hidden ? " (already hidden)" : "") + "</p>" : '<p class="file-meta">The content no longer exists.</p>') +
          '<div class="mc-actions">' + (t ? act(r.target_type === "event" ? "Cancel the gathering" : "Hide it", "cm-hide-report", r.id, "btn-dark") : "") + act("Dismiss", "cm-dismiss", r.id) + "</div></div>";
      }).join("") : '<p class="file-meta">No open reports. All quiet in the realm.</p>');
    }).catch(function (er) { warn(host, er); });
  }
  function cmMessages(host) {
    sb().from("messages").select("*").order("created_at", { ascending: false }).limit(100).then(function (r) {
      if (r.error) throw r.error; C.msgs = r.data || [];
      host.innerHTML = '<p class="file-meta">The latest 100 messages across all rooms. Hiding a message removes it for everyone except you.</p>' + (C.msgs.length ? C.msgs.map(function (m) {
        return '<div class="entry"><p><strong>' + esc(m.author_name || "?") + "</strong> &middot; #" + esc(m.room) + " &middot; " + esc(m.age_group) + " circle &middot; " + fmt(m.created_at) + (m.hidden ? ' <span class="badge st-archived">Hidden</span>' : "") + "</p><p>" + snip(m.body) + '</p><div class="mc-actions">' + act(m.hidden ? "Unhide" : "Hide", "cm-toggle-msg", m.id) + act("Delete", "cm-del-msg", m.id) + "</div></div>"; }).join("") : '<p class="file-meta">No messages yet.</p>');
    }).catch(function (er) { warn(host, er); });
  }
  function cmWall(host) {
    sb().from("recognitions").select("*").order("created_at", { ascending: false }).limit(100).then(function (r) {
      if (r.error) throw r.error; C.wall = r.data || [];
      host.innerHTML = C.wall.length ? C.wall.map(function (m) { return '<div class="entry"><p><strong>' + esc(m.author_name) + "</strong>" + (m.to_name ? " &rarr; " + esc(m.to_name) : "") + " &middot; " + esc(m.kind) + " &middot; " + esc(m.age_group) + " circle" + (m.hidden ? ' <span class="badge st-archived">Hidden</span>' : "") + "</p><p>" + snip(m.body) + '</p><div class="mc-actions">' + act(m.hidden ? "Unhide" : "Hide", "cm-toggle-rec", m.id) + act("Delete", "cm-del-rec", m.id) + "</div></div>"; }).join("") : '<p class="file-meta">The wall is empty.</p>';
    }).catch(function (er) { warn(host, er); });
  }
  function cmEvents(host) {
    sb().from("events").select("*").order("starts_at", { ascending: false }).limit(100).then(function (r) {
      if (r.error) throw r.error; C.evs = r.data || []; var pend = C.evs.filter(function (x) { return x.status === "Pending"; });
      host.innerHTML = '<p class="file-meta">Gatherings hosted by members under 18 wait here for your approval before they’re listed. Adults’ gatherings are listed straight away and can be cancelled here.</p>' + "<h3>Waiting for approval (" + pend.length + ")</h3>" +
        (pend.length ? pend.map(function (x) { return evRow(x, true); }).join("") : '<p class="file-meta">Nothing waiting.</p>') + "<h3>All gatherings</h3>" + (C.evs.length ? C.evs.map(function (x) { return evRow(x, false); }).join("") : '<p class="file-meta">None yet.</p>');
    }).catch(function (er) { warn(host, er); });
  }
  function evRow(x, pend) {
    return '<div class="entry"><p><strong>' + esc(x.title) + "</strong> &middot; " + esc(x.kind) + " &middot; " + fmt(x.starts_at) + " &middot; hosted by " + esc(x.creator_name || "?") + " &middot; " + esc(x.age_group) + ' circle <span class="badge st-in-progress">' + esc(x.status) + "</span></p>" + (x.description ? "<p>" + snip(x.description) + "</p>" : "") +
      '<div class="mc-actions">' + (x.status === "Pending" ? act("Approve", "cm-ev", x.id, "btn-dark", ' data-do="Listed"') + act("Reject", "cm-ev", x.id, "btn-line", ' data-do="Rejected"') : "") + (x.status === "Listed" ? act("Cancel", "cm-ev", x.id, "btn-line", ' data-do="Cancelled"') : "") + "</div></div>";
  }

  function cmGames(host) {
    sb().from("game_prompts").select("*").order("sort_order", { ascending: true }).then(function (r) {
      if (r.error) throw r.error; C.prompts = r.data || [];
      host.innerHTML = '<p class="file-meta">Ice-breakers, would-you-rathers and founder dilemmas shown in the Lounge. Switch any off, or add your own.</p>' +
        '<form data-form="prompt" class="shell"><div class="row-2">' + fld("pr-kind", "Type", sel("pr-kind", [["icebreaker", "Ice-breaker (a written answer)"], ["wyr", "Would you rather (2 to 5 choices)"], ["dilemma", "Founder dilemma (choices with notes)"]], "icebreaker")) + fld("pr-title", "Title / question *", inp("pr-title", "", 'required maxlength="160"')) + "</div>" +
        fld("pr-body", "Extra detail (optional)", inp("pr-body", "", 'maxlength="600"')) + fld("pr-opts", "Choices (one per line; for dilemmas write: choice | what to weigh)", ta("pr-opts", "", 4), "Leave empty for an ice-breaker.") +
        '<p class="field-error" id="dlg-error" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Add game</button></form>' +
        C.prompts.map(function (p) { return '<div class="entry"><p><strong>' + esc(p.title) + "</strong> &middot; " + esc(p.kind) + (p.active ? ' <span class="badge st-open">On</span>' : ' <span class="badge st-archived">Off</span>') + '</p><div class="mc-actions">' + act(p.active ? "Switch off" : "Switch on", "cm-prompt-toggle", p.id) + act("Delete", "cm-prompt-del", p.id) + "</div></div>"; }).join("");
    }).catch(function (er) { warn(host, er); });
  }
  function cmChallenges(host) {
    sb().from("challenges").select("*").order("created_at", { ascending: false }).limit(100).then(function (r) {
      if (r.error) throw r.error; C.chals = r.data || [];
      host.innerHTML = '<p class="file-meta">Challenges members have started. Hide or remove anything that doesn’t belong.</p>' + (C.chals.length ? C.chals.map(function (c) {
        return '<div class="entry"><p><strong>' + esc(c.title) + "</strong> &middot; " + esc(c.kind) + " &middot; by " + esc(c.creator_name || "?") + " &middot; " + esc(c.age_group) + " circle &middot; " + esc(c.status) + (c.hidden ? ' <span class="badge st-archived">Hidden</span>' : "") + "</p><p>" + snip(c.description) + '</p><div class="mc-actions">' + act(c.hidden ? "Unhide" : "Hide", "cm-chal-hide", c.id) + (c.status !== "Removed" ? act("Remove", "cm-chal-remove", c.id) : "") + "</div></div>"; }).join("") : '<p class="file-meta">No challenges yet.</p>');
    }).catch(function (er) { warn(host, er); });
  }
  function cmSeed(host) {
    Promise.all([sb().from("seed_rounds").select("*").order("created_at", { ascending: false }), sb().from("seed_ideas").select("*").order("created_at", { ascending: false }), sb().from("seed_votes").select("*")]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; C.rounds = rs[0].data || []; C.ideas = rs[1].data || []; var votes = {}; (rs[2].data || []).forEach(function (v) { votes[v.idea_id] = (votes[v.idea_id] || 0) + 1; });
      host.innerHTML = '<div class="panel"><p><strong>Seed Month.</strong> Members share ideas (Submissions), then vote (Voting), then you close the round (Closed) and members see the tally. <strong>Votes are interest, never a funding decision.</strong> You decide funding separately. Shortlist ideas here as you review them.</p></div>' +
        '<form data-form="round" class="shell"><div class="row-2">' + fld("rd-title", "New round title *", inp("rd-title", "", 'required maxlength="100" placeholder="e.g. Seed Month, December"')) + fld("rd-votes", "Votes each member gets", '<input type="number" id="rd-votes" min="1" max="10" value="3">') + "</div>" +
        fld("rd-desc", "What this round is for", ta("rd-desc", "", 3)) + '<p class="field-error" id="dlg-error" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Create round (as a draft)</button></form>' +
        C.rounds.map(function (r) {
          var ideas = C.ideas.filter(function (i) { return i.round_id === r.id; });
          return '<div class="entry"><h3>' + esc(r.title) + ' <span class="badge st-in-progress">' + esc(r.status) + "</span></h3><p class=\"file-meta\">" + r.votes_per_member + " votes each &middot; " + ideas.length + " ideas</p><div class=\"mc-actions\">" + ["Draft", "Submissions", "Voting", "Closed"].map(function (st) { return r.status === st ? "" : act("Move to " + st, "cm-round-status", r.id, "btn-line", ' data-do="' + st + '"'); }).join("") + "</div>" +
            ideas.map(function (i) { return '<div class="entry"><p><strong>' + esc(i.title) + "</strong> by " + esc(i.author_name || "?") + " &middot; " + esc(i.age_group) + " circle &middot; <strong>" + (votes[i.id] || 0) + "</strong> votes" + (i.shortlisted ? ' <span class="badge st-open">Shortlisted</span>' : "") + (i.hidden ? ' <span class="badge st-archived">Hidden</span>' : "") + "</p><p>" + snip(i.summary) + '</p><div class="mc-actions">' + act(i.shortlisted ? "Remove from shortlist" : "Shortlist", "cm-idea-short", i.id) + act(i.hidden ? "Unhide" : "Hide", "cm-idea-hide", i.id) + "</div></div>"; }).join("") + "</div>";
        }).join("");
    }).catch(function (er) { warn(host, er); });
  }

  function cmRooms(host) {
    sb().from("rooms").select("*").order("sort", { ascending: true }).then(function (r) {
      if (r.error) throw r.error; C.rooms = r.data || [];
      host.innerHTML = '<form data-form="room" class="shell"><div class="row-2">' + fld("rm-slug", "Short name (letters, numbers, dashes) *", inp("rm-slug", "", 'required maxlength="30" placeholder="e.g. design"')) + fld("rm-name", "Room name *", inp("rm-name", "", 'required maxlength="40"')) + "</div>" + fld("rm-desc", "One-line description", inp("rm-desc", "", 'maxlength="160"')) + '<p class="field-error" id="dlg-error" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Add room</button></form>' +
        C.rooms.map(function (m) { return '<div class="entry"><p><strong># ' + esc(m.name) + "</strong> &middot; " + esc(m.slug) + (m.archived ? ' <span class="badge st-archived">Archived</span>' : "") + '</p><p class="file-meta">' + esc(m.description || "") + '</p><div class="mc-actions">' + act(m.archived ? "Bring back" : "Archive", "cm-room", m.slug) + "</div></div>"; }).join("");
    }).catch(function (er) { warn(host, er); });
  }
  function cmStamps(host) {
    Promise.all([sb().from("stamp_types").select("*").order("sort", { ascending: true }), members()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; C.mem = rs[1];
      host.innerHTML = '<p class="file-meta">Some stamps are awarded automatically (first message, hosting, attending, thanking). Award the others here: completing a mission, helping, sharing knowledge, collaborating.</p>' +
        '<form data-form="stamp" class="shell"><div class="row-2">' + fld("st-member", "Member", sel("st-member", C.mem.map(function (m) { return [m.id, (m.display_name || "(no profile)") + " · " + m.email]; }), "")) + fld("st-key", "Stamp", sel("st-key", (rs[0].data || []).map(function (s) { return [s.key, s.name]; }), "")) + "</div>" +
        fld("st-note", "Note (optional, the member sees it)", inp("st-note", "", 'maxlength="200"')) + '<p class="field-error" id="dlg-error" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Award stamp</button></form>';
    }).catch(function (er) { warn(host, er); });
  }


  /* ======================================================================
     GUARDIANS: members under 18 who asked for more access
     ====================================================================== */
  A.addTab("guardians", "Guardians", function (host) {
    Promise.all([sb().from("members").select("*").in ? sb().from("members").select("*") : sb().from("members").select("*"), members()]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; C.mem = rs[1];
      var teens = (rs[0].data || []).filter(function (m) { return m.age_band === "14–15" || m.age_band === "16–17"; });
      host.innerHTML = '<p class="file-meta">Members under 18 who give a parent or guardian’s details. <strong>Contact the guardian yourself</strong> (a call is best), make sure they agree, and only then press Verify. A verified guardian unlocks the Ad Bureau and the Currency Exchange for that member. Their details are private to you. Under-18s always stay in the teen circle.</p>' +
        (teens.length ? teens.map(function (m) {
          return '<div class="entry"><p><strong>' + esc(memberName(C.mem, m.id)) + "</strong> &middot; " + esc(m.age_band) + (m.guardian_verified ? ' <span class="badge st-open">Guardian verified</span>' : m.guardian_name ? ' <span class="badge st-in-progress">Waiting for you</span>' : ' <span class="badge st-archived">No guardian details</span>') + "</p>" +
            (m.guardian_name ? "<p>Guardian: <strong>" + esc(m.guardian_name) + "</strong> &middot; " + esc(m.guardian_contact || "") + "</p>" : "") +
            '<div class="mc-actions">' + (m.guardian_name && !m.guardian_verified ? act("Verify guardian", "gd-verify", m.id, "btn-dark", ' data-do="yes"') : "") + (m.guardian_verified ? act("Remove verification", "gd-verify", m.id, "btn-line", ' data-do="no"') : "") + "</div></div>"; }).join("") : '<p class="file-meta">No members under 18 yet.</p>');
    }).catch(function (er) { warn(host, er); });
  });


  function lbMember(id) { return (C.lb || []).filter(function (x) { return x.id === id; })[0] || { id: id, display_name: "", email: "" }; }
  function grantForm(m) {
    return '<h2 id="ad-title" class="md-title">Grant Crowns to ' + esc(m.display_name || m.email) + '</h2><form data-form="grant" data-member="' + esc(m.id) + '">' +
      '<div class="row-2">' + fld("gr-amt", "Crowns *", '<input type="number" id="gr-amt" required step="1" min="-100000" max="100000" placeholder="e.g. 50">') + fld("gr-kind", "Why", sel("gr-kind", ["Mission", "Helped a builder", "Participation", "Adjustment"], "Mission")) + "</div>" +
      fld("gr-reason", "Reason (the member sees this) *", inp("gr-reason", "", 'required maxlength="200" placeholder="e.g. Mission I, strong and honest work"'), "Crowns for Mission, Helped a builder and Participation count toward their level. Adjustment doesn't.") +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Grant</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }
  function certForm(m) {
    return '<h2 id="ad-title" class="md-title">Certificate for ' + esc(m.display_name || m.email) + '</h2><form data-form="cert" data-member="' + esc(m.id) + '">' +
      fld("ce-name", "Name on the certificate *", inp("ce-name", m.display_name || "", 'required maxlength="80"')) + fld("ce-title", "Title *", inp("ce-title", "", 'required maxlength="120" placeholder="e.g. Royal Mission I: Distinction"')) +
      fld("ce-reason", "Why (optional, shown on the certificate)", ta("ce-reason", "", 3), "Keep it true and specific.") +
      '<div class="panel"><p>The certificate says plainly that the Republic is fictional and that this recognises taking part. It is not an academic qualification.</p></div>' +
      '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Grant certificate</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>';
  }

  /* ---------- clicks ---------- */
  A.onClick(function (a, el, id, what) {
    var db = sb(), reload = A.loadTab;
    function run(p, ok) { p.then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say(ok || "Done."); reload(); }, function (er) { A.say(A.errText(er), true); }); return true; }
    if (a === "new-alumnus") { A.showDialog(alumnusForm()); return true; }
    if (a === "edit-alumnus") { A.showDialog(alumnusForm((C.alumni || []).filter(function (x) { return x.id === id; })[0])); return true; }
    if (a === "delete-alumnus") { var al = (C.alumni || []).filter(function (x) { return x.id === id; })[0]; if (confirm("Delete this alumnus for good?")) db.from("alumni").delete().eq("id", id).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); if (al) A.removeFiles([al.photo]); A.say("Deleted."); reload(); }); return true; }
    if (a === "an-start") { var v0 = anthemVideo(); if (!v0) return true; SYNC.pos = 0; v0.currentTime = 0; var pp = v0.play && v0.play(); if (pp && pp.catch) pp.catch(function () {}); syncStatus(); return true; }
    if (a === "an-mark") {
      var v1 = anthemVideo(); if (!v1 || SYNC.pos < 0 || SYNC.pos >= C.anthem.length) return true;
      var tm = r1(v1.currentTime || 0); C.anthem[SYNC.pos].t = tm; var inp1 = document.getElementById("an-t-" + SYNC.pos); if (inp1) { inp1.value = tm.toFixed(1); inp1.scrollIntoView({ block: "nearest" }); }
      SYNC.pos++; syncStatus(); return true;
    }
    if (a === "an-undo") { if (SYNC.pos > 0) { SYNC.pos--; syncStatus(); } return true; }
    if (a === "an-back") { var v2 = anthemVideo(); if (v2) v2.currentTime = Math.max(0, (v2.currentTime || 0) - 3); return true; }
    if (a === "an-play-at") { var v3 = anthemVideo(), ln = C.anthem[Number(id)]; if (v3 && ln) { v3.currentTime = Math.max(0, ln.t - 1); var p3 = v3.play && v3.play(); if (p3 && p3.catch) p3.catch(function () {}); } return true; }
    if (a === "an-apply") { var parsed = parseAnthem(document.getElementById("an-text").value); if (!parsed.length) { A.say("Add at least one line of lyrics.", true); return true; } C.anthem = parsed; autoSpace(Number(document.getElementById("an-a0").value) || 14, Number(document.getElementById("an-a1").value) || 192); document.getElementById("an-rows").innerHTML = anthemRows(); SYNC.pos = -1; syncStatus(); A.say("Lyrics updated and re-spaced. Now sync them."); return true; }
    if (a === "an-auto") { autoSpace(Number(document.getElementById("an-a0").value) || 14, Number(document.getElementById("an-a1").value) || 192); document.getElementById("an-rows").innerHTML = anthemRows(); A.say("Lines spread evenly. Sync them for exact timing."); return true; }
    if (a === "an-reset") { if (confirm("Remove your synced version and go back to the built-in lyrics?")) db.rpc("admin_save_anthem", { p_lines: [] }).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say("Back to the built-in lyrics."); reload(); }); return true; }
    if (a === "new-offer") { A.showDialog(offerForm()); return true; }
    if (a === "edit-offer") { A.showDialog(offerForm((C.offers || []).filter(function (x) { return x.id === id; })[0])); return true; }
    if (a === "toggle-offer") { var of0 = (C.offers || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("crown_offers").update({ active: !(of0 && of0.active) }).eq("id", id), "Updated."); }
    if (a === "delete-offer") { if (confirm("Delete this offer? Past purchases stay on record.")) run(db.from("crown_offers").delete().eq("id", id), "Offer deleted."); return true; }
    if (a === "purch-done") return run(db.from("crown_purchases").update({ status: "Fulfilled", fulfilled_at: new Date().toISOString() }).eq("id", id), "Marked as delivered.");
    if (a === "purch-refund") { if (confirm("Refund the Crowns for this purchase?")) db.rpc("admin_refund_purchase", { p_purchase: id }).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say("Refunded. The Crowns are back in their wallet."); reload(); }); return true; }
    if (a === "purch-note") { var pn = prompt("Note for the member (they will see it):", ""); if (pn != null) return run(db.from("crown_purchases").update({ note: pn.slice(0, 300) || null }).eq("id", id), "Note saved."); return true; }
    if (a === "cm-view") { C.cview = id; reload(); return true; }
    if (a === "cm-prompt-toggle") { var pp = (C.prompts || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("game_prompts").update({ active: !(pp && pp.active) }).eq("id", id), "Updated."); }
    if (a === "cm-prompt-del") { if (confirm("Delete this game and its answers?")) run(db.from("game_prompts").delete().eq("id", id), "Deleted."); return true; }
    if (a === "cm-chal-hide") { var ch = (C.chals || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("challenges").update({ hidden: !(ch && ch.hidden) }).eq("id", id), "Updated."); }
    if (a === "cm-chal-remove") { if (confirm("Remove this challenge?")) run(db.from("challenges").update({ status: "Removed" }).eq("id", id), "Removed."); return true; }
    if (a === "cm-round-status") return run(db.from("seed_rounds").update({ status: what }).eq("id", id), "Round moved to " + what + ".");
    if (a === "cm-idea-short") { var id1 = (C.ideas || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("seed_ideas").update({ shortlisted: !(id1 && id1.shortlisted) }).eq("id", id), "Updated."); }
    if (a === "cm-idea-hide") { var id2 = (C.ideas || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("seed_ideas").update({ hidden: !(id2 && id2.hidden) }).eq("id", id), "Updated."); }
    if (a === "cm-toggle-msg") { var mg = (C.msgs || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("messages").update({ hidden: !(mg && mg.hidden) }).eq("id", id), "Updated."); }
    if (a === "cm-del-msg") { if (confirm("Delete this message for good?")) run(db.from("messages").delete().eq("id", id), "Deleted."); return true; }
    if (a === "cm-toggle-rec") { var rc = (C.wall || []).filter(function (x) { return x.id === id; })[0]; return run(db.from("recognitions").update({ hidden: !(rc && rc.hidden) }).eq("id", id), "Updated."); }
    if (a === "cm-del-rec") { if (confirm("Delete this for good?")) run(db.from("recognitions").delete().eq("id", id), "Deleted."); return true; }
    if (a === "cm-ev") return run(db.from("events").update({ status: what }).eq("id", id), "Updated.");
    if (a === "cm-room") { var rm = (C.rooms || []).filter(function (x) { return x.slug === id; })[0]; return run(db.from("rooms").update({ archived: !(rm && rm.archived) }).eq("slug", id), "Updated."); }
    if (a === "cm-dismiss") return run(db.from("reports").update({ status: "dismissed" }).eq("id", id), "Report dismissed.");
    if (a === "cm-hide-report") {
      var rp = (C.reps || []).filter(function (x) { return x.id === id; })[0]; if (!rp) return true;
      var tbl = { message: "messages", recognition: "recognitions", event: "events" }[rp.target_type], patch = rp.target_type === "event" ? { status: "Cancelled" } : { hidden: true };
      db.from(tbl).update(patch).eq("id", rp.target_id).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); return db.from("reports").update({ status: "actioned" }).eq("id", id).then(function () { A.say("Done. The content is hidden and the report is closed."); reload(); }); }); return true;
    }
    if (a === "ex-confirm") { db.rpc("admin_confirm_exchange", { p_id: id }).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say(esc(r.data || "Confirmed.")); reload(); }); return true; }
    if (a === "ex-reject") { var exn = prompt("Why? (the member will see this)", ""); if (exn == null) return true; return run(db.from("crown_exchange").update({ status: "Rejected", decided_at: new Date().toISOString(), admin_note: exn.slice(0, 300) || null }).eq("id", id), "Rejected."); }
    if (a === "gd-verify") { db.rpc("admin_verify_guardian", { p_member: id, p_verified: what === "yes" }).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say(esc(r.data || "Done.")); reload(); }); return true; }
    if (a === "lb-grant") { A.showDialog(grantForm(lbMember(id))); return true; }
    if (a === "lb-cert") { A.showDialog(certForm(lbMember(id))); return true; }
    if (a === "lb-publish") {
      db.rpc("admin_public_leaderboard", { p_limit: 10 }).then(function (r) {
        if (r.error) return A.say(A.errText(r.error), true); var rows = r.data || []; if (!rows.length) return A.say("Nobody has earned any Crowns yet, so there is nothing to publish.", true);
        var d = new Date(), month = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        var body = "The builders of the Republic who have earned the most Crowns through real work: Royal Missions, helping other builders and taking part. Only members who chose to be named appear by name.\n\n" +
          rows.map(function (x) { return x.rank + ". " + x.name + ": " + x.earned + " Crowns"; }).join("\n") + "\n\nCrowns are earned, never bought, and a place on this list does not decide funding.";
        A.showDialog('<h2 id="ad-title" class="md-title">Publish the leaderboard</h2><p class="file-meta">Names shown are only for adults who opted in. Everyone else appears as "A builder of the Republic". Edit anything before you publish.</p><form data-form="lbpost">' +
          fld("lp-head", "Headline", inp("lp-head", "The Royal Leaderboard, " + month, 'required maxlength="140"')) + fld("lp-body", "Text", ta("lp-body", body, 12)) + chkb("lp-pub", "Publish to the Newsroom now", true) +
          '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Post it</button><button type="button" class="btn btn-line" data-close>Cancel</button></div></form>');
      }); return true;
    }
    if (a === "new-scheme") { A.showDialog(schemeForm()); return true; }
    if (a === "edit-scheme") { A.showDialog(schemeForm((C.schemes || []).filter(function (x) { return x.id === id; })[0])); return true; }
    if (a === "scheme-today") return run(db.from("schemes").update({ last_verified: today() }).eq("id", id), "Marked as checked today.");
    if (a === "toggle-scheme") { var sc = (C.schemes || []).filter(function (x) { return x.id === id; })[0]; if (sc && !sc.published && !sc.last_verified) { A.say("Check the official site first, then set “Last checked” (use “Checked today”) before publishing.", true); return true; } return run(db.from("schemes").update({ published: !(sc && sc.published) }).eq("id", id), "Updated."); }
    if (a === "delete-scheme") { if (confirm("Delete this scheme for good?")) run(db.from("schemes").delete().eq("id", id), "Scheme deleted."); return true; }

    if (a === "copy-invite") { if (navigator.clipboard) navigator.clipboard.writeText(id).then(function () { A.say("Link copied. Send it to the founder."); }, function () { A.say("Copy it by hand: " + esc(id)); }); else A.say("Copy it by hand: " + esc(id)); return true; }
    if (a === "delete-invite") { if (confirm("Delete this link? It will stop working.")) run(db.from("story_invites").delete().eq("token", id), "Link deleted."); return true; }
    if (a === "view-sub") { var s = (C.subs || []).filter(function (x) { return x.id === id; })[0]; if (!s) return true;
      A.showDialog('<h2 id="ad-title" class="md-title">' + esc(s.name) + "</h2><p class=\"file-meta\">" + esc([s.role, s.venture, s.email, s.age_band].filter(Boolean).join(" · ")) + "</p><p style=\"white-space:pre-wrap\">" + esc(s.story) + "</p>" +
        (s.links ? "<p><strong>Links:</strong> " + esc(s.links) + "</p>" : "") + (s.photo_link ? '<p><a href="' + esc(s.photo_link) + '" target="_blank" rel="noopener noreferrer nofollow">Photo link</a></p>' : "") + '<div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>'); return true; }
    if (a === "decline-sub") return run(db.from("story_submissions").update({ status: "Declined" }).eq("id", id), "Declined.");
    if (a === "delete-sub") { if (confirm("Delete this submission for good?")) run(db.from("story_submissions").delete().eq("id", id), "Deleted."); return true; }
    if (a === "draft-sub") {
      var x = (C.subs || []).filter(function (y) { return y.id === id; })[0]; if (!x) return true;
      var slug = (x.name + "-" + (x.venture || "story")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) + "-" + A.uuid().slice(0, 4);
      var minor = /^1[46]/.test(x.age_band);
      db.from("stories").insert({ slug: slug, kind: "Founder story", headline: (x.name + (x.venture ? ": " + x.venture : "’s story")).slice(0, 140), body: x.story + (x.links ? "\n\nLinks: " + x.links : ""), person_name: x.name, person_role: x.role, venture: x.venture, venture_url: x.website,
        relationship: "Member of the Republic", consent_confirmed: false, person_is_minor: minor, guardian_consent: !!x.guardian_ok, published: false }).then(function (r) {
        if (r.error) return A.say(A.errText(r.error), true);
        return db.from("story_submissions").update({ status: "Drafted" }).eq("id", id).then(function () { A.say("Draft created. Open the Stories tab to edit it, tick the consent box once you’ve confirmed with them, and publish."); reload(); });
      }); return true;
    }

    if (a === "ad-view") { C.adview = id; reload(); return true; }
    if (a === "review-adp") {
      var p = (C.adp || []).filter(function (y) { return y.id === id; })[0]; if (!p) return true;
      A.showDialog('<h2 id="ad-title" class="md-title">' + esc(p.venture) + '</h2><p class="file-meta">' + esc(memberName(C.mem, p.owner)) + " &middot; " + esc(p.category) + " &middot; " + esc(p.region || "") + "</p><p><strong>" + esc(p.headline) + "</strong></p><p>" + esc(p.copy || "") + "</p>" +
        "<p><strong>Channels:</strong> " + esc((p.channels || []).join(", ") || "none") + " &middot; <strong>Can pay:</strong> " + money(p.can_pay_inr) + " &middot; " + (p.open_to_sharing ? "open to sharing" : "wants its own placement") + "</p>" + (p.placement_notes ? "<p><strong>Spots in mind:</strong> " + esc(p.placement_notes) + "</p>" : "") + (p.audience ? "<p><strong>Audience:</strong> " + esc(p.audience) + "</p>" : "") + (p.conflict_note ? "<p><strong>Doesn’t want to share with:</strong> " + esc(p.conflict_note) + "</p>" : "") +
        (p.website ? '<p><a href="' + esc(p.website) + '" target="_blank" rel="noopener noreferrer nofollow">Website</a></p>' : "") + (p.creative_link ? '<p><a href="' + esc(p.creative_link) + '" target="_blank" rel="noopener noreferrer nofollow">Creative link</a></p>' : "") +
        (p.creative_image ? '<p><img alt="Creative" style="max-width:100%;border:2px solid var(--gold)" src="' + esc(String(window.RAEESI_SUPABASE.url).replace(/\/$/, "") + "/storage/v1/object/public/ads/" + p.creative_image) + '"></p>' : "") +
        '<form data-form="review-adp" data-id="' + esc(p.id) + '">' + fld("rv-status", "Decision", sel("rv-status", ["Under review", "Approved", "Needs changes", "Declined"], p.status === "Submitted" ? "Under review" : p.status)) + fld("rv-note", "Note to the member (they see this)", ta("rv-note", p.admin_note, 3)) +
        '<p class="field-error" id="dlg-error" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">Save decision</button><button type="button" class="btn btn-line" data-close>Close</button></div></form>'); return true;
    }
    if (a === "new-campaign") { A.showDialog(campaignForm()); return true; }
    if (a === "edit-campaign") { A.showDialog(campaignForm((C.camps || []).filter(function (y) { return y.id === id; })[0])); return true; }
    if (a === "delete-campaign") { if (confirm("Delete this campaign and its entries for good?")) run(db.from("ad_campaigns").delete().eq("id", id), "Campaign deleted."); return true; }
    if (a === "camp-entries") { entriesDialog(id); return true; }
    if (a === "entry-confirm") { db.rpc("admin_confirm_entry", { p_entry: id }).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say("Confirmed. Any Crowns it used were charged once."); entriesDialog(C.entryCamp.id); }); return true; }
    if (a === "entry-set") { db.from("ad_entries").update({ status: what }).eq("id", id).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); A.say("Updated."); entriesDialog(C.entryCamp.id); }); return true; }
    if (a === "entry-note") { var note = prompt("Note about this decision (the member can see it):", ""); if (note != null) db.from("ad_entries").update({ decision_note: note.slice(0, 500) || null }).eq("id", id).then(function (r) { if (r.error) return A.say(A.errText(r.error), true); entriesDialog(C.entryCamp.id); }); return true; }

    if (a === "winner-done") return run(db.from("mission_winners").update({ fulfilled: true }).eq("id", id), "Marked as fulfilled.");
    if (a === "winner-del") { if (confirm("Remove this winner?")) run(db.from("mission_winners").delete().eq("id", id), "Removed."); return true; }
    if (a === "lb-pitches") {
      Promise.all([db.from("pitches").select("*").eq("author", id), db.from("ad_pitches").select("*").eq("owner", id)]).then(function (rs) {
        var ps = rs[0].data || [], aps = rs[1].data || [];
        A.showDialog('<h2 id="ad-title" class="md-title">' + esc(memberName(C.mem, id)) + "</h2><h3>Pitches</h3>" + (ps.length ? ps.map(function (q) { return "<div class=\"entry\"><p><strong>" + esc(q.title) + "</strong> &middot; " + esc(q.category) + " &middot; " + esc(q.status) + "</p><p>" + esc(q.description) + "</p></div>"; }).join("") : '<p class="file-meta">None.</p>') +
          "<h3>Ad pitches</h3>" + (aps.length ? aps.map(function (q) { return "<div class=\"entry\"><p><strong>" + esc(q.venture) + "</strong> &middot; " + esc(q.status) + "</p><p>" + esc(q.headline) + "</p></div>"; }).join("") : '<p class="file-meta">None.</p>') + '<div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-close>Close</button></div>');
      }); return true;
    }
    return false;
  });

  /* ---------- form submits ---------- */
  A.onSubmit(function (kind, form, t) {
    var db = sb(), v = t.v, c = t.c;
    if (kind === "alumnus") {
      var aid = form.getAttribute("data-id"), pubd = c("al-pub"), perm = c("al-perm"), mn = c("al-minor"), file = $("#al-photo", form).files[0];
      if (pubd && !perm) { t.fail({ message: "To list someone publicly, please confirm they agreed to be listed." }); return true; }
      if (pubd && mn) { t.fail({ message: "Someone under 18 can’t be listed publicly." }); return true; }
      var arow = { name: v("al-name"), cohort: v("al-cohort") || null, headline: v("al-head") || null, story: v("al-story") || null, venture: v("al-venture") || null, website: v("al-web") || null, links: v("al-links") || null,
        sort_order: parseInt(v("al-order"), 10) || 0, permission_confirmed: perm, is_minor: mn, published: pubd, photo: form.getAttribute("data-old-photo") || null };
      t.busy(true); var st = Promise.resolve();
      if (file) st = A.resizeToBlob(file, 800, 0.86).then(function (b) { return A.upload("alumni/" + A.uuid().slice(0, 12) + ".jpg", b); }).then(function (u) { var old = arow.photo; arow.photo = u; A.removeFiles([old]); });
      st.then(function () { return aid ? db.from("alumni").update(arow).eq("id", aid) : db.from("alumni").insert(arow); }).then(function (r) { if (r.error) throw r.error; A.done("Alumnus saved."); }).catch(t.fail); return true;
    }
    if (kind === "anthem") {
      var lns = (C.anthem || []).map(function (l) { return { t: Number(l.t) || 0, text: l.text, section: l.section || "" }; }).sort(function (x, y) { return x.t - y.t; });
      if (!lns.length) { t.fail({ message: "There are no lyrics to save." }); return true; }
      var vid = v("an-vid-i"); if (vid && !/^(https:\/\/|media\/)/.test(vid)) { t.fail({ message: "The video address must start with https:// (or leave it blank)." }); return true; }
      t.busy(true);
      db.rpc("admin_save_anthem", { p_lines: lns }).then(function (r) { if (r.error) throw r.error;
        return db.from("anthem_settings").upsert({ id: 1, title: v("an-title-i") || null, video_url: vid || null, poster_url: (C.anthemSettings || {}).poster_url || null, time_offset: Math.max(-10, Math.min(10, Number(v("an-off-i")) || 0)) });
      }).then(function (r) { if (r.error) throw r.error; t.busy(false); A.say("The anthem is saved (" + lns.length + " lines). Open the Anthem page to try it."); }).catch(t.fail); return true;
    }
    if (kind === "offer") {
      var oid = form.getAttribute("data-id"), cost = parseInt(v("of-cost"), 10);
      if (!(cost >= 1)) { t.fail({ message: "The cost must be at least 1 Crown." }); return true; }
      var orow = { name: v("of-name"), description: v("of-desc") || null, kind: v("of-kind"), cost: cost, stock: v("of-stock") === "" ? null : Math.max(0, parseInt(v("of-stock"), 10) || 0), adults_only: c("of-adults"), active: c("of-active"), sort_order: parseInt(v("of-order"), 10) || 0 };
      t.busy(true); (oid ? db.from("crown_offers").update(orow).eq("id", oid) : db.from("crown_offers").insert(orow)).then(function (r) { if (r.error) return t.fail(r.error); A.done("Offer saved."); }, t.fail); return true;
    }
    if (kind === "prompt") {
      var pk = v("pr-kind"), lines = A.lines(document.getElementById("pr-opts").value), opts = lines.map(function (l) { var pr = l.split("|"); return pr.length > 1 ? { label: pr[0].trim().slice(0, 120), note: pr.slice(1).join("|").trim().slice(0, 300) } : { label: l.trim().slice(0, 120) }; }).filter(function (o) { return o.label; });
      if (pk !== "icebreaker" && (opts.length < 2 || opts.length > 5)) { t.fail({ message: "Please give between 2 and 5 choices (one per line)." }); return true; }
      t.busy(true); db.from("game_prompts").insert({ slug: "g-" + A.uuid().slice(0, 8), kind: pk, title: v("pr-title"), body: v("pr-body") || null, options: pk === "icebreaker" ? [] : opts, sort_order: 100 }).then(function (r) { if (r.error) return t.fail(r.error); A.done("Game added."); }, t.fail); return true;
    }
    if (kind === "round") {
      t.busy(true); db.from("seed_rounds").insert({ title: v("rd-title"), description: v("rd-desc") || null, votes_per_member: Math.max(1, Math.min(10, parseInt(v("rd-votes"), 10) || 3)), status: "Draft" }).then(function (r) { if (r.error) return t.fail(r.error); A.done("Round created as a draft. Move it to Submissions when you're ready."); }, t.fail); return true;
    }
    if (kind === "room") {
      var slug = v("rm-slug").toLowerCase(); if (!/^[a-z0-9-]{2,30}$/.test(slug)) { t.fail({ message: "The short name can only use letters, numbers and dashes." }); return true; }
      t.busy(true); db.from("rooms").insert({ slug: slug, name: v("rm-name"), description: v("rm-desc") || null, sort: 50 }).then(function (r) { if (r.error) return t.fail(r.error); A.done("Room added."); }, t.fail); return true;
    }
    if (kind === "stamp") {
      t.busy(true); db.rpc("admin_award_stamp", { p_member: v("st-member"), p_key: v("st-key"), p_note: v("st-note") || null }).then(function (r) { t.busy(false); if (r.error) return A.say(A.errText(r.error), true); A.say("Stamp awarded. The member gets an alert."); }); return true;
    }
    if (kind === "settings") {
      var rate = parseInt(v("sx-rate"), 10); if (!(rate >= 1)) { t.fail({ message: "Rupees per Crown must be at least 1." }); return true; }
      t.busy(true); db.from("app_settings").upsert({ id: 1, crown_rate_inr: rate, exchange_min_inr: Math.max(1, parseInt(v("sx-min"), 10) || 100), ad_min_inr: Math.max(0, parseInt(v("sx-admin"), 10) || 0), exchange_instructions: v("sx-ins") || null, exchange_enabled: c("sx-on"), auto_approve_adults: c("sx-auto") })
        .then(function (r) { t.busy(false); if (r.error) return A.say(A.errText(r.error), true); A.say("Settings saved."); }); return true;
    }
    if (kind === "grant") {
      var amt2 = parseInt(v("gr-amt"), 10); if (!amt2) { t.fail({ message: "Enter a number of Crowns (not zero)." }); return true; }
      t.busy(true); db.from("credit_entries").insert({ member: form.getAttribute("data-member"), amount: amt2, kind: v("gr-kind"), reason: v("gr-reason") }).then(function (r) { if (r.error) return t.fail(r.error); A.done("Crowns granted."); }, t.fail); return true;
    }
    if (kind === "cert") {
      t.busy(true); db.from("certificates").insert({ member: form.getAttribute("data-member"), holder_name: v("ce-name"), title: v("ce-title"), reason: v("ce-reason") || null }).then(function (r) { if (r.error) return t.fail(r.error); A.done("Certificate granted. The member will find it in their wallet."); }, t.fail); return true;
    }
    if (kind === "lbpost") {
      var slug = "leaderboard-" + new Date().toISOString().slice(0, 10) + "-" + A.uuid().slice(0, 4), pubn = c("lp-pub");
      t.busy(true); db.from("stories").insert({ slug: slug, kind: "Republic news", headline: v("lp-head"), body: v("lp-body"), relationship: "None", published: pubn, published_at: pubn ? new Date().toISOString() : null }).then(function (r) { if (r.error) return t.fail(r.error); A.done(pubn ? "Published to the Newsroom." : "Saved as a draft in the Stories tab."); }, t.fail); return true;
    }
    if (kind === "scheme") {
      var id = form.getAttribute("data-id"), pub = c("sc-pub"), ver = v("sc-ver");
      if (pub && !ver) { t.fail({ message: "Please check the official site and set “Last checked” before publishing." }); return true; }
      var row = { name: v("sc-name"), agency: v("sc-agency"), level: v("sc-level"), state: v("sc-state") || null, kind: v("sc-kind"), status: v("sc-status"), summary: v("sc-summary") || null, eligibility: v("sc-elig") || null, amount_text: v("sc-amount") || null,
        deadline: v("sc-deadline") || null, stage: A.list(v("sc-stage")), tags: A.list(v("sc-tags")), link: v("sc-link"), last_verified: ver || null, published: pub };
      t.busy(true); (id ? db.from("schemes").update(row).eq("id", id) : db.from("schemes").insert(row)).then(function (r) { if (r.error) return t.fail(r.error); A.done("Scheme saved."); }, t.fail); return true;
    }
    if (kind === "invite") {
      var tok = token(); t.busy(true);
      db.from("story_invites").insert({ token: tok, label: v("iv-label") }).then(function (r) {
        t.busy(false); if (r.error) return A.say(A.errText(r.error), true);
        var link = baseUrl() + "share-story.html?t=" + tok; A.loadTab();
        A.say("Link created for <strong>" + esc(v("iv-label")) + "</strong>: <code>" + esc(link) + "</code> Send it to them privately. It works once and expires in 60 days.");
      }); return true;
    }
    if (kind === "review-adp") {
      t.busy(true); db.from("ad_pitches").update({ status: v("rv-status"), admin_note: v("rv-note") || null }).eq("id", form.getAttribute("data-id")).then(function (r) { if (r.error) return t.fail(r.error); A.done("Decision saved."); }, t.fail); return true;
    }
    if (kind === "campaign") {
      var cid = form.getAttribute("data-id");
      var cr = { title: v("cm-title"), channel: v("cm-channel"), status: v("cm-status"), venue: v("cm-venue") || null, description: v("cm-desc") || null, area_sqft: v("cm-area") ? Number(v("cm-area")) : null, cost_inr: v("cm-cost") !== "" ? parseInt(v("cm-cost"), 10) : null, credit_value_inr: parseInt(v("cm-cv"), 10) || 0, min_entry_inr: Math.max(0, parseInt(v("cm-min"), 10) || 0), closes_on: v("cm-close") || null };
      t.busy(true); (cid ? db.from("ad_campaigns").update(cr).eq("id", cid) : db.from("ad_campaigns").insert(cr)).then(function (r) { if (r.error) return t.fail(r.error); A.done("Campaign saved."); }, t.fail); return true;
    }
    if (kind === "credit") {
      var amt = parseInt(v("cr-amt"), 10); if (!amt) { A.say("Enter a number of Crowns (not zero).", true); return true; }
      t.busy(true); db.from("credit_entries").insert({ member: v("cr-member"), amount: amt, kind: v("cr-kind"), reason: v("cr-reason") || null }).then(function (r) { t.busy(false); if (r.error) return A.say(A.errText(r.error), true); A.say("Recorded."); A.loadTab(); }); return true;
    }
    if (kind === "level") {
      var lv = form.getAttribute("data-level"), i = levels().map(function (l) { return l.name; }).indexOf(lv);
      t.busy(true); db.from("level_perks").upsert({ level: lv, perks: A.lines($("#lv-perks-" + i, form).value).slice(0, 8), ad_discount_pct: Math.max(0, Math.min(100, parseInt(v("lv-disc-" + i), 10) || 0)) }).then(function (r) { t.busy(false); if (r.error) return A.say(A.errText(r.error), true); A.say("Saved " + esc(lv) + "."); }); return true;
    }
    if (kind === "winner") {
      var mid = form.getAttribute("data-mission");
      t.busy(true); db.from("mission_winners").insert({ mission_id: mid, member: v("wn-m-" + mid), place: parseInt(v("wn-p-" + mid), 10) || 1 }).then(function (r) { t.busy(false); if (r.error) return A.say(A.errText(r.error), true); A.say("Winner added. They’ll see it on their profile and can choose a gift."); A.loadTab(); }); return true;
    }
    return false;
  });
})();
