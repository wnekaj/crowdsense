/* =========================================================================
   trial.js — SANDBOX TRIAL of two guesses, points, and leaderboard signup.

   Copied into sandbox/ by tools/build-sandbox.js and loaded after app.js.
   app.js itself is the live engine, byte for byte: this file changes the
   sandbox's behaviour by replacing a handful of its functions, so the trial
   can never leak into the live game and is thrown away with the sandbox.

   Two guesses (single-question days only — multi-part days are untouched):
     1. the first guess is locked and the player is told only Higher or
        Lower — never the points, which would give the answer away
        (88 points = 6 off, and the direction says which side)
     2. the second guess brings the reveal: the day's score out of 100,
        both guesses as lines on the bar, and the crowd
   Per guess: max(0, 100 - 2 x error). Day: S1 + half of any gain from S2.
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
  function signup(){ return readJSON(T.SIGNUP_KEY); }
  function lbHref(){
    var m = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    return "leaderboard.html" + (m ? "?day=" + m[1] : "");
  }
  function twoGuessDay(){ return CONFIG.MAX_GUESSES >= 2 && !isMulti(); }

  // the day's points from the guesses on the board
  function pointsNow(){
    var g = state.guesses;
    if (!g.length) return null;
    var s1 = T.guessPoints(g[0] - Q.answer);
    var s2 = g.length > 1 ? T.guessPoints(g[1] - Q.answer) : null;
    return { g1: g[0], g2: g.length > 1 ? g[1] : null, s1: s1, s2: s2, score: T.dayScore(s1, s2) };
  }

  // ---------- 1. after the first guess: just Higher or Lower ----------
  window.renderLedgerRow = function(n, g){
    if (!twoGuessDay() || n !== 1) return;   // the second guess goes to the reveal
    // an exact first guess ends the day (BULLSEYE 0), so there is always a side
    var up = Q.answer > g;
    var card = el("div", "tg-fb");
    card.id = "tgFeedback";
    card.innerHTML = '<p class="tg-fb-dir ' + (up ? "up" : "down") + '"><span aria-hidden="true">' +
      (up ? "↑" : "↓") + '</span> ' + (up ? "Higher" : "Lower") + '</p>';
    els.ledger.innerHTML = "";
    els.ledger.appendChild(card);
    els.ledger.classList.add("tg-open");
  };

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
        s1: p.s1, s2: p.s2, score: p.score, g1: p.g1, g2: p.g2,
        answer: Q.answer, puzzle: CUR.puzzleNo
      });
    }
    paintPoints(p);
    markFirstGuess(p, alreadyDone);
    paintCta(p);
  };

  function paintPoints(p){
    var old = document.getElementById("tgPoints");
    if (old) old.remove();
    var box = el("div", "tg-pts");
    box.id = "tgPoints";
    box.innerHTML = '<span class="tg-pts-k">Today\'s score</span>' +
      '<b class="tg-pts-score">' + p.score + '<span>/100</span></b>';
    els.sourceNote.insertAdjacentElement("afterend", box);
  }

  // Both guesses as lines on the reveal bar: the first in grey, labelled
  // "1st", above the engine's own mark for the second, labelled "2nd". Each
  // shows as the fill reaches it, the way the engine reveals its own mark.
  function clearFirstGuess(){
    var wrap = els.revealBarWrap;
    if (!wrap) return;
    wrap.classList.remove("tg-two");
    Array.prototype.forEach.call(wrap.querySelectorAll(".tg-firstmark, .tg-firstlabel"), function(x){ x.remove(); });
  }
  function markFirstGuess(p, alreadyDone){
    clearFirstGuess();
    if (p.g2 === null || !els.revealBarWrap) return;   // one guess: the engine's mark is the only one
    var wrap = els.revealBarWrap;
    // on the wrap rather than inside the bar, so it can stand a little proud
    // of it and stay visible over both the dark fill and the pale track
    var mark = el("div", "tg-firstmark");
    mark.style.left = p.g1 + "%";
    mark.title = "Your first guess";
    wrap.appendChild(mark);
    var lab = el("span", "tg-firstlabel", "1st " + p.g1);
    lab.style.left = p.g1 + "%";
    wrap.appendChild(lab);
    wrap.classList.add("tg-two");
    els.youLabel.textContent = "2nd " + p.g2;
    if (alreadyDone || !els.reveal.classList.contains("staging")){
      mark.classList.add("on"); lab.classList.add("on");
      return;
    }
    (function watch(){
      var reached = parseFloat(els.revealFill.style.width) >= p.g1;
      var landed = !els.reveal.classList.contains("staging");
      if (reached || landed){ mark.classList.add("on"); lab.classList.add("on"); }
      if (!landed && !(reached)) requestAnimationFrame(watch);
    })();
  }

  function paintCta(p){
    var old = document.getElementById("tgCta");
    if (old) old.remove();
    var box = el("div", "tg-cta");
    box.id = "tgCta";
    if (MODE !== "daily"){
      box.classList.add("quiet");
      box.innerHTML = '<p>Archive games are unranked — only today\'s question, played today (UK time), counts towards the leaderboard.</p>' +
        '<a href="' + lbHref() + '">See the leaderboard →</a>';
    } else if (signup()){
      box.classList.add("done");
      box.innerHTML = '<p><b>✓ Today\'s ' + p.score + ' is on the leaderboard.</b></p>' +
        '<a href="' + lbHref() + '">See your rank →</a>';
    } else {
      box.innerHTML = '<p class="tg-cta-title">Sign up to put today\'s score on the leaderboard</p>' +
        '<p class="tg-cta-sub">Three quick questions, so you can see how you rank overall and in your group.</p>' +
        '<button type="button" class="tg-btn" id="tgSignupBtn">Sign up</button>' +
        '<a class="tg-cta-link" href="' + lbHref() + '">Just look at the leaderboard →</a>';
      box.querySelector("#tgSignupBtn").addEventListener("click", openSignup);
    }
    var pts = document.getElementById("tgPoints");
    (pts || els.sourceNote).insertAdjacentElement("afterend", box);
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
    els.crowdHead.innerHTML += ' <span class="tg-demo">first guesses · demo crowd</span>';
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
    lines.push((p.s2 === null ? b1 : b1 + " → " + heat(Math.abs(p.g2 - Q.answer)).emoji) + "  " + p.score + "/100");
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
    _setupGame(dayKey, mode);
    // the squeeze track belongs to two-guess days; a multi-part day keeps its own flow
    els.track.parentElement.classList.toggle("hidden", !twoGuessDay() || state.done);
  };

  // ---------- signup mock ----------
  var COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh",
    "Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina",
    "Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
    "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros",
    "Congo","Costa Rica","Côte d'Ivoire","Croatia","Cuba","Cyprus","Czechia",
    "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
    "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada",
    "Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India",
    "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
    "Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
    "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia",
    "Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
    "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru",
    "Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea",
    "North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea",
    "Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
    "São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone",
    "Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea",
    "South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan",
    "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
    "Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates",
    "United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam",
    "Yemen","Zambia","Zimbabwe"];

  function chips(name, options){
    return '<div class="tg-chips" role="radiogroup">' + options.map(function(o){
      return '<label class="tg-chip"><input type="radio" name="' + name + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>';
    }).join("") + '</div>';
  }
  function buildSignup(){
    if (document.getElementById("tgSignup")) return;
    var root = el("div", "modal-root hidden tg-signup");
    root.id = "tgSignup";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "tgSignupTitle");
    root.innerHTML =
      '<div class="modal-backdrop" data-tg-close></div>' +
      '<div class="modal-card">' +
        '<button class="modal-close" type="button" data-tg-close aria-label="Close">✕</button>' +
        '<h2 id="tgSignupTitle">Put today\'s score on the leaderboard</h2>' +
        '<p class="tg-sub">So we can show where you rank in your group. Every question has "Prefer not to say".</p>' +
        '<form id="tgSignupForm" novalidate>' +
          '<fieldset><legend>Age</legend>' + chips("age", T.AGES.concat([T.PNTS])) + '</fieldset>' +
          '<fieldset><legend>Gender</legend>' + chips("gender", T.GENDERS.concat([T.PNTS])) + '</fieldset>' +
          '<fieldset><legend><label for="tgRegion">Where do you live?</label></legend>' +
            '<select id="tgRegion" name="region"><option value="">Choose…</option>' +
            T.REGIONS.concat([T.PNTS]).map(function(r){ return '<option>' + esc(r) + '</option>'; }).join("") +
            '</select>' +
            '<div class="tg-country hidden" id="tgCountryWrap"><label for="tgCountry">Which country?</label>' +
            '<select id="tgCountry" name="country"><option value="">Choose a country…</option>' +
            COUNTRIES.map(function(c){ return '<option>' + esc(c) + '</option>'; }).join("") +
            '</select></div>' +
          '</fieldset>' +
          '<p class="tg-err hidden" id="tgSignupErr" role="alert"></p>' +
          '<button type="submit" class="tg-btn">Sign up</button>' +
          '<p class="tg-fine">Sandbox mock: stored only in this browser, nothing is sent anywhere.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener("click", function(e){
      if (e.target.hasAttribute && e.target.hasAttribute("data-tg-close")) closeSignup();
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && !root.classList.contains("hidden")) closeSignup();
    });
    var region = root.querySelector("#tgRegion");
    region.addEventListener("change", function(){
      root.querySelector("#tgCountryWrap").classList.toggle("hidden", region.value !== "Outside the UK");
    });
    root.querySelector("#tgSignupForm").addEventListener("submit", submitSignup);
  }
  function openSignup(){
    buildSignup();
    var root = document.getElementById("tgSignup");
    root.querySelector("#tgSignupErr").classList.add("hidden");
    root.classList.remove("hidden");
    var first = root.querySelector('input[name="age"]');
    if (first) try{ first.focus(); }catch(_){}
  }
  function closeSignup(){
    var root = document.getElementById("tgSignup");
    if (root) root.classList.add("hidden");
  }
  function submitSignup(e){
    e.preventDefault();
    var f = e.target;
    var age = (f.querySelector('input[name="age"]:checked') || {}).value;
    var gender = (f.querySelector('input[name="gender"]:checked') || {}).value;
    var region = f.querySelector("#tgRegion").value;
    var country = f.querySelector("#tgCountry").value;
    var missing = [];
    if (!age) missing.push("your age");
    if (!gender) missing.push("your gender");
    if (!region) missing.push("where you live");
    else if (region === "Outside the UK" && !country) missing.push("your country");
    var err = f.querySelector("#tgSignupErr");
    if (missing.length){
      err.textContent = "Please choose " + missing.join(", ").replace(/, ([^,]*)$/, " and $1") +
        " — or pick \"Prefer not to say\".";
      err.classList.remove("hidden");
      return;
    }
    writeJSON(T.SIGNUP_KEY, {
      age: age, gender: gender, region: region,
      country: region === "Outside the UK" ? country : "",
      at: new Date().toISOString()
    });
    closeSignup();
    var p = pointsNow();
    if (p) paintCta(p);
    toast("You're on the leaderboard");
  }

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

  window.CS_TRIAL_UI = { openSignup: openSignup, pointsNow: pointsNow, menu: menu };
})();
