/* ==========================================================================
   Shared header, menu and footer for every page of the Republic of Raeesi.
   Edit the links here once and every page updates.
   ========================================================================== */
(function () {
  "use strict";
  var path = location.pathname.split("/").pop() || "index.html";
  var home = (path === "index.html");
  function h(id) { return home ? "#" + id : "index.html#" + id; }

  var LINKS = [
    { t: "The Four Stages",    href: h("stages") },
    { t: "Royal Missions",     href: "missions.html", page: "missions.html" },
    { t: "The Network",        href: "network.html", page: "network.html" },
    { t: "Newsroom",           href: "newsroom.html", page: "newsroom.html" },
    { t: "The Royal Treasury", href: h("treasury") },
    { t: "Royal Archives",     href: "archive.html", page: "archive.html" }
  ];
  var FOOT_LINKS = LINKS.concat([{ t: "Privacy", href: h("trust") }]);

  function linkHtml(l) {
    return '<a href="' + l.href + '"' + (l.page === path ? ' aria-current="page"' : "") + ">" + l.t + "</a>";
  }
  var navHtml = LINKS.map(linkHtml).join("");
  var footNavHtml = FOOT_LINKS.map(linkHtml).join("");

  var header =
    '<header class="topbar">' +
      '<div class="wrap topbar-in">' +
        '<a class="brand" href="' + (home ? "#top" : "index.html") + '" aria-label="Pitch to Raeesi, home">' +
          '<img class="brand-crest" src="images/crest-small.png" alt="" width="46" height="35">' +
          '<span class="brand-name" data-cfg="brand.siteName">Pitch to Raeesi</span>' +
        "</a>" +
        '<nav class="nav" aria-label="Main">' + navHtml + "</nav>" +
        '<div class="topbar-right">' +
          '<a class="btn btn-gold btn-sm cta-top" href="' + h("petition") + '" data-apply>Submit Your Petition</a>' +
          '<details class="menu" id="site-menu"><summary aria-label="Open the menu"><span class="menu-bars" aria-hidden="true"></span><span class="menu-label">Menu</span></summary>' +
            '<nav class="menu-panel" aria-label="Menu">' + navHtml +
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
        '<nav class="footer-nav" aria-label="Footer">' + footNavHtml + "</nav>" +
        '<p class="footer-contact" id="footer-contact" hidden></p>' +
        '<p class="footer-fine">The Republic is a fictional, satirical country. The mission is real; the royal dramatics are not legally binding. Nothing on this site is an offer of investment, a guarantee of funding, or financial or legal advice. Any investment would be agreed separately, in writing.</p>' +
      "</div>" +
    "</footer>";

  var hd = document.getElementById("site-header");
  if (hd) hd.outerHTML = header;
  var ft = document.getElementById("site-footer");
  if (ft) ft.outerHTML = footer;

  // Close the mobile menu after choosing a link, or pressing Escape
  var menu = document.getElementById("site-menu");
  if (menu) {
    menu.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) menu.open = false; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); } });
    document.addEventListener("click", function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  }
})();
