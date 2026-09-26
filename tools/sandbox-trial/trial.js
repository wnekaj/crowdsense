/* =========================================================================
   trial.js — SANDBOX TRIAL of two guesses, points, and leaderboard signup.

   Copied into sandbox/ by tools/build-sandbox.js and loaded after app.js.
   app.js itself is the live engine, byte for byte: this file changes the
   sandbox's behaviour by replacing a handful of its functions, so the trial
   can never leak into the live game and is thrown away with the sandbox.

   Two guesses (single-question days only — multi-part days are untouched):
     1. the first guess is locked and the player is told only Higher or
        Lower — never the points, which would give the answer away
        (the bands say how close, but never exactly)
     2. the second guess brings the reveal: the day's score and band ("3.5 —
        on the scent"),
        both guesses as lines on the bar, and the crowd
   Scoring, in points off as the original game: the first guess's error,
   minus half of however much closer the second gets. Lower is better.
   The crowd distribution pools FIRST guesses only.

   The sandbox config sets MAX_GUESSES: 2, which wakes the engine's own
   two-guess machinery (the squeeze window, the guess dots), and BULLSEYE: 0,
   so only an exact first guess skips the second.
   ========================================================================= */
(function(){
  "use strict";
  var T = window.CS_TRIAL;
  if (!T || typeof setupGame !== "function") return;

  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(_){ return null; } }
  function writeJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
  function lbHref(){
    var m = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    return "leaderboard.html" + (m ? "?day=" + m[1] : "");
  }
  function twoGuessDay(){ return CONFIG.MAX_GUESSES >= 2 && !isMulti(); }

  // the day's points from the guesses on the board
  function pointsNow(){
    var g = state.guesses;
    if (!g.length) return null;
    var e1 = Math.abs(g[0] - Q.answer);
    var e2 = g.length > 1 ? Math.abs(g[1] - Q.answer) : null;
    return { g1: g[0], g2: g.length > 1 ? g[1] : null, e1: e1, e2: e2, off: T.dayOff(e1, e2) };
  }

  // The engine's own score, so Your stats — the Crowdsense average, the best
  // day — is kept in the same points off the reveal shows.
  var _computeScore = window.computeScore;
  window.computeScore = function(guesses, answer){
    if (!guesses || !guesses.length || CONFIG.MAX_GUESSES < 2) return _computeScore(guesses, answer);
    return T.dayOff(guesses[0] - answer, guesses.length > 1 ? guesses[1] - answer : null);
  };
  // ...and the day goes into Your record under the band the reveal names
  // ("7.5 — in the mix"), not the band of the last guess alone
  var _recordResult = window.recordResult;
  window.recordResult = function(win, firstErr, finalErr, score){
    if (twoGuessDay()) finalErr = score;
    return _recordResult(win, firstErr, finalErr, score);
  };

  // ---------- 1. after the first guess: Higher or Lower, and the band ----------
  // what each band means, said the way the bands are described elsewhere
  var BAND_RANGE = { target: "You're within 2", hot: "You're within 5", warm: "You're within 10",
                     cool: "You're within 20", cold: "You're more than 20 away" };
  window.renderLedgerRow = function(n, g){
    if (!twoGuessDay() || n !== 1) return;   // the second guess goes to the reveal
    // an exact first guess ends the day (BULLSEYE 0), so there is always a side
    var up = Q.answer > g;
    var card = el("div", "tg-fb");
    card.id = "tgFeedback";
    var h = heat(Math.abs(g - Q.answer));
    // each line is centred on its words; the arrow and the dot hang in the
    // margin to their left, so the two lines sit symmetrically on one axis
    card.innerHTML =
      '<p class="tg-fb-dir ' + (up ? "up" : "down") + '"><span class="tg-fb-t">' +
        '<i class="tg-fb-arrow" aria-hidden="true">' + (up ? "↑" : "↓") + '</i>' + (up ? "Higher" : "Lower") + '</span></p>' +
      // just how close, with the band's coloured dot — no band name
      '<p class="tg-fb-band ' + h.cls + '"><span class="tg-fb-t"><i class="tg-fb-dot" aria-hidden="true"></i>' +
        BAND_RANGE[h.cls] + '</span></p>' +
      '<p class="tg-fb-next">You have another guess</p>';
    els.ledger.innerHTML = "";
    els.ledger.appendChild(card);
    els.ledger.classList.add("tg-open");
    markTrackGuess(g, up);
  };

  // The first guess, numbered inside the grey bar at the point it reached.
  // The figure sits in the ruled-out part, beside the line, and flips to
  // the other side when it's too close to that end to fit.
  function clearTrackGuess(){
    var old = document.getElementById("tgTrackGuess");
    if (old) old.remove();
  }
  function markTrackGuess(g, up){
    clearTrackGuess();
    var m = el("div", "tg-trackguess");
    m.id = "tgTrackGuess";
    m.style.left = g + "%";
    // Higher rules out everything up to the guess, Lower everything after it
    var side = up ? "left" : "right";
    if (side === "left" && g < 9) side = "right";
    if (side === "right" && g > 91) side = "left";
    m.classList.add("to-" + side);
    m.innerHTML = '<span>' + g + '</span>';
    m.title = "Your first guess: " + g + "%";
    els.track.appendChild(m);
  }

  // ---------- 2. the reveal: points, then the signup prompt ----------
  var _finishGame = window.finishGame;
  window.finishGame = function(alreadyDone){
    _finishGame(alreadyDone);
    if (!twoGuessDay()) return;
    els.ledger.innerHTML = "";
    els.ledger.classList.remove("tg-open");
    var p = pointsNow();
    if (!p) return;
    // only a play of the day's own question, made that day, is ranked
    if (!alreadyDone && MODE === "daily"){
      writeJSON(T.POINTS_PREFIX + CUR.dayKey, {
        e1: p.e1, e2: p.e2, off: p.off, g1: p.g1, g2: p.g2,
        answer: Q.answer, puzzle: CUR.puzzleNo
      });
    }
    // the old verdict line, carrying the day's score without the word "off"
    paintVerdict(p);
    markFirstGuess(p, alreadyDone);
    paintCta();
  };

  // "3.5 — on the scent": the day's score and its band, in the engine's own
  // verdict line; the stats then open after the reveal as they always do
  function paintVerdict(p){
    var band = verdictForErr(p.off).text.split(" — ")[1];
    els.verdict.textContent = T.fmtOff(p.off) + " — " + band;
    els.verdict.classList.remove("hidden");
  }

  // The first guess as a plain line on the reveal bar itself, beside the
  // engine's own mark for the second. No label: the second guess keeps the
  // engine's usual figure above the bar. It shows as the fill reaches it,
  // the way the engine reveals its own mark.
  function clearFirstGuess(){
    if (!els.revealBarWrap) return;
    els.revealBarWrap.classList.remove("tg-two");
    Array.prototype.forEach.call(els.revealBarWrap.querySelectorAll(".tg-firstmark, .tg-firstlabel"), function(x){ x.remove(); });
  }
  function markFirstGuess(p, alreadyDone){
    clearFirstGuess();
    if (p.g2 === null || !els.revealBarWrap) return;   // one guess: the engine's mark is the only one
    var wrap = els.revealBarWrap;
    var mark = el("div", "tg-firstmark");
    mark.style.left = p.g1 + "%";
    mark.title = "Your first guess: " + p.g1 + "%";
    wrap.querySelector(".revealbar").appendChild(mark);
    // its figure above the bar, the way the engine labels the second guess
    var lab = el("span", "tg-firstlabel", String(p.g1));
    lab.style.left = p.g1 + "%";
    wrap.appendChild(lab);
    // two figures close together would collide: then the first steps up a row
    var a = lab.getBoundingClientRect(), b = els.youLabel.getBoundingClientRect();
    if (a.width && b.width && a.right + 4 > b.left && b.right + 4 > a.left) wrap.classList.add("tg-two");
    function show(){ mark.classList.add("on"); lab.classList.add("on"); }
    if (alreadyDone || !els.reveal.classList.contains("staging")){ show(); return; }
    (function watch(){
      var reached = parseFloat(els.revealFill.style.width) >= p.g1;
      var landed = !els.reveal.classList.contains("staging");
      if (reached || landed) show();
      else requestAnimationFrame(watch);
    })();
  }

  // Just a way to the leaderboard; signing up is offered there.
  function paintCta(){
    var old = document.getElementById("tgCta");
    if (old) old.remove();
    var box = el("div", "tg-cta");
    box.id = "tgCta";
    box.innerHTML = '<a class="tg-lbbtn" href="' + lbHref() + '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/>' +
      '<path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>View leaderboard</a>';
    els.sourceNote.insertAdjacentElement("afterend", box);
  }

  // ---------- 3. the crowd: first guesses only ----------
  // The sandbox has no crowd server — its guesses must never reach the real
  // pool — so it draws a made-up crowd, labelled as such. Anywhere a crowd
  // server is configured, the first guess is what gets pooled and compared.
  var _crowdFlow = window.crowdFlow;
  window.crowdFlow = function(finalGuess, isFresh){
    if (!twoGuessDay()) return _crowdFlow(finalGuess, isFresh);
    var first = state.guesses[0];
    if (CONFIG.CROWD_API_URL) return _crowdFlow(first, isFresh);
    renderCrowd(demoDist(), first);
  };
  function demoDist(){
    var r = T.rng(T.hashStr("demo-crowd-" + CUR.puzzleNo));
    var counts = new Array(101).fill(0), total = 850;
    var lean = (r() - 0.5) * 16;              // the crowd's shared blind spot
    for (var i = 0; i < total; i++){
      var v = r() < 0.82 ? Q.answer + lean + T.gauss(r) * 13 : r() * 100;
      counts[Math.max(0, Math.min(100, Math.round(v)))]++;
    }
    return { total: total, counts: counts };
  }

  // ---------- share: the two guesses' bands and the day's points ----------
  var _shareText = window.shareText;
  window.shareText = function(includeUrl){
    if (!twoGuessDay()) return _shareText(includeUrl);
    var p = pointsNow();
    var lines = ["Crowdsense #" + CUR.puzzleNo];
    var b1 = heat(Math.abs(p.g1 - Q.answer)).emoji;
    lines.push((p.e2 === null ? b1 : b1 + " → " + heat(p.e2).emoji) + "  " + T.fmtOff(p.off) + " off");
    if (MODE === "daily" && state.crowdPct !== null && state.crowdPct !== undefined){
      lines.push("First guess closer than " + state.crowdPct + "% of players");
    }
    if (includeUrl !== false) lines.push(CONFIG.SITE_URL);
    return lines.join("\n");
  };

  // ---------- setup: clear the trial's furniture between days ----------
  var _setupGame = window.setupGame;
  window.setupGame = function(dayKey, mode){
    ["tgPoints", "tgCta"].forEach(function(id){ var x = document.getElementById(id); if (x) x.remove(); });
    els.ledger.classList.remove("tg-open");
    clearFirstGuess();
    clearTrackGuess();
    _setupGame(dayKey, mode);
    // the squeeze track belongs to two-guess days; a multi-part day keeps its own flow
    els.track.parentElement.classList.toggle("hidden", !twoGuessDay() || state.done);
  };

  function goHome(){
    document.querySelectorAll(".modal-root:not(.hidden)").forEach(function(m){ m.classList.add("hidden"); });
    if (MODE !== "daily" || !CUR || CUR.dayKey !== DAY_KEY) setupGame(DAY_KEY, "daily");
    try{ window.scrollTo({ top: 0, behavior: "smooth" }); }catch(_){ window.scrollTo(0, 0); }
  }

  // ---------- How to play, for the trial's rules ----------
  (function(){
    var body = document.querySelector("#helpModal .modal-body");
    if (!body) return;
    var legend = body.querySelector(".legend");
    body.innerHTML =
      '<p>Each day we take one real question the British public have been polled on, and you guess what they said.</p>' +
      '<p><b>You get two guesses.</b> Lock in your first, and we\'ll tell you whether the answer is <b>higher or lower</b>, and how close you were:</p>' +
      '<div class="tg-help-legend"></div>' +
      '<p style="margin-top:12px">Then take your second guess, and the answer is revealed.</p>' +
      '<p><b>Scoring.</b> Your score is how many points you\'re off — lower is better, and 0 is perfect. ' +
      'With two guesses, it\'s your first guess\'s distance, minus half of however much closer your second guess gets — so a second guess can never make it worse.</p>' +
      '<p class="tg-help-eg">e.g. first guess 6 off, second 1 off: 6 − half of 5 = <b>3.5 off</b>. ' +
      'Get it exactly right first time and you score 0 straight away.</p>' +
      '<p><b>The leaderboard.</b> Your daily scores add up over the month and the lowest total wins. A missed day counts as 50 off, and your 3 worst days are dropped. ' +
      'Only today\'s question, played today (UK time), counts — games from the archive are unranked. ' +
      'How you compare with other players is always measured on first guesses.</p>' +
      '<p style="margin-top:14px">New question daily at midnight, UK time. All figures come from real polling of the British public; each day\'s source is shown with the answer.</p>';
    if (legend) body.querySelector(".tg-help-legend").appendChild(legend);
  })();

  // ---------- one Menu button, on the left ----------
  // The three header buttons stay in the page, hidden, so the menu can hand
  // off to exactly what they already do.
  var menu = null;
  var bar = document.querySelector(".sitebar");
  if (bar && window.CS_MENU){
    var icons = bar.querySelector(".iconbtns");
    if (icons) icons.classList.add("hidden");
    bar.classList.add("tg-hasmenu");
    function tap(b){ return function(){ if (b) b.click(); }; }
    menu = CS_MENU.mount({ into: bar, items: [
      // back to today's question from anywhere: the archive, a panel, lower down the page
      { key: "home", label: "Home", onClick: goHome },
      { key: "leaderboard", label: "Leaderboard", href: lbHref() },
      { key: "archive", label: "Archive", onClick: tap(els.archiveBtn) },
      { key: "stats", label: "Your stats", onClick: tap(els.statsBtn) },
      { key: "help", label: "How to play", onClick: tap(els.helpBtn) }
    ]});
    // the one-off tour pointed at the three buttons; now there is one to show
    window.startTour = function(){
      if (!els.tour || tourSeen()) return;
      TOUR_PENDING = false;
      TOUR_STEPS = [{ el: menu.button,
        text: "<b>Menu.</b> The leaderboard, past questions, your stats and how to play are all in here." }];
      TOUR_STEP = 0;
      els.tour.classList.remove("hidden");
      paintTourStep();
      window.addEventListener("resize", paintTourStep);
    };
    // the leaderboard's menu links here with #archive, #stats or #help
    var deep = { "#archive": els.archiveBtn, "#stats": els.statsBtn, "#help": els.helpBtn }[location.hash];
    if (deep){
      try{ history.replaceState(null, "", location.pathname + location.search); }catch(_){}
      setTimeout(function(){ deep.click(); }, 0);
    }
  }

  // app.js set the page up before this file loaded, so run the setup again
  // now the trial's versions are in place (it rebuilds from saved state)
  if (CUR) setupGame(CUR.dayKey, MODE);

  window.CS_TRIAL_UI = { pointsNow: pointsNow, menu: menu };
})();
