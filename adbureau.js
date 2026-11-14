/* The Royal Ad Bureau: member area. You should not need to edit this.
   Privacy and permissions are enforced by the database, not this file. */
(function () {
  "use strict";
  var app = document.getElementById("ab-app"); if (!app) return;
  var CFG = window.RAEESI_SUPABASE || {}, APP = window.RAEESI_APP || { currency: "Crowns", currencyOne: "Crown" };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function validUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch (e) { return false; } }
  function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  function say(t, bad) { var el = $("ab-status"); el.innerHTML = t ? '<div class="notice' + (bad ? " warn" : "") + '"><p>' + t + "</p></div>" : ""; if (t && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  function fr(err) {
    var m = (err && (err.message || err.msg)) || "";
    if (/free credits/i.test(m)) return "You don’t have that many free " + APP.currency + ".";
    if (/approved pitch/i.test(m)) return "Only an approved ad pitch of yours can join a campaign.";
    if (/not open/i.test(m)) return "That campaign isn’t open for pitches any more.";
    if (/duplicate key/i.test(m)) return "That pitch has already joined this campaign.";
    if (/row-level security/i.test(m)) return "That isn’t allowed. Ad pitches are for approved members aged 18 and over.";
    if (/check constraint/i.test(m)) return "One of your answers is too short, too long, or not in the right format.";
    return "Something went wrong" + (m ? " (" + m + ")" : "") + ". Please try again.";
  }
  function uuid() { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); var a = new Uint8Array(16); crypto.getRandomValues(a); var h = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20); }
  function levels() { return ((window.RAEESI_MISSIONS || {}).levels) || [{ name: "Newcomer", min: 0 }, { name: "Apprentice Builder", min: 40 }, { name: "Journeyman Builder", min: 150 }, { name: "Master Builder", min: 350 }]; }
  function levelFor(p) { var lv = levels()[0].name; levels().forEach(function (l) { if (p >= l.min) lv = l.name; }); return lv; }

  var CATS = ["Education", "Coaching / tutoring", "Food & beverage", "Health & wellness", "Fashion & lifestyle", "Finance", "Technology / software", "Retail", "Services", "Entertainment", "Other"];
  var CHANNELS = ["Billboard", "Prime-location banner", "Metro / transit", "Gym / fitness centre", "School display", "College campus", "Coaching centre", "Cafe / restaurant", "Mall / retail", "Residential society", "Print / flyers", "Digital / social", "Event / exhibition", "Other"];
  var S = { sb: null, user: null, member: null, wallet: { balance: 0, earned: 0 }, ledger: [], perks: [], pitches: [], camps: [], pool: {}, entries: [], loaded: false };
  var MINOR = ["14–15", "16–17"];
  function ok() { return !!(S.member && S.member.approved && !S.member.suspended && MINOR.indexOf(S.member.age_band) === -1); }

  function resizeJpeg(file, maxEdge) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Please choose a JPG, PNG or WebP picture."));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { var k = Math.min(1, maxEdge / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(function (b) { b ? resolve(b) : reject(new Error("Couldn’t process that picture.")); }, "image/jpeg", 0.85); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Couldn’t read that picture.")); }; img.src = url;
    });
  }

  /* ---------- loading ---------- */
  var busyLoad = false, again = false;
  function refresh() {
    if (busyLoad) { again = true; return; } busyLoad = true;
    load().then(function () { S.loaded = true; render(); }).catch(function () { S.loaded = true; render(); say("We couldn’t load your bureau just now. Please reload.", true); })
      .then(function () { busyLoad = false; if (again) { again = false; refresh(); } });
  }
  function load() {
    var sb = S.sb, uid = S.user && S.user.id; S.member = null; S.pitches = []; S.camps = []; S.pool = {}; S.entries = []; S.ledger = []; S.perks = []; S.wallet = { balance: 0, earned: 0 };
    if (!uid) return Promise.resolve();
    return sb.from("members").select("*").eq("id", uid).maybeSingle().then(function (r) { S.member = r.data || null; if (!ok()) return null;
      return sb.rpc("my_wallet").then(function (w) { var row = Array.isArray(w.data) ? w.data[0] : w.data; if (row) S.wallet = { balance: row.balance || 0, earned: row.earned || 0 }; })
        .then(function () { return sb.from("credit_entries").select("*").order("created_at", { ascending: false }).limit(10); }).then(function (r2) { S.ledger = r2.data || []; })
        .then(function () { return sb.from("level_perks").select("*"); }).then(function (r3) { S.perks = r3.data || []; })
        .then(function () { return sb.from("ad_pitches").select("*").eq("owner", uid).order("created_at", { ascending: false }); }).then(function (r4) { S.pitches = r4.data || []; })
        .then(function () { return sb.from("ad_campaigns").select("*").order("created_at", { ascending: false }); }).then(function (r5) { S.camps = r5.data || []; })
        .then(function () { return sb.from("ad_entries").select("*").eq("owner", uid); }).then(function (r6) { S.entries = r6.data || []; })
        .then(function () { return Promise.all(S.camps.map(function (c) { return sb.rpc("campaign_pool", { p_campaign: c.id }).then(function (p) { var row = Array.isArray(p.data) ? p.data[0] : p.data; S.pool[c.id] = row || { entries: 0, total_inr: 0 }; }); })); });
    });
  }

  /* ---------- rendering ---------- */
  function render() {
    var html = "";
    if (!S.user) {
      html = '<form data-f="signin" class="authbar"><label for="ab-email">Sign in with your email</label><div class="inline"><input type="email" id="ab-email" required autocomplete="email" placeholder="you@example.com"><button type="submit" class="btn btn-dark btn-sm">Email me a sign-in link</button></div><p class="hint">Use the email you joined the Builders’ Network with. No password needed.</p></form>';
    } else {
      html = '<div class="authbar signed"><span class="who">Signed in as <strong>' + esc(S.user.email || "") + '</strong></span> <button type="button" class="linkish" data-a="signout">Sign out</button></div>';
      if (!S.member) html += '<div class="notice"><p>You haven’t joined the Builders’ Network yet. <a href="network.html">Create your profile</a> first, then come back.</p></div>';
      else if (MINOR.indexOf(S.member.age_band) > -1) html += '<div class="notice"><p>The Ad Bureau is for members aged 18 and over, because it involves agreements about money. You can still earn ' + esc(APP.currency) + ' through Royal Missions.</p></div>';
      else if (!S.member.approved) html += '<div class="notice"><p>The Ad Bureau opens once the Supreme Leader has approved your membership. Create your profile in the <a href="network.html">Builders’ Network</a> if you haven’t.</p></div>';
      else html += walletHtml() + pitchesHtml() + campsHtml();
    }
    app.innerHTML = html;
  }

  function walletHtml() {
    var lv = levelFor(S.wallet.earned), perk = S.perks.filter(function (p) { return p.level === lv; })[0] || { perks: [], ad_discount_pct: 0 };
    var next = levels().filter(function (l) { return l.min > S.wallet.earned; })[0];
    return '<div class="panel"><h3>Your ' + esc(APP.currency) + "</h3><p><strong>" + S.wallet.balance + "</strong> " + esc(APP.currency) + " to spend &middot; <strong>" + S.wallet.earned + "</strong> earned &middot; level <strong>" + esc(lv) + "</strong>" + (next ? " (" + (next.min - S.wallet.earned) + " more earned to reach " + esc(next.name) + ")" : "") + "</p>" +
      ((perk.perks || []).length || perk.ad_discount_pct ? "<p><strong>Your level’s perks:</strong> " + esc((perk.perks || []).join("; ")) + (perk.ad_discount_pct ? (perk.perks.length ? "; " : "") + perk.ad_discount_pct + "% off ad contributions (confirmed by the Supreme Leader per campaign)" : "") + "</p>" : '<p class="file-meta">No perks have been set for your level yet.</p>') +
      (S.ledger.length ? '<details><summary>Recent activity</summary>' + S.ledger.map(function (e) { return '<p class="file-meta">' + esc(new Date(e.created_at).toLocaleDateString("en-IN")) + " &middot; " + (e.amount > 0 ? "+" : "") + e.amount + " &middot; " + esc(e.kind) + (e.reason ? " &middot; " + esc(e.reason) : "") + "</p>"; }).join("") + "</details>" : "") + "</div>";
  }

  function pitchesHtml() {
    return '<h3>Your ad pitches</h3><p><button type="button" class="btn btn-gold btn-sm" data-a="new-pitch">New ad pitch</button></p>' + (S.pitches.length ? S.pitches.map(function (p) {
      return '<div class="entry"><p><strong>' + esc(p.venture) + "</strong> &middot; " + esc(p.category) + ' <span class="badge ' + (p.status === "Approved" ? "st-open" : p.status === "Declined" || p.status === "Withdrawn" ? "st-archived" : "st-in-progress") + '">' + esc(p.status) + "</span></p><p>" + esc(p.headline) + "</p>" +
        (p.admin_note ? '<p class="why"><strong>From the Supreme Leader:</strong> ' + esc(p.admin_note) + "</p>" : "") +
        '<div class="mc-actions">' + (p.status !== "Withdrawn" && p.status !== "Declined" ? '<button type="button" class="btn btn-line btn-sm" data-a="edit-pitch" data-id="' + esc(p.id) + '">Edit</button><button type="button" class="btn btn-line btn-sm" data-a="withdraw-pitch" data-id="' + esc(p.id) + '">Withdraw</button>' : "") + "</div></div>"; }).join("")
      : '<p class="file-meta">You haven’t pitched an ad yet.</p>');
  }

  function myEntry(campId) { return S.entries.filter(function (e) { return e.campaign_id === campId && ["Withdrawn", "Declined"].indexOf(e.status) === -1; })[0]; }
  function eff(e, c) { return (e.cash_inr || 0) + (e.credits || 0) * (c.credit_value_inr || 0); }
  function campsHtml() {
    var approvedPitches = S.pitches.filter(function (p) { return p.status === "Approved"; });
    return "<h3>Campaigns</h3>" + (S.camps.length ? S.camps.map(function (c) {
      var pool = S.pool[c.id] || { entries: 0, total_inr: 0 }, mine = myEntry(c.id), open = c.status === "Open for pitches" && (!c.closes_on || new Date(c.closes_on + "T23:59:59") >= new Date());
      var inner = '<div class="entry"><p><strong>' + esc(c.title) + "</strong> &middot; " + esc(c.channel) + (c.venue ? " &middot; " + esc(c.venue) : "") + ' <span class="badge st-in-progress">' + esc(c.status) + "</span></p>" + (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
        '<p class="file-meta">' + (c.area_sqft ? esc(c.area_sqft) + " sq ft &middot; " : "") + (c.cost_inr != null ? "cost " + money(c.cost_inr) + " &middot; " : "") + "1 " + esc(APP.currencyOne) + " = " + money(c.credit_value_inr) + " here &middot; " + pool.entries + " pitch(es) so far" + (c.closes_on ? " &middot; closes " + esc(c.closes_on) : "") + "</p>";
      if (mine) {
        var total = Number(pool.total_inr) || eff(mine, c), share = total ? eff(mine, c) / total * 100 : 0;
        inner += '<p class="why"><strong>You’re in.</strong> ' + esc(mine.status) + " &middot; cash " + money(mine.cash_inr) + " + " + mine.credits + " " + esc(APP.currency) + " &middot; projected share <strong>" + share.toFixed(1) + "%</strong>" + (c.area_sqft ? " (about " + (c.area_sqft * share / 100).toFixed(1) + " sq ft)" : "") + ". A projection, not a promise: shares can change as others join." + (mine.decision_note ? "<br><strong>Note:</strong> " + esc(mine.decision_note) : "") + '</p><div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-a="leave" data-id="' + esc(mine.id) + '">Withdraw from this campaign</button></div>';
      } else if (open) {
        inner += approvedPitches.length ? '<form data-f="join" data-camp="' + esc(c.id) + '" class="shell" style="margin-top:.75rem"><div class="field"><label for="jn-p-' + esc(c.id) + '">Your ad</label><select id="jn-p-' + esc(c.id) + '">' + approvedPitches.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.venture) + ": " + esc(p.headline) + "</option>"; }).join("") + "</select></div>" +
          '<div class="row-2"><div class="field"><label for="jn-c-' + esc(c.id) + '">Cash you can pledge (₹)</label><input type="number" id="jn-c-' + esc(c.id) + '" min="0" value="0" data-prev="' + esc(c.id) + '"></div><div class="field"><label for="jn-k-' + esc(c.id) + '">' + esc(APP.currency) + " to use (you have " + S.wallet.balance + ')</label><input type="number" id="jn-k-' + esc(c.id) + '" min="0" max="' + S.wallet.balance + '" value="0" data-prev="' + esc(c.id) + '"></div></div>' +
          '<p class="file-meta" id="jn-prev-' + esc(c.id) + '"></p><p class="field-error" id="jn-e-' + esc(c.id) + '" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Join this campaign</button><p class="file-meta">A pledge, not a contract. Nothing is charged through this site. If another business in your field joins, we’ll ask you personally.</p></form>'
          : '<p class="file-meta">You need an approved ad pitch to join. Submit one above.</p>';
      }
      return inner + "</div>";
    }).join("") : '<p class="file-meta">No campaigns are open right now. When one is, it will appear here.</p>');
  }

  function pitchForm(p) {
    p = p || { venture: "", category: "Education", headline: "", copy: "", website: "", creative_link: "", channels: [], placement_notes: "", audience: "", region: "", can_pay_inr: 0, open_to_sharing: true, conflict_note: "" };
    var edit = !!p.id;
    return '<div class="shell" style="margin-top:1rem"><h3>' + (edit ? "Edit your ad pitch" : "New ad pitch") + "</h3>" + (edit ? '<p class="file-meta">After you save, your pitch goes back for review.</p>' : "") +
      '<form data-f="pitch" data-id="' + esc(p.id || "") + '"><div class="row-2"><div class="field"><label for="ap-v">Business or product *</label><input type="text" id="ap-v" required maxlength="80" value="' + esc(p.venture) + '"></div>' +
      '<div class="field"><label for="ap-c">Business type *</label><select id="ap-c">' + CATS.map(function (c) { return "<option" + (p.category === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label for="ap-h">Headline *</label><input type="text" id="ap-h" required minlength="5" maxlength="120" value="' + esc(p.headline) + '"></div>' +
      '<div class="field"><label for="ap-t">Ad text</label><span class="hint">Keep it truthful. No guaranteed results, and nothing you couldn’t prove.</span><textarea id="ap-t" maxlength="600" style="min-height:6rem">' + esc(p.copy || "") + "</textarea></div>" +
      '<div class="row-2"><div class="field"><label for="ap-w">Website</label><input type="url" id="ap-w" maxlength="300" placeholder="https://" value="' + esc(p.website || "") + '"></div><div class="field"><label for="ap-l">Link to your design (optional)</label><input type="url" id="ap-l" maxlength="300" placeholder="https://" value="' + esc(p.creative_link || "") + '"></div></div>' +
      '<div class="field"><label for="ap-i">Or upload a picture of your ad (optional)</label><input type="file" id="ap-i" accept="image/jpeg,image/png,image/webp"></div>' +
      '<fieldset class="field"><legend class="label">Where would you like it seen?</legend><div class="checks">' + CHANNELS.map(function (c) { return '<label class="inline-check"><input type="checkbox" name="ap-ch" value="' + esc(c) + '"' + ((p.channels || []).indexOf(c) > -1 ? " checked" : "") + "> " + esc(c) + "</label>"; }).join("") + "</div></fieldset>" +
      '<div class="field"><label for="ap-n">Exact spots you have in mind (optional)</label><span class="hint">For example: gyms in Koramangala, the Blue Line metro, the main road outside the college.</span><input type="text" id="ap-n" maxlength="200" value="' + esc(p.placement_notes || "") + '"></div>' +
      '<div class="row-2"><div class="field"><label for="ap-a">Who is it for?</label><input type="text" id="ap-a" maxlength="200" value="' + esc(p.audience || "") + '"></div><div class="field"><label for="ap-r">City or region</label><input type="text" id="ap-r" maxlength="100" value="' + esc(p.region || "") + '"></div></div>' +
      '<div class="field"><label for="ap-p">What you can pay (₹, put 0 if nothing)</label><input type="number" id="ap-p" min="0" value="' + esc(p.can_pay_inr || 0) + '"></div>' +
      '<div class="check"><input type="checkbox" id="ap-s"' + (p.open_to_sharing ? " checked" : "") + '><label for="ap-s">I’m happy to share a placement with other businesses</label></div>' +
      '<div class="field"><label for="ap-x">Anyone you wouldn’t want next to your ad? (optional)</label><input type="text" id="ap-x" maxlength="300" value="' + esc(p.conflict_note || "") + '"></div>' +
      '<div class="check"><input type="checkbox" id="ap-ok"><label for="ap-ok">My ad is truthful, and I have the right to use everything in it. <span class="req" aria-hidden="true">*</span></label></div>' +
      '<p class="field-error" id="ap-e" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark">' + (edit ? "Save changes" : "Submit pitch") + '</button><button type="button" class="btn btn-line" data-a="cancel-pitch">Cancel</button></div></form></div>';
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el || !S.sb) return;
    var a = el.getAttribute("data-a"), id = el.getAttribute("data-id"), sb = S.sb;
    if (a === "signout") return sb.auth.signOut().then(function () { S.user = null; refresh(); });
    if (a === "new-pitch" || a === "edit-pitch") { var old = $("pitch-box"); if (old) old.remove(); var d = document.createElement("div"); d.id = "pitch-box"; d.innerHTML = pitchForm(a === "edit-pitch" ? S.pitches.filter(function (p) { return p.id === id; })[0] : null); app.insertBefore(d, app.children[2] || null); d.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (a === "cancel-pitch") { var b = $("pitch-box"); if (b) b.remove(); return; }
    if (a === "withdraw-pitch") { if (confirm("Withdraw this ad pitch?")) sb.from("ad_pitches").update({ status: "Withdrawn" }).eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Withdrawn."); refresh(); }); return; }
    if (a === "leave") { if (confirm("Withdraw from this campaign?")) sb.from("ad_entries").update({ status: "Withdrawn" }).eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("You’ve withdrawn from the campaign."); refresh(); }); }
  });
  document.addEventListener("input", function (e) {
    var cid = e.target.getAttribute && e.target.getAttribute("data-prev"); if (!cid) return;
    var c = S.camps.filter(function (x) { return x.id === cid; })[0]; if (!c) return;
    var mineEff = (parseInt($("jn-c-" + cid).value, 10) || 0) + (parseInt($("jn-k-" + cid).value, 10) || 0) * (c.credit_value_inr || 0), total = (Number((S.pool[cid] || {}).total_inr) || 0) + mineEff, share = total ? mineEff / total * 100 : 0;
    $("jn-prev-" + cid).textContent = "Your contribution would count as " + money(mineEff) + ", about " + share.toFixed(1) + "% of the space right now. This changes as others join.";
  });
  document.addEventListener("submit", function (e) {
    var f = e.target.closest("form[data-f]"); if (!f || !S.sb) return; e.preventDefault();
    var kind = f.getAttribute("data-f"), sb = S.sb, uid = S.user && S.user.id;
    if (kind === "signin") { var em = $("ab-email").value.trim(); sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Check your email. We’ve sent a sign-in link to <strong>" + esc(em) + "</strong>."); }); return; }
    if (kind === "join") {
      var cid = f.getAttribute("data-camp"), err = $("jn-e-" + cid); err.textContent = "";
      var cash = parseInt($("jn-c-" + cid).value, 10) || 0, k = parseInt($("jn-k-" + cid).value, 10) || 0;
      if (cash < 0 || k < 0) { err.textContent = "Please use zero or more."; return; }
      Array.prototype.forEach.call(f.querySelectorAll("button"), function (b) { b.disabled = true; });
      sb.from("ad_entries").insert({ campaign_id: cid, pitch_id: $("jn-p-" + cid).value, owner: uid, cash_inr: cash, credits: k }).then(function (r) {
        if (r.error) { Array.prototype.forEach.call(f.querySelectorAll("button"), function (b) { b.disabled = false; }); err.textContent = fr(r.error); return; }
        say("You’re in. The Supreme Leader will be in touch about next steps. This is a pledge, not a contract."); refresh();
      }); return;
    }
    if (kind === "pitch") {
      var errEl = $("ap-e"); errEl.textContent = ""; if (!$("ap-ok").checked) { errEl.textContent = "Please confirm your ad is truthful and yours to use."; return; }
      var web = $("ap-w").value.trim(), lnk = $("ap-l").value.trim(); if ((web && !validUrl(web)) || (lnk && !validUrl(lnk))) { errEl.textContent = "Links must start with https://"; return; }
      var pid = f.getAttribute("data-id"), file = $("ap-i").files[0], oldP = S.pitches.filter(function (p) { return p.id === pid; })[0];
      var row = { venture: $("ap-v").value.trim(), category: $("ap-c").value, headline: $("ap-h").value.trim(), copy: $("ap-t").value.trim() || null, website: web || null, creative_link: lnk || null,
        channels: Array.prototype.map.call(f.querySelectorAll("input[name=ap-ch]:checked"), function (x) { return x.value; }), placement_notes: $("ap-n").value.trim() || null, audience: $("ap-a").value.trim() || null, region: $("ap-r").value.trim() || null,
        can_pay_inr: Math.max(0, parseInt($("ap-p").value, 10) || 0), open_to_sharing: $("ap-s").checked, conflict_note: $("ap-x").value.trim() || null, creative_image: oldP ? oldP.creative_image : null };
      Array.prototype.forEach.call(f.querySelectorAll("button"), function (b) { b.disabled = true; });
      var step = Promise.resolve();
      if (file) { var path = uid + "/" + uuid() + ".jpg"; step = resizeJpeg(file, 1200).then(function (bl) { return sb.storage.from("ads").upload(path, bl, { contentType: "image/jpeg", upsert: false }); }).then(function (r) { if (r.error) throw r.error; row.creative_image = path; }); }
      step.then(function () { return pid ? sb.from("ad_pitches").update(row).eq("id", pid) : sb.from("ad_pitches").insert(Object.assign({ owner: uid }, row)); }).then(function (r) {
        if (r.error) throw r.error; say(pid ? "Saved. Your pitch has gone back for review." : "Pitch submitted. The Supreme Leader will review it."); refresh();
      }).catch(function (er) { Array.prototype.forEach.call(f.querySelectorAll("button"), function (b) { b.disabled = false; }); errEl.textContent = fr(er); });
    }
  });

  /* ---------- start ---------- */
  if (!CFG.url || !CFG.anonKey) { app.innerHTML = '<div class="notice"><p><strong>The Ad Bureau is opening soon.</strong> It isn’t switched on yet.</p></div>'; return; }
  if (!window.supabase || !window.supabase.createClient) { app.innerHTML = '<div class="notice warn"><p>The Ad Bureau couldn’t load (a needed script was blocked). Please reload.</p></div>'; return; }
  S.sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  S.sb.auth.onAuthStateChange(function (ev, session) { var u = session ? session.user : null; if ((u && u.id) !== (S.user && S.user.id) || !S.loaded) { S.user = u; refresh(); } });
  S.sb.auth.getSession().then(function (r) { var u = r.data && r.data.session ? r.data.session.user : null; if (!S.loaded) { S.user = u; refresh(); } });
})();
