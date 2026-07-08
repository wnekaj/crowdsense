// app.js — Crowdsense game engine
// Two guesses: instinct, then judgement. Score out of 100 rewards both.
"use strict";

// ===== config =====
var CONFIG = {
  ANCHOR: "2026-07-08",          // puzzle No. 1 date (London time) — set to launch day
  SITE_URL: "https://wnekaj.github.io/crowdsense/",
  TZ: "Europe/London",
  MAX_GUESSES: 2,
  BULLSEYE: 2,                   // within this on the FIRST guess ends the game instantly
  WIN_MARGIN: 5,                 // final guess within this = win (keeps the streak)
  FIRST_WEIGHT: 0.4,             // how much the first guess counts toward the score
  FINAL_WEIGHT: 0.6,             // how much the final guess counts
  // Optional: published Google Sheet with columns date,question,answer,note,source.
  // Leave empty to use questions.js only (recommended — a published sheet is
  // publicly readable, so anyone can peek at tomorrow's answer).
  SHEET_PUBLISHED_URL: ""
};

// ===== question bank =====
var QUESTIONS = (typeof CS_QUESTIONS !== "undefined" && CS_QUESTIONS.length) ? CS_QUESTIONS : [
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

var DAY_KEY = getDayKey();
var PUZZLE_NO = Math.max(1, daysSince(CONFIG.ANCHOR, DAY_KEY) + 1);

// ===== elements =====
function $(id){ return document.getElementById(id); }
var els = {
  puzzleNo: $("puzzleNo"), dailyDate: $("dailyDate"), streakBadge: $("streakBadge"),
  questionText: $("questionText"), kicker: $("kicker"),
  guessRow: $("guessRow"), input: $("guessInput"), slider: $("guessSlider"), guessBtn: $("guessBtn"),
  guessDots: $("guessDots"),
  track: $("track"), trackWindow: $("trackWindow"), answerMarker: $("answerMarker"),
  ledger: $("ledger"),
  reveal: $("reveal"), verdict: $("verdict"), bigAnswer: $("bigAnswer"),
  scoreLine: $("scoreLine"), answerNote: $("answerNote"), sourceNote: $("sourceNote"),
  shareBtn: $("shareBtn"), countdown: $("countdown"),
  toast: $("toast"),
  helpBtn: $("helpBtn"), statsBtn: $("statsBtn"),
  helpModal: $("helpModal"), statsModal: $("statsModal"),
  emailForm: $("emailForm"), emailInput: $("emailInput"), emailMsg: $("emailMsg")
};

// ===== state =====
var Q = null;                       // today's question
var state = { guesses: [], done: false, win: false, score: 0 };
var minAllowed = 0, maxAllowed = 100;   // the squeeze window

function stateKey(){ return "cs-state-" + DAY_KEY; }
function saveState(){ try{ localStorage.setItem(stateKey(), JSON.stringify(state)); }catch(_){} }
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
  if (err <= 2)  return { cls:"target", label:"On target", emoji:"🎯" };
  if (err <= 5)  return { cls:"hot",    label:"Hot",       emoji:"🟩" };
  if (err <= 10) return { cls:"warm",   label:"Warm",      emoji:"🟨" };
  if (err <= 20) return { cls:"cool",   label:"Cool",      emoji:"🟧" };
  return           { cls:"cold",   label:"Cold",      emoji:"🟥" };
}

// ===== scoring =====
// Weighted error: the final guess matters most, but a sharp first instinct is rewarded.
function computeScore(guesses, answer){
  var err1 = Math.abs(guesses[0] - answer);
  var errF = Math.abs(guesses[guesses.length-1] - answer);
  var e = CONFIG.FIRST_WEIGHT * err1 + CONFIG.FINAL_WEIGHT * errF;
  return Math.max(0, 100 - Math.round(3 * e));
}

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
  els.streakBadge.classList.toggle("hidden", !show);
  if (show) els.streakBadge.textContent = "🔥 " + s.count;
}

// ===== stats =====
function readStats(){
  try{
    var raw = localStorage.getItem("cs-stats");
    if (raw){ var s = JSON.parse(raw); if (s && typeof s.played === "number") return s; }
  }catch(_){}
  return { played:0, wins:0, tiers:{target:0,hot:0,warm:0,cool:0,cold:0}, firstErrSum:0, scoreSum:0 };
}
function writeStats(s){ try{ localStorage.setItem("cs-stats", JSON.stringify(s)); }catch(_){} }
function recordResult(win, firstErr, finalErr, score){
  var s = readStats();
  s.played += 1;
  if (win) s.wins += 1;
  var t = heat(finalErr).cls;
  s.tiers[t] = (s.tiers[t]||0) + 1;
  s.firstErrSum += firstErr;
  s.scoreSum += score;
  writeStats(s);
}
function renderStats(){
  var s = readStats();
  $("stPlayed").textContent = s.played;
  $("stWin").textContent = s.played ? Math.round(100*s.wins/s.played) + "%" : "0%";
  $("stStreak").textContent = readStreak().count;
  $("stMax").textContent = parseInt(localStorage.getItem("bestStreak")||"0",10);

  var rows = $("distRows");
  rows.innerHTML = "";
  var tiers = [
    { cls:"target", label:"🎯 On target" },
    { cls:"hot",    label:"Hot"  },
    { cls:"warm",   label:"Warm" },
    { cls:"cool",   label:"Cool" },
    { cls:"cold",   label:"Cold" }
  ];
  var max = 1;
  tiers.forEach(function(t){ max = Math.max(max, s.tiers[t.cls]||0); });
  tiers.forEach(function(t){
    var n = s.tiers[t.cls]||0;
    var row = document.createElement("div");
    row.className = "distrow";
    var lab = document.createElement("span"); lab.className = "g"; lab.textContent = t.label;
    var bar = document.createElement("div"); bar.className = "distbar" + (n ? "" : " zero");
    bar.style.width = Math.max(9, Math.round(100*n/max)) + "%";
    bar.textContent = n;
    row.appendChild(lab); row.appendChild(bar);
    rows.appendChild(row);
  });

  var fe = $("firstErr");
  if (s.played){
    var avg = (s.firstErrSum / s.played).toFixed(1);
    var avgScore = Math.round(s.scoreSum / s.played);
    fe.innerHTML = "Your first instinct is off by <b>" + avg + "</b> points on average, and your average score is <b>" + avgScore + "</b>/100. That's your crowdsense.";
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
  for (var i=0;i<CONFIG.MAX_GUESSES;i++){
    var dot = document.createElement("span");
    dot.className = "gdot" + (i < state.guesses.length ? " used" : "");
    els.guessDots.appendChild(dot);
  }
}
function renderLedgerRow(n, g){
  var err = Math.abs(g - Q.answer);
  var h = heat(err);
  var row = document.createElement("div");
  row.className = "lrow";
  var dir;
  if (err <= CONFIG.BULLSEYE) dir = "Right on the money";
  else if (Q.answer > g) dir = "The real figure is higher ▲";
  else dir = "The real figure is lower ▼";
  row.innerHTML =
    '<span class="lnum">' + n + '</span>' +
    '<span class="lval">' + g + '%</span>' +
    '<span class="ldir">' + dir + '</span>' +
    '<span class="chip ' + h.cls + '">' + h.label + '</span>';
  els.ledger.appendChild(row);
}
function setKickerForTurn(){
  if (!els.kicker) return;
  if (state.done) { els.kicker.textContent = "Come back tomorrow for question No. " + (PUZZLE_NO + 1) + "."; return; }
  if (state.guesses.length === 0) els.kicker.textContent = "Guess the percentage. First your instinct…";
  else els.kicker.textContent = "…now your judgement. One guess left.";
}

function verdictFor(guesses, answer, win){
  var err1 = Math.abs(guesses[0] - answer);
  var errF = Math.abs(guesses[guesses.length-1] - answer);
  if (guesses.length === 1 && err1 <= CONFIG.BULLSEYE) return { text: "🎯 Bullseye, first time.", win: true };
  if (errF <= 2)  return { text: "Dead on.", win: win };
  if (errF <= 5)  return { text: "Sharp. You know the public.", win: win };
  if (errF <= 10) return { text: "Close — but the public got away.", win: win };
  if (errF <= 20) return { text: "Warm-ish. The crowd had other ideas.", win: win };
  return { text: "The public surprised you.", win: win };
}

function finishGame(alreadyDone){
  state.done = true;
  state.score = computeScore(state.guesses, Q.answer);
  var errF = Math.abs(state.guesses[state.guesses.length-1] - Q.answer);
  var err1 = Math.abs(state.guesses[0] - Q.answer);
  state.win = errF <= CONFIG.WIN_MARGIN;

  els.input.disabled = true;
  els.slider.disabled = true;
  els.guessBtn.disabled = true;

  var v = verdictFor(state.guesses, Q.answer, state.win);
  els.verdict.textContent = v.text;
  els.verdict.className = "verdict " + (state.win ? "win" : "loss");
  els.bigAnswer.textContent = Q.answer + "%";
  var breakdown = (state.guesses.length > 1)
    ? "First guess " + err1 + " off · final " + errF + " off"
    : "One guess, " + err1 + " off";
  els.scoreLine.innerHTML = "Crowdsense score: <b>" + state.score + "</b>/100 · " + breakdown;
  els.answerNote.textContent = Q.note || "";
  els.sourceNote.textContent = Q.source ? ("Source: " + Q.source) : "";
  els.reveal.classList.remove("hidden");

  // sweep the true figure onto the track
  els.answerMarker.setAttribute("data-v", Q.answer + "%");
  els.answerMarker.classList.remove("hidden");
  requestAnimationFrame(function(){ els.answerMarker.style.left = Q.answer + "%"; });

  setKickerForTurn();
  startCountdown();

  if (!alreadyDone){
    // streak + stats are recorded once, when the game actually ends
    if (state.win){
      var s = readStreak();
      var next = (s.last === getYesterdayKey(DAY_KEY)) ? s.count + 1 : 1;
      if (s.last === DAY_KEY) next = s.count; // safety: never double-count a day
      writeStreak(next, DAY_KEY);
    } else {
      writeStreak(0, DAY_KEY);
    }
    updateStreakBadge();
    recordResult(state.win, err1, errF, state.score);
    saveState();
  }
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
function shareText(){
  var lines = [];
  lines.push("Crowdsense No. " + PUZZLE_NO + " — " + state.score + "/100");
  var grid = state.guesses.map(function(g){
    var err = Math.abs(g - Q.answer);
    var h = heat(err);
    if (err <= CONFIG.BULLSEYE) return h.emoji;
    return h.emoji + (Q.answer > g ? "⬆️" : "⬇️");
  }).join(" ");
  lines.push(grid);
  var s = readStreak();
  if (state.win && s.count > 1) lines.push("🔥 " + s.count + " day streak");
  lines.push(CONFIG.SITE_URL);
  return lines.join("\n");
}
function doShare(){
  var text = shareText();
  if (navigator.share){
    navigator.share({ text: text }).catch(function(){});
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text)
      .then(function(){ toast("Result copied — paste it anywhere"); })
      .catch(function(){ toast("Couldn't copy — select and copy manually"); });
  } else {
    toast("Sharing not supported in this browser");
  }
}

// ===== countdown to next question (London midnight) =====
var _countdownTimer = null;
function startCountdown(){
  if (_countdownTimer) clearInterval(_countdownTimer);
  function tick(){
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: safeTZ(), hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit" }).formatToParts(new Date());
    var h=0,m=0,s=0;
    for (var i=0;i<parts.length;i++){
      if (parts[i].type==="hour") h=+parts[i].value;
      else if (parts[i].type==="minute") m=+parts[i].value;
      else if (parts[i].type==="second") s=+parts[i].value;
    }
    var left = 86400 - (h*3600 + m*60 + s);
    if (left <= 0){ els.countdown.textContent = "now — refresh!"; return; }
    var hh = Math.floor(left/3600), mm = Math.floor((left%3600)/60), ss = left%60;
    els.countdown.textContent = hh + "h " + String(mm).padStart(2,"0") + "m " + String(ss).padStart(2,"0") + "s";
  }
  tick();
  _countdownTimer = setInterval(tick, 1000);
}

// ===== date ticker =====
function startDailyTicker(){
  if (!els.dailyDate) return;
  var dateStr = new Intl.DateTimeFormat("en-GB", { timeZone: safeTZ(), day:"numeric", month:"short", year:"numeric" }).format(new Date());
  els.dailyDate.textContent = dateStr;
}

// ===== modals =====
function openModal(id){ var m = $(id); if (m) m.classList.remove("hidden"); }
function closeModal(id){ var m = $(id); if (m) m.classList.add("hidden"); }
document.addEventListener("click", function(e){
  var t = e.target.closest("[data-close]");
  if (t) closeModal(t.getAttribute("data-close"));
});
document.addEventListener("keydown", function(e){
  if (e.key === "Escape"){ closeModal("helpModal"); closeModal("statsModal"); }
});
if (els.helpBtn) els.helpBtn.addEventListener("click", function(){ openModal("helpModal"); });
if (els.statsBtn) els.statsBtn.addEventListener("click", function(){ renderStats(); openModal("statsModal"); });

// ===== email capture =====
function handleEmailSubmit(e){
  e.preventDefault();
  var email = (els.emailInput && els.emailInput.value || "").trim();
  if (!email) return;
  els.emailMsg.textContent = "Submitting…";
  fetch(els.emailForm.action, { method:"POST", headers:{ "Accept":"application/json" }, body: new FormData(els.emailForm) })
    .then(function(res){ if (res.ok) return res.json(); throw new Error("Subscribe failed"); })
    .then(function(){ els.emailMsg.textContent = "Thanks! Check your inbox to confirm."; try{ els.emailForm.reset(); }catch(_){} })
    .catch(function(){ els.emailMsg.textContent = "Sorry — there was a problem. Please try again."; });
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
  if (!CONFIG.SHEET_PUBLISHED_URL) return Promise.resolve(QUESTIONS);
  return fetch(normalizeToCSV(CONFIG.SHEET_PUBLISHED_URL), { cache:"no-store" })
    .then(function(resp){ if(!resp.ok) throw new Error("HTTP "+resp.status); return resp.text(); })
    .then(function(text){
      var out = rowsToQuestions(parseCSV(text));
      console.log("Loaded " + out.length + " questions from sheet");
      return out;
    })
    .catch(function(err){
      console.warn("Sheet load failed, using embedded questions", err);
      return QUESTIONS;
    });
}

// ===== question selection (same question for everyone, everywhere) =====
function pickTodaysQuestion(bank){
  var dated = bank.filter(function(q){ return (q.date||"") === DAY_KEY; });
  if (dated.length) return dated[0];
  var pool = bank.filter(function(q){ return !(q.date||"").length; });
  if (!pool.length) pool = bank;
  // deterministic rotation, stable order
  var sorted = pool.slice().sort(function(a,b){
    var x = String(a.question).toLowerCase(), y = String(b.question).toLowerCase();
    return x < y ? -1 : (x > y ? 1 : 0);
  });
  var offset = Math.abs(daysSince(CONFIG.ANCHOR, DAY_KEY)) % sorted.length;
  return sorted[offset];
}

// ===== restore a saved game =====
function restore(saved){
  state = { guesses: [], done: false, win: false, score: 0 };
  saved.guesses.forEach(function(g){
    state.guesses.push(g);
    renderLedgerRow(state.guesses.length, g);
    applyGuessToWindow(g);
  });
  renderDots();
  if (saved.done){
    finishGame(true);
  } else {
    setKickerForTurn();
  }
}

// ===== init =====
(function init(){
  loadQuestions().then(function(bank){
    Q = pickTodaysQuestion(bank);

    resetStreakIfSkippedDay();
    els.puzzleNo.textContent = "No. " + PUZZLE_NO;
    startDailyTicker();
    els.questionText.textContent = Q.question;
    updateTrackWindow();
    renderDots();
    setKickerForTurn();
    updateStreakBadge();

    var saved = loadState();
    if (saved && saved.guesses.length) restore(saved);

    // first visit: show how-to
    try{
      if (!localStorage.getItem("cs-seen-help")){
        openModal("helpModal");
        localStorage.setItem("cs-seen-help", "1");
      }
    }catch(_){}
  }).catch(function(err){
    console.error("Init failed", err);
    els.questionText.textContent = "Something went wrong loading today's question — refresh to try again.";
  });
})();

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
if (els.shareBtn) els.shareBtn.addEventListener("click", doShare);
if (els.emailForm) els.emailForm.addEventListener("submit", handleEmailSubmit);
