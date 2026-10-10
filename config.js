/* ==========================================================================
   THE REPUBLIC OF RAEESI — SETTINGS
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit for everyday changes.
   Change the text between the quote marks, save the file, and re-upload.
   Do not delete commas, quote marks or curly brackets.
   ========================================================================== */

window.RAEESI_CONFIG = {

  /* ---- Names ---------------------------------------------------------- */
  brand: {
    siteName:    "Pitch to Raeesi",
    countryName: "The Republic of Raeesi",
    leaderName:  "Raeesi"
  },

  /* ---- Are petitions (applications) open? ----------------------------- */
  applications: {
    open: true,                       // true = form visible, false = form hidden
    closedTitle:   "The gates are closed for now.",
    closedMessage: "The Republic is not accepting new petitions at the moment. Check back soon."
  },

  /* ---- The Royal Treasury: change the amount here ---------------------- */
  fundingPool: {
    amount: 100000,                   // shown as ₹1,00,000 everywhere on the site
    currencySymbol: "₹"
  },

  /* ---- Contact (leave "" to hide) -------------------------------------- */
  contact: {
    email: "gargtanishq08@gmail.com"  // shown in the privacy section and footer. Leave "" to hide.
  },

  /* ---- Community joining method ---------------------------------------- */
  community: {
    // The WhatsApp group link is NOT stored here, so it stays out of the public website files.
    // It lives in apps-script/Code.gs (COMMUNITY_JOIN_URL) and is shown only after a petition is saved.
    joinLabel: "Join the Republic's WhatsApp group",   // button text on the confirmation screen
    joinUrl:   "",                    // leave "" (only fill this if you accept the link being publicly visible)
    joinNote:  ""
  },

  /* ---- Your pitch video (any normal YouTube link works) ---------------- */
  video: {
    url: "https://youtu.be/15hZ8ZLA_qY?si=p3oCeDVs3JXGFoIN"
  },

  /* ---- Photographs (put image files in the "images" folder) ------------ */
  photos: {
    crest:     "images/crest.png",
    flag:      "images/flag.jpg",
    hero:      "images/supreme-leader.jpg",
    heroAlt:   "Official portrait of Raeesi, the Supreme Leader, in a white ceremonial uniform with gold epaulettes and a radiant halo.",
    story:     "images/supreme-leader.jpg",
    storyAlt:  "Raeesi, the Supreme Leader, in ceremonial dress."
  },

  /* ---- Academy: add any commitments you genuinely want to make --------- */
  academy: {
    // Leave "" unless you want to promise something specific, for example:
    // "Every member can join one group workshop per month."
    extraCommitments: ""
  },

  /* ---- After someone applies ------------------------------------------- */
  review: {
    // Leave "" to say nothing about timing. Example: "I aim to reply within 3 weeks."
    expectedTimeline: ""
  },

  /* ---- Google connection (see SETUP-GUIDE.md, Part 3) ------------------- */
  form: {
    endpoint: "https://script.google.com/macros/s/AKfycbyk32xywk1JXSLMmxmt2eLtP6n17x5YNDRek1JuVoZ63jtfP5LOM9SeEiIedRPJ0BIl/exec",                     // paste your Apps Script "Web app URL" here
    uploadsEnabled: true,             // set false to accept links only
    maxFileMB: 8,                     // per-file limit. Keep it small; recommend links for videos.
    maxEvidenceItems: 5
  }
};
