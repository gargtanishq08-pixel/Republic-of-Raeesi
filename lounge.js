/* The Royal Lounge. You should not need to edit this.
   Who can see what is enforced by the database: members under 18 and adults are kept in separate circles. */
(function () {
  "use strict";
  var app = document.getElementById("lg-app"); if (!app) return;
  var CFG = window.RAEESI_SUPABASE || {}, APP = window.RAEESI_APP || { currency: "Crowns", currencyOne: "Crown" };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function validUrl(u) { try { return new URL(u).protocol === "https:"; } catch (e) { return false; } }
  function say(t, bad) { var el = $("lg-status"); el.innerHTML = t ? '<div class="notice' + (bad ? " warn" : "") + '"><p>' + t + "</p></div>" : ""; if (t && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
  function ago(iso) { var s = Math.max(0, (Date.now() - new Date(iso)) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min ago" : s < 86400 ? Math.floor(s / 3600) + " h ago" : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  function fr(err) {
    var m = (err && (err.message || err.msg)) || "";
    if (/teens can.t share/i.test(m)) return "For your safety, teens can’t share links, emails or phone numbers here.";
    if (/Slow down/i.test(m)) return "Slow down a little: you can send up to 60 messages an hour.";
    if (/is full/i.test(m)) return "This gathering is full.";
    if (/other circle/i.test(m)) return "That gathering is for the other circle.";
    if (/already started/i.test(m)) return "That gathering has already started.";
    if (/choose a date/i.test(m)) return "Please choose a date in the next year.";
    if (/Choose who/i.test(m)) return "Choose who you’re thanking.";
    if (/can.t join that challenge/i.test(m)) return "You can’t join that challenge.";
    if (/3 challenges a day/i.test(m)) return "You can start up to 3 challenges a day.";
    if (/isn.t taking ideas/i.test(m)) return "This round isn’t taking ideas right now.";
    if (/up to 3 ideas/i.test(m)) return "You can put up to 3 ideas into a round.";
    if (/Voting isn.t open/i.test(m)) return "Voting isn’t open for this round.";
    if (/used all your votes/i.test(m)) return "You’ve used all your votes for this round.";
    if (/your own idea/i.test(m)) return "You can’t vote for your own idea.";
    if (/other circle/i.test(m)) return "That one is in the other circle.";
    if (/game isn.t available/i.test(m)) return "That game isn’t available any more.";
    if (/choose one of the options/i.test(m)) return "Please choose one of the options.";
    if (/write an answer/i.test(m)) return "Please write an answer.";
    if (/can.t comment/i.test(m)) return "You can’t comment on that.";
    if (/yourself/i.test(m)) return "You can’t thank yourself (nice try).";
    if (/own circle/i.test(m)) return "You can only thank members of your own circle.";
    if (/row-level security/i.test(m)) return "That isn’t allowed right now. Your membership may still be waiting for approval.";
    if (/check constraint/i.test(m)) return "One of your answers is too short, too long, or not in the right format.";
    return "Something went wrong" + (m ? " (" + m + ")" : "") + ". Please try again.";
  }
  function unsafeTeen(t) { return /https?:\/\/|www\./i.test(t) || /[0-9][0-9 .-]{8,}[0-9]/.test(t) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t); }
  function levels() { return ((window.RAEESI_MISSIONS || {}).levels) || [{ name: "Newcomer", min: 0 }, { name: "Apprentice Builder", min: 40 }, { name: "Journeyman Builder", min: 150 }, { name: "Master Builder", min: 350 }]; }
  function levelFor(p) { var lv = levels()[0].name; levels().forEach(function (l) { if (p >= l.min) lv = l.name; }); return lv; }

  var MINOR = ["14–15", "16–17"];
  var KINDS = ["Founder meetup", "Gym session", "Party / dinner", "Workshop", "Networking event", "Online session", "Other"];
  var TABS = [["dashboard", "Dashboard"], ["rooms", "Rooms"], ["gatherings", "Gatherings"], ["games", "Games"], ["challenges", "Challenges"], ["seed", "Seed Month"], ["recognition", "Recognition Wall"], ["passport", "Passport"], ["notifications", "Alerts"]];
  var S = { sb: null, user: null, member: null, profile: null, loaded: false, tab: "dashboard", room: null, rooms: [], messages: [], notifs: [], stamps: [], stampTypes: [], wallet: { balance: 0, earned: 0 },
    events: [], rsvps: {}, details: {}, attendees: {}, roster: {}, recs: [], directory: [], missions: [], open: {},
    prompts: [], myResp: {}, results: {}, answers: {}, gameKind: "all", challenges: [], cmembers: {}, rounds: [], round: null, ideas: [], myVotes: {}, tally: [], comments: {}, ideaOpen: {} };
  function ok() { return !!(S.member && S.member.approved && !S.member.suspended && S.profile); }
  function teen() { return !!(S.member && MINOR.indexOf(S.member.age_band) > -1); }
  function unread() { return S.notifs.filter(function (n) { return !n.read; }).length; }
  var poll = null;

  /* ---------- routing ---------- */
  function parseHash() { var h = (location.hash || "").replace(/^#/, ""), p = h.split(":"); var t = TABS.some(function (x) { return x[0] === p[0]; }) ? p[0] : "dashboard"; return { tab: t, room: p[1] || null }; }
  function go(tab, room) { location.hash = tab + (room ? ":" + room : ""); }
  window.addEventListener("hashchange", function () { var h = parseHash(); S.tab = h.tab; if (h.room) S.room = h.room; loadTab(); });

  /* ---------- loading ---------- */
  function loadBase() {
    var sb = S.sb, uid = S.user && S.user.id; S.member = null; S.profile = null;
    if (!uid) return Promise.resolve();
    return sb.from("members").select("*").eq("id", uid).maybeSingle().then(function (r) { S.member = r.data || null; return sb.from("profiles").select("*").eq("id", uid).maybeSingle(); })
      .then(function (r) { S.profile = r.data || null; if (!ok()) return null;
        return Promise.all([sb.from("rooms").select("*").order("sort", { ascending: true }), sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)]).then(function (rs) {
          S.rooms = (rs[0].data || []).filter(function (x) { return !x.archived; }); S.notifs = rs[1].data || [];
          if (!S.room && S.rooms.length) S.room = S.rooms[0].slug;
        });
      });
  }
  var loading = false, again = false;
  function refresh() { if (loading) { again = true; return; } loading = true; var h = parseHash(); S.tab = h.tab; if (h.room) S.room = h.room;
    loadBase().then(function () { S.loaded = true; return loadTab(); }).catch(function () { S.loaded = true; render(); say("We couldn’t load the Lounge just now. Please reload.", true); }).then(function () { loading = false; if (again) { again = false; refresh(); } }); }

  function loadTab() {
    var sb = S.sb, uid = S.user && S.user.id; stopPoll();
    if (!ok()) { render(); return Promise.resolve(); }
    var p = Promise.resolve();
    if (S.tab === "dashboard") {
      p = Promise.all([loadEvents(), sb.rpc("my_wallet"), sb.from("stamps").select("*"), sb.from("missions").select("id,number,title,status,deadline").eq("status", "Open"), sb.from("recognitions").select("*").order("created_at", { ascending: false }).limit(3)]).then(function (rs) {
        var w = Array.isArray(rs[1].data) ? rs[1].data[0] : rs[1].data; if (w) S.wallet = { balance: w.balance || 0, earned: w.earned || 0 };
        S.stamps = rs[2].data || []; S.missions = (rs[3].data || []).slice(0, 3); S.recs = rs[4].data || []; });
    } else if (S.tab === "rooms") { p = loadMessages().then(function () { startPoll(); }); }
    else if (S.tab === "gatherings") { p = loadEvents(); }
    else if (S.tab === "games") { p = loadGames(); }
    else if (S.tab === "challenges") { p = loadChallenges(); }
    else if (S.tab === "seed") { p = loadSeed(); }
    else if (S.tab === "recognition") { p = Promise.all([sb.from("recognitions").select("*").order("created_at", { ascending: false }).limit(60), sb.rpc("group_directory")]).then(function (rs) { S.recs = rs[0].data || []; S.directory = rs[1].data || []; }); }
    else if (S.tab === "passport") { p = Promise.all([sb.from("stamp_types").select("*").order("sort", { ascending: true }), sb.from("stamps").select("*")]).then(function (rs) { S.stampTypes = rs[0].data || []; S.stamps = rs[1].data || []; }); }
    else if (S.tab === "notifications") { p = sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50).then(function (r) { S.notifs = r.data || []; }); }
    return p.then(function () { render(); }).catch(function () { render(); say("We couldn’t load that just now. Please try again.", true); });
  }

  /* ---------- loaders for Games, Challenges and Seed Month ---------- */
  function loadGames() {
    var sb = S.sb, uid = S.user.id;
    return Promise.all([sb.from("game_prompts").select("*").order("sort_order", { ascending: true }), sb.from("game_responses").select("*").eq("member", uid)]).then(function (rs) {
      S.prompts = rs[0].data || []; S.myResp = {}; (rs[1].data || []).forEach(function (r) { S.myResp[r.prompt_id] = r; });
      return Promise.all(S.prompts.filter(function (p) { return S.myResp[p.id]; }).map(function (p) {
        if (p.kind === "icebreaker") return sb.from("game_responses").select("*").eq("prompt_id", p.id).order("created_at", { ascending: false }).limit(20).then(function (r) { S.answers[p.id] = (r.data || []).filter(function (x) { return x.answer; }); });
        return sb.rpc("game_results", { p_prompt: p.id }).then(function (r) { var m = {}; (r.data || []).forEach(function (x) { m[x.choice] = x.votes; }); S.results[p.id] = m; });
      }));
    });
  }
  function loadChallenges() {
    var sb = S.sb;
    return Promise.all([sb.from("challenges").select("*").order("created_at", { ascending: false }).limit(50), sb.from("challenge_members").select("*")]).then(function (rs) {
      S.challenges = (rs[0].data || []).filter(function (c) { return c.status !== "Removed"; }); S.cmembers = {};
      (rs[1].data || []).forEach(function (m) { (S.cmembers[m.challenge_id] = S.cmembers[m.challenge_id] || []).push(m); });
    });
  }
  function loadSeed() {
    var sb = S.sb, uid = S.user.id;
    return sb.from("seed_rounds").select("*").order("created_at", { ascending: false }).then(function (r) {
      S.rounds = r.data || []; if (!S.round || !S.rounds.some(function (x) { return x.id === S.round; })) S.round = S.rounds.length ? S.rounds[0].id : null;
      if (!S.round) { S.ideas = []; S.myVotes = {}; S.tally = []; return null; }
      var rd = S.rounds.filter(function (x) { return x.id === S.round; })[0];
      return Promise.all([sb.from("seed_ideas").select("*").eq("round_id", S.round).order("created_at", { ascending: false }), sb.from("seed_votes").select("*").eq("round_id", S.round), rd.status === "Closed" ? sb.rpc("seed_results", { p_round: S.round }) : Promise.resolve({ data: [] })]).then(function (rs) {
        S.ideas = rs[0].data || []; S.myVotes = {}; (rs[1].data || []).forEach(function (v) { S.myVotes[v.idea_id] = true; }); S.tally = rs[2].data || [];
      });
    });
  }

  function loadMessages() {
    if (!S.room) { S.messages = []; return Promise.resolve(); }
    return S.sb.from("messages").select("*").eq("room", S.room).order("created_at", { ascending: false }).limit(80).then(function (r) { S.messages = ((r && r.data) || []).slice().reverse(); });
  }
  function loadEvents() {
    var sb = S.sb;
    return Promise.all([sb.from("events").select("*").order("starts_at", { ascending: true }), sb.from("event_rsvps").select("*").eq("member", S.user.id)]).then(function (rs) {
      S.events = (rs[0].data || []).filter(function (e) { return e.status !== "Cancelled" || e.creator === S.user.id; });
      S.rsvps = {}; (rs[1].data || []).forEach(function (r) { S.rsvps[r.event_id] = r; });
    });
  }
  function startPoll() { poll = setInterval(function () { if (document.hidden || S.tab !== "rooms") return; var box = $("lg-msgs"), near = box && box.scrollHeight - box.scrollTop - box.clientHeight < 80, n = S.messages.length;
    loadMessages().then(function () { if (S.messages.length !== n) { drawMessages(); if (near) { var b = $("lg-msgs"); if (b) b.scrollTop = b.scrollHeight; } } }); }, 6000); }
  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }

  /* ---------- rendering ---------- */
  function render() {
    var h = "";
    if (!S.user) h = '<form data-f="signin" class="authbar"><label for="lg-email">Sign in with your email</label><div class="inline"><input type="email" id="lg-email" required autocomplete="email" placeholder="you@example.com"><button type="submit" class="btn btn-dark btn-sm">Email me a sign-in link</button></div><p class="hint">Use the email you joined the Builders’ Network with. No password needed.</p></form>';
    else {
      h = '<div class="authbar signed"><span class="who">Signed in as <strong>' + esc(S.user.email || "") + '</strong></span> <button type="button" class="linkish" data-a="signout">Sign out</button></div>';
      if (!S.member || !S.profile) h += '<div class="notice"><p>The Lounge is for members of the Builders’ Network. <a href="network.html">Create your profile</a> first, then come back.</p></div>';
      else if (!S.member.approved) h += '<div class="notice"><p>The Lounge opens once the Supreme Leader has approved your membership. It won’t be long.</p></div>';
      else if (S.member.suspended) h += '<div class="notice warn"><p>Your access is paused. Please contact the Supreme Leader.</p></div>';
      else h += circleNote() + tabsBar() + '<div id="lg-panel" role="tabpanel">' + panel() + "</div>";
    }
    app.innerHTML = h;
    if (S.tab === "rooms" && ok()) { var b = $("lg-msgs"); if (b) b.scrollTop = b.scrollHeight; }
  }
  function circleNote() { return '<p class="file-meta circle-note">You’re in the <strong>' + (teen() ? "under-18" : "adult") + " circle</strong>. Rooms, gatherings and the wall are kept separate for members under 18 and adults, to keep everyone safe." + (teen() ? " In the Lounge, teens can’t share links, emails or phone numbers." : "") + "</p>"; }
  function tabsBar() {
    return '<div class="tabs lg-tabs" role="tablist" aria-label="The Lounge">' + TABS.map(function (t) {
      var n = t[0] === "notifications" ? unread() : 0;
      return '<button type="button" role="tab" class="tab" data-a="tab" data-id="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + (n ? ' <span class="count" aria-label="' + n + ' unread">' + n + "</span>" : "") + "</button>"; }).join("") + "</div>";
  }
  function panel() { return ({ dashboard: dashHtml, rooms: roomsHtml, gatherings: gatherHtml, games: gamesHtml, challenges: challengesHtml, seed: seedHtml, recognition: recHtml, passport: passHtml, notifications: notifHtml }[S.tab] || dashHtml)(); }

  function dashHtml() {
    var name = (S.profile && S.profile.display_name) || "builder", lv = levelFor(S.wallet.earned), now = Date.now();
    var mine = S.events.filter(function (e) { return e.status === "Listed" && new Date(e.starts_at) > now && (S.rsvps[e.id] && S.rsvps[e.id].status === "Going"); }).slice(0, 3);
    var soon = S.events.filter(function (e) { return e.status === "Listed" && new Date(e.starts_at) > now; }).slice(0, 3);
    var list = mine.length ? mine : soon;
    return "<h3>Welcome, " + esc(name) + ".</h3>" +
      '<div class="stat-row"><a class="stat" href="wallet.html"><strong>' + S.wallet.balance + "</strong><span>" + esc(APP.currency) + "</span></a><a class=\"stat\" href=\"wallet.html\"><strong>" + esc(lv) + "</strong><span>level</span></a><button type=\"button\" class=\"stat\" data-a=\"tab\" data-id=\"passport\"><strong>" + S.stamps.length + "</strong><span>stamps</span></button><button type=\"button\" class=\"stat\" data-a=\"tab\" data-id=\"notifications\"><strong>" + unread() + "</strong><span>unread alerts</span></button></div>" +
      "<h3>" + (mine.length ? "Your upcoming gatherings" : "Coming up") + "</h3>" + (list.length ? list.map(function (e) { return '<p><strong>' + esc(e.title) + "</strong> &middot; " + esc(when(e.starts_at)) + (e.is_online ? " &middot; online" : e.city ? " &middot; " + esc(e.city) : "") + "</p>"; }).join("") : '<p class="file-meta">Nothing planned yet. Why not <button type="button" class="linkish" data-a="tab" data-id="gatherings">host a gathering</button>?</p>') +
      "<h3>Open Royal Missions</h3>" + (S.missions.length ? S.missions.map(function (m) { return '<p><a href="missions.html">Mission ' + esc(m.number) + ": " + esc(m.title) + "</a>" + (m.deadline ? ' <span class="file-meta">closes ' + esc(m.deadline) + "</span>" : "") + "</p>"; }).join("") : '<p class="file-meta">No missions are open right now.</p>') +
      "<h3>Latest from the Recognition Wall</h3>" + (S.recs.length ? S.recs.map(function (r) { return '<p><strong>' + esc(r.author_name) + "</strong>" + (r.to_name ? " to <strong>" + esc(r.to_name) + "</strong>" : "") + ": " + esc(r.body) + "</p>"; }).join("") : '<p class="file-meta">Nothing yet. Thank someone!</p>') +
      '<div class="mc-actions"><button type="button" class="btn btn-gold btn-sm" data-a="tab" data-id="rooms">Say hello in a room</button><a class="btn btn-line btn-sm" href="network.html">Find collaborators</a></div>';
  }

  /* ----- rooms ----- */
  function roomsHtml() {
    var cur = S.rooms.filter(function (r) { return r.slug === S.room; })[0];
    return '<div class="filters" role="group" aria-label="Rooms">' + S.rooms.map(function (r) { return '<button type="button" class="chip" data-a="room" data-id="' + esc(r.slug) + '" aria-pressed="' + (r.slug === S.room) + '"># ' + esc(r.name) + "</button>"; }).join("") + "</div>" +
      (cur ? '<p class="file-meta">' + esc(cur.description || "") + "</p>" : "") +
      '<div class="msgs" id="lg-msgs" tabindex="0" aria-label="Messages">' + msgsInner() + "</div>" +
      '<form data-f="msg" class="msg-form"><label class="sr-only" for="lg-body">Your message</label><textarea id="lg-body" maxlength="1000" rows="2" placeholder="Say something. Use the Mention box to tag someone."></textarea>' +
      '<div class="msg-tools"><label class="sr-only" for="lg-mention">Mention someone</label><select id="lg-mention"><option value="">Mention…</option>' + mentionOptions() + '</select><button type="submit" class="btn btn-dark btn-sm">Send</button></div>' +
      '<p class="field-error" id="lg-err" role="alert"></p></form><p class="file-meta">Be kind. Reports go to the Supreme Leader.' + (teen() ? " Teens can’t share links, emails or phone numbers." : "") + "</p>";
  }
  function mentionOptions() { var seen = {}, out = ""; S.messages.forEach(function (m) { if (m.author !== S.user.id && m.author_name && !seen[m.author_name]) { seen[m.author_name] = 1; out += "<option>" + esc(m.author_name) + "</option>"; } }); return out; }
  function msgsInner() {
    if (!S.messages.length) return '<p class="file-meta">No messages yet. Be the first to speak.</p>';
    return S.messages.map(function (m) {
      var body = esc(m.body).replace(/@\[([^\]]{2,50})\]/g, '<span class="mention">@$1</span>').replace(/\n/g, "<br>"), mine = m.author === S.user.id;
      return '<div class="msg' + (m.hidden ? " hidden-msg" : "") + '"><p class="msg-head"><strong>' + esc(m.author_name || "Member") + '</strong> <span class="file-meta">' + esc(ago(m.created_at)) + "</span></p><p class=\"msg-body\">" + (m.hidden ? "<em>Hidden by the moderators.</em>" : body) + "</p>" +
        '<p class="msg-act">' + (mine ? '<button type="button" class="linkish" data-a="del-msg" data-id="' + esc(m.id) + '">Delete</button>' : '<button type="button" class="linkish" data-a="report" data-type="message" data-id="' + esc(m.id) + '">Report</button> <button type="button" class="linkish" data-a="block" data-id="' + esc(m.author) + '">Block</button>') + "</p></div>"; }).join("");
  }
  function drawMessages() { var b = $("lg-msgs"); if (b) { b.innerHTML = msgsInner(); } var sel = $("lg-mention"); if (sel) { var cur = sel.value; sel.innerHTML = '<option value="">Mention…</option>' + mentionOptions(); sel.value = cur; } }

  /* ----- gatherings ----- */
  function gatherHtml() {
    var now = Date.now(), mine = S.events.filter(function (e) { return e.creator === S.user.id; }), upcoming = S.events.filter(function (e) { return e.status === "Listed" && new Date(e.starts_at) > now && e.creator !== S.user.id; });
    return '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-gold btn-sm" data-a="new-event">Host a gathering</button></div>' +
      '<div id="ev-form"></div><h3>Coming up</h3>' + (upcoming.length ? upcoming.map(eventCard).join("") : '<p class="file-meta">No gatherings are planned in your circle yet. Host one!</p>') +
      "<h3>Your gatherings</h3>" + (mine.length ? mine.map(eventCard).join("") : '<p class="file-meta">You haven’t hosted any yet.</p>');
  }
  function eventCard(e) {
    var r = S.rsvps[e.id], host = e.creator === S.user.id, d = S.details[e.id], full = null, open = S.open[e.id];
    var h = '<article class="show-card"><p class="mc-num">' + esc(e.kind) + " &middot; hosted by " + esc(host ? "you" : e.creator_name || "a member") + (e.status !== "Listed" ? ' &middot; <span class="badge st-under-review">' + esc(e.status === "Pending" ? "Waiting for review" : e.status) + "</span>" : "") + "</p>" +
      "<h3>" + esc(e.title) + "</h3><p><strong>" + esc(when(e.starts_at)) + "</strong>" + (e.is_online ? " &middot; online" : e.city ? " &middot; " + esc(e.city) : "") + (e.capacity ? " &middot; up to " + e.capacity + " people" : "") + "</p>" + (e.description ? "<p>" + esc(e.description) + "</p>" : "");
    if (e.status === "Listed" && !host) h += '<div class="mc-actions">' + (r && r.status === "Going" ? '<button type="button" class="btn btn-dark btn-sm" disabled>You’re going</button>' : '<button type="button" class="btn btn-gold btn-sm" data-a="rsvp" data-id="' + esc(e.id) + '" data-do="Going">I’m going</button>') +
      (r && r.status === "Maybe" ? '<button type="button" class="btn btn-dark btn-sm" disabled>Maybe</button>' : '<button type="button" class="btn btn-line btn-sm" data-a="rsvp" data-id="' + esc(e.id) + '" data-do="Maybe">Maybe</button>') + (r ? '<button type="button" class="btn btn-line btn-sm" data-a="unrsvp" data-id="' + esc(e.id) + '">Can’t make it</button>' : "") + '<button type="button" class="btn btn-line btn-sm" data-a="report" data-type="event" data-id="' + esc(e.id) + '">Report</button></div>';
    if (e.status === "Listed" && (host || (r && r.status === "Going"))) h += '<div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-a="event-details" data-id="' + esc(e.id) + '">' + (open ? "Hide details" : "Where and who") + "</button></div>";
    if (open && (host || (r && r.status === "Going"))) {
      h += '<div class="panel">' + (d ? (d.location_text ? "<p><strong>Where:</strong> " + esc(d.location_text) + "</p>" : "") + (d.online_link && validUrl(d.online_link) ? '<p><strong>Link:</strong> <a href="' + esc(d.online_link) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(d.online_link) + "</a></p>" : "") + (d.notes ? "<p>" + esc(d.notes) + "</p>" : "") : '<p class="file-meta">No extra details were given.</p>') +
        "<p><strong>Going:</strong> " + esc((S.attendees[e.id] || []).join(", ") || "nobody yet") + "</p></div>";
    }
    if (host) {
      h += '<div class="mc-actions">' + (e.status !== "Cancelled" ? '<button type="button" class="btn btn-line btn-sm" data-a="roster" data-id="' + esc(e.id) + '">Roster and attendance</button><button type="button" class="btn btn-line btn-sm" data-a="cancel-event" data-id="' + esc(e.id) + '">Cancel gathering</button>' : "") + "</div>";
      if (S.roster[e.id]) h += '<div class="panel"><h4>Who said they’re coming</h4>' + (S.roster[e.id].length ? S.roster[e.id].map(function (x) { return '<label class="inline-check"><input type="checkbox" data-a="attend" data-id="' + esc(e.id) + '" data-m="' + esc(x.member) + '"' + (x.attended ? " checked disabled" : "") + "> " + esc(x.name) + " (" + esc(x.status) + ")</label>"; }).join("<br>") + '<p class="file-meta">Tick people who actually came. They each earn a Passport stamp.</p>' : '<p class="file-meta">Nobody yet.</p>') + "</div>";
    }
    return h + "</article>";
  }
  function eventForm() {
    return '<div class="shell" style="margin:1rem 0"><h3>Host a gathering</h3>' + (teen() ? '<p class="notice">Gatherings hosted by members under 18 are reviewed by the Supreme Leader before they’re listed. Please make sure a parent or guardian knows about any in-person plan.</p>' : '<p class="file-meta">Meet people safely: public places, tell a friend, and trust your instincts. The exact place is shown only to people who RSVP “going”.</p>') +
      '<form data-f="event"><div class="row-2"><div class="field"><label for="ev-title">Title *</label><input type="text" id="ev-title" required minlength="4" maxlength="100"></div><div class="field"><label for="ev-kind">Type *</label><select id="ev-kind">' + KINDS.map(function (k) { return "<option>" + k + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="row-2"><div class="field"><label for="ev-when">Date and time *</label><input type="datetime-local" id="ev-when" required></div><div class="field"><label for="ev-city">City (shown to everyone)</label><input type="text" id="ev-city" maxlength="60"></div></div>' +
      '<div class="field"><label for="ev-desc">What’s the plan?</label><textarea id="ev-desc" maxlength="800"></textarea></div>' +
      '<div class="check"><input type="checkbox" id="ev-online"><label for="ev-online">This is an online session</label></div>' +
      '<div class="row-2"><div class="field"><label for="ev-loc">Exact place (only people who RSVP see it)</label><input type="text" id="ev-loc" maxlength="200"></div><div class="field"><label for="ev-link">Meeting link (https://, only people who RSVP see it)</label><input type="url" id="ev-link" maxlength="300"></div></div>' +
      '<div class="field"><label for="ev-cap">Maximum people (optional)</label><input type="number" id="ev-cap" min="2" max="500"></div><p class="field-error" id="ev-err" role="alert"></p>' +
      '<div class="mc-actions"><button type="submit" class="btn btn-dark btn-sm">' + (teen() ? "Send for review" : "Publish gathering") + '</button><button type="button" class="btn btn-line btn-sm" data-a="cancel-form">Cancel</button></div></form></div>';
  }


  /* ----- games ----- */
  function pct(m, i) { var tot = 0; Object.keys(m || {}).forEach(function (k) { tot += m[k]; }); return tot ? Math.round(((m || {})[i] || 0) / tot * 100) : 0; }
  function gamesHtml() {
    var kinds = [["all", "All"], ["icebreaker", "Ice-breakers"], ["wyr", "Would you rather"], ["dilemma", "Founder dilemmas"]];
    var played = Object.keys(S.myResp).length, list = S.prompts.filter(function (p) { return S.gameKind === "all" || p.kind === S.gameKind; });
    return '<p class="file-meta">Easy ways to start a conversation. Answers are shown only to members of your own circle. You’ve played <strong>' + played + "</strong> of " + S.prompts.length + ". Play 5 for a Passport stamp, and make 3 founder decisions for another.</p>" +
      '<div class="filters" role="group" aria-label="Game types">' + kinds.map(function (k) { return '<button type="button" class="chip" data-a="game-kind" data-id="' + k[0] + '" aria-pressed="' + (S.gameKind === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div>" +
      (list.length ? list.map(gameCard).join("") : '<p class="file-meta">No games here yet.</p>');
  }
  function gameCard(p) {
    var mine = S.myResp[p.id], opts = p.options || [], h = '<article class="show-card game"><p class="mc-num">' + esc({ icebreaker: "Ice-breaker", wyr: "Would you rather", dilemma: "Founder dilemma" }[p.kind]) + "</p><h3>" + esc(p.title) + "</h3>" + (p.body ? "<p>" + esc(p.body) + "</p>" : "");
    if (p.kind === "icebreaker") {
      if (!mine) return h + '<form data-f="ib" data-id="' + esc(p.id) + '"><label class="sr-only" for="ib-' + esc(p.id) + '">Your answer</label><textarea id="ib-' + esc(p.id) + '" maxlength="300" required placeholder="Your answer…"></textarea><p class="field-error" id="ibe-' + esc(p.id) + '" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Share my answer</button></form></article>';
      return h + '<p class="why"><strong>You:</strong> ' + esc(mine.answer) + "</p>" + ((S.answers[p.id] || []).filter(function (a) { return a.member !== S.user.id; }).map(function (a) { return "<p><strong>" + esc(a.author_name || "A member") + ":</strong> " + esc(a.answer) + "</p>"; }).join("") || '<p class="file-meta">You’re the first. Others’ answers will show up here.</p>') + "</article>";
    }
    var res = S.results[p.id] || {};
    if (!mine) return h + '<div class="mc-actions">' + opts.map(function (o, i) { return '<button type="button" class="btn btn-line" data-a="game-play" data-id="' + esc(p.id) + '" data-c="' + i + '">' + esc(o.label) + "</button>"; }).join("") + "</div></article>";
    h += opts.map(function (o, i) { var v = pct(res, i); return '<div class="opt' + (mine.choice === i ? " mine" : "") + '"><p><strong>' + esc(o.label) + "</strong>" + (mine.choice === i ? " (your pick)" : "") + ' <span class="file-meta">' + v + '%</span></p><div class="meter"><span style="width:' + v + '%"></span></div>' + (p.kind === "dilemma" && o.note ? '<p class="file-meta">' + esc(o.note) + "</p>" : "") + "</div>"; }).join("");
    return h + (p.kind === "dilemma" ? '<p class="file-meta">There’s no single right answer. The notes show what founders usually weigh.</p>' : "") + "</article>";
  }

  /* ----- challenges ----- */
  function challengesHtml() {
    var uid = S.user.id;
    return '<p class="file-meta">Challenges are started by members, and are separate from the official Royal Missions. Join one, log your progress, and finish it. Finishers earn a Passport stamp.</p>' +
      '<details class="panel"><summary><strong>Start a challenge</strong></summary><form data-f="chal" class="shell"><div class="row-2"><div class="field"><label for="ch-title">Title *</label><input type="text" id="ch-title" required minlength="4" maxlength="100" placeholder="e.g. Build a landing page in 7 days"></div><div class="field"><label for="ch-kind">Type</label><select id="ch-kind"><option>Build</option><option>Learn</option><option>Prototype</option><option>Read</option><option>Other</option></select></div></div>' +
      '<div class="field"><label for="ch-desc">What is it, and what counts as finished?</label><textarea id="ch-desc" maxlength="800"></textarea></div><div class="field"><label for="ch-days">How many days? (1 to 90)</label><input type="number" id="ch-days" min="1" max="90" value="7"></div><p class="field-error" id="ch-err" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Start it</button></form></details>' +
      (S.challenges.length ? S.challenges.map(function (c) {
        var ms = S.cmembers[c.id] || [], me = ms.filter(function (m) { return m.member === uid; })[0], done = ms.filter(function (m) { return m.completed; }), mine = c.creator === uid;
        var h = '<article class="show-card"><p class="mc-num">' + esc(c.kind) + " &middot; " + c.days + " days &middot; by " + esc(mine ? "you" : c.creator_name || "a member") + (c.status === "Closed" ? ' &middot; <span class="badge st-archived">Closed</span>' : "") + "</p><h3>" + esc(c.title) + "</h3>" + (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
          '<p class="file-meta">' + ms.length + " taking part &middot; " + done.length + " finished" + (done.length ? ": " + esc(done.map(function (m) { return m.member_name || "A member"; }).join(", ")) : "") + "</p>";
        if (me) {
          h += me.completed ? '<p class="why"><strong>You finished this.</strong> Well done.</p>' : '<form data-f="chal-prog" data-id="' + esc(c.id) + '" class="shell"><div class="row-2"><div class="field"><label for="cp-p-' + esc(c.id) + '">Progress (%)</label><input type="number" id="cp-p-' + esc(c.id) + '" min="0" max="100" value="' + me.progress + '"></div>' + (teen() ? "" : '<div class="field"><label for="cp-e-' + esc(c.id) + '">Link to your work (https://, optional)</label><input type="url" id="cp-e-' + esc(c.id) + '" maxlength="300" value="' + esc(me.evidence || "") + '"></div>') + '</div><div class="field"><label for="cp-n-' + esc(c.id) + '">What did you do or learn?</label><input type="text" id="cp-n-' + esc(c.id) + '" maxlength="300" value="' + esc(me.note || "") + '"></div><p class="field-error" id="cpe-' + esc(c.id) + '" role="alert"></p><div class="mc-actions"><button type="submit" class="btn btn-dark btn-sm">Save progress</button><button type="button" class="btn btn-gold btn-sm" data-a="chal-complete" data-id="' + esc(c.id) + '">I finished it</button><button type="button" class="btn btn-line btn-sm" data-a="chal-leave" data-id="' + esc(c.id) + '">Leave</button></div></form>';
        } else if (c.status === "Open") h += '<div class="mc-actions"><button type="button" class="btn btn-gold btn-sm" data-a="chal-join" data-id="' + esc(c.id) + '">Join this challenge</button></div>';
        if (mine && c.status === "Open") h += '<div class="mc-actions"><button type="button" class="btn btn-line btn-sm" data-a="chal-close" data-id="' + esc(c.id) + '">Close this challenge</button></div>';
        if (!mine) h += '<p class="msg-act"><button type="button" class="linkish" data-a="report" data-type="challenge" data-id="' + esc(c.id) + '">Report</button></p>';
        return h + "</article>";
      }).join("") : '<p class="file-meta">No challenges yet. Start the first one!</p>');
  }

  /* ----- Seed Month ----- */
  function seedHtml() {
    var rd = S.rounds.filter(function (x) { return x.id === S.round; })[0];
    var note = '<div class="notice"><p><strong>How Seed Month works.</strong> Members share ideas, discuss them and vote. <strong>Votes help ideas get noticed. They do not decide funding.</strong> Any funding from the Royal Treasury is a separate evaluation of potential, feasibility, progress and available capital, and it is never guaranteed.</p></div>';
    if (!rd) return note + '<p class="file-meta">No Seed Month round is open right now. When one starts, you’ll find it here.</p>';
    var picker = S.rounds.length > 1 ? '<div class="field"><label for="sd-round">Round</label><select id="sd-round">' + S.rounds.map(function (r) { return '<option value="' + esc(r.id) + '"' + (r.id === S.round ? " selected" : "") + ">" + esc(r.title) + " (" + esc(r.status) + ")</option>"; }).join("") + "</select></div>" : "";
    var used = Object.keys(S.myVotes).length, h = note + picker + "<h3>" + esc(rd.title) + ' <span class="badge st-in-progress">' + esc(rd.status) + "</span></h3>" + (rd.description ? "<p>" + esc(rd.description) + "</p>" : "");
    if (rd.status === "Submissions") h += '<details class="panel"><summary><strong>Share an idea</strong></summary><form data-f="seed-idea" class="shell"><div class="field"><label for="si-title">Idea name *</label><input type="text" id="si-title" required minlength="4" maxlength="100"></div><div class="field"><label for="si-problem">What problem does it solve, and for whom?</label><textarea id="si-problem" maxlength="400"></textarea></div><div class="field"><label for="si-sum">What is the idea? *</label><textarea id="si-sum" required minlength="20" maxlength="800"></textarea></div><div class="field"><label for="si-stage">Where is it now?</label><select id="si-stage"><option>Just an idea</option><option>Researching</option><option>Prototype</option><option>Early users</option></select></div><p class="field-error" id="si-err" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Submit my idea</button></form></details>';
    if (rd.status === "Voting") h += '<p class="file-meta">You have <strong>' + Math.max(0, rd.votes_per_member - used) + "</strong> of " + rd.votes_per_member + " votes left. You can’t vote for your own idea.</p>";
    var ideas = S.ideas.slice(); if (rd.status === "Closed" && S.tally.length) { var order = {}; S.tally.forEach(function (t, i) { order[t.idea_id] = i; }); ideas.sort(function (a, b) { return (order[a.id] == null ? 999 : order[a.id]) - (order[b.id] == null ? 999 : order[b.id]); }); }
    h += ideas.length ? ideas.map(function (i) {
      var mine = i.author === S.user.id, t = S.tally.filter(function (x) { return x.idea_id === i.id; })[0], open = S.ideaOpen[i.id];
      return '<article class="show-card"><p class="mc-num">' + esc(i.stage || "Idea") + " &middot; by " + esc(mine ? "you" : i.author_name || "a member") + (i.shortlisted ? ' &middot; <span class="badge st-open">Shortlisted</span>' : "") + "</p><h3>" + esc(i.title) + "</h3>" + (i.problem ? "<p><strong>Problem:</strong> " + esc(i.problem) + "</p>" : "") + "<p>" + esc(i.summary) + "</p>" +
        (rd.status === "Closed" && t ? '<p class="file-meta"><strong>' + t.votes + "</strong> community vote" + (t.votes === 1 ? "" : "s") + ". This is a tally of interest, not a funding decision.</p>" : "") +
        '<div class="mc-actions">' + (rd.status === "Voting" && !mine ? (S.myVotes[i.id] ? '<button type="button" class="btn btn-dark btn-sm" data-a="seed-unvote" data-id="' + esc(i.id) + '">Voted: take back</button>' : '<button type="button" class="btn btn-gold btn-sm" data-a="seed-vote" data-id="' + esc(i.id) + '">Vote for this</button>') : "") +
        '<button type="button" class="btn btn-line btn-sm" data-a="seed-comments" data-id="' + esc(i.id) + '">' + (open ? "Hide discussion" : "Discuss") + "</button>" + (mine ? '<button type="button" class="btn btn-line btn-sm" data-a="del-idea" data-id="' + esc(i.id) + '">Delete</button>' : '<button type="button" class="btn btn-line btn-sm" data-a="report" data-type="idea" data-id="' + esc(i.id) + '">Report</button>') + "</div>" +
        (open ? '<div class="panel">' + ((S.comments[i.id] || []).length ? S.comments[i.id].map(function (c) { return "<p><strong>" + esc(c.author_name || "A member") + ":</strong> " + esc(c.body) + "</p>"; }).join("") : '<p class="file-meta">No comments yet.</p>') + '<form data-f="seed-comment" data-id="' + esc(i.id) + '"><label class="sr-only" for="sc-' + esc(i.id) + '">Your comment</label><textarea id="sc-' + esc(i.id) + '" maxlength="500" required placeholder="Constructive feedback, questions, or encouragement…"></textarea><p class="field-error" id="sce-' + esc(i.id) + '" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Comment</button></form></div>' : "") + "</article>";
    }).join("") : '<p class="file-meta">No ideas in this round yet.</p>';
    return h;
  }

  /* ----- recognition ----- */
  function recHtml() {
    return '<form data-f="rec" class="shell"><h3>Recognise someone</h3><div class="row-2"><div class="field"><label for="rc-kind">What kind?</label><select id="rc-kind"><option>Thanks</option><option>Achievement</option><option>Milestone</option><option>Congratulations</option></select></div>' +
      '<div class="field"><label for="rc-to">Who? (needed for Thanks)</label><select id="rc-to"><option value="">Nobody in particular</option>' + S.directory.map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.name) + "</option>"; }).join("") + '</select></div></div>' +
      '<div class="field"><label for="rc-body">Say it (be specific: what did they do?)</label><textarea id="rc-body" required minlength="5" maxlength="500"></textarea></div><p class="field-error" id="rc-err" role="alert"></p><button type="submit" class="btn btn-dark btn-sm">Post to the wall</button></form>' +
      "<h3>The wall</h3>" + (S.recs.length ? S.recs.map(function (r) {
        return '<div class="entry"><p><span class="badge st-open">' + esc(r.kind) + "</span> <strong>" + esc(r.author_name) + "</strong>" + (r.to_name ? " &rarr; <strong>" + esc(r.to_name) + "</strong>" : "") + ' <span class="file-meta">' + esc(ago(r.created_at)) + "</span></p><p>" + esc(r.body) + "</p>" +
          (r.author === S.user.id ? '<p class="msg-act"><button type="button" class="linkish" data-a="del-rec" data-id="' + esc(r.id) + '">Delete</button></p>' : '<p class="msg-act"><button type="button" class="linkish" data-a="report" data-type="recognition" data-id="' + esc(r.id) + '">Report</button></p>') + "</div>"; }).join("") : '<p class="file-meta">The wall is empty. Thank someone who helped you!</p>');
  }

  /* ----- passport ----- */
  function passHtml() {
    var by = {}; S.stamps.forEach(function (s) { (by[s.stamp_key] = by[s.stamp_key] || []).push(s); });
    return '<p class="file-meta">Stamps celebrate taking part, not popularity. Collect them by showing up, helping and building.</p><div class="passport">' + S.stampTypes.map(function (t) {
      var got = by[t.key] || [], last = got.length ? got.slice().sort(function (a, b) { return a.awarded_at < b.awarded_at ? 1 : -1; })[0] : null;
      return '<div class="stamp' + (got.length ? " earned" : " locked") + '"><span class="stamp-icon" aria-hidden="true">' + esc(t.icon || "★") + '</span><strong>' + esc(t.name) + "</strong><span class=\"file-meta\">" + esc(t.description || "") + "</span><span class=\"file-meta\">" + (got.length ? "Earned" + (got.length > 1 ? " ×" + got.length : "") + " &middot; " + esc(new Date(last.awarded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })) : "Not yet earned") + "</span></div>"; }).join("") + "</div>";
  }

  /* ----- notifications ----- */
  function notifHtml() {
    return (S.notifs.length ? '<div class="mc-actions" style="margin-top:0"><button type="button" class="btn btn-line btn-sm" data-a="read-all">Mark all as read</button></div>' + S.notifs.map(function (n) {
      return '<div class="entry' + (n.read ? "" : " unread") + '"><p>' + (n.read ? "" : '<span class="badge st-in-progress">New</span> ') + esc(n.body) + ' <span class="file-meta">' + esc(ago(n.created_at)) + "</span></p>" + (n.link ? '<p><button type="button" class="linkish" data-a="open-notif" data-id="' + esc(n.id) + '">Open</button></p>' : "") + "</div>"; }).join("")
      : '<p class="file-meta">No alerts yet. You’ll see mentions, thanks and new stamps here.</p>');
  }

  /* ---------- actions ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el || !S.sb || el.tagName === "INPUT") return;
    var a = el.getAttribute("data-a"), id = el.getAttribute("data-id"), sb = S.sb, uid = S.user && S.user.id;
    if (a === "signout") return sb.auth.signOut().then(function () { S.user = null; stopPoll(); refresh(); });
    if (a === "tab") return go(id);
    if (a === "game-kind") { S.gameKind = id; render(); return; }
    if (a === "game-play") { sb.from("game_responses").insert({ prompt_id: id, member: uid, choice: parseInt(el.getAttribute("data-c"), 10) }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); loadTab(); }); return; }
    if (a === "chal-join") { sb.from("challenge_members").insert({ challenge_id: id, member: uid }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("You’re in. Good luck!"); loadTab(); }); return; }
    if (a === "chal-leave") { if (confirm("Leave this challenge?")) sb.from("challenge_members").delete().eq("challenge_id", id).eq("member", uid).then(function () { loadTab(); }); return; }
    if (a === "chal-close") { sb.from("challenges").update({ status: "Closed" }).eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); loadTab(); }); return; }
    if (a === "chal-complete") { if (confirm("Mark this challenge as finished? You can’t undo this.")) sb.from("challenge_members").update({ completed: true }).eq("challenge_id", id).eq("member", uid).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Finished! A stamp is on its way."); loadTab(); }); return; }
    if (a === "seed-vote") { sb.rpc("cast_vote", { p_idea: id }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); loadTab(); }); return; }
    if (a === "seed-unvote") { sb.rpc("remove_vote", { p_idea: id }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); loadTab(); }); return; }
    if (a === "del-idea") { if (confirm("Delete your idea?")) sb.from("seed_ideas").delete().eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); loadTab(); }); return; }
    if (a === "seed-comments") { if (S.ideaOpen[id]) { delete S.ideaOpen[id]; render(); return; } S.ideaOpen[id] = true; sb.from("seed_comments").select("*").eq("idea_id", id).order("created_at", { ascending: true }).then(function (r) { S.comments[id] = r.data || []; render(); }); return; }
    if (a === "room") { S.room = id; go("rooms", id); return; }
    if (a === "new-event") { var f = $("ev-form"); if (f) { f.innerHTML = eventForm(); f.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if (a === "cancel-form") { var f2 = $("ev-form"); if (f2) f2.innerHTML = ""; return; }
    if (a === "del-msg") { sb.from("messages").delete().eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); S.messages = S.messages.filter(function (m) { return m.id !== id; }); drawMessages(); }); return; }
    if (a === "del-rec") { sb.from("recognitions").delete().eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); loadTab(); }); return; }
    if (a === "block") { if (confirm("Block this member? You won’t see each other’s messages.")) sb.from("blocks").insert({ blocker: uid, blocked: id }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Blocked."); loadTab(); }); return; }
    if (a === "report") {
      var why = prompt("Why are you reporting this? (at least 10 characters)", ""); if (why == null) return; why = why.trim();
      if (why.length < 10) return say("Please give a reason of at least 10 characters.", true);
      sb.from("reports").insert({ reporter: uid, target_type: el.getAttribute("data-type"), target_id: id, reason: why.slice(0, 600) }).then(function (r) { say(r.error ? esc(fr(r.error)) : "Thank you. The Supreme Leader will look at it.", !!r.error); }); return;
    }
    if (a === "rsvp") { sb.from("event_rsvps").upsert({ event_id: id, member: uid, status: el.getAttribute("data-do") }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Done. See you there."); loadTab(); }); return; }
    if (a === "unrsvp") { sb.from("event_rsvps").delete().eq("event_id", id).eq("member", uid).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); delete S.open[id]; loadTab(); }); return; }
    if (a === "event-details") {
      if (S.open[id]) { delete S.open[id]; render(); return; } S.open[id] = true;
      Promise.all([sb.from("event_details").select("*").eq("event_id", id).maybeSingle(), sb.rpc("event_attendees", { p_event: id })]).then(function (rs) { S.details[id] = rs[0].data || null; S.attendees[id] = ((rs[1].data) || []).map(function (x) { return x.name; }); render(); }); return;
    }
    if (a === "roster") { sb.rpc("event_roster", { p_event: id }).then(function (r) { S.roster[id] = r.data || []; render(); }); return; }
    if (a === "cancel-event") { if (confirm("Cancel this gathering?")) sb.from("events").update({ status: "Cancelled" }).eq("id", id).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Cancelled."); loadTab(); }); return; }
    if (a === "read-all") { sb.from("notifications").update({ read: true }).eq("member", uid).eq("read", false).then(function () { S.notifs.forEach(function (n) { n.read = true; }); render(); }); return; }
    if (a === "open-notif") { var n = S.notifs.filter(function (x) { return x.id === id; })[0]; if (!n) return; sb.from("notifications").update({ read: true }).eq("id", id).then(function () { n.read = true; var h = (n.link || "").split("#")[1]; if (h) location.hash = h; else render(); }); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "sd-round") { S.round = t.value; loadTab(); return; }
    if (t.id === "lg-mention" && t.value) { var ta = $("lg-body"); ta.value = (ta.value ? ta.value.replace(/\s*$/, " ") : "") + "@[" + t.value + "] "; t.value = ""; ta.focus(); }
    if (t.getAttribute && t.getAttribute("data-a") === "attend" && t.checked && S.sb) {
      var eid = t.getAttribute("data-id"), mid = t.getAttribute("data-m");
      S.sb.from("event_rsvps").update({ attended: true }).eq("event_id", eid).eq("member", mid).then(function (r) { if (r.error) { t.checked = false; return say(esc(fr(r.error)), true); } t.disabled = true; say("Marked as attended. They’ve earned a stamp."); });
    }
  });
  document.addEventListener("submit", function (e) {
    var f = e.target.closest("form[data-f]"); if (!f || !S.sb) return; e.preventDefault();
    var kind = f.getAttribute("data-f"), sb = S.sb, uid = S.user && S.user.id;
    function lock(b) { Array.prototype.forEach.call(f.querySelectorAll("button"), function (x) { x.disabled = b; }); }
    if (kind === "signin") { var em = $("lg-email").value.trim(); sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) { if (r.error) return say(esc(fr(r.error)), true); say("Check your email. We’ve sent a sign-in link to <strong>" + esc(em) + "</strong>."); }); return; }
    if (kind === "ib") {
      var pid = f.getAttribute("data-id"), ans = $("ib-" + pid).value.trim(), er0 = $("ibe-" + pid); er0.textContent = "";
      if (teen() && unsafeTeen(ans)) { er0.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("game_responses").insert({ prompt_id: pid, member: uid, answer: ans }).then(function (r) { lock(false); if (r.error) { er0.textContent = fr(r.error); return; } loadTab(); }); return;
    }
    if (kind === "chal") {
      var er1 = $("ch-err"); er1.textContent = ""; var ct = $("ch-title").value.trim(), cd = $("ch-desc").value.trim();
      if (teen() && unsafeTeen(ct + " " + cd)) { er1.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("challenges").insert({ creator: uid, title: ct, description: cd || null, kind: $("ch-kind").value, days: Math.max(1, Math.min(90, parseInt($("ch-days").value, 10) || 7)) }).then(function (r) { lock(false); if (r.error) { er1.textContent = fr(r.error); return; } say("Your challenge is live."); loadTab(); }); return;
    }
    if (kind === "chal-prog") {
      var cid = f.getAttribute("data-id"), er2 = $("cpe-" + cid); er2.textContent = ""; var ev = $("cp-e-" + cid), ev1 = ev ? ev.value.trim() : "", nt = $("cp-n-" + cid).value.trim();
      if (ev1 && !validUrl(ev1)) { er2.textContent = "The link must start with https://"; return; }
      if (teen() && unsafeTeen(nt)) { er2.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("challenge_members").update({ progress: Math.max(0, Math.min(100, parseInt($("cp-p-" + cid).value, 10) || 0)), note: nt || null, evidence: ev1 || null }).eq("challenge_id", cid).eq("member", uid).then(function (r) { lock(false); if (r.error) { er2.textContent = fr(r.error); return; } say("Progress saved."); loadTab(); }); return;
    }
    if (kind === "seed-idea") {
      var er3 = $("si-err"); er3.textContent = ""; var st = $("si-title").value.trim(), sp = $("si-problem").value.trim(), ss = $("si-sum").value.trim();
      if (teen() && unsafeTeen(st + " " + sp + " " + ss)) { er3.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("seed_ideas").insert({ round_id: S.round, author: uid, title: st, problem: sp || null, summary: ss, stage: $("si-stage").value }).then(function (r) { lock(false); if (r.error) { er3.textContent = fr(r.error); return; } say("Your idea is in. A Passport stamp is on its way."); loadTab(); }); return;
    }
    if (kind === "seed-comment") {
      var iid = f.getAttribute("data-id"), er4 = $("sce-" + iid); er4.textContent = ""; var cb = $("sc-" + iid).value.trim();
      if (teen() && unsafeTeen(cb)) { er4.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("seed_comments").insert({ idea_id: iid, author: uid, body: cb }).then(function (r) { lock(false); if (r.error) { er4.textContent = fr(r.error); return; } S.ideaOpen[iid] = true; sb.from("seed_comments").select("*").eq("idea_id", iid).order("created_at", { ascending: true }).then(function (r2) { S.comments[iid] = r2.data || []; render(); }); }); return;
    }
    if (kind === "msg") {
      var body = $("lg-body").value.trim(), er = $("lg-err"); er.textContent = ""; if (!body) return;
      if (teen() && unsafeTeen(body)) { er.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("messages").insert({ room: S.room, author: uid, body: body }).then(function (r) { lock(false); if (r.error) { er.textContent = fr(r.error); return; } $("lg-body").value = ""; loadMessages().then(function () { drawMessages(); var b = $("lg-msgs"); if (b) b.scrollTop = b.scrollHeight; }); }); return;
    }
    if (kind === "rec") {
      var k = $("rc-kind").value, to = $("rc-to").value, txt = $("rc-body").value.trim(), er2 = $("rc-err"); er2.textContent = "";
      if (k === "Thanks" && !to) { er2.textContent = "Choose who you’re thanking."; return; }
      if (teen() && unsafeTeen(txt)) { er2.textContent = "For your safety, teens can’t share links, emails or phone numbers here."; return; }
      lock(true); sb.from("recognitions").insert({ author: uid, kind: k, to_member: to || null, body: txt }).then(function (r) { lock(false); if (r.error) { er2.textContent = fr(r.error); return; } say("Posted to the wall."); loadTab(); }); return;
    }
    if (kind === "event") {
      var er3 = $("ev-err"); er3.textContent = ""; var wv = $("ev-when").value, st = wv ? new Date(wv) : null, link = $("ev-link").value.trim(), cap = $("ev-cap").value, title = $("ev-title").value.trim(), desc = $("ev-desc").value.trim();
      if (!st || isNaN(st) || st < new Date()) { er3.textContent = "Please choose a date and time in the future."; return; }
      if (link && !validUrl(link)) { er3.textContent = "The meeting link must start with https://"; return; }
      if (teen() && unsafeTeen(title + " " + desc + " " + $("ev-loc").value)) { er3.textContent = "For your safety, teens can’t put links, emails or phone numbers in a gathering."; return; }
      lock(true);
      sb.from("events").insert({ creator: uid, title: title, kind: $("ev-kind").value, description: desc || null, city: $("ev-city").value.trim() || null, starts_at: st.toISOString(), is_online: $("ev-online").checked, capacity: cap ? parseInt(cap, 10) : null }).select("id,status").then(function (r) {
        if (r.error) { lock(false); er3.textContent = fr(r.error); return null; }
        var ev = (r.data || [])[0]; if (!ev) { lock(false); er3.textContent = "Saved, but we couldn’t read it back. Please reload."; return null; }
        var loc = $("ev-loc").value.trim();
        return (loc || link ? sb.from("event_details").insert({ event_id: ev.id, location_text: loc || null, online_link: link || null }) : Promise.resolve({})).then(function (r2) {
          lock(false); if (r2 && r2.error) { er3.textContent = "Your gathering was saved, but its details weren’t: " + fr(r2.error); return; }
          say(teen() ? "Sent for review. It will be listed once the Supreme Leader approves it." : "Your gathering is live. A Passport stamp is on its way."); loadTab(); });
      }); return;
    }
  });

  /* ---------- start ---------- */
  if (!CFG.url || !CFG.anonKey) { app.innerHTML = '<div class="notice"><p><strong>The Royal Lounge is opening soon.</strong></p></div>'; return; }
  if (!window.supabase || !window.supabase.createClient) { app.innerHTML = '<div class="notice warn"><p>The Lounge couldn’t load (a needed script was blocked). Please reload.</p></div>'; return; }
  S.sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  S.sb.auth.onAuthStateChange(function (ev, session) { var u = session ? session.user : null; if ((u && u.id) !== (S.user && S.user.id) || !S.loaded) { S.user = u; refresh(); } });
  S.sb.auth.getSession().then(function (r) { var u = r.data && r.data.session ? r.data.session.user : null; if (!S.loaded) { S.user = u; refresh(); } });
})();
