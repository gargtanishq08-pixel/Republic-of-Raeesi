/* ==========================================================================
   ROYAL MISSIONS — missions and scoring rules.
   --------------------------------------------------------------------------
   TO PUBLISH A MISSION
     Find it below (or copy a block to make a new one), set  status  to one of:
        "Draft"         hidden from the public (nobody sees it)
        "Open"          visible, people can register interest and submit
        "In Progress"   visible, people can still submit
        "Under Review"  visible, no new submissions, you're scoring
        "Completed"     visible, results published in the Royal Ledger
        "Archived"      visible in the archive of past missions
     Then save and re-upload this file.

   THE SAMPLE MISSION BELOW ("Mission I") USES EXAMPLE DATES.
   Change the dates and wording to what you really want, or set it to "Draft".

   The scoring rules are further down. The website and the Ledger both read them
   from here, so there's one place to change them. If you change weights or the
   pass mark, tell members; don't quietly change rules after scoring.
   ========================================================================== */
window.RAEESI_MISSIONS = {

  /* ---------------- How points work ---------------- */
  scale: "Each criterion is scored 0 to 5 by a reviewer: 0 nothing shown, 1 a weak attempt, 2 partly there, 3 solid, 4 strong, 5 outstanding.",
  criteria: [
    { key: "execution",     name: "Execution and functionality",    weight: 25, desc: "Does it work? Can someone see it running, use it, or follow it from start to finish?" },
    { key: "originality",   name: "Originality and problem-solving", weight: 20, desc: "Did you think for yourself and solve the actual problem, rather than copy a template?" },
    { key: "quality",       name: "Technical or creative quality",   weight: 20, desc: "How well is it made? Code, design, writing, analysis, craft." },
    { key: "documentation", name: "Documentation and clarity",       weight: 15, desc: "Can a stranger understand what you built, why, and how to use or check it?" },
    { key: "collaboration", name: "Collaboration and reliability",   weight: 10, desc: "Did you communicate, keep commitments, and credit others? Solo builders are scored on reliability." },
    { key: "improvement",   name: "Improvement after feedback",      weight: 10, desc: "Did you listen, revise, and make the work better?" }
  ],
  passMark: 40,                                    // weighted score out of 100 needed to earn points
  difficultyMultiplier: { Easy: 1, Medium: 1.5, Hard: 2 },
  rules: [
    "Points reward the quality of the work, never popularity. Comments, likes and attention add nothing.",
    "A submission needs at least 40 out of 100 to earn points. Lower scores still get written feedback.",
    "Only your best scored entry for each mission counts, so repeating easy tasks can’t beat real depth.",
    "Harder missions are worth more: Easy ×1, Medium ×1.5, Hard ×2.",
    "Any adjustment up or down needs a written reason that appears in the Ledger.",
    "You can ask for a reassessment, and any change is recorded in the Ledger’s revision note.",
    "Your score is a record of your work. It never decides funding, employment or any other major decision on its own."
  ],
  levels: [
    { name: "Newcomer",           min: 0 },
    { name: "Apprentice Builder", min: 40 },
    { name: "Journeyman Builder", min: 150 },
    { name: "Master Builder",     min: 350 }
  ],

  /* ---------------- The missions ---------------- */
  missions: [
    {
      id: "M001", number: "I",
      title: "The Ministry Landing Page",
      status: "Open",
      difficulty: "Easy",
      categories: ["Design", "Marketing", "Technology"],
      skills: ["HTML and CSS, or a no-code site builder", "Copywriting", "Visual design"],
      summary: "Create a landing page for a fictional royal department. Pick a ministry (Biscuit Affairs, Unnecessary Meetings, Rooftop Diplomacy, anything) and make a page that would genuinely convince a visitor.",
      objectives: [
        "Choose or invent a department and decide who the page is for.",
        "Write a clear headline, a short explanation, and a call to action.",
        "Design a page that looks credible on a phone and a computer.",
        "Publish it somewhere a reviewer can open it."
      ],
      deliverables: [
        "A live link to your page (or a link to the code or design file).",
        "A short note on who it’s for and what you decided.",
        "At least one thing you changed after getting feedback."
      ],
      instructions: [
        "Register your interest below (optional, but it helps me plan).",
        "Build alone or with others. Credit everyone in your submission.",
        "Submit through the Mission Desk before the deadline.",
        "Reviewers score against the published criteria. Results appear in the Royal Ledger."
      ],
      opens: "2026-10-19", deadline: "2026-11-20", reviewBy: "2026-12-05"
    },
    {
      id: "M002", number: "II", title: "The Automation Decree", status: "Draft", difficulty: "Medium",
      categories: ["Operations", "Technology"], skills: ["Spreadsheets or scripting", "Process thinking"],
      summary: "Build an automation that saves real time or money for you, a family business, a club or a school.",
      objectives: ["Find a repetitive task.", "Automate it.", "Measure the time or money saved."],
      deliverables: ["A working demonstration.", "Before-and-after numbers."],
      instructions: ["Submit through the Mission Desk."], opens: "", deadline: "", reviewBy: ""
    },
    {
      id: "M003", number: "III", title: "A Prototype for a Real Problem", status: "Draft", difficulty: "Hard",
      categories: ["Technology", "Entrepreneurship"], skills: ["Prototyping", "User research"],
      summary: "Develop a prototype that solves a real-world problem you can show to the people who have it.",
      objectives: ["Define the problem.", "Build a prototype.", "Test it with real people."],
      deliverables: ["A working prototype or demo.", "What users said."],
      instructions: ["Submit through the Mission Desk."], opens: "", deadline: "", reviewBy: ""
    },
    {
      id: "M004", number: "IV", title: "A Brand for a New Venture", status: "Draft", difficulty: "Medium",
      categories: ["Design", "Marketing"], skills: ["Brand design", "Writing"],
      summary: "Design a brand identity (name, logo, colours, voice) for a new venture and show it in use.",
      objectives: ["Define the audience.", "Design the identity.", "Show it on real examples."],
      deliverables: ["A brand sheet.", "Three examples in use."],
      instructions: ["Submit through the Mission Desk."], opens: "", deadline: "", reviewBy: ""
    },
    {
      id: "M005", number: "V", title: "A Viable Business Model", status: "Draft", difficulty: "Medium",
      categories: ["Finance", "Entrepreneurship"], skills: ["Financial modelling", "Market research"],
      summary: "Produce a business model for a startup that could actually work, with honest numbers.",
      objectives: ["Describe the customer.", "Model costs and revenue.", "Name the riskiest assumption."],
      deliverables: ["A model people can check.", "A one-page summary."],
      instructions: ["Submit through the Mission Desk."], opens: "", deadline: "", reviewBy: ""
    },
    {
      id: "M006", number: "VI", title: "The Working Ledger (Blockchain)", status: "Draft", difficulty: "Hard",
      categories: ["Blockchain", "Technology"], skills: ["Smart contracts or blockchain tooling"],
      summary: "Build a functional blockchain application with a working demonstration.",
      objectives: ["Define the use case.", "Build it.", "Demonstrate it working."],
      deliverables: ["Code repository.", "A demo link or recording."],
      instructions: ["Submit through the Mission Desk."], opens: "", deadline: "", reviewBy: ""
    },
    {
      id: "M007", number: "VII", title: "The Royal Assistant (AI)", status: "Draft", difficulty: "Hard",
      categories: ["AI", "Technology"], skills: ["AI tools and APIs", "Product design"],
      summary: "Create an AI-powered tool that does something useful, with a working demonstration.",
      objectives: ["Pick a real use.", "Build it.", "Show where it fails and how you handled it."],
      deliverables: ["Working demo.", "Notes on limits and risks."],
      instructions: ["Submit through the Mission Desk."], opens: "", deadline: "", reviewBy: ""
    }
  ]
};
