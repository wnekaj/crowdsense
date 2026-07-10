/* =========================================================================
   CROWDSENSE — LAUNCH QUESTION BANK (REAL FIGURES)
   Derived from published Public First polling tables, verified against the
   raw xlsx toplines. Nets are summed from unrounded values then rounded.

   ⚠ Two things to verify before launch:
   1. The ThinkFlow question (27 Jul) assumes "ThinkFlow" was a fictitious
      control brand in the Google poll (alongside HorizonML and NovaMind).
      Confirm with the research team before it runs.
   2. Whether client attribution is needed in source lines is a house-style
      call — kept neutral here.

   Scheduling: each question carries a "date" (YYYY-MM-DD, London time) and
   runs on exactly that day. Launch is Monday 2026-07-20 (puzzle No. 1).
   The perishable leadership-race questions run first; evergreen follows.
   The bank currently covers 20 Jul – 3 Aug — top it up before it runs out,
   or undated questions will be rotated automatically as a fallback.
   ========================================================================= */

var CS_QUESTIONS = [

  /* ---------- PRE-LAUNCH TASTER ----------
     Undated, so it runs on any day without a dated question — i.e. every
     day before launch. Swap or remove once the bank extends past 3 Aug,
     or it will resurface when the dates run out. */
  {
    date: "",
    question: "What percentage of Brits agreed Andy Burnham would be an improvement on Keir Starmer as Prime Minister?",
    answer: 49,
    note: "A pre-launch taster — the daily game proper starts Monday 20 July.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },

  /* ---------- LAUNCH WEEK: leadership race (perishable) ---------- */
  {
    date: "2026-07-20",
    question: "What percentage of Brits think Andy Burnham is most likely to become the next Prime Minister?",
    answer: 59,
    note: "Among over-65s it's 74%. Just 3% say Angela Rayner.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-21",
    question: "What percentage of Brits say the Labour leadership contest is 'all but guaranteed — mostly a formality'?",
    answer: 64,
    note: "82% of over-65s call it a formality. Only 48% of 18–24s agree.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-22",
    question: "What percentage of the public say the country needs a general election to sort out who should be in charge?",
    answer: 51,
    note: "Strikingly uniform: 51% of 18–24s, 53% of over-65s.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-23",
    question: "What percentage of Brits have a 'very unfavourable' view of Nigel Farage?",
    answer: 37,
    note: "Rises to 45% among over-65s — higher than among 18–24s (31%).",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-24",
    question: "What percentage of the public would approve of Ed Miliband being appointed Chancellor of the Exchequer?",
    answer: 34,
    note: "The age war: 48% of over-65s strongly disapprove. 4% of 18–24s do.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-25",
    question: "What percentage of Brits say they trust Andy Burnham?",
    answer: 48,
    note: "More trust him than don't — rare territory for a politician.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },

  /* ---------- EVERGREEN: AI & tech ---------- */
  {
    date: "2026-07-26",
    question: "What percentage of the British public have ever used ChatGPT?",
    answer: 62,
    note: "Which leaves four in ten who've never touched it.",
    source: "Public First poll of 2,017 UK adults, 20–26 March 2026"
  },
  {
    date: "2026-07-27",
    question: "What percentage of Brits claim to have used 'ThinkFlow' — an AI tool that doesn't exist?",
    answer: 8,
    note: "It was invented for this poll. One in twelve used it anyway.",
    source: "Public First poll of 2,017 UK adults, 20–26 March 2026"
  },
  {
    date: "2026-07-28",
    question: "What percentage of the public use AI tools for work at least once a week?",
    answer: 56,
    note: "22% say they never use AI at work at all.",
    source: "Public First poll of 2,017 UK adults, 20–26 March 2026"
  },
  {
    date: "2026-07-29",
    question: "What percentage of Brits would give up access to every AI tool, permanently, in exchange for £2.50?",
    answer: 37,
    note: "Raise the offer to £100 and still only 53% take the money.",
    source: "Public First poll of 2,017 UK adults, 20–26 March 2026"
  },

  /* ---------- EVERGREEN: online safety ---------- */
  {
    date: "2026-07-30",
    question: "What percentage of the public think under-16s would still find ways around social media age checks?",
    answer: 81,
    note: "Just 3% say it's 'not at all likely' the kids would win.",
    source: "Public First poll of 1,949 UK adults, 15–19 June 2026"
  },
  {
    date: "2026-07-31",
    question: "What percentage of Brits would be comfortable having their own face scanned to prove their age online, if it meant better protection for children?",
    answer: 53,
    note: "Comfort with a child scanning theirs is lower: 39%.",
    source: "Public First poll of 1,949 UK adults, 15–19 June 2026"
  },

  /* ---------- EVERGREEN: crime & morality (LONDONERS — keep the wording) ---------- */
  {
    date: "2026-08-01",
    question: "What percentage of Londoners say the death penalty is an appropriate punishment in some cases?",
    answer: 62,
    note: "Yes, London. 40% of over-65s pick the strongest pro option.",
    source: "Public First poll of 1,041 London adults, 19–22 June 2026"
  },
  {
    date: "2026-08-02",
    question: "What percentage of Londoners agree that 'a good person would never commit a crime'?",
    answer: 43,
    note: "Only 28% of 18–24s agree. Age, not politics, is the divide.",
    source: "Public First poll of 1,041 London adults, 19–22 June 2026"
  },
  {
    date: "2026-08-03",
    question: "What percentage of Londoners think criminals are better than the police at using technology?",
    answer: 34,
    note: "Just 19% back the police. 31% call it a draw.",
    source: "Public First poll of 1,041 London adults, 19–22 June 2026"
  }

  /* ---------- SPARE (verified, ready if needed) ----------
  ,{
    date: "",
    question: "What percentage of Londoners say they've attended a protest in the last year?",
    answer: 13,
    note: "21% of 18–24s — versus 6% of over-65s.",
    source: "Public First poll of 1,041 London adults, 19–22 June 2026"
  }
  ----------------------------------------------------------- */
];
