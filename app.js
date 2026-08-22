// app.js — Crowdsense game engine
// Two guesses: instinct, then judgement. Score out of 100 rewards both.
"use strict";

// ===== config =====
var CONFIG = {
  ANCHOR: "2026-07-08",          // puzzle No. 1 date (London time) — set to launch day
  SITE_URL: "https://wnekaj.github.io/crowdsense/",
  TZ: "Europe/London",
  MAX_GUESSES: 1,
  BULLSEYE: 2,                   // within this = bullseye
  WIN_MARGIN: 10,                // within this = win (keeps the streak)
  FIRST_WEIGHT: 0.4,             // weighting only applies if MAX_GUESSES > 1
  FINAL_WEIGHT: 0.6,
  REVEAL_MS: 3400,               // Pointless-style countdown duration on reveal
  // Cloudflare Worker URL for the crowd layer (see worker/README.md).
  // Empty = crowd layer off.
  CROWD_API_URL: "",
  // Optional: published Google Sheet with columns date,question,answer,note,source.
  // Leave empty to use questions.js only (recommended — a published sheet is
  // publicly readable, so anyone can peek at tomorrow's answer).
  SHEET_PUBLISHED_URL: "",
  // Pretend a given day (YYYY-MM-DD) is today. Only the sandbox at /sandbox/
  // sets this, so it lets us preview a future question without waiting for it.
  // The live index.html never sets it, so live always uses the real date.
  TODAY: ""
};
// Site-specific overrides live in index.html (window.CS_CONFIG), so config
// changes don't require touching this file.
if (typeof window !== "undefined" && window.CS_CONFIG){
  for (var _k in window.CS_CONFIG){ if (window.CS_CONFIG[_k] !== undefined) CONFIG[_k] = window.CS_CONFIG[_k]; }
}

// ===== question bank =====
var BANK = (typeof CS_QUESTIONS !== "undefined" && CS_QUESTIONS.length) ? CS_QUESTIONS : [
  { date: "", question: "What percentage of Brits say they trust their neighbours?",
    answer: 54, note: "Placeholder question — add questions.js.", source: "Public First" }
];

// ===== day / date helpers =====
function safeTZ(){
  var tz = CONFIG.TZ || "Europe/London";
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }).format(new Date()); return tz; }
  catch (e) { return "Europe/London"; }
}
function getDayKey(){
  if (/^\d{4}-\d{2}-\d{2}$/.test(CONFIG.TODAY || "")) return CONFIG.TODAY;
  var parts = new Intl.DateTimeFormat("en-GB", { timeZone: safeTZ(), year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
  var y="",m="",d="";
  for (var i=0;i<parts.length;i++){
    if (parts[i].type==="year") y=parts[i].value;
    else if (parts[i].type==="month") m=parts[i].value;
    else if (parts[i].type==="day") d=parts[i].value;
  }
  return y+"-"+m+"-"+d;
}
function getYesterdayKey(key){
  var p = key.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1]-1, p[2]));
  d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
function daysSince(aKey, bKey){
  var a = aKey.split("-").map(Number), b = bKey.split("-").map(Number);
  return Math.floor(Date.UTC(b[0],b[1]-1,b[2])/86400000) - Math.floor(Date.UTC(a[0],a[1]-1,a[2])/86400000);
}
function keyForPuzzle(n){
  var p = CONFIG.ANCHOR.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1]-1, p[2]));
  d.setUTCDate(d.getUTCDate() + (n - 1));
  return d.toISOString().slice(0,10);
}
function puzzleNoForKey(key){ return Math.max(1, daysSince(CONFIG.ANCHOR, key) + 1); }
function formatKey(key){
  var p = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", day:"numeric", month:"short", year:"numeric" })
    .format(new Date(Date.UTC(p[0], p[1]-1, p[2])));
}

var DAY_KEY = getDayKey();
var PUZZLE_NO = puzzleNoForKey(DAY_KEY);

// ===== elements =====
function $(id){ return document.getElementById(id); }
var els = {
  puzzleNo: $("puzzleNo"), dailyDate: $("dailyDate"), streakBadge: $("streakBadge"),
  questionText: $("questionText"), kicker: $("kicker"),
  practiceBar: $("practiceBar"), practiceLabel: $("practiceLabel"), backToday: $("backToday"),
  guessRow: $("guessRow"), input: $("guessInput"), slider: $("guessSlider"), guessBtn: $("guessBtn"),
  guessDots: $("guessDots"),
  track: $("track"), trackWindow: $("trackWindow"), answerMarker: $("answerMarker"),
  ledger: $("ledger"),
  reveal: $("reveal"), verdict: $("verdict"), bigAnswer: $("bigAnswer"),
  revealFill: $("revealFill"), youMarker: $("youMarker"), youLabel: $("youLabel"),
  revealBarWrap: $("revealBarWrap"),
  sourceNote: $("sourceNote"),
  crowdBlock: $("crowdBlock"), crowdHead: $("crowdHead"), histo: $("histo"),
  shareBtn: $("shareBtn"),
  roundList: $("roundList"), revealTag: $("revealTag"), sourceBottom: $("sourceBottom"),
  runAvg: $("runAvg"),
  toast: $("toast"),
  helpBtn: $("helpBtn"), statsBtn: $("statsBtn"), archiveBtn: $("archiveBtn"), privacyBtn: $("privacyBtn"), contactBtn: $("contactBtn"),
  tour: $("tour"), tourSpot: $("tourSpot"), tourCard: $("tourCard"),
  tourText: $("tourText"), tourNext: $("tourNext"),
  archiveList: $("archiveList"),
  emailForm: $("emailForm"), emailInput: $("emailInput"), emailMsg: $("emailMsg"),
};

// set once the player opens their stats themselves; stops the post-reveal auto-open
var STATS_SEEN = false;

// ===== state =====
var MODE = "daily";                 // "daily" | "practice"
var CUR = null;                     // { dayKey, puzzleNo, q }
var Q = null;                       // current question (alias of CUR.q)
var state = { guesses: [], done: false, win: false, score: 0, crowdPct: null };
var minAllowed = 0, maxAllowed = 100;   // the squeeze window

// State is keyed by the day being played, so a past day's result is stored
// under its own date: it shows as done in the calendar and can't be replayed
// (and so can't be counted twice in the stats).
function stateKey(){ return "cs-state-" + ((CUR && CUR.dayKey) || DAY_KEY); }
function saveState(){
  try{ localStorage.setItem(stateKey(), JSON.stringify({ guesses: state.guesses, done: state.done })); }catch(_){}
}
function loadState(){
  try{
    var raw = localStorage.getItem(stateKey());
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (s && Array.isArray(s.guesses)) return s;
  }catch(_){}
  return null;
}

// ===== heat scale =====
function heat(err){
  if (err <= 2)  return { cls:"target", label:"On the pulse",  emoji:"🎯" };
  if (err <= 5)  return { cls:"hot",    label:"On the scent",  emoji:"🟩" };
  if (err <= 10) return { cls:"warm",   label:"In the mix",    emoji:"🟨" };
  if (err <= 20) return { cls:"cool",   label:"Warm-ish",  emoji:"🟧" };
  return           { cls:"cold",   label:"Out of touch", emoji:"🟥" };
}

// ===== scoring =====
// Golf scoring: your score is simply how many points you were off.
// 0 is perfect; lower is better. (With multiple guesses the final guess
// weighs heaviest, per the FIRST/FINAL weights.)
function computeScore(guesses, answer){
  var err1 = Math.abs(guesses[0] - answer);
  var errF = Math.abs(guesses[guesses.length-1] - answer);
  return Math.round(CONFIG.FIRST_WEIGHT * err1 + CONFIG.FINAL_WEIGHT * errF);
}

// ===== multi-part days =====
// Some days put the same question to several crossbreaks in turn — everyone,
// then men, then 18-24s, and so on. Each round is revealed before the next is
// asked, so what you learn compounds.
//
// Scoring: the day's score is the MEAN of the round errors, not the sum. That
// keeps a five-round day on the same 0-100 scale as an ordinary day, so it
// drops into the existing tiers (2/5/10/20), the Crowdsense average, the best
// score and the bullseye count without distorting any of them. A sum would
// make every multi-round day look roughly five times worse than a normal one
// and would wreck the average.
var ROUND = 0;
// How long the answer stays up before the next group is asked. The reveal
// animation runs first (CONFIG.REVEAL_MS), so this is reading time on top.
var ROUND_HOLD_MS = 1500;
var ROUND_TIMER = null;
// Any navigation away mid-run must kill the pending advance, or a stale timer
// would drag the player back into the run from wherever they went.
function clearRoundTimer(){
  if (ROUND_TIMER){ clearTimeout(ROUND_TIMER); ROUND_TIMER = null; }
}
function isMulti(q){
  var t = q || Q;
  return !!(t && t.parts && t.parts.length > 1);
}
function roundsOf(q){ return ((q || Q) || {}).parts || []; }
// A part's question reads "<category>: <stem>", with the category in bold.
// A part may override it outright with its own "question".
function partQuestion(i, q){
  var t = q || Q, p = roundsOf(t)[i];
  if (!p) return "";
  if (p.question) return p.question;
  return "**" + (p.ask || p.label) + "**: " + (t.stem || "");
}
// errors for the rounds played so far
function roundErrors(guesses, q){
  var gs = guesses || state.guesses, rs = roundsOf(q), out = [];
  for (var i = 0; i < gs.length && i < rs.length; i++) out.push(Math.abs(gs[i] - rs[i].answer));
  return out;
}
function meanErrExact(guesses, q){
  var e = roundErrors(guesses, q);
  if (!e.length) return 0;
  var sum = 0;
  for (var i = 0; i < e.length; i++) sum += e[i];
  return sum / e.length;
}
// the score that is recorded and shown as the verdict, on the same whole-number
// scale as every other day
function meanErr(guesses, q){ return Math.round(meanErrExact(guesses, q)); }

// ===== streak =====
function readStreak(){
  var c = parseInt(localStorage.getItem("streakCount")||"0",10);
  return { count: isFinite(c)?c:0, last: localStorage.getItem("lastWinDate")||"" };
}
function writeStreak(count, lastDate){
  try{
    localStorage.setItem("streakCount", String(count));
    localStorage.setItem("lastWinDate", lastDate||"");
    var best = parseInt(localStorage.getItem("bestStreak")||"0",10);
    if (count > best) localStorage.setItem("bestStreak", String(count));
  }catch(_){}
}
function resetStreakIfSkippedDay(){
  var s = readStreak();
  if (!s.count) return;
  if (s.last !== DAY_KEY && s.last !== getYesterdayKey(DAY_KEY)) writeStreak(0, s.last);
}
function updateStreakBadge(){
  if (!els.streakBadge) return;
  var s = readStreak();
  var show = s.count > 0 && (s.last === DAY_KEY || s.last === getYesterdayKey(DAY_KEY));
  // every bullseye (a within-2 "on the pulse" finish) is tallied for good
  var bullseyes = 0;
  try{ bullseyes = readStats().tiers.target || 0; }catch(_){}
  els.streakBadge.classList.toggle("hidden", !show && bullseyes === 0);
  var parts = [];
  if (show) parts.push("🔥 " + s.count);
  if (bullseyes > 0) parts.push("🎯 " + bullseyes);
  els.streakBadge.textContent = parts.join(" ");
}

// ===== stats =====
// Storage durability, in short: everything a player has is in this origin's
// localStorage. Two things can take it away without the player doing
// anything, and only one is fixable here.
//   * Eviction under storage pressure (Chrome/Firefox) — mitigated by the
//     navigator.storage.persist() request in index.html.
//   * Safari/iOS deletes script-writable storage after 7 days without a visit
//     to the site. Nothing client-side prevents that; installing the game to
//     the home screen exempts it, and only an off-device backup truly fixes
//     it. The heal* functions below recover everything that is still locally
//     recoverable after a partial loss.
function blankStats(){
  return { played:0, wins:0, tiers:{target:0,hot:0,warm:0,cool:0,cold:0}, firstErrSum:0, scoreSum:0, best:null };
}
function readStats(){
  var raw = null;
  try{ raw = localStorage.getItem("cs-stats"); }catch(_){ return blankStats(); }
  if (raw){
    var s = null;
    try{ s = JSON.parse(raw); }catch(_){}
    if (s && typeof s.played === "number"){
      if (!s.tiers) s.tiers = blankStats().tiers;
      return s;
    }
    // present but unusable — unparseable or the wrong shape. Keep a copy
    // rather than silently discarding it, so nothing is thrown away.
    try{ if (!localStorage.getItem("cs-stats-broken")) localStorage.setItem("cs-stats-broken", raw); }catch(_){}
  }
  return blankStats();
}
function writeStats(s){ try{ localStorage.setItem("cs-stats", JSON.stringify(s)); }catch(_){} }

// Every finished game also writes its own cs-state-<date> record, so the
// per-day history is an independent copy of the same facts. If the aggregate
// is lost or corrupted while those records survive, rebuild from them.
function statesFromHistory(){
  var out = [];
  try{
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (!k || k.indexOf("cs-state-") !== 0) continue;
      var day = k.slice(9);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      var st = null;
      try{ st = JSON.parse(localStorage.getItem(k) || "null"); }catch(_){ continue; }
      if (!st || !st.done || !st.guesses || !st.guesses.length) continue;
      out.push({ day: day, guesses: st.guesses });
    }
  }catch(_){}
  out.sort(function(a,b){ return a.day < b.day ? -1 : (a.day > b.day ? 1 : 0); });
  return out;
}
function statsFromHistory(){
  var s = blankStats();
  var days = statesFromHistory();
  for (var i = 0; i < days.length; i++){
    var q = pickQuestionForKey(days[i].day);
    if (!q) continue;
    var gs = days[i].guesses;
    // a multi-round day is scored on the mean of its rounds, same as when
    // it was played, so a rebuild can't disagree with the live tally
    var errF = isMulti(q) ? meanErrExact(gs, q) : Math.abs(gs[gs.length-1] - q.answer);
    var score = isMulti(q) ? meanErr(gs, q) : computeScore(gs, q.answer);
    s.played += 1;
    if (errF <= CONFIG.WIN_MARGIN) s.wins += 1;
    var t = heat(errF).cls;
    s.tiers[t] = (s.tiers[t]||0) + 1;
    s.firstErrSum += isMulti(q) ? errF : Math.abs(gs[0] - q.answer);
    s.scoreSum += score;
    s.best = (s.best === null) ? score : Math.min(s.best, score);
  }
  return s;
}
// Repairs are one-directional: a player's totals are never reduced, and the
// best score is never made worse, so a partial history can only ever help.
function healStatsFromHistory(){
  try{
    var stored = readStats();
    var rebuilt = statsFromHistory();
    var out = (rebuilt.played > stored.played) ? rebuilt : stored;
    if (rebuilt.best !== null && (out.best === null || out.best === undefined || rebuilt.best < out.best)){
      out.best = rebuilt.best;
    }
    if (out !== stored || out.best !== stored.best) writeStats(out);
  }catch(_){}
}
// The streak is consecutive days played, which the per-day records also imply.
function healStreakFromHistory(){
  try{
    var days = statesFromHistory().map(function(d){ return d.day; });
    if (!days.length) return;
    var yday = getYesterdayKey(DAY_KEY);
    var last = days[days.length-1];
    // only a run that is still alive (ends today or yesterday) counts
    var run = 0;
    if (last === DAY_KEY || last === yday){
      var expect = last;
      for (var i = days.length - 1; i >= 0; i--){
        if (days[i] !== expect) break;
        run++;
        expect = getYesterdayKey(expect);
      }
    }
    // longest run anywhere in the history, for bestStreak
    var longest = 1, cur = 1;
    for (var j = 1; j < days.length; j++){
      cur = (getYesterdayKey(days[j]) === days[j-1]) ? cur + 1 : 1;
      if (cur > longest) longest = cur;
    }
    var s = readStreak();
    if (run > s.count) writeStreak(run, last);
    var storedBest = 0;
    try{ storedBest = parseInt(localStorage.getItem("bestStreak")||"0",10) || 0; }catch(_){}
    if (longest > storedBest){ try{ localStorage.setItem("bestStreak", String(longest)); }catch(_){} }
  }catch(_){}
}
function recordResult(win, firstErr, finalErr, score){
  var s = readStats();
  s.played += 1;
  if (win) s.wins += 1;
  var t = heat(finalErr).cls;
  s.tiers[t] = (s.tiers[t]||0) + 1;
  s.firstErrSum += firstErr;
  s.scoreSum += score;
  // best day: the lowest score (0 = read the public perfectly)
  s.best = (s.best === null || s.best === undefined) ? score : Math.min(s.best, score);
  writeStats(s);
}
// Recompute the best (lowest) daily score from the per-day game states in
// localStorage. Fixes players whose 'best' was seeded from their first game
// after the field was introduced rather than from their true history.
function reconcileBestFromHistory(){
  try{
    var s = readStats();
    if (!s.played) return;
    var best = null;
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (!k || k.indexOf("cs-state-") !== 0) continue;
      var st = JSON.parse(localStorage.getItem(k) || "null");
      if (!st || !st.done || !st.guesses || !st.guesses.length) continue;
      var q = pickQuestionForKey(k.slice(9));
      if (!q) continue;
      var sc = computeScore(st.guesses, q.answer);
      if (best === null || sc < best) best = sc;
    }
    if (best !== null && (s.best === null || s.best === undefined || best < s.best)){
      s.best = best;
      writeStats(s);
    }
  }catch(_){}
}

function renderStats(){
  var s = readStats();
  $("stPlayed").textContent = s.played;
  // Crowdsense score: rolling average of how far off you are each day.
  // Lower is better; 0 means you read the public perfectly.
  var avg = s.played ? Math.round((s.scoreSum / s.played) * 10) / 10 : null;
  $("stWin").textContent = (avg === null) ? "–" : String(avg);
  // the average quietly takes the colour of the tier it falls in
  $("stWin").className = "v" + (avg === null ? "" : " " + heat(avg).cls);
  $("stStreak").textContent = readStreak().count;
  // Best = your lowest daily score; 0 is a perfect day
  $("stMax").textContent = (s.best === null || s.best === undefined) ? "–" : String(s.best);

  var rows = $("distRows");
  rows.innerHTML = "";
  var tiers = [
    { cls:"target", label:"🎯 On the pulse" },
    { cls:"hot",    label:"On the scent" },
    { cls:"warm",   label:"In the mix" },
    { cls:"cool",   label:"Warm-ish" },
    { cls:"cold",   label:"Out of touch" }
  ];
  var max = 1;
  tiers.forEach(function(t){ max = Math.max(max, s.tiers[t.cls]||0); });
  tiers.forEach(function(t){
    var n = s.tiers[t.cls]||0;
    var row = document.createElement("div");
    row.className = "distrow";
    var lab = document.createElement("span"); lab.className = "g"; lab.textContent = t.label;
    var wrap = document.createElement("div"); wrap.className = "distwrap";
    var bar = document.createElement("div"); bar.className = "distbar " + t.cls + (n ? "" : " zero");
    bar.style.width = Math.max(9, Math.round(100*n/max)) + "%";
    bar.textContent = n;
    wrap.appendChild(bar);
    row.appendChild(lab); row.appendChild(wrap);
    rows.appendChild(row);
  });

  var fe = $("firstErr");
  if (s.played){
    fe.textContent = "Your Crowdsense score is how far off you are on an average day.";
  } else {
    fe.textContent = "Play your first game to start measuring your crowdsense.";
  }
}

// ===== toast =====
var _toastTimer = null;
function toast(msg){
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ els.toast.classList.remove("show"); }, 2200);
}
function shakeInput(){
  if (!els.input) return;
  els.input.classList.add("shake");
  setTimeout(function(){ els.input.classList.remove("shake"); }, 450);
}

// ===== track (the squeeze) =====
function updateTrackWindow(){
  els.trackWindow.style.left = minAllowed + "%";
  els.trackWindow.style.width = Math.max(0, maxAllowed - minAllowed) + "%";
}
function applyGuessToWindow(g){
  if (Q.answer > g) minAllowed = Math.max(minAllowed, Math.min(100, g + 1));
  else if (Q.answer < g) maxAllowed = Math.min(maxAllowed, Math.max(0, g - 1));
  updateTrackWindow();
}

// ===== rendering =====
function renderDots(){
  els.guessDots.innerHTML = "";
  if (CONFIG.MAX_GUESSES < 2) return; // dots are meaningless with a single guess
  for (var i=0;i<CONFIG.MAX_GUESSES;i++){
    var dot = document.createElement("span");
    dot.className = "gdot" + (i < state.guesses.length ? " used" : "");
    els.guessDots.appendChild(dot);
  }
}
// ---- multi-part UI ----
// one pip per group, filled as each is answered
function renderRoundPips(){
  if (!els.guessDots) return;
  els.guessDots.innerHTML = "";
  if (!isMulti()) return;
  els.guessDots.setAttribute("aria-label", "Groups answered");
  var rs = roundsOf();
  for (var i = 0; i < rs.length; i++){
    var d = document.createElement("span");
    d.className = "gdot" + (i < state.guesses.length ? " used" : "");
    els.guessDots.appendChild(d);
  }
}
// hand the input back for the next group
function paintRound(){
  renderQuestionText(partQuestion(ROUND));
  // The bar belongs to the part that has just been revealed, so it is taken
  // away while the next part is asked — leaving it up made the day look
  // finished. The tally and the running score stay, and they now carry the
  // figure, so nothing is lost by clearing the bar.
  if (els.revealBarWrap) els.revealBarWrap.classList.add("hidden");
  hideRevealTag();
  // the reveal itself only holds the tally between parts
  if (!state.guesses.length) els.reveal.classList.add("hidden");
  if (els.shareBtn) els.shareBtn.classList.add("hidden");
  els.input.disabled = false;
  els.slider.disabled = false;
  els.guessBtn.disabled = false;
  els.guessRow.classList.remove("hidden");
  els.guessDots.classList.remove("hidden");
  // The slider stays where the player left it between groups: the answer for
  // one group is the natural starting point for the next, so resetting to 50
  // would throw away the anchor they've just been given. The box is kept in
  // step with it rather than blanked.
  var held = Math.round(Number(els.slider.value));
  if (!isFinite(held) || held < 0 || held > 100) held = 50;
  els.slider.value = held;
  els.slider.style.setProperty("--fill", held + "%");
  els.input.value = String(held);
  renderRoundPips();
  setKickerForTurn();
  try{ els.input.focus(); }catch(_){}
}
// The running tally: one cell per part, laid out in a row — the category
// name with a coloured box beneath carrying that part's score. Parts not yet
// asked keep their place as a blank grey box, so the row never jumps and
// nothing is given away about what is coming.
// The Crowdsense score for the day so far: the running average of the parts
// answered, to one decimal, coloured by the tier it currently falls in — the
// same treatment the stats tile gives the lifetime average.
function renderRunAvg(){
  if (!els.runAvg) return;
  var errs = roundErrors();
  if (!errs.length){ els.runAvg.classList.add("hidden"); return; }
  var avg = meanErrExact();
  var h = heat(avg);
  var done = state.done && errs.length >= roundsOf().length;
  // once every part is in, this line IS the result: score and category
  // together, so there is no second verdict line saying the same thing
  els.runAvg.className = "runavg" + (done ? " dayscore" : "");
  // the category is kept in one piece so a narrow screen breaks the line
  // before the dash rather than orphaning the last word of it
  els.runAvg.innerHTML = 'Crowdsense score <b class="' + h.cls + '">' + avg.toFixed(1) + '</b>' +
    (done ? (' <span class="ra-cat">— ' + h.label + '</span>') : '');
  els.runAvg.classList.remove("hidden");
}
function renderRoundList(){
  if (!els.roundList) return;
  var rs = roundsOf(), errs = roundErrors();
  if (!errs.length){ els.roundList.classList.add("hidden"); return; }
  var html = "";
  for (var i = 0; i < rs.length; i++){
    var done = i < errs.length;
    var cls = done ? heat(errs[i]).cls : "pending";
    // an exact read earns a bullseye in its box
    var txt = done ? ((errs[i] === 0 ? "🎯 " : "") + errs[i] + " off") : "";
    // a miniature of the reveal bar: the fill is where the public landed, the
    // mark is where you guessed, in the colour of how close that was
    var bar = '<div class="rbar">' +
      (done
        ? ('<div class="rfill" style="width:' + rs[i].answer + '%"></div>' +
           '<div class="rmark t-' + cls + '" style="left:' + state.guesses[i] + '%"></div>')
        : "") +
    '</div>';
    html += '<div class="rcell">' +
      '<span class="rlabel">' +
        (done ? ('<span class="rcat">' + rs[i].label + '</span><b>' + rs[i].answer + '%</b>') : "") +
      '</span>' +
      '<span class="rchip ' + cls + '">' + txt + '</span>' +
      bar +
    '</div>';
  }
  els.roundList.innerHTML = html;
  els.roundList.classList.remove("hidden");
  renderRunAvg();
}

// The answer rides the end of the bar on a short leader line,
// at reading size, rather than landing underneath it as a display number.
// Called on every animation frame so the figure counts up as the bar travels.
function paintRevealTag(v){
  if (!els.revealTag) return;
  var pct = Math.max(0, Math.min(100, v));
  els.revealTag.classList.remove("hidden");
  if (els.revealBarWrap) els.revealBarWrap.classList.add("tagged");
  // the tag is centred on the end of the fill, nudged in at the extremes so a
  // figure near 0 or 100 can't hang off the edge of the bar
  els.revealTag.style.left = Math.min(Math.max(pct, 7), 93) + "%";
  var num = els.revealTag.querySelector(".rt-num");
  if (num) num.textContent = Math.round(pct) + "%";
}
function hideRevealTag(){
  if (els.revealTag) els.revealTag.classList.add("hidden");
  if (els.revealBarWrap) els.revealBarWrap.classList.remove("tagged");
}

// Once every part is in, the big bar is retired: each part keeps a miniature
// of it under its own score box, so a single bar showing only the last part
// would be the odd one out.
function hideDayBar(){
  if (els.revealBarWrap) els.revealBarWrap.classList.add("hidden");
  hideRevealTag();
}

// Paint the guess marker in the colour of how close that guess was, rather
// than always orange.
function tintGuessMark(err){
  var cls = heat(err).cls;
  ["target","hot","warm","cool","cold"].forEach(function(c){
    els.youMarker.classList.remove("t-" + c);
    els.youLabel.classList.remove("t-" + c);
  });
  els.youMarker.classList.add("t-" + cls);
  els.youLabel.classList.add("t-" + cls);
}

// Mid-round reveal: the figure and nothing else. No verdict, no source and no
// table until the day is over, so the run is four answers in a row rather than
// four scored results, and the scoring lands once at the end.
function revealRound(i){
  var r = roundsOf()[i];
  var g = state.guesses[i];
  els.verdict.textContent = "";
  els.verdict.className = "verdict";
  els.bigAnswer.textContent = "";
  els.bigAnswer.classList.add("hidden");
  els.sourceNote.textContent = "";
  els.sourceNote.classList.add("hidden");
  tintGuessMark(Math.abs(g - r.answer));
  els.youMarker.style.left = g + "%";
  els.youLabel.style.left = g + "%";
  els.youLabel.textContent = g;
  els.youMarker.classList.remove("on");
  els.youLabel.classList.remove("on");
  els.reveal.classList.remove("hidden");
  if (els.revealBarWrap) els.revealBarWrap.classList.remove("hidden");
  var marked = false;
  els.reveal.classList.add("staging");
  els.revealFill.style.width = "0%";
  paintRevealTag(0);
  animateValue(0, r.answer, CONFIG.REVEAL_MS, function(v){
    els.revealFill.style.width = v + "%";
    paintRevealTag(v);
    if (!marked && v >= g){ marked = true; els.youMarker.classList.add("on"); els.youLabel.classList.add("on"); }
  }, function(){
    if (!marked){ els.youMarker.classList.add("on"); els.youLabel.classList.add("on"); }
    setTimeout(function(){
      els.reveal.classList.remove("staging");
      renderRoundList();
      // hold on the figure long enough to read it, then move straight on
      ROUND_TIMER = setTimeout(nextRound, ROUND_HOLD_MS);
    }, 350);
  });
}
// A refresh mid-run comes back between parts, where there is no bar — just
// the tally of what has been answered so far.
function paintRestoredReveal(i){
  if (i < 0) return;
  els.verdict.textContent = "";
  els.verdict.className = "verdict";
  els.sourceNote.textContent = "";
  els.sourceNote.classList.add("hidden");
  els.bigAnswer.textContent = "";
  els.bigAnswer.classList.add("hidden");
  els.reveal.classList.remove("staging");
  els.reveal.classList.remove("hidden");
  renderRoundList();
}
function nextRound(){
  clearRoundTimer();
  if (ROUND >= roundsOf().length - 1) return;
  ROUND += 1;
  paintRound();
}

function renderLedgerRow(n, g){
  if (CONFIG.MAX_GUESSES < 2) return; // single-guess mode: the reveal bar carries the guess
  var err = Math.abs(g - Q.answer);
  var h = heat(err);
  var row = document.createElement("div");
  row.className = "lrow";
  var dir;
  if (err <= CONFIG.BULLSEYE) dir = "·";
  else if (Q.answer > g) dir = "↑";
  else dir = "↓";
  var dirTitle = (dir === "↑") ? "The real figure is higher" : (dir === "↓") ? "The real figure is lower" : "On target";
  row.innerHTML =
    '<span class="lnum">' + n + '</span>' +
    '<span class="lval">' + g + '</span>' +
    '<span class="ldir" title="' + dirTitle + '">' + dir + '</span>' +
    '<i class="hdot ' + h.cls + '" title="' + h.label + '"></i>';
  els.ledger.appendChild(row);
}
function setKickerForTurn(){
  if (!els.kicker) return;
  if (state.done){
    els.kicker.textContent = (MODE === "practice")
      ? "Pick another from the archive, or head back to today."
      : "Come back tomorrow for question #" + (PUZZLE_NO + 1) + ".";
    return;
  }
  if (isMulti()){
    var n = roundsOf().length;
    els.kicker.textContent = (ROUND === 0)
      ? "Five groups, same question. Start with everyone."
      : "Group " + (ROUND + 1) + " of " + n + ".";
    return;
  }
  if (state.guesses.length === 0) els.kicker.textContent = "Guess the percentage. First your instinct…";
  else els.kicker.textContent = "…now your judgement. One guess left.";
}

function verdictForErr(err){
  var off = err + " off — ";
  if (err <= 2)  return { text: off + "on the pulse" };
  if (err <= 5)  return { text: off + "on the scent" };
  if (err <= 10) return { text: off + "in the mix" };
  if (err <= 20) return { text: off + "warm-ish" };
  return { text: off + "out of touch" };
}
function verdictFor(guesses, answer, win){
  return verdictForErr(Math.abs(guesses[guesses.length-1] - answer));
}

// ===== crowd layer =====
// isFresh = the guess was just made. Restored results only read the
// distribution; they must never re-submit a guess made on an earlier visit.
// On a multi-part day there is no single guess to pool, so the crowd layer
// compares DAY SCORES instead: each player contributes the mean they ended on,
// and the line reads the same way ("closer than X% of players") because a
// lower score is a better read.
//
// No worker change is needed for this. Each day has its own puzzle number and
// every player that day plays the same format, so the pool for a multi-part
// day contains only scores, and the worker's distribution of them is exactly
// what renderCrowdScore wants. The mode=score marker rides along so the stored
// rows can be told apart later; the worker ignores it. The one thing to
// remember is that for those puzzle numbers the "guess" column holds a score.
function crowdFlow(finalGuess, isFresh){
  if (!CONFIG.CROWD_API_URL) return;
  var base = String(CONFIG.CROWD_API_URL).replace(/\/+$/, "");
  // Keyed to the day being played, so past questions pool with the players
  // who answered them on the day.
  var dayKey = CUR.dayKey;
  // Pre-launch taster days record under high test IDs (99990, 99991, ...)
  // so real puzzle numbers start clean on launch day.
  var crowdPuzzle = isPreLaunch(dayKey)
    ? 100000 + daysSince(CONFIG.ANCHOR, dayKey)
    : CUR.puzzleNo;
  var sentKey = "cs-crowd-sent-" + dayKey;
  var already = false;
  try{ already = !!localStorage.getItem(sentKey); }catch(_){}

  // a multi-part day pools the day's score; every other day pools the guess
  var MULTI = isMulti();
  var value = MULTI ? meanErr() : finalGuess;
  var mode = MULTI ? "score" : "guess";

  var p;
  if (already || !isFresh){
    p = fetch(base + "/dist?puzzle=" + crowdPuzzle + "&mode=" + mode).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  } else {
    p = fetch(base + "/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzle: crowdPuzzle, guess: value, mode: mode })
    }).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      try{ localStorage.setItem(sentKey, "1"); }catch(_){}
      return r.json();
    });
  }
  p.then(function(dist){ MULTI ? renderCrowdScore(dist, value) : renderCrowd(dist, finalGuess); })
   .catch(function(err){ console.warn("Crowd layer unavailable", err); });
}

// Multi-part day: counts are indexed by day score (0-100, lower is better),
// so "further away" means a higher score than yours.
function renderCrowdScore(dist, myScore){
  if (!dist || !dist.total || !Array.isArray(dist.counts)) return;
  var counts = dist.counts, total = dist.total;
  var worse = 0;
  for (var v = 0; v <= 100; v++){ if (counts[v] && v > myScore) worse += counts[v]; }
  var pct = Math.round(100 * worse / total);
  state.crowdPct = pct;
  els.crowdHead.innerHTML = (total === 1)
    ? "First player today"
    : "Closer than <b>" + pct + "%</b> of players";

  // Scores bunch up near zero, so unlike the guess histogram this one is a
  // point per bar across 0-19, with everything worse folded into a 20+ bar.
  var BINS = 21;
  var bins = new Array(BINS).fill(0);
  function binOf(v){ return Math.min(BINS - 1, v); }
  for (var g = 0; g <= 100; g++){ if (counts[g]) bins[binOf(g)] += counts[g]; }
  var maxBin = Math.max.apply(null, bins) || 1;
  els.histo.innerHTML = "";
  var youBin = binOf(myScore);
  for (var bnd = 0; bnd < BINS; bnd++){
    var bar = document.createElement("div");
    // bin 0 is a perfect day — the equivalent of the truth marker
    bar.className = "hbar" + (bnd === youBin ? " you" : "") + (bnd === 0 ? " truth" : "");
    bar.style.height = Math.max(4, Math.round(100 * bins[bnd] / maxBin)) + "%";
    bar.title = (bnd === BINS - 1 ? (BINS - 1) + "+ off: " : bnd + " off: ") +
      bins[bnd] + (bins[bnd] === 1 ? " player" : " players");
    els.histo.appendChild(bar);
  }
  els.crowdBlock.classList.remove("hidden");
}

function renderCrowd(dist, myGuess){
  if (!dist || !dist.total || !Array.isArray(dist.counts)) return;
  var counts = dist.counts, total = dist.total;
  var myErr = Math.abs(myGuess - Q.answer);

  // percentile: share of all recorded players who were further from the truth
  var further = 0;
  for (var v=0; v<=100; v++){
    if (counts[v] && Math.abs(v - Q.answer) > myErr) further += counts[v];
  }
  var pct = Math.round(100 * further / total);
  state.crowdPct = pct;
  els.crowdHead.innerHTML = (total === 1)
    ? "First player today"
    : "Closer than <b>" + pct + "%</b> of players";

  // histogram: 20 bins of 5 points (100 folds into the last bin)
  var bins = new Array(20).fill(0);
  function binOf(v){ return Math.min(19, Math.floor(v / 5)); }
  for (var g=0; g<=100; g++){ if (counts[g]) bins[binOf(g)] += counts[g]; }
  var maxBin = Math.max.apply(null, bins) || 1;

  els.histo.innerHTML = "";
  var youBin = binOf(myGuess), truthBin = binOf(Q.answer);
  for (var b=0; b<20; b++){
    var bar = document.createElement("div");
    bar.className = "hbar" + (b === youBin ? " you" : "") + (b === truthBin ? " truth" : "");
    bar.style.height = Math.max(4, Math.round(100 * bins[b] / maxBin)) + "%";
    bar.title = (b*5) + "–" + (b === 19 ? 100 : b*5+4) + "%: " + bins[b] + (bins[b] === 1 ? " player" : " players");
    els.histo.appendChild(bar);
  }
  els.crowdBlock.classList.remove("hidden");
  updateShareForCrowd();
}
function updateShareForCrowd(){ /* share text reads state.crowdPct at click time */ }

// ===== presentation: reveal animations =====
function reducedMotion(){
  return (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) || !window.requestAnimationFrame;
}
// Eased value animation, decelerating hard as it approaches the target —
// the Pointless effect: fast at first, agonising at the end.
function animateValue(from, to, duration, onFrame, onDone){
  if (reducedMotion()){
    onFrame(to);
    if (onDone) onDone();
    return;
  }
  var start = null;
  function step(ts){
    if (start === null) start = ts;
    var t = Math.min(1, (ts - start) / (duration || 1000));
    var eased = 1 - Math.pow(1 - t, 4);
    onFrame(from + eased * (to - from));
    if (t < 1) requestAnimationFrame(step);
    else if (onDone) onDone();
  }
  requestAnimationFrame(step);
}
function animateCount(el, to, suffix, duration, from, onDone){
  animateValue((from === undefined || from === null) ? 0 : from, to, duration, function(v){
    el.textContent = Math.round(v) + (suffix || "");
  }, onDone);
}

// ===== finishing =====
function finishGame(alreadyDone){
  state.done = true;
  // On a multi-round day the day's number is the mean of the round errors,
  // and the bar settles on the last group's figure.
  var MULTI = isMulti();
  var dayAnswer = MULTI ? roundsOf()[roundsOf().length-1].answer : Q.answer;
  state.score = MULTI ? meanErr() : computeScore(state.guesses, Q.answer);
  // the exact mean drives the tier and the win, so the category recorded is
  // the one shown next to the decimal; the SCORE stays a whole number
  var errF = MULTI ? meanErrExact() : Math.abs(state.guesses[state.guesses.length-1] - Q.answer);
  var err1 = MULTI ? meanErr() : Math.abs(state.guesses[0] - Q.answer);
  state.win = errF <= CONFIG.WIN_MARGIN;

  els.input.disabled = true;
  els.slider.disabled = true;
  els.guessBtn.disabled = true;
  els.guessRow.classList.add("hidden");
  els.guessDots.classList.add("hidden");
  els.track.parentElement.classList.add("hidden");

  // a multi-part day says it once, in the Crowdsense line below the bar
  var v = MULTI ? { text: "" } : verdictFor(state.guesses, Q.answer, state.win);
  els.verdict.textContent = v.text;
  els.verdict.className = "verdict " + (state.win ? "win" : "loss");
  els.verdict.classList.toggle("hidden", MULTI);
  // multi-round days carry the figure on the bar instead of below it
  els.bigAnswer.textContent = MULTI ? "" : (dayAnswer + "%");
  els.bigAnswer.classList.toggle("hidden", MULTI);
  if (!MULTI) hideRevealTag();
  var finalGuessVal = state.guesses[state.guesses.length-1];
  els.youMarker.style.left = finalGuessVal + "%";
  els.youLabel.style.left = finalGuessVal + "%";
  els.youLabel.textContent = finalGuessVal;
  function showGuessMark(){
    els.youMarker.classList.add("on");
    els.youLabel.classList.add("on");
  }
  els.youMarker.classList.remove("on");
  els.youLabel.classList.remove("on");
  if (els.revealBarWrap) els.revealBarWrap.classList.remove("hidden");
  // the marker sits on the last group's bar, so it takes that group's colour
  if (MULTI) tintGuessMark(Math.abs(finalGuessVal - dayAnswer));
  if (alreadyDone){
    els.revealFill.style.width = dayAnswer + "%";
    if (MULTI){ hideDayBar(); renderQuestionText(Q.question); }
    showGuessMark();
  } else {
    // Pointless-style reveal: the bar crawls along the 0-100 scale toward
    // the true figure, decelerating as it closes in. Your guess mark stays
    // hidden until the fill reaches it — or the fill stops short of it.
    // Everything else holds back until the bar stops.
    var marked = false;
    els.reveal.classList.add("staging");
    els.revealFill.style.width = "0%";
    if (MULTI) paintRevealTag(0);
    animateValue(0, dayAnswer, CONFIG.REVEAL_MS, function(v){
      els.revealFill.style.width = v + "%";
      if (MULTI) paintRevealTag(v);
      if (!marked && v >= finalGuessVal){ marked = true; showGuessMark(); }
    }, function(){
      if (!marked) showGuessMark();
      setTimeout(function(){
        els.reveal.classList.remove("staging");
        // the last cell and the day's Crowdsense score land with the figure,
        // and the big bar steps aside now every part has its own
        if (MULTI){
          renderRoundList();
          hideDayBar();
          // the day is over, so the heading stops asking about the last group
          // and returns to the question's own neutral wording
          renderQuestionText(Q.question);
        }
        // update the header badge only now the answer is on screen, so a
        // bullseye 🎯 never gives itself away before the reveal lands
        updateStreakBadge();
      }, 350);
    });
  }
  // multi-part days carry the source at the foot of the page instead, clear
  // of the result; single-question days keep it under the reveal as before
  var src = Q.source ? ("Source: " + Q.source) : "";
  els.sourceNote.textContent = MULTI ? "" : src;
  els.sourceNote.classList.toggle("hidden", MULTI);
  if (els.sourceBottom){
    els.sourceBottom.textContent = MULTI ? src : "";
    els.sourceBottom.classList.toggle("hidden", !MULTI || !src);
  }
  els.reveal.classList.remove("hidden");
  if (MULTI){
    clearRoundTimer();
    if (els.shareBtn) els.shareBtn.classList.remove("hidden");
    // A staged reveal fills the last cell and the day's score only once the
    // bar has landed — otherwise the final Crowdsense score is on screen
    // before the figure it is derived from. Restored days paint at once.
    if (!els.reveal.classList.contains("staging")) renderRoundList();
  }

  setKickerForTurn();

  if (!alreadyDone){
    // Every finished game counts toward the stats, past days included.
    // The streak is consecutive days of the daily puzzle only.
    if (MODE === "daily"){
      var s = readStreak();
      var next = (s.last === getYesterdayKey(DAY_KEY)) ? s.count + 1 : 1;
      if (s.last === DAY_KEY) next = s.count; // safety: never double-count a day
      writeStreak(next, DAY_KEY);
    }
    recordResult(state.win, err1, errF, state.score);
    // badge update is deferred to the reveal-complete callback (staged),
    // or fires here for the non-staged path, so 🎯 stays hidden until land
    if (!els.reveal.classList.contains("staging")) updateStreakBadge();
    saveState();
    // the tour waits until the player has seen the answer and dismissed stats
    armTour();
    // surface the record once the reveal has landed, unless the player
    // has already opened it (or another modal) themselves
    var statsDelay = els.reveal.classList.contains("staging") ? CONFIG.REVEAL_MS + 2200 : 1400;
    setTimeout(function(){
      if (!STATS_SEEN && !document.querySelector(".modal-root:not(.hidden)")){
        renderStats();
        openModal("statsModal");
        return;
      }
      // stats didn't auto-open (already seen, or another panel is up) — run
      // the tour once nothing is covering the screen
      if (TOUR_PENDING && !document.querySelector(".modal-root:not(.hidden)")) startTour();
    }, statsDelay);
  }
  crowdFlow(state.guesses[state.guesses.length-1], !alreadyDone);
}

// ===== one-off tour =====
// A short click-through that points out the header buttons. It runs once per
// device: after a player finishes a game and closes their stats. Players who
// were already playing before the tour existed get it once too.
var TOUR_KEY = "cs-tour-v1";
var TOUR_PENDING = false, TOUR_STEP = -1, TOUR_STEPS = [];

function tourSeen(){
  try{ return !!localStorage.getItem(TOUR_KEY); }catch(_){ return true; }
}
function markTourSeen(){
  try{ localStorage.setItem(TOUR_KEY, "1"); }catch(_){}
}
// called when a game finishes: queue the tour for when stats is dismissed
function armTour(){
  if (!els.tour || tourSeen()) return;
  TOUR_PENDING = true;
}
// Players who have already played get the tour straight away on landing.
// Brand-new players get it after their first game instead, when the header
// buttons actually mean something to them.
function maybeStartTourOnLoad(){
  if (!els.tour || tourSeen()) return;
  var played = 0;
  try{ played = readStats().played || 0; }catch(_){}
  if (played < 1) return;
  setTimeout(function(){
    if (tourSeen() || TOUR_STEP >= 0) return;
    if (document.querySelector(".modal-root:not(.hidden)")) return;
    startTour();
  }, 700);
}
function startTour(){
  if (!els.tour || tourSeen()) return;
  TOUR_PENDING = false;
  TOUR_STEPS = [
    { el: els.statsBtn,   text: "<b>Your stats.</b> Your Crowdsense score, streak and record live here." },
    { el: els.archiveBtn, text: "<b>Past questions.</b> Play any day you've missed." },
    { el: els.helpBtn,    text: "<b>How to play.</b> The rules and the scoring, whenever you need them." }
  ].filter(function(s){ return s.el; });
  if (!TOUR_STEPS.length) return;
  TOUR_STEP = 0;
  els.tour.classList.remove("hidden");
  paintTourStep();
  window.addEventListener("resize", paintTourStep);
}
function paintTourStep(){
  var step = TOUR_STEPS[TOUR_STEP];
  if (!step) return;
  var r = step.el.getBoundingClientRect();
  var pad = 6;
  els.tourSpot.style.top = (r.top - pad) + "px";
  els.tourSpot.style.left = (r.left - pad) + "px";
  els.tourSpot.style.width = (r.width + pad*2) + "px";
  els.tourSpot.style.height = (r.height + pad*2) + "px";
  els.tourText.innerHTML = step.text;
  els.tourNext.textContent = (TOUR_STEP === TOUR_STEPS.length - 1) ? "Got it" : "Next";
  // card sits under the highlighted button, kept inside the viewport
  var cardW = Math.min(280, window.innerWidth * 0.8);
  var left = Math.min(Math.max(8, r.left + r.width/2 - cardW/2), window.innerWidth - cardW - 8);
  els.tourCard.style.top = (r.bottom + 14) + "px";
  els.tourCard.style.left = left + "px";
}
function advanceTour(){
  if (TOUR_STEP < 0) return;
  if (TOUR_STEP < TOUR_STEPS.length - 1){ TOUR_STEP++; paintTourStep(); return; }
  endTour();
}
function endTour(){
  TOUR_STEP = -1;
  TOUR_PENDING = false;
  markTourSeen();
  if (els.tour) els.tour.classList.add("hidden");
  window.removeEventListener("resize", paintTourStep);
}

// ===== guessing =====
function submitGuess(){
  if (state.done) return;
  var raw = String(els.input.value || "").trim();
  var g = Math.round(Number(raw));
  if (raw === "" || !isFinite(g) || g < 0 || g > 100){
    shakeInput();
    toast("Enter a whole number between 0 and 100");
    return;
  }
  if (g < minAllowed || g > maxAllowed){
    shakeInput();
    toast("You already know the answer is between " + minAllowed + "% and " + maxAllowed + "% — don't waste the guess");
    return;
  }

  // multi-round day: bank the guess, reveal that group, wait for "Next"
  if (isMulti()){
    state.guesses.push(g);
    saveState();
    renderRoundPips();
    // the guess bar stays in place while the figure comes up — only locked
    els.input.disabled = true;
    els.slider.disabled = true;
    els.guessBtn.disabled = true;
    if (state.guesses.length >= roundsOf().length) finishGame(false);
    else revealRound(ROUND);
    return;
  }

  state.guesses.push(g);
  renderLedgerRow(state.guesses.length, g);
  applyGuessToWindow(g);
  renderDots();
  saveState();

  var err = Math.abs(g - Q.answer);
  if (err <= CONFIG.BULLSEYE || state.guesses.length >= CONFIG.MAX_GUESSES){
    finishGame(false);
    return;
  }

  setKickerForTurn();
  els.input.value = "";
  try{ els.input.focus(); }catch(_){}
}

// ===== share =====
// includeUrl=false leaves the link out of the text — used with the native
// share sheet, where the URL travels as its own field so the target renders
// a proper link preview (site icon, OG card) instead of a plain-text glyph.
// five-square bracket meter: one filled square per tier reached (best = 5),
// each in the tier's share colour, the rest empty. Plain-text so it renders
// anywhere (WhatsApp, iMessage, etc.).
function shareMeter(err){
  var cls = heat(err).cls;
  var m = {
    target: { n:5, sq:"🟩" },   // on the pulse
    hot:    { n:4, sq:"🟩" },   // on the scent
    warm:   { n:3, sq:"🟨" },   // in the mix
    cool:   { n:2, sq:"🟧" },   // warm-ish
    cold:   { n:1, sq:"🟥" }    // out of touch
  }[cls];
  var out = "";
  for (var i=0; i<5; i++) out += (i < m.n) ? m.sq : "⬜";
  // a bullseye (on the pulse) gets a target right after the five squares
  if (cls === "target") out += "🎯";
  return out;
}
// Multi-round day: one square per group, coloured by how that group went, so
// the five squares carry the shape of the day rather than a single tier. A
// bullseye group shows as 🎯, which keeps all five tiers distinguishable
// (on the pulse and on the scent are both green otherwise).
function shareMeterMulti(){
  var sq = { target:"🎯", hot:"🟩", warm:"🟨", cool:"🟧", cold:"🟥" };
  var e = roundErrors(), out = "";
  for (var i = 0; i < e.length; i++) out += sq[heat(e[i]).cls];
  return out;
}
function shareText(includeUrl){
  var lines = [];
  lines.push("Crowdsense #" + CUR.puzzleNo);
  if (isMulti()){
    lines.push(shareMeterMulti() + " " + state.score + " off");
  } else {
  var finalErr = Math.abs(state.guesses[state.guesses.length-1] - Q.answer);
  lines.push(shareMeter(finalErr) + " " + state.score + " off");
  }
  if (MODE === "daily" && state.crowdPct !== null && state.crowdPct !== undefined){
    lines.push("Closer than " + state.crowdPct + "% of players");
  }
  if (includeUrl !== false) lines.push(CONFIG.SITE_URL);
  return lines.join("\n");
}
// Fallback copy for insecure contexts and older browsers, where the
// share/clipboard APIs don't exist.
function legacyCopy(text){
  try{
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }catch(_){ return false; }
}
function doShare(){
  if (navigator.share){
    // URL lives in the text on its own line; no separate url field, which
    // WhatsApp would otherwise append to the previous line.
    navigator.share({ title: "Crowdsense", text: shareText(true) }).catch(function(){});
    return;
  }
  var text = shareText();
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text)
      .then(function(){ toast("Result copied — paste it anywhere"); })
      .catch(function(){
        if (legacyCopy(text)) toast("Result copied — paste it anywhere");
        else toast("Couldn't copy — select and copy manually");
      });
    return;
  }
  if (legacyCopy(text)) toast("Result copied — paste it anywhere");
  else toast("Couldn't copy — select and copy manually");
}

// ===== date ticker =====
// "12 Aug" for a day key, read as a plain calendar date rather than an instant
function formatDayShort(key){
  var p = String(key || "").split("-").map(Number);
  if (p.length !== 3 || !isFinite(p[0])) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", day:"numeric", month:"short" })
    .format(new Date(Date.UTC(p[0], p[1]-1, p[2])));
}
function paintDayDate(key){
  if (!els.dailyDate) return;
  els.dailyDate.textContent = formatDayShort(key);
}
function startDailyTicker(){ paintDayDate(DAY_KEY); }

// ===== modals =====
function openModal(id){ var m = $(id); if (m) m.classList.remove("hidden"); }
function closeModal(id){
  var m = $(id); if (m) m.classList.add("hidden");
  // closing the stats tile is the tour's cue
  if (id === "statsModal" && TOUR_PENDING) setTimeout(startTour, 260);
}
document.addEventListener("click", function(e){
  var t = e.target.closest("[data-close]");
  if (t) closeModal(t.getAttribute("data-close"));
});
document.addEventListener("keydown", function(e){
  if (e.key === "Escape"){ closeModal("helpModal"); closeModal("statsModal"); closeModal("archiveModal"); closeModal("privacyModal"); closeModal("contactModal"); }
});
if (els.helpBtn) els.helpBtn.addEventListener("click", function(){ openModal("helpModal"); });
if (els.statsBtn) els.statsBtn.addEventListener("click", function(){ STATS_SEEN = true; renderStats(); openModal("statsModal"); });
// the whole overlay is a click target: click anywhere to advance
if (els.tour) els.tour.addEventListener("click", advanceTour);
document.addEventListener("keydown", function(e){
  if (TOUR_STEP < 0) return;
  if (e.key === "Escape") endTour();
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advanceTour(); }
});
if (els.archiveBtn) els.archiveBtn.addEventListener("click", function(){ calY = null; renderArchive(); openModal("archiveModal"); });
if (els.privacyBtn) els.privacyBtn.addEventListener("click", function(){ openModal("privacyModal"); });
if (els.contactBtn) els.contactBtn.addEventListener("click", function(){ openModal("contactModal"); });

// ===== archive / practice =====
// A month calendar: past puzzle days are clickable and open that day's
// question in practice mode. Days you've completed carry a small dot.
var calY = null, calM = null; // displayed month; reset each time the modal opens

function monthKeyOf(y, m){ return y + "-" + String(m).padStart(2, "0"); }

function renderArchive(){
  var list = els.archiveList;
  list.innerHTML = "";
  if (PUZZLE_NO <= 1){
    var p = document.createElement("p");
    p.className = "archive-empty";
    p.textContent = "No past questions yet — today's is #1. Come back tomorrow and the calendar starts filling up.";
    list.appendChild(p);
    return;
  }
  if (calY === null){
    var tp = DAY_KEY.split("-").map(Number);
    calY = tp[0]; calM = tp[1];
  }
  renderCalendar();
}

function renderCalendar(){
  var list = els.archiveList;
  list.innerHTML = "";
  var anchorMK = CONFIG.ANCHOR.slice(0, 7);
  var todayMK = DAY_KEY.slice(0, 7);
  var curMK = monthKeyOf(calY, calM);

  var head = document.createElement("div");
  head.className = "calhead";
  // SVG chevrons rather than ‹ › glyphs: text arrows sit off-centre because
  // of the font's side bearings, an SVG is centred by geometry
  var chevron = function(dir){
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
           'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           '<path d="' + (dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") + '"/></svg>';
  };
  var prev = document.createElement("button");
  prev.type = "button"; prev.className = "calnav"; prev.innerHTML = chevron("prev");
  prev.setAttribute("aria-label", "Previous month");
  prev.disabled = curMK <= anchorMK;
  prev.addEventListener("click", function(){ calM--; if (calM < 1){ calM = 12; calY--; } renderCalendar(); });
  var label = document.createElement("span");
  label.className = "callabel";
  label.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(Date.UTC(calY, calM - 1, 1)));
  var next = document.createElement("button");
  next.type = "button"; next.className = "calnav"; next.innerHTML = chevron("next");
  next.setAttribute("aria-label", "Next month");
  next.disabled = curMK >= todayMK;
  next.addEventListener("click", function(){ calM++; if (calM > 12){ calM = 1; calY++; } renderCalendar(); });
  head.appendChild(prev); head.appendChild(label); head.appendChild(next);
  list.appendChild(head);

  var grid = document.createElement("div");
  grid.className = "calgrid";
  ["M","T","W","T","F","S","S"].forEach(function(w){
    var el = document.createElement("span");
    el.className = "calwd"; el.textContent = w;
    grid.appendChild(el);
  });
  var firstDow = (new Date(Date.UTC(calY, calM - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  for (var i = 0; i < firstDow; i++) grid.appendChild(document.createElement("span"));
  var daysInMonth = new Date(Date.UTC(calY, calM, 0)).getUTCDate();
  for (var d = 1; d <= daysInMonth; d++){
    var key = curMK + "-" + String(d).padStart(2, "0");
    var cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-day";
    cell.textContent = d;
    var playable = key >= CONFIG.ANCHOR && key < DAY_KEY;
    if (key === DAY_KEY){
      cell.classList.add("today");
      cell.title = "Today's question";
      cell.addEventListener("click", function(){
        closeModal("archiveModal");
        setupGame(DAY_KEY, "daily");
      });
    } else if (!playable){
      cell.classList.add("off");
      cell.disabled = true;
    } else {
      cell.classList.add("avail");
      cell.title = "#" + puzzleNoForKey(key);
      try{
        var st = JSON.parse(localStorage.getItem("cs-state-" + key) || "null");
        if (st && st.done) cell.classList.add("done");
      }catch(_){}
      (function(k){
        cell.addEventListener("click", function(){
          closeModal("archiveModal");
          setupGame(k, "practice");
        });
      })(key);
    }
    grid.appendChild(cell);
  }
  list.appendChild(grid);
}

// ===== question selection (same question for everyone, everywhere) =====
function pickQuestionForKey(key){
  var dated = BANK.filter(function(q){ return (q.date||"") === key; });
  if (dated.length) return dated[0];
  var pool = BANK.filter(function(q){ return !(q.date||"").length; });
  if (!pool.length) pool = BANK;
  // deterministic rotation, stable order
  var sorted = pool.slice().sort(function(a,b){
    var x = String(a.question).toLowerCase(), y = String(b.question).toLowerCase();
    return x < y ? -1 : (x > y ? 1 : 0);
  });
  var offset = Math.abs(daysSince(CONFIG.ANCHOR, key)) % sorted.length;
  return sorted[offset];
}

// Before launch day the dummy question runs; it plays normally but must not
// feed the crowd data for puzzle No. 1.
function isPreLaunch(dayKey){ return daysSince(CONFIG.ANCHOR, dayKey) < 0; }

// Questions may emphasise a phrase with **double asterisks**. Everything is
// HTML-escaped first, so only that one markup can ever reach the DOM.
function renderQuestionText(text){
  var safe = String(text || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  els.questionText.innerHTML = safe;
}

// ===== game setup (daily or practice) =====
function setupGame(dayKey, mode){
  MODE = mode;
  CUR = { dayKey: dayKey, puzzleNo: puzzleNoForKey(dayKey), q: pickQuestionForKey(dayKey) };
  Q = CUR.q;
  state = { guesses: [], done: false, win: false, score: 0, crowdPct: null };
  minAllowed = 0; maxAllowed = 100;

  els.puzzleNo.textContent = "#" + CUR.puzzleNo;
  // the date has to follow the day being played, not the wall clock, or a past
  // question shows today's date beside that day's puzzle number
  paintDayDate(dayKey);
  renderQuestionText(Q.question);
  els.ledger.innerHTML = "";
  els.reveal.classList.add("hidden");
  els.crowdBlock.classList.add("hidden");
  els.answerMarker.classList.add("hidden");
  els.answerMarker.style.left = "0%";
  els.input.disabled = false;
  els.slider.disabled = false;
  els.guessBtn.disabled = false;
  els.guessRow.classList.remove("hidden");
  els.guessDots.classList.remove("hidden");
  // the squeeze track only earns its place when there is a second guess to aim
  els.track.parentElement.classList.toggle("hidden", CONFIG.MAX_GUESSES < 2);
  els.input.value = "";
  els.slider.value = 50;
  els.slider.style.setProperty("--fill", "50%");
  updateTrackWindow();
  renderDots();
  setKickerForTurn();

  els.practiceBar.classList.toggle("hidden", mode !== "practice");
  els.practiceLabel.textContent = "";
  // reset the multi-round furniture: a single-question day must never inherit
  // a hidden share button, a stale group table or a pending auto-advance
  clearRoundTimer();
  hideRevealTag();
  els.bigAnswer.classList.remove("hidden");
  els.verdict.className = "verdict";
  els.verdict.classList.remove("hidden");
  els.sourceNote.classList.remove("hidden");
  if (els.sourceBottom){ els.sourceBottom.textContent = ""; els.sourceBottom.classList.add("hidden"); }
  if (els.shareBtn) els.shareBtn.classList.remove("hidden");
  if (els.roundList){ els.roundList.innerHTML = ""; els.roundList.classList.add("hidden"); }
  if (els.runAvg){ els.runAvg.innerHTML = ""; els.runAvg.classList.add("hidden"); }

  // multi-round day: play the groups in order
  if (isMulti()){
    ROUND = 0;   // the tally and running score were cleared just above
    paintRound();
    var savedM = loadState();
    if (savedM && savedM.guesses.length){
      state.guesses = savedM.guesses.slice(0, roundsOf().length);
      ROUND = Math.min(state.guesses.length, roundsOf().length - 1);
      renderRoundPips();
      if (savedM.done || state.guesses.length >= roundsOf().length){
        finishGame(true);
      } else {
        // mid-run refresh: put the last group's bar and the tally back, then
        // pick up at the next group that hasn't been asked
        paintRestoredReveal(state.guesses.length - 1);
        ROUND = state.guesses.length;
        paintRound();
      }
    }
    return;
  }

  // restore any saved result for this day, today's or a past one
  var saved = loadState();
  if (saved && saved.guesses.length){
    saved.guesses.forEach(function(g){
      state.guesses.push(g);
      renderLedgerRow(state.guesses.length, g);
      applyGuessToWindow(g);
    });
    renderDots();
    if (saved.done) finishGame(true);
    else setKickerForTurn();
  }
}

// ===== email capture =====
function handleEmailSubmit(e){
  e.preventDefault();
  var form = e.target;
  var input = form.querySelector("input[type=email]");
  var msg = form.querySelector(".email-msg");
  var email = (input && input.value || "").trim();
  if (!email || !msg) return;
  msg.textContent = "Submitting…";
  fetch(form.action, { method:"POST", headers:{ "Accept":"application/json" }, body: new FormData(form) })
    .then(function(res){ if (res.ok) return res.json(); throw new Error("Subscribe failed"); })
    .then(function(){ msg.textContent = "Thanks! Check your inbox to confirm."; try{ form.reset(); }catch(_){} })
    .catch(function(){ msg.textContent = "Sorry — there was a problem. Please try again."; });
}

// ===== optional Google Sheet loader (columns: date, question, answer, note, source) =====
function normalizeToCSV(url){
  if (!url) return "";
  var m = /gid=([0-9]+)/.exec(url); var gid = m ? "&gid="+m[1] : "";
  if (/\/pubhtml(\?|$)/.test(url)) return url.replace(/\/pubhtml(\?.*)?$/,"/pub?output=csv"+gid);
  if (/\/pub(\?|$)/.test(url) && url.indexOf("output=csv")===-1) return url.replace(/\/pub(\?.*)?$/,"/pub?output=csv");
  return url;
}
function parseCSV(text){
  var rows=[],row=[],field="",inQuotes=false,i,c;
  for(i=0;i<text.length;i++){
    c=text[i];
    if (inQuotes){
      if (c === '"'){ if (text[i+1] === '"'){ field+='"'; i++; } else { inQuotes=false; } }
      else { field+=c; }
    } else {
      if (c === '"') inQuotes=true;
      else if (c === ","){ row.push(field); field=""; }
      else if (c === "\n"){ row.push(field); rows.push(row); row=[]; field=""; }
      else if (c === "\r"){ }
      else { field+=c; }
    }
  }
  if (field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}
function normalizeDateYMD(s){
  s = String(s||"").trim();
  if (!s) return "";
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + "-" + m[2].padStart(2,"0") + "-" + m[3].padStart(2,"0");
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return m[3] + "-" + m[2].padStart(2,"0") + "-" + m[1].padStart(2,"0");
  return "";
}
function rowsToQuestions(rows){
  var header = rows[0].map(function(h){ return String(h||"").trim().toLowerCase(); });
  var di = header.indexOf("date"), qi = header.indexOf("question"), ai = header.indexOf("answer");
  var ni = header.indexOf("note"), si = header.indexOf("source");
  if (qi < 0 || ai < 0) throw new Error("Sheet needs 'question' and 'answer' columns");
  var out = [];
  rows.slice(1).forEach(function(row){
    if (!row || !row.length) return;
    var q = (row[qi]||"").trim();
    var a = Math.round(Number(String(row[ai]||"").replace(/[^0-9.+-]/g,"")));
    if (!q || !isFinite(a) || a < 0 || a > 100) return;
    out.push({
      date: di>=0 ? normalizeDateYMD(row[di]) : "",
      question: q,
      answer: a,
      note: ni>=0 ? (row[ni]||"").trim() : "",
      source: si>=0 ? (row[si]||"").trim() : ""
    });
  });
  if (!out.length) throw new Error("Parsed 0 questions");
  return out;
}
function loadQuestions(){
  if (!CONFIG.SHEET_PUBLISHED_URL) return Promise.resolve(BANK);
  return fetch(normalizeToCSV(CONFIG.SHEET_PUBLISHED_URL), { cache:"no-store" })
    .then(function(resp){ if(!resp.ok) throw new Error("HTTP "+resp.status); return resp.text(); })
    .then(function(text){
      var out = rowsToQuestions(parseCSV(text));
      console.log("Loaded " + out.length + " questions from sheet");
      return out;
    })
    .catch(function(err){
      console.warn("Sheet load failed, using embedded questions", err);
      return BANK;
    });
}

// ===== init =====
(function init(){
  loadQuestions().then(function(bank){
    BANK = bank;

    // recover anything the browser dropped before touching the streak, so a
    // rebuilt run isn't immediately treated as a skipped day
    healStatsFromHistory();
    healStreakFromHistory();
    resetStreakIfSkippedDay();
    reconcileBestFromHistory();
    startDailyTicker();
    updateStreakBadge();
    setupGame(DAY_KEY, "daily");
    // no how-to pop-up: the ? button opens it. Returning players get the
    // one-off tour now; first-timers get it after their first finished game.
    maybeStartTourOnLoad();
  }).catch(function(err){
    console.error("Init failed", err);
    els.questionText.textContent = "Something went wrong loading today's question — refresh to try again.";
  });
})();

// ===== stale-tab guard =====
// Phones resurrect old tabs (bfcache, app switcher) hours or days later.
// Whenever the page comes back into view, check the London day: if the tab
// still shows a previous day's question in daily mode, reload for today's.
function reloadIfNewDay(){
  try{
    if (MODE === "daily" && getDayKey() !== DAY_KEY) location.reload();
  }catch(_){}
}
window.addEventListener("pageshow", function(e){ if (e.persisted) reloadIfNewDay(); });
document.addEventListener("visibilitychange", function(){
  if (document.visibilityState === "visible") reloadIfNewDay();
});

// ===== events =====
els.guessBtn.addEventListener("click", submitGuess);
els.input.addEventListener("keydown", function(e){ if (e.key === "Enter") submitGuess(); });
els.input.addEventListener("input", function(){
  var v = Math.round(Number(els.input.value));
  if (isFinite(v) && v >= 0 && v <= 100){
    els.slider.value = v;
    els.slider.style.setProperty("--fill", v + "%");
  }
});
els.slider.addEventListener("input", function(){
  els.input.value = els.slider.value;
  els.slider.style.setProperty("--fill", els.slider.value + "%");
});
if (els.backToday) els.backToday.addEventListener("click", function(){ setupGame(DAY_KEY, "daily"); });
if (els.shareBtn) els.shareBtn.addEventListener("click", doShare);
Array.prototype.forEach.call(document.querySelectorAll("form.email-form"), function(f){
  f.addEventListener("submit", handleEmailSubmit);
});
