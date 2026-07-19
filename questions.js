/* =========================================================================
   CROWDSENSE — FINAL 14-DAY SCHEDULE · LAUNCH: MON 20 JULY 2026
   All figures verified against raw tables. Days 13–14 are third-party
   polls (Focaldata; YouGov/The Times) — the how-to modal wording covers
   this ("real polling"), and each day's reveal cites its own source.

   Scheduling: each question carries a "date" (YYYY-MM-DD, London time) and
   runs on exactly that day. The undated taster runs on any day without a
   dated question — every day before launch, and as the fallback if the
   bank runs dry. Top up before 3 August.
   ========================================================================= */

var CS_QUESTIONS = [

  /* ---------- PRE-LAUNCH TASTER (also the fallback if dates run out) ----------
     Note: intentionally the same question as Day 1 — early taster players
     will already know the answer on launch day. Owner's call. */
  {
    date: "",
    question: "What percentage of Brits agreed Andy Burnham would be an improvement on Keir Starmer as Prime Minister?",
    answer: 49,
    note: "A pre-launch taster — the daily game proper starts Monday 20 July.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },

  {
    date: "2026-07-20",  // Day 1
    question: "What percentage of Brits agree that Andy Burnham will be an improvement on Keir Starmer as PM?",
    answer: 49,
    note: "Just 16% disagree. Day one: the bar is set.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-21",  // Day 2
    question: "What percentage of the public think Andy Burnham will be a bad leader?",
    answer: 20,
    note: "40% say good. A quarter sit exactly on the fence.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-22",  // Day 3
    question: "What percentage of Brits say they're currently registered on a dating app or website?",
    answer: 12,
    note: "Another 30% have been in the past.",
    source: "Public First poll of 2,045 UK adults, 19–22 January 2026"
  },
  {
    date: "2026-07-23",  // Day 4
    question: "What percentage of UK workers say they've been promoted at work in the past year?",
    answer: 30,
    note: "52% of 25–34s — versus 14% of 45–54s.",
    source: "Public First poll of 1,352 working UK adults, 20–26 March 2026"
  },
  {
    date: "2026-07-24",  // Day 5
    question: "What percentage of the public have an unfavourable view of Nigel Farage?",
    answer: 49,
    note: "37% go straight to 'very unfavourable'. 34% are favourable.",
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-25",  // Day 6
    question: "What percentage of Brits agree that talking politics on a first date is usually a bad idea?",
    answer: 62,
    note: "32% see no problem with it. Brave.",
    source: "Public First poll of 2,045 UK adults, 19–22 January 2026"
  },
  {
    date: "2026-07-26",  // Day 7
    question: "What percentage of British adults say they gamble at least once a week?",
    answer: 25,
    note: "45% say they never gamble at all.",
    source: "Public First poll of 2,076 UK adults, 29 May – 2 June 2026"
  },
  {
    date: "2026-07-27",  // Day 8
    question: "What percentage of the public agree they'd one day be interested in going into politics?",
    answer: 16,
    note: "54% strongly disagree. The talent pipeline, everyone.",
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-07-28",  // Day 9
    question: "What percentage of Brits think the UK's best days are behind it?",
    answer: 37,
    note: "Just 11% say the best days are ahead.",
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-07-29",  // Day 10
    question: "What percentage of the public say they have travelled outside of Europe?",
    answer: 76,
    note: "Meaning one in four Brits never has.",
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-07-30",  // Day 11
    question: "Asked if they plan to start a business in the next five years, what percentage of Brits simply say 'No'?",
    answer: 62,
    note: "Among under-25s, only 30% say no.",
    source: "Public First poll of 4,158 UK adults, 19–29 January 2026"
  },
  {
    date: "2026-07-31",  // Day 12
    question: "What percentage of the public say they tend to buy organic products from the supermarket?",
    answer: 32,
    note: "Two-thirds say they don't.",
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-08-01",  // Day 13
    question: "What percentage of UK adults recognise the Gen Z slang term 'rizz'?",
    answer: 19,
    note: "41% of 18–24s. 4% of over-65s.",
    source: "Focaldata survey of 1,060 UK adults, 7–10 May 2026"
  },
  {
    date: "2026-08-02",  // Day 14
    question: "In a referendum tomorrow, what percentage of Brits say they'd vote to rejoin the European Union?",
    answer: 51,
    note: "29% would vote to stay out. 11% don't know.",
    source: "YouGov poll for The Times of 2,058 GB adults, 10–11 June 2026"
  },
  {
    date: "2026-08-03",  // Day 15
    question: "What percentage of the British public have ever used ChatGPT?",
    answer: 62,
    note: "Which leaves four in ten who've never touched it.",
    source: "Public First poll of 2,017 UK adults, 20–26 March 2026"
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
