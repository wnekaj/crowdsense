/* =========================================================================
   look.js — the "Cards" design, live from Fri 9 Oct 2026 (it was look C in
   the sandbox): soft grey page, everything on rounded white cards, friendly
   rounded type, brand-orange pills, a warm peach front door.

   index.html sets data-look="c" on <html> from that date and loads
   look.css; this file does nothing without it. Loaded after app.js and
   nav.js. The engine is untouched: this only adds a front door and a result
   card, rewrites How to play into icon rows, and the styles in look.css
   restyle what is already there.
   ========================================================================= */
(function(){
  "use strict";
  var look = document.documentElement.getAttribute("data-look") || "";
  if (look !== "c" || typeof setupGame !== "function") return;

  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function longDate(key){
    var p = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .format(new Date(Date.UTC(p[0], p[1] - 1, p[2])));
  }

  // the Crowdsense mark: the reveal bar, with your guess on it
  // (the fill is where the public landed, the pin is where you guessed)
  var MARK = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<rect class="m-track" x="5" y="25" width="54" height="14" rx="7"/>' +
    '<rect class="m-fill" x="5" y="25" width="29" height="14" rx="7"/>' +
    '<rect class="m-pin" x="40" y="13" width="8" height="38" rx="4"/></svg>';

  // ---------- 1. the front door ----------
  (function(){
    if (MODE !== "daily" || !CUR) return;
    var done = !!state.done;
    var s = el("div", "lk-splash");
    s.setAttribute("role", "dialog");
    s.setAttribute("aria-label", "Crowdsense");
    s.innerHTML =
      '<div class="lk-splash-in">' +
        '<div class="lk-mark">' + MARK + '</div>' +
        '<h1 class="lk-title">Crowdsense</h1>' +
        '<p class="lk-tagline">How well do you know Britain?</p>' +
        '<button type="button" class="lk-btn lk-play">' + (done ? "See your result" : "Play") + '</button>' +
        '<p class="lk-when"><b>' + longDate(CUR.dayKey) + '</b><span>No. ' + CUR.puzzleNo + '</span></p>' +
      '</div>';
    document.body.appendChild(s);
    document.documentElement.classList.add("lk-splashing");
    s.querySelector(".lk-play").addEventListener("click", function(){
      s.classList.add("out");
      document.documentElement.classList.remove("lk-splashing");
      setTimeout(function(){ s.remove(); }, 380);
    });
  })();

  // ---------- 2. the result as a card ----------
  // the band centred in the top bar, the answer, and how far off you were
  function clearCard(){
    var old = document.getElementById("lkCard");
    if (old) old.remove();
    els.reveal.classList.remove("lk-has-card");
  }
  function paintCard(){
    clearCard();
    if (!state.done || !Q || isMulti()) return;
    var score = computeScore(state.guesses, Q.answer);
    var h = heat(score);
    var shown = Math.round(score * 10) / 10;
    var c = el("div", "lk-card t-" + h.cls);
    c.id = "lkCard";
    c.innerHTML =
      '<div class="lk-card-top">' +
        '<span class="lk-chip t-' + h.cls + '">' + (h.cls === "target" ? "🎯 " : "") + h.label + '</span>' +
      '</div>' +
      '<div class="lk-card-big">' + Q.answer + '<i>%</i></div>' +
      '<div class="lk-card-you"><b>' + shown + '</b> off</div>' +
      '<div class="lk-card-foot"><span class="lk-brand">Crowdsense<i>.</i></span><span>No. ' + CUR.puzzleNo + '</span></div>';
    els.reveal.insertBefore(c, els.sourceNote);
    els.reveal.classList.add("lk-has-card");
  }
  var _finishGame = window.finishGame;
  window.finishGame = function(alreadyDone){
    _finishGame(alreadyDone);
    paintCard();
  };
  var _setupGame = window.setupGame;
  window.setupGame = function(dayKey, mode){
    clearCard();
    _setupGame(dayKey, mode);
  };
  if (state.done) paintCard();

  // ---------- 3. How to play, as icon rows ----------
  (function(){
    var body = document.querySelector("#helpModal .modal-body");
    if (!body) return;
    var legend = body.querySelector(".legend");
    var I = {
      slide: '<svg viewBox="0 0 24 24"><rect x="2.5" y="10" width="19" height="4" rx="2"/><circle cx="14" cy="12" r="4.2" class="f"/></svg>',
      target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" class="f"/></svg>',
      crowd: '<svg viewBox="0 0 24 24"><path d="M4 20v-5M9 20V9M14 20v-8M19 20V5"/></svg>'
    };
    body.innerHTML =
      '<p class="lk-lead">Guess what share of Britain said it.</p>' +
      '<ul class="lk-rules">' +
        '<li><i>' + I.slide + '</i><div><b>One guess</b><span>Slide or type a percentage, then lock it in.</span></div></li>' +
        '<li><i>' + I.target + '</i><div><b>Get close</b><span>Your score is how many points off you are. Lower is better.</span></div></li>' +
        '<li><i>' + I.crowd + '</i><div><b>Beat the crowd</b><span>See how you compare with everyone who played.</span></div></li>' +
      '</ul>' +
      '<div class="lk-subhead">How close you were</div>' +
      '<div class="lk-legend-slot"></div>' +
      '<p class="lk-small">A new question every day at midnight. Every figure comes from real polling.</p>';
    if (legend) body.querySelector(".lk-legend-slot").appendChild(legend);
  })();

  window.CS_LOOK = { look: look, paintCard: paintCard };
})();
