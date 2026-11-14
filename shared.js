/* ==========================================================================
   Shared header, menus, sponsor tab and footer for every page of the Republic.
   Edit the links here once and every page updates.
   ========================================================================== */
(function () {
  "use strict";
  var path = location.pathname.split("/").pop() || "index.html";
  var home = (path === "index.html");
  function h(id) { return home ? "#" + id : "index.html#" + id; }
  var sponsorHref = home ? "#sponsor" : "sponsors.html";

  // The few things most visitors need, always visible
  var MAIN = [
    { t: "Royal Missions", href: "missions.html", page: "missions.html" },
    { t: "The Network",    href: "network.html",  page: "network.html" },
    { t: "Newsroom",       href: "newsroom.html", page: "newsroom.html" }
  ];
  // Everything else tucked under "More"
  var MORE = [
    { t: "The Four Stages",    href: h("stages") },
    { t: "The Royal Treasury", href: h("treasury") },
    { t: "Funding and schemes", href: "funding.html", page: "funding.html" },
    { t: "Ad Bureau",         href: "adbureau.html", page: "adbureau.html" },
    { t: "Alumni Body",       href: "alumni.html", page: "alumni.html" },
    { t: "Sing the Anthem",   href: "anthem.html", page: "anthem.html" },
    { t: "Royal Archives",     href: "archive.html", page: "archive.html" },
    { t: "Sponsor the Republic", href: sponsorHref, page: "sponsors.html", cls: "more-sponsor" },
    { t: "Privacy",            href: h("trust") }
  ];

  function linkHtml(l) {
    return '<a href="' + l.href + '"' + (l.cls ? ' class="' + l.cls + '"' : "") + (l.page === path ? ' aria-current="page"' : "") + ">" + l.t + "</a>";
  }
  var moreActive = MORE.some(function (l) { return l.page === path; });
  var allLinks = MAIN.concat(MORE);
  var allHtml = allLinks.map(function (l) { var c = Object.assign({}, l); delete c.cls; return linkHtml(c); }).join("");

  var header =
    '<header class="topbar">' +
      '<div class="wrap topbar-in">' +
        '<a class="brand" href="' + (home ? "#top" : "index.html") + '" aria-label="Pitch to Raeesi, home">' +
          '<img class="brand-crest" src="images/crest-small.png" alt="" width="46" height="35">' +
          '<span class="brand-name" data-cfg="brand.siteName">Pitch to Raeesi</span>' +
        "</a>" +
        '<nav class="nav" aria-label="Main">' + MAIN.map(linkHtml).join("") +
          '<details class="more" id="more-menu"><summary' + (moreActive ? ' class="active"' : "") + '>More<span class="caret" aria-hidden="true"></span></summary>' +
            '<div class="more-panel">' + MORE.map(linkHtml).join("") + "</div></details>" +
        "</nav>" +
        '<div class="topbar-right">' +
          '<a class="btn btn-ghost btn-sm btn-sponsor" href="' + sponsorHref + '">Sponsor</a>' +
          '<a class="btn btn-gold btn-sm cta-top" href="' + h("petition") + '" data-apply>Submit Your Petition</a>' +
          '<details class="menu" id="site-menu"><summary aria-label="Open the menu"><span class="menu-bars" aria-hidden="true"></span><span class="menu-label">Menu</span></summary>' +
            '<nav class="menu-panel" aria-label="Menu">' + allHtml +
              '<a class="menu-cta" href="' + h("petition") + '" data-apply>Submit Your Petition</a>' +
            "</nav></details>" +
        "</div>" +
      "</div>" +
    "</header>";

  var footer =
    '<footer class="footer">' +
      '<div class="wrap footer-in">' +
        '<img class="footer-crest" src="images/crest-small.png" alt="" width="150" height="115" loading="lazy">' +
        '<p class="footer-brand"><span data-cfg="brand.countryName">The Republic of Raeesi</span></p>' +
        '<nav class="footer-nav" aria-label="Footer">' + allHtml + "</nav>" +
        '<p class="footer-contact" id="footer-contact" hidden></p>' +
        '<p class="footer-fine">The Republic is a fictional, satirical country. The mission is real; the royal dramatics are not legally binding. Nothing on this site is an offer of investment, a guarantee of funding, or financial or legal advice. Any investment would be agreed separately, in writing.</p>' +
      "</div>" +
    "</footer>";

  var hd = document.getElementById("site-header");
  if (hd) hd.outerHTML = header;
  var ft = document.getElementById("site-footer");
  if (ft) ft.outerHTML = footer;

  // Mobile menu and "More" dropdown: close on link click, Escape, or clicking elsewhere
  function wire(d) {
    if (!d) return;
    d.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) d.open = false; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && d.open) { d.open = false; d.querySelector("summary").focus(); } });
    document.addEventListener("click", function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
  }
  wire(document.getElementById("site-menu")); wire(document.getElementById("more-menu"));

  // A small, dismissible tab inviting sponsors. Not shown on the sponsors page, admin or capital pages.
  var SHOW_ON = ["index.html", "missions.html", "newsroom.html", "archive.html", "network.html"];
  var KEY = "raeesi.sponsorTab.dismissed";
  function dismissedRecently() { try { var t = Number(localStorage.getItem(KEY) || 0); return t && Date.now() - t < 7 * 864e5; } catch (e) { return false; } }
  if (SHOW_ON.indexOf(path) > -1 && !dismissedRecently()) {
    setTimeout(function () {
      var tab = document.createElement("div");
      tab.className = "sponsor-tab"; tab.setAttribute("role", "complementary"); tab.setAttribute("aria-label", "Sponsor the Republic");
      tab.innerHTML = '<a href="' + sponsorHref + '"><strong>Sponsor a Royal Mission</strong><span>or a prize, or an event</span></a><button type="button" aria-label="Dismiss this suggestion">&times;</button>';
      document.body.appendChild(tab);
      tab.querySelector("button").addEventListener("click", function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} tab.remove(); });
      var pet = document.getElementById("petition");     // don't sit on top of the petition form
      if (pet && "IntersectionObserver" in window) new IntersectionObserver(function (es) { tab.hidden = es[0].isIntersecting; }, { threshold: 0.05 }).observe(pet);
    }, 2500);
  }
})();
