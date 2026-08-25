/* =========================================================================
   CROWDSENSE — LAUNCH SCHEDULE · LAUNCH: MON 20 JULY 2026
   All figures verified against raw tables; each day's reveal cites its
   own source.

   Scheduling: each question carries a "date" (YYYY-MM-DD, London time) and
   runs on exactly that day. The undated Burnham-improvement taster runs on
   any day without a dated question — it is the fallback if the bank runs
   dry. Top up before 24 August.

   Email-only fields, both optional and ignored by the game:
     teaser — the short hook used in the daily email's subject line. If a
              question has none, email.html derives one from the question
              text, which is safe but usually too long for a subject.
     fact   — the reveal sentence after the percentage, e.g. "of Brits
              say ...". Only needed when the question doesn't begin
              "What percentage of ...", since email.html otherwise builds
              this from the question itself.
   ========================================================================= */

var CS_QUESTIONS = [

  /* ---------- TASTER / FALLBACK (runs on any day without a dated question) */
  {
    date: "",
    question: "What percentage of Brits agreed Andy Burnham would be an improvement on Keir Starmer as Prime Minister?",
    answer: 49,
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026",
    teaser: "Is Burnham an upgrade on Starmer?"
  },

  {
    date: "2026-07-20",  // Day 1
    question: "What percentage of the public think Andy Burnham will be a good leader?",
    answer: 40,
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026",
    teaser: "How many back Burnham as leader?"
  },
  {
    date: "2026-07-21",  // Day 2
    question: "What percentage of Brits agree that talking politics on a first date is usually a bad idea?",
    answer: 62,
    source: "Public First poll of 2,045 UK adults, 19–22 January 2026",
    teaser: "Is politics a first-date dealbreaker?"
  },
  {
    date: "2026-07-22",  // Day 3
    question: "What percentage of the public say they have travelled outside of Europe?",
    answer: 76,
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026",
    teaser: "How many Brits have left Europe?"
  },
  {
    date: "2026-07-23",  // Day 4
    question: "What percentage of British adults say they gamble at least once a week?",
    answer: 25,
    source: "Public First poll of 2,076 UK adults, 29 May – 2 June 2026",
    teaser: "How many Brits gamble every week?"
  },
  {
    date: "2026-07-24",  // Day 5
    question: "What percentage of Brits say they're currently registered on a dating app or website?",
    answer: 12,
    source: "Public First poll of 2,045 UK adults, 19–22 January 2026",
    teaser: "How many Brits are on dating apps?"
  },
  {
    date: "2026-07-25",  // Day 6
    question: "What percentage of Brits say they'd be willing to volunteer for military service if the UK mainland was invaded?",
    answer: 44,
    source: "Public First poll of 1,983 UK adults, 6–9 March 2026",
    teaser: "Who would sign up if Britain was invaded?"
  },
  {
    date: "2026-07-26",  // Day 7
    question: "What percentage of UK workers said they didn't take a single day off work due to sickness in 2025?",
    answer: 41,
    source: "Public First poll of 1,308 working UK adults, 16–30 January 2026",
    teaser: "How many took no sick days last year?"
  },
  {
    date: "2026-07-27",  // Day 8
    question: "What percentage of Brits think the UK's best days are behind it?",
    answer: 37,
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026",
    teaser: "Are Britain's best days behind it?"
  },
  {
    date: "2026-07-28",  // Day 9
    question: "What percentage of Brits say they have never tried a vape?",
    answer: 72,
    source: "Public First poll of 2,010 UK adults, 21 February – 5 March 2025",
    teaser: "How many have never touched a vape?"
  },
  {
    date: "2026-07-29",  // Day 10
    question: "What percentage of the public have an unfavourable view of Nigel Farage?",
    answer: 49,
    source: "Public First poll of 2,013 UK adults, 26–29 June 2026",
    teaser: "How unpopular is Nigel Farage?"
  },
  {
    date: "2026-07-30",  // Day 11
    question: "What percentage of the public say they tend to buy organic products from the supermarket?",
    answer: 32,
    source: "Public First poll of 3,025 UK adults, 13–15 March 2026",
    teaser: "How many Brits buy organic?"
  },
  {
    date: "2026-07-31",  // Day 12
    question: "What percentage of Brits say they watched or listened to any of Andy Burnham's first speech as Prime Minister outside 10 Downing Street?",
    answer: 55,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026",
    teaser: "Who watched Burnham's first speech?"
  },
  {
    date: "2026-08-01",  // Day 13
    question: "What percentage of the public say they support allowing new oil and gas exploration in the North Sea?",
    answer: 64,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026",
    teaser: "Do Brits want more North Sea drilling?"
  },
  {
    date: "2026-08-02",  // Day 14
    question: "What percentage of UK workers say they've been promoted at work in the past year?",
    answer: 30,
    source: "Public First poll of 1,352 working UK adults, 20–26 March 2026",
    teaser: "How many workers got promoted?"
  },
  {
    date: "2026-08-03",  // Day 15
    question: "What percentage of Brits say they smoke every day?",
    answer: 12,
    source: "Public First poll of 2,010 UK adults, 21 February – 5 March 2025",
    teaser: "How many Brits smoke every day?"
  },
  {
    date: "2026-08-04",  // Day 16
    question: "What percentage of **18–34 year-olds** say they have used AI to help write a break-up or rejection message?",
    answer: 10,
    source: "Public First poll of 2,045 UK adults, 19–29 January 2026",
    teaser: "Who's using AI to dump people?"
  },
  {
    date: "2026-08-05",  // Day 17
    question: "What percentage of Brits say it's likely a nuclear weapon will be used in a conflict in the next five years?",
    answer: 44,
    source: "Public First poll of 2,024 UK adults, April 2026",
    teaser: "How many expect a nuclear strike?"
  },
  {
    date: "2026-08-06",  // Day 18
    question: "If a general election were called tomorrow, what percentage of Brits say they would vote Labour?",
    answer: 23,
    source: "Public First poll of 2,183 UK adults, 21–25 July 2026",
    teaser: "How many would vote Labour tomorrow?",
    // question doesn't start "What percentage of ...", so spell the line out
    fact: "of Brits say they would vote Labour if a general election were called tomorrow"
  },
  {
    date: "2026-08-07",  // Day 19
    question: "What percentage of Brits say they have absolutely no plans to start a business in the next five years?",
    answer: 62,
    source: "Public First poll of 4,158 UK adults, 19–29 January 2026",
    teaser: "How many will never start a business?"
  },
  {
    date: "2026-08-08",  // Day 20
    question: "What percentage of Londoners say they've attended a protest in the last year?",
    answer: 13,
    source: "Public First poll of 1,041 London adults, 19–22 June 2026",
    teaser: "How many Londoners are protesting?"
  },
  {
    date: "2026-08-09",  // Day 21
    question: "What percentage of Brits support scrapping the planned digital ID scheme?",
    answer: 67,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026",
    teaser: "Do Brits want digital ID scrapped?"
  },
  {
    date: "2026-08-10",  // Day 22
    question: "What percentage of Brits support capping bus fares in England at £2?",
    answer: 73,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026",
    teaser: "How popular is the £2 bus fare cap?"
  },
  {
    date: "2026-08-11",  // Day 23
    question: "What percentage of Brits name levels of immigration as one of the top three issues facing the country?",
    answer: 41,
    source: "Public First poll of 1,995 UK adults, 24–27 July 2026",
    teaser: "How big an issue is immigration?"
  },
  {
    date: "2026-08-12",  // Day 24
    question: "What percentage of Brits say they go to the gym at least once a week?",
    answer: 23,
    source: "Public First poll of 2,015 UK adults, 16–30 January 2026",
    teaser: "How many Brits go to the gym weekly?"
  },
  {
    date: "2026-08-13",  // Day 25
    question: "What percentage of Brits say they have not been ill at all in the past year?",
    answer: 35,
    source: "Public First poll of 2,015 UK adults, 16–30 January 2026",
    teaser: "How many Brits dodged illness all year?"
  },
  {
    date: "2026-08-14",  // Day 26
    question: "What percentage of Brits trust pharmacists to give them accurate medical advice?",
    answer: 79,
    source: "Public First poll of 2,015 UK adults, 16–30 January 2026",
    teaser: "Do Brits trust their pharmacist?"
  },
  {
    date: "2026-08-15",  // Day 27
    question: "What percentage of Brits feel optimistic about the impact of technology on society?",
    answer: 61,
    source: "Public First poll of 5,578 UK adults, 20 March – 2 April 2026",
    teaser: "Are Brits optimistic about tech?"
  },
  {
    date: "2026-08-16",  // Day 28
    question: "What percentage of **UK workers** say they feel confident in their abilities at work?",
    answer: 92,
    source: "Public First poll of 4,118 working UK adults, 20 March – 2 April 2026",
    teaser: "How confident are Brits at work?"
  },
  {
    date: "2026-08-17",  // Day 29
    question: "What percentage of Brits describe themselves as thick-skinned?",
    answer: 44,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "How thick-skinned are Brits?"
  },
  {
    date: "2026-08-18",  // Day 30
    question: "What percentage of Brits say they do not believe in a god or gods?",
    answer: 41,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "How many Brits are non-believers?"
  },
  {
    date: "2026-08-19",  // Day 31
    question: "What percentage of Brits say they always ask if anyone else wants a cup of tea when they make one?",
    answer: 80,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "Do Brits offer you a cuppa?"
  },
  {
    date: "2026-08-20",  // Day 32
    question: "What percentage of Brits say they like to take the mick out of other people?",
    answer: 34,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "How many Brits take the mick?"
  },
  {
    date: "2026-08-21",  // Day 33
    // deliberately the disagree side of the statement, not the agree side
    question: "What percentage of Brits disagree that everyone should buy a round at the pub?",
    answer: 20,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "Who objects to buying a round?"
  },
  {
    date: "2026-08-22",  // Day 34
    question: "What percentage of Brits think families should eat together?",
    answer: 75,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "Should families eat together?"
  },
  {
    date: "2026-08-23",  // Day 35
    question: "What percentage of Brits agree that Britain is the greatest country in the world?",
    answer: 44,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "Is Britain the greatest country?"
  },
  {
    date: "2026-08-24",  // Day 36 — the first multi-part day
    question: "What percentage of Brits say they currently use Instagram?",
    answer: 53,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "How many Brits use Instagram?",
    // MULTI-PART DAY. The same question is put to four groups in turn, each
    // revealed before the next is asked. The day's score is the mean of the
    // four errors, so it sits on the same scale as an ordinary day.
    //   stem   the question asked of every part, written once
    //   parts  label (short, for the score box) · ask (how the category reads
    //          in the question, defaults to label) · answer
    // Part one is the whole population — "All adults" by default — and the
    // heading returns to the neutral "question" above once the day is over.
    stem: "What percentage say they currently use Instagram?",
    // 53 and 49 are read straight off the total and male columns. The tables
    // publish 18-24 / 25-34 and 55-64 / 65+ separately, with no combined
    // bands, so those two are the weighted means of the pairs:
    //   18-34  (82 x 557 + 79 x 681) / 1238 = 80.4  -> 80
    //   55+    (30 x 562 + 17 x 841) / 1403 = 22.2  -> 22
    parts: [
      { label: "All adults", ask: "All adults",       answer: 53 },
      { label: "Men",        ask: "Men",              answer: 49 },
      { label: "18–34s",     ask: "18–34 year-olds",  answer: 80 },
      { label: "55+",        ask: "55s and over",     answer: 22 }
    ]
  },
  {
    date: "2026-08-25",  // Day 37 — back to the standard single-question format
    question: "What percentage of Brits say they have sung the national anthem at a public event in the past year?",
    answer: 40,
    source: "Public First poll of 4,005 UK adults, 24–30 October 2025",
    teaser: "How many Brits sang the anthem this year?",
    // 40 is the net of the four recency bands in the total column, which the
    // tables publish separately rather than as a running total:
    //   past week 5 + past month 10 + past six months 12 + past year 13 = 40
  },
  {
    date: "2026-08-26",  // Day 38
    question: "What percentage of Brits say they have ever ridden in a fully self-driving car?",
    answer: 17,
    // 17 is "yes, multiple times" 7 + "yes, once" 10.
    // Asked of 1,180 of the 2,051 (weighted), a 57.5% split. That sub-sample's
    // age profile matches the full sample's — every band within about one
    // standard error, chi-square 3.98 on 5 df, p = 0.55 — so it reads as a
    // random split rather than a screened group, and the figure carries to
    // all UK adults.
    source: "Public First poll of 1,180 UK adults, 2–9 May 2026",
    teaser: "Who's ridden in a driverless car?"
  },
  {
    date: "2026-08-27",  // Day 39
    question: "What percentage of Brits say they have already been in a relationship with an AI boyfriend or girlfriend?",
    answer: 6,
    source: "Public First poll of 2,051 UK adults, 2–9 May 2026",
    teaser: "How many Brits have had an AI partner?"
  },
  {
    date: "2026-08-28",  // Day 40
    question: "What percentage of Brits say that someone in a committed relationship using an AI for sexual or intimate interactions is cheating?",
    answer: 53,
    // 53 is "definitely cheating" 27 + "probably cheating" 26
    source: "Public First poll of 2,051 UK adults, 2–9 May 2026",
    teaser: "Is using an AI for intimacy cheating?"
  },
  {
    date: "2026-08-29",  // Day 41
    question: "What percentage of Brits say they have shared political content with friends or family in the past month?",
    answer: 18,
    source: "Public First poll of 2,005 UK adults, 24–28 April 2026",
    teaser: "How many Brits share political content?"
  },
  {
    date: "2026-08-30",  // Day 42
    question: "What percentage of Brits agree we should pause the development of AI until we can be sure it is safe?",
    answer: 60,
    // 60 is the three agree bands: strongly 24 + moderately 16 + a little 20
    source: "Public First poll of 2,051 UK adults, 2–9 May 2026",
    teaser: "How many Brits want to pause AI?"
  }

  /* ---------- SPARES (verified, unscheduled — slot in when needed) ----------
  ,{
    date: "",
    question: "What percentage of Brits say they have a Boots Advantage Card?",
    answer: 62,
    source: "Public First poll of 2,015 UK adults, 16–30 January 2026",
    teaser: "How many Brits carry a Boots card?"
  }
  ,{
    date: "",
    question: "What percentage of Brits say they'd feel responsible for protecting their family if a war broke out?",
    answer: 90,
    source: "Public First poll of 1,983 UK adults, 6–9 March 2026",
    teaser: "Who'd protect their family in a war?"
  }
  ------------------------------------------------------------------------------- */
];
