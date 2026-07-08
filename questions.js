// questions.js — Crowdsense question bank
//
// Each entry:
//   date     Optional "YYYY-MM-DD" (London time). If a question carries today's
//            date it runs that exact day. Undated questions rotate automatically,
//            one per day, in a fixed order that is the same for every player.
//   question The question as shown to the player. Phrase it so the answer is a
//            percentage of the British public, e.g. "What percentage of Brits say…"
//   answer   The real polled figure, a whole number 0-100.
//   note     One line shown on the reveal — the "huh, interesting" fact people
//            screenshot. Keep it under ~140 characters.
//   source   The fieldwork line, e.g. "Public First poll of 2,106 UK adults, July 2025".
//
// >>> EVERY ANSWER BELOW IS A PLACEHOLDER. Replace with real polling before launch. <<<

var CS_QUESTIONS = [
  {
    date: "",
    question: "What percentage of Brits say it's never acceptable to shoplift, even small items from big chains?",
    answer: 61,
    note: "PLACEHOLDER — swap in the real figure and a one-line note before launch.",
    source: "Public First poll of 2,106 UK adults, July 2025"
  },
  {
    date: "",
    question: "What percentage of Brits say they would report a close friend for tax evasion?",
    answer: 18,
    note: "PLACEHOLDER — swap in the real figure and a one-line note before launch.",
    source: "Public First poll of 2,106 UK adults, July 2025"
  },
  {
    date: "",
    question: "What percentage of Brits say they trust their neighbours?",
    answer: 54,
    note: "PLACEHOLDER — swap in the real figure and a one-line note before launch.",
    source: "Public First poll of 2,106 UK adults, July 2025"
  },
  {
    date: "",
    question: "What percentage of Brits say the country was better off 20 years ago?",
    answer: 47,
    note: "PLACEHOLDER — swap in the real figure and a one-line note before launch.",
    source: "Public First poll of 2,106 UK adults, July 2025"
  },
  {
    date: "",
    question: "What percentage of Brits say they would take a 10% pay cut to work a four-day week?",
    answer: 38,
    note: "PLACEHOLDER — swap in the real figure and a one-line note before launch.",
    source: "Public First poll of 2,106 UK adults, July 2025"
  }
];
