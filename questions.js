/* =========================================================================
   CROWDSENSE — LAUNCH SCHEDULE · LAUNCH: MON 20 JULY 2026
   All figures verified against raw tables; each day's reveal cites its
   own source.

   Scheduling: each question carries a "date" (YYYY-MM-DD, London time) and
   runs on exactly that day. The undated Burnham-improvement taster runs on
   any day without a dated question — it is the fallback if the bank runs
   dry. Top up before 8 August.
   ========================================================================= */

var CS_QUESTIONS = [

  /* ---------- TASTER / FALLBACK (runs on any day without a dated question) */
  {
    date: "",
    question: "What percentage of Brits agreed Andy Burnham would be an improvement on Keir Starmer as Prime Minister?",
    answer: 49,
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },

  {
    date: "2026-07-20",  // Day 1
    question: "What percentage of the public think Andy Burnham will be a good leader?",
    answer: 40,
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-21",  // Day 2
    question: "What percentage of Brits agree that talking politics on a first date is usually a bad idea?",
    answer: 62,
    source: "Public First poll of 2,045 UK adults, 19–22 January 2026"
  },
  {
    date: "2026-07-22",  // Day 3
    question: "What percentage of the public say they have travelled outside of Europe?",
    answer: 76,
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-07-23",  // Day 4
    question: "What percentage of British adults say they gamble at least once a week?",
    answer: 25,
    source: "Public First poll of 2,076 UK adults, 29 May – 2 June 2026"
  },
  {
    date: "2026-07-24",  // Day 5
    question: "What percentage of Brits say they're currently registered on a dating app or website?",
    answer: 12,
    source: "Public First poll of 2,045 UK adults, 19–22 January 2026"
  },
  {
    date: "2026-07-25",  // Day 6
    question: "What percentage of Brits say they'd be willing to volunteer for military service if the UK mainland was invaded?",
    answer: 44,
    source: "Public First poll of 1,983 UK adults, 6–9 March 2026"
  },
  {
    date: "2026-07-26",  // Day 7
    question: "What percentage of UK workers said they didn't take a single day off work due to sickness in 2025?",
    answer: 41,
    source: "Public First poll of 1,308 working UK adults, 16–30 January 2026"
  },
  {
    date: "2026-07-27",  // Day 8
    question: "What percentage of Brits think the UK's best days are behind it?",
    answer: 37,
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-07-28",  // Day 9
    question: "What percentage of Brits say they have never tried a vape?",
    answer: 72,
    source: "Public First poll of 2,010 UK adults, 21 February – 5 March 2025"
  },
  {
    date: "2026-07-29",  // Day 10
    question: "What percentage of the public have an unfavourable view of Nigel Farage?",
    answer: 49,
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026"
  },
  {
    date: "2026-07-30",  // Day 11
    question: "What percentage of the public say they tend to buy organic products from the supermarket?",
    answer: 32,
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026"
  },
  {
    date: "2026-07-31",  // Day 12
    question: "What percentage of Brits say they watched or listened to any of Andy Burnham's first speech as Prime Minister outside 10 Downing Street?",
    answer: 55,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026"
  },
  {
    date: "2026-08-01",  // Day 13
    question: "What percentage of the public say they support allowing new oil and gas exploration in the North Sea?",
    answer: 64,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026"
  },
  {
    date: "2026-08-02",  // Day 14
    question: "What percentage of UK workers say they've been promoted at work in the past year?",
    answer: 30,
    source: "Public First poll of 1,352 working UK adults, 20–26 March 2026"
  },
  {
    date: "2026-08-03",  // Day 15
    question: "What percentage of Brits say they smoke every day?",
    answer: 12,
    source: "Public First poll of 2,010 UK adults, 21 February – 5 March 2025"
  },
  {
    date: "2026-08-04",  // Day 16
    question: "What percentage of **18–34 year-olds** say they have used AI to help write a break-up or rejection message?",
    answer: 10,
    source: "Public First poll of 2,045 UK adults, 19–29 January 2026"
  },
  {
    date: "2026-08-05",  // Day 17
    question: "What percentage of Brits say it's likely a nuclear weapon will be used in a conflict in the next five years?",
    answer: 44,
    source: "Public First poll of 2,024 UK adults, April 2026"
  },
  {
    date: "2026-08-06",  // Day 18
    question: "If a general election were called tomorrow, what percentage of Brits say they would vote Labour?",
    answer: 23,
    source: "Public First poll of 2,183 UK adults, 21–25 July 2026"
  },
  {
    date: "2026-08-07",  // Day 19
    question: "What percentage of Brits say they have absolutely no plans to start a business in the next five years?",
    answer: 62,
    source: "Public First poll of 4,158 UK adults, 19–29 January 2026"
  },
  {
    date: "2026-08-08",  // Day 20
    question: "What percentage of Londoners say they've attended a protest in the last year?",
    answer: 13,
    source: "Public First poll of 1,041 London adults, 19–22 June 2026"
  }

  /* ---------- SPARES (verified, unscheduled — slot in when needed) ----------
  ,{
    date: "",
    question: "What percentage of Brits say they have a Boots Advantage Card?",
    answer: 62,
    source: "Public First poll of 2,015 UK adults, 16–30 January 2026"
  }
  ,{
    date: "",
    question: "What percentage of Brits say they'd feel responsible for protecting their family if a war broke out?",
    answer: 90,
    source: "Public First poll of 1,983 UK adults, 6–9 March 2026"
  }
  ------------------------------------------------------------------------------- */
];
