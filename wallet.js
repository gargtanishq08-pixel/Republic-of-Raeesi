/* The Royal Wallet: balance, level, the Crown Shop and your history. You should not need to edit this.
   What you can buy and how much it costs is set in admin.html -> Crown Shop, and enforced by the database. */
(function () {
  "use strict";
  var app = document.getElementById("wl-app"); if (!app) return;
  var CFG = window.RAEESI_SUPABASE || {}, APP = window.RAEESI_APP || { currency: "Crowns", currencyOne: "Crown" };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function say(t, bad) { var el = $("wl-status"); el.innerHTML = t ? '<div class="notice' + (bad ? " warn" : "") + '"><p>' + t + "</p></div>" : ""; if (t && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  function fr(err) {
    var m = (err && (err.message || err.msg)) || "";
    if (/enough free/i.test(m)) return "You don’t have enough free " + APP.currency + " for that. (" + APP.currency + " held in an ad campaign can’t be spent twice.)";
    if (/sold out/i.test(m)) return "Sorry, that offer has sold out.";
    if (/18 and over/i.test(m)) return "That offer is for members aged 18 and over.";
    if (/isn.t available/i.test(m)) return "That offer isn’t available any more.";
    if (/sign in/i.test(m)) return "Please sign in as an approved member first.";
    if (/not open yet/i.test(m)) return "The Currency Exchange isn’t open yet.";
    if (/guardian is needed/i.test(m)) return "A verified parent or guardian is needed first. Please add your guardian’s details below.";
    if (/smallest exchange/i.test(m)) return m;
    if (/3 requests waiting/i.test(m)) return "You already have 3 requests waiting. Please wait for them to be confirmed.";
    if (/too small/i.test(m)) return "That amount is too small to exchange.";
    if (/guardian.s name/i.test(m)) return "Please give your guardian’s name and a way to reach them.";
    return "Something went wrong" + (m ? " (" + m + ")" : "") + ". Please try again.";
  }
  function levels() { return ((window.RAEESI_MISSIONS || {}).levels) || [{ name: "Newcomer", min: 0 }, { name: "Apprentice Builder", min: 40 }, { name: "Journeyman Builder", min: 150 }, { name: "Master Builder", min: 350 }]; }
  function levelFor(p) { var lv = levels()[0].name; levels().forEach(function (l) { if (p >= l.min) lv = l.name; }); return lv; }
  var MINOR = ["14–15", "16–17"];
  var S = { sb: null, user: null, member: null, wallet: { balance: 0, earned: 0 }, ledger: [], perks: [], offers: [], purchases: [], settings: null, exchanges: [], certs: [], loaded: false };
  function ok() { return !!(S.member && S.member.approved && !S.member.suspended); }
  function teen() { return !!(S.member && MINOR.indexOf(S.member.age_band) > -1); }

  var busy = false, again = false;
  function refresh() {
    if (busy) { again = true; return; } busy = true;
    load().then(function () { S.loaded = true; render(); }).catch(function () { S.loaded = true; render(); say("We couldn’t load your wallet just now. Please reload.", true); })
      .then(function () { busy = false; if (again) { again = false; refresh(); } });
  }
  function load() {
    var sb = S.sb, uid = S.user && S.user.id; S.member = null; S.ledger = []; S.perks = []; S.offers = []; S.purchases = []; S.exchanges = []; S.certs = []; S.wallet = { balance: 0, earned: 0 };
    if (!uid) return Promise.resolve();
    return sb.from("members").select("*").eq("id", uid).maybeSingle().then(function (r) { S.member = r.data || null; if (!ok()) return null;
      return sb.rpc("my_wallet").then(function (w) { var row = Array.isArray(w.data) ? w.data[0] : w.data; if (row) S.wallet = { balance: row.balance || 0, earned: row.earned || 0 }; })
        .then(function () { return sb.from("credit_entries").select("*").order("created_at", { ascending: false }).limit(100); }).then(function (r2) { S.ledger = (r2 && r2.data) || []; })
        .then(function () { return sb.from("level_perks").select("*"); }).then(function (r3) { S.perks = (r3 && r3.data) || []; })
        .then(function () { return sb.from("crown_offers").select("*").order("sort_order", { ascending: true }); }).then(function (r4) { S.offers = (r4 && r4.data) || []; })
        .then(function () { return sb.from("crown_purchases").select("*").order("created_at", { ascending: false }); }).then(function (r5) { S.purchases = (r5 && r5.data) || []; })
        .then(function () { return sb.from("app_settings").select("*").eq("id", 1).maybeSingle(); }).then(function (r6) { S.settings = (r6 && r6.data) || null; })
        .then(function () { return sb.from("crown_exchange").select("*").order("created_at", { ascending: false }); }).then(function (r7) { S.exchanges = (r7 && r7.data) || []; })
        .then(function () { return sb.from("certificates").select("*").order("issued_at", { ascending: false }); }).then(function (r8) { S.certs = (r8 && r8.data) || []; });
    });
  }

  function render() {
    var h = "";
    if (!S.user) h = '<form data-f="signin" class="authbar"><label for="wl-email">Sign in with your email</label><div class="inline"><input type="email" id="wl-email" required autocomplete="email" placeholder="you@example.com"><button type="submit" class="btn btn-dark btn-sm">Email me a sign-in link</button></div><p class="hint">Use the email you joined the Builders’ Network with. No password needed.</p></form>';
    else {
      h = '<div class="authbar signed"><span class="who">Signed in as <strong>' + esc(S.user.email || "") + '</strong></span> <button type="button" class="linkish" data-a="signout">Sign out</button></div>';
      if (!S.member) h += '<div class="notice"><p>You haven’t joined the Builders’ Network yet. <a href="network.html">Create your profile</a> first, then your wallet opens.</p></div>';
      else if (!ok()) h += '<div class="notice"><p>Your wallet opens once the Supreme Leader has approved your membership.</p></div>';
      else h += summary() + exchange() + shop() + purchases() + certs() + history();
    }
    app.innerHTML = h;
  }

  function summary() {
    var lv = levelFor(S.wallet.earned), perk = S.perks.filter(function (p) { return p.level === lv; })[0] || { perks: [], ad_discount_pct: 0 };
    var ls = levels(), next = ls.filter(function (l) { return l.min > S.wallet.earned; })[0], cur = ls.filter(function (l) { return l.name === lv; })[0] || ls[0];
    var pct = next ? Math.max(0, Math.min(100, Math.round((S.wallet.earned - cur.min) / (next.min - cur.min) * 100))) : 100;
    return '<div class="panel wallet-card"><p class="wallet-bal"><span class="crown" aria-hidden="true">&#9819;</span> <strong>' + S.wallet.balance + "</strong> " + esc(APP.currency) + ' to spend</p>' +
      "<p>Earned in total: <strong>" + S.wallet.earned + "</strong> &middot; Level: <strong>" + esc(lv) + "</strong></p>" +
      '<div class="meter" role="img" aria-label="' + pct + ' percent of the way to the next level"><span style="width:' + pct + '%"></span></div>' +
      (next ? '<p class="file-meta">' + (next.min - S.wallet.earned) + " more earned " + esc(APP.currency) + " to reach " + esc(next.name) + ".</p>" : '<p class="file-meta">You’ve reached the highest level.</p>') +
      ((perk.perks || []).length || perk.ad_discount_pct ? "<p><strong>Your level’s perks:</strong> " + esc((perk.perks || []).join("; ")) + (perk.ad_discount_pct ? ((perk.perks || []).length ? "; " : "") + perk.ad_discount_pct + "% off ad contributions" : "") + "</p>" : "") + "</div>";
  }


  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  function guardianBox() {
    var m = S.member || {};
    if (m.guardian_name && !m.guardian_verified) return '<div class="notice"><p>Thank you. The Supreme Leader is contacting your parent or guardian (<strong>' + esc(m.guardian_name) + "</strong>) to confirm. This area opens once that’s done.</p></div>";
    return '<form data-f="guardian" class="shell"><p><strong>Under 18?</strong> Money matters need a parent or guardian, who is the one who agrees and pays. Give their details and the Supreme Leader will contact them to confirm. Their details stay private and are never shown to other members.</p>' +
      '<div class="row-2"><div class="field"><label for="gd-name">Guardian’s name *</label><input type="text" id="gd-name" required maxlength="80"></div><div class="field"><label for="gd-contact">Their phone or email *</label><input type="text" id="gd-contact" required maxlength="120"></div></div>' +
      '<p class="field-error" id="gd-err" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Send for verification</button></form>';
  }
  function exchange() {
    var s = S.settings || {}, rate = s.crown_rate_inr || 5;
    var h = "<h3>Currency Exchange</h3><p class=\"file-meta\">No Crowns yet, or want more? Exchange rupees for " + esc(APP.currency) + " so everyone gets a chance to join in. <strong>₹" + (rate * 100) + " = 100 " + esc(APP.currency) + "</strong> (₹" + rate + " per " + esc(APP.currencyOne) + "). Crowns you exchange are for spending only: they never raise your level.</p>";
    if (!s.exchange_enabled) return h + '<div class="notice"><p>The Currency Exchange isn’t open yet. It will open soon.</p></div>';
    if (teen() && !(S.member && S.member.guardian_verified)) return h + guardianBox();
    var min = s.exchange_min_inr || 100;
    h += (s.exchange_instructions ? '<div class="panel"><p><strong>How to pay</strong></p><p>' + nl(s.exchange_instructions) + "</p></div>" : "") +
      '<form data-f="exchange" class="shell"><div class="row-2"><div class="field"><label for="ex-amt">Amount in rupees (at least ₹' + min + ')</label><input type="number" id="ex-amt" min="' + min + '" step="1" value="' + Math.max(min, rate * 100) + '" required></div>' +
      '<div class="field"><label for="ex-ref">Payment reference (after you pay)</label><input type="text" id="ex-ref" maxlength="80" placeholder="e.g. the transaction ID"></div></div>' +
      '<p class="file-meta" id="ex-prev"></p><p class="field-error" id="ex-err" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Request ' + esc(APP.currency) + '</button>' +
      '<p class="file-meta">Your ' + esc(APP.currency) + ' are added once the Supreme Leader confirms the payment arrived. ' + (teen() ? "Your parent or guardian is the one who pays. " : "") + "Nothing is charged through this website.</p></form>";
    if (S.exchanges.length) h += "<h4>Your exchange requests</h4>" + S.exchanges.map(function (x) { return '<p class="file-meta">₹' + x.amount_inr + " &rarr; " + x.crowns + " " + esc(APP.currency) + ' <span class="badge ' + (x.status === "Confirmed" ? "st-open" : x.status === "Rejected" ? "st-archived" : "st-in-progress") + '">' + esc(x.status) + "</span> &middot; " + esc(new Date(x.created_at).toLocaleDateString("en-IN")) + (x.admin_note ? " &middot; " + esc(x.admin_note) : "") + "</p>"; }).join("");
    return h;
  }
  function certs() {
    if (!S.certs.length) return "";
    return "<h3>Your certificates</h3>" + S.certs.map(function (c) { return '<div class="entry"><p><strong>' + esc(c.title) + "</strong> &middot; " + esc(c.issued_at) + ' &middot; <span class="file-meta">' + esc(c.number) + '</span> <a class="btn btn-line btn-sm" href="certificate.html?id=' + esc(c.id) + '">View and print</a></p>' + (c.reason ? "<p>" + esc(c.reason) + "</p>" : "") + "</div>"; }).join("");
  }

  function shop() {
    var cards = S.offers.filter(function (o) { return o.active; }).map(function (o) {
      var sold = o.stock != null && o.stock < 1, blockedAge = o.adults_only && teen(), poor = o.cost > S.wallet.balance;
      return '<article class="show-card"><p class="mc-num">' + esc(o.kind) + (o.adults_only ? " &middot; 18+" : "") + "</p><h3>" + esc(o.name) + "</h3>" + (o.description ? "<p>" + esc(o.description) + "</p>" : "") +
        '<p><strong>' + o.cost + "</strong> " + esc(APP.currency) + (o.stock != null ? ' <span class="file-meta">&middot; ' + (sold ? "sold out" : o.stock + " left") + "</span>" : "") + "</p>" +
        '<div class="mc-actions"><button type="button" class="btn btn-gold btn-sm" data-a="buy" data-id="' + esc(o.id) + '"' + (sold || blockedAge ? " disabled" : "") + ">" + (sold ? "Sold out" : blockedAge ? "For members 18+" : poor ? "Not enough " + esc(APP.currency) : "Get this") + "</button></div></article>";
    });
    return '<h3>The Crown Shop</h3><p class="file-meta">Offers from the Supreme Leader. Spending is final unless the Supreme Leader refunds you. To spend Crowns on ads, see the <a href="adbureau.html">Ad Bureau</a>.</p>' +
      (cards.length ? '<div class="show-grid">' + cards.join("") + "</div>" : '<p class="file-meta">The shop is empty right now. Offers will appear here.</p>');
  }
  function purchases() {
    if (!S.purchases.length) return "";
    return "<h3>Your purchases</h3>" + S.purchases.map(function (p) {
      return '<div class="entry"><p><strong>' + esc(p.offer_name) + "</strong> &middot; " + p.cost + " " + esc(APP.currency) + ' <span class="badge ' + (p.status === "Fulfilled" ? "st-open" : p.status === "Refunded" ? "st-archived" : "st-in-progress") + '">' + esc(p.status) + "</span> &middot; " + esc(new Date(p.created_at).toLocaleDateString("en-IN")) + "</p>" +
        (p.note ? '<p class="why">' + esc(p.note) + "</p>" : "") + "</div>"; }).join("");
  }
  function history() {
    return "<h3>History</h3>" + (S.ledger.length ? '<div class="ledger-list">' + S.ledger.map(function (e) {
      return '<p class="file-meta"><span class="' + (e.amount > 0 ? "plus" : "minus") + '">' + (e.amount > 0 ? "+" : "") + e.amount + "</span> &middot; " + esc(e.kind) + (e.reason ? " &middot; " + esc(e.reason) : "") + " &middot; " + esc(new Date(e.created_at).toLocaleDateString("en-IN")) + "</p>"; }).join("") + "</div>"
      : '<p class="file-meta">Nothing yet. Your first ' + esc(APP.currencyOne) + " will show up here.</p>");
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el || !S.sb) return;
    var a = el.getAttribute("data-a"), id = el.getAttribute("data-id");
    if (a === "signout") return S.sb.auth.signOut().then(function () { S.user = null; refresh(); });
    if (a === "buy") {
      var o = S.offers.filter(function (x) { return x.id === id; })[0]; if (!o) return;
      if (!confirm("Spend " + o.cost + " " + APP.currency + " on “" + o.name + "”? This can’t be undone unless the Supreme Leader refunds you.")) return;
      el.disabled = true;
      S.sb.rpc("buy_offer", { p_offer: id }).then(function (r) { if (r.error) { say(esc(fr(r.error)), true); refresh(); return; } say(esc(r.data || "Done.")); refresh(); });
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id !== "ex-amt") return; var rate = (S.settings || {}).crown_rate_inr || 5, v = parseInt(e.target.value, 10) || 0;
    $("ex-prev").textContent = v >= 1 ? "₹" + v + " becomes " + Math.floor(v / rate) + " " + APP.currency + "." : "";
  });
  document.addEventListener("submit", function (e) {
    var g = e.target.closest("form[data-f=guardian]");
    if (g && S.sb) { e.preventDefault(); S.sb.rpc("submit_guardian", { p_name: $("gd-name").value, p_contact: $("gd-contact").value }).then(function (r) { if (r.error) { $("gd-err").textContent = fr(r.error); return; } say(esc(r.data || "Thank you.")); refresh(); }); return; }
    var x = e.target.closest("form[data-f=exchange]");
    if (x && S.sb) { e.preventDefault(); $("ex-err").textContent = ""; var amt = parseInt($("ex-amt").value, 10) || 0;
      Array.prototype.forEach.call(x.querySelectorAll("button"), function (b) { b.disabled = true; });
      S.sb.rpc("request_exchange", { p_amount_inr: amt, p_reference: $("ex-ref").value }).then(function (r) { if (r.error) { Array.prototype.forEach.call(x.querySelectorAll("button"), function (b) { b.disabled = false; }); $("ex-err").textContent = fr(r.error); return; } say(esc(r.data || "Request sent.")); refresh(); }); return; }
    var f = e.target.closest("form[data-f=signin]"); if (!f || !S.sb) return; e.preventDefault();
    var em = $("wl-email").value.trim();
    S.sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Check your email. We’ve sent a sign-in link to <strong>" + esc(em) + "</strong>."); });
  });

  if (!CFG.url || !CFG.anonKey) { app.innerHTML = '<div class="notice"><p><strong>The Royal Wallet is opening soon.</strong></p></div>'; return; }
  if (!window.supabase || !window.supabase.createClient) { app.innerHTML = '<div class="notice warn"><p>The wallet couldn’t load (a needed script was blocked). Please reload.</p></div>'; return; }
  S.sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  S.sb.auth.onAuthStateChange(function (ev, session) { var u = session ? session.user : null; if ((u && u.id) !== (S.user && S.user.id) || !S.loaded) { S.user = u; refresh(); } });
  S.sb.auth.getSession().then(function (r) { var u = r.data && r.data.session ? r.data.session.user : null; if (!S.loaded) { S.user = u; refresh(); } });
})();
