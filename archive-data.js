/* ==========================================================================
   THE ROYAL ARCHIVES — the list of images and captions.
   --------------------------------------------------------------------------
   TO ADD A NEW IMAGE
     1. Put the picture in the  images/archive/  folder (a "thumb" copy about
        640 pixels wide keeps the page fast; if you don't have one, use the
        same file for both).
     2. Copy one of the blocks below, paste it at the END of the list (before the
        closing  ]  ), and change the text.
     3. Give it the next number. Keep the commas between blocks.

   Everything here is FICTION and SATIRE. Don't use real people's likenesses,
   real news events, or anything that could be mistaken for a real record.

   Fields
     number        "0005" (4 digits, unique)
     title         Short name of the (fictional) event
     category      Pick from "categories" below, or add a new one
     classification e.g. "State Achievement"
     caption       The deadpan official caption (one line)
     statement     The "official statement" (one line)
     event, date   Optional, fictional
     image, thumb  File paths
     alt           Describe what is actually in the picture (for screen readers)
     featured      true on ONE item to feature it at the top
     downloadable  false to hide the Download button
     pending       true = "awaiting the Royal Photographer" placeholder card
   ========================================================================== */
window.RAEESI_ARCHIVE = {

  categories: [
    "Official Portraits",
    "State Symbols",
    "Military Ceremonies",
    "State Banquets",
    "Foreign Diplomacy",
    "Supreme Leader's Decrees",
    "National Achievements",
    "Royal Palace Life",
    "Royal Holidays",
    "The Supreme Leader's Personal Opinions",
    "Classified Affairs"
  ],

  items: [
    {
      number: "0001",
      title: "The Official Portrait",
      category: "Official Portraits",
      classification: "Official Portrait",
      caption: "The Supreme Leader gazes into a future he has already approved.",
      statement: "The halo is a lighting decision. Probably.",
      event: "Sitting for the First Official Portrait",
      date: "Year 1 of the Republic",
      image: "images/archive/0001-official-portrait.jpg",
      thumb: "images/archive/0001-official-portrait-thumb.jpg",
      alt: "Portrait of the Supreme Leader in a white ceremonial uniform with gold epaulettes and medals, in front of a glowing halo and crimson rays.",
      downloadable: true
    },
    {
      number: "0002",
      title: "The National Coat of Arms",
      category: "State Symbols",
      classification: "State Symbol",
      caption: "The coat of arms is unveiled to a nation that was not consulted.",
      statement: "The falcon is monitored. The lion is mechanical. Both are loyal.",
      event: "Unveiling of the Coat of Arms",
      date: "Year 1 of the Republic",
      image: "images/archive/0002-coat-of-arms.jpg",
      thumb: "images/archive/0002-coat-of-arms-thumb.jpg",
      alt: "The coat of arms of the Republic: a golden falcon and a mechanical lion hold a four-part shield beneath a castle, above a banner reading Integritas, Innovatio, Imperium.",
      downloadable: true
    },
    {
      number: "0003",
      title: "The National Flag",
      category: "State Symbols",
      classification: "State Symbol",
      caption: "The flag of the Republic rises steadily. So, according to the flag, does everything else.",
      statement: "Any downward movement is a printing error.",
      event: "First Raising of the Flag",
      date: "Year 1 of the Republic",
      image: "images/archive/0003-national-flag.jpg",
      thumb: "images/archive/0003-national-flag-thumb.jpg",
      alt: "The flag of the Republic: crimson above teal, a golden phoenix with a gear at its heart, and a glowing golden arrow rising to the right.",
      downloadable: true
    },
    {
      number: "0004",
      title: "Ceremonial Transport to Dinner",
      category: "Military Ceremonies",
      classification: "Ceremonial Transport",
      caption: "The Supreme Leader proceeds to dinner. Walking was not scheduled.",
      statement: "The Royal Guard performed flawlessly. The Supreme Leader performed horizontally.",
      event: "The Procession of the Four Berets",
      date: "Year 1 of the Republic",
      image: "images/archive/0004-royal-guard-transit.jpg",
      thumb: "images/archive/0004-royal-guard-transit-thumb.jpg",
      alt: "The Supreme Leader, wearing a white uniform and blue sunglasses, is carried flat on his back by four serious women in olive uniforms and maroon berets; one holds a golden handgun.",
      featured: true,
      downloadable: true
    },

    /* ---- Awaiting the Royal Photographer (placeholders, not real images) ---- */
    {
      number: "0005",
      title: "The Biscuit Inspection",
      category: "State Banquets",
      classification: "Pending",
      caption: "The Supreme Leader inspects the national supply of biscuits.",
      statement: "Awaiting the Royal Photographer.",
      pending: true
    },
    {
      number: "0006",
      title: "The Summit of Trivial Matters",
      category: "Foreign Diplomacy",
      classification: "Pending",
      caption: "An extravagant diplomatic meeting about an absurdly small subject.",
      statement: "Awaiting the Royal Photographer.",
      pending: true
    },
    {
      number: "0007",
      title: "The Decree of Being Awake",
      category: "Supreme Leader's Decrees",
      classification: "Pending",
      caption: "The Supreme Leader officially confirms that he was, in fact, awake.",
      statement: "Awaiting the Royal Photographer.",
      pending: true
    },
    {
      number: "0008",
      title: "The Ministry of Unnecessary Affairs",
      category: "National Achievements",
      classification: "Pending",
      caption: "A completely unnecessary ministry is opened with total seriousness.",
      statement: "Awaiting the Royal Photographer.",
      pending: true
    }
  ]
};
