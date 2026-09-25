/* =========================================================================
   leaderboard.js — SANDBOX TRIAL. The monthly board, on dummy data.

   Copied into sandbox/ by tools/build-sandbox.js. Reads only the sandbox's
   own storage (the page carries the same isolation shim as the sandbox
   game), and writes nothing at all.
   ========================================================================= */
(function(){
  "use strict";
  var T = window.CS_TRIAL;
  if (!T) return;

  var SHOW = 20;   // rows before the list is cut, "You" pinned below if lower
  var DIMS = {
    region: { label: "Region", values: T.REGIONS },
    age:    { label: "Age",    values: T.AGES },
    gender: { label: "Gender", values: T.GENDERS }
  };

  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(_){ return null; } }
  function ordinal(n){
    var s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function num(n){ return Math.round(n).toLocaleString("en-GB"); }

  var todayKey = T.todayKey();
  var dayParam = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search);
  var q = dayParam ? "?day=" + dayParam[1] : "";
  ["backTop", "backBottom"].forEach(function(id){ $(id).setAttribute("href", "index.html" + q); });

  // the player's real, ranked sandbox plays this month
  function realDays(){
    var out = {}, mk = T.monthKeyOf(todayKey), dayNow = +todayKey.slice(8, 10);
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (!k || k.indexOf(T.POINTS_PREFIX) !== 0) continue;
      var day = k.slice(T.POINTS_PREFIX.length);
      if (day.slice(0, 7) !== mk) continue;
      var d = +day.slice(8, 10);
      if (d > dayNow) continue;     // a future day previewed with ?day= hasn't happened yet
      var e = readJSON(k);
      if (e && typeof e.score === "number") out[d] = e;
    }
    return out;
  }

  var signup = readJSON(T.SIGNUP_KEY);
  var board = T.buildBoard({ todayKey: todayKey, signup: signup, realDays: realDays() });
  var you = board.players.filter(function(p){ return p.you; })[0];

  var monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(board.year, board.monthNum - 1, 1)));
  $("monthLabel").textContent = monthName + " · day " + board.dayCount + " of " + board.daysInMonth;

  var early = board.dayCount <= T.DROP;
  $("rulesMonth").textContent = "Your daily scores add up across the month. Everyone's " + T.DROP +
    " lowest days are dropped, and a day you miss counts as 0 — so a few missed or bad days won't sink you." +
    (early ? " It's day " + board.dayCount + ", so every day so far is still being dropped: scores start counting on day " +
      (T.DROP + 1) + "." : "");

  // ---------- countdown to the monthly reset ----------
  var resetAt = T.nextResetMs(todayKey);
  var nm = board.monthNum === 12 ? 1 : board.monthNum + 1;
  var ny = board.monthNum === 12 ? board.year + 1 : board.year;
  $("resetWhen").textContent = "Resets at midnight UK time on 1 " +
    new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ny, nm - 1, 1))) +
    (dayParam ? " (clock shifted to the sandbox's ?day=)" : "");
  function tick(){
    var ms = resetAt - T.nowMs();
    if (ms <= 0){ $("clock").textContent = "Resetting now…"; return; }
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;
    function p2(n){ return String(n).padStart(2, "0"); }
    $("clock").textContent = d + "d " + p2(h) + "h " + p2(m) + "m " + p2(s) + "s";
  }
  tick();
  setInterval(tick, 1000);

  // ---------- past winners: placeholders for each finished month ----------
  (function(){
    var list = $("past"), y = board.year, m = board.monthNum, items = [];
    // the game launched in July 2026; no board before that
    for (var i = 0; i < 6; i++){
      m -= 1; if (m < 1){ m = 12; y -= 1; }
      if (y < 2026 || (y === 2026 && m < 7)) break;
      items.push(new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(y, m - 1, 1))));
    }
    if (!items.length){
      list.innerHTML = '<li><span>No finished months yet</span><span>placeholder</span></li>';
      return;
    }
    list.innerHTML = items.map(function(label){
      return '<li><span>' + esc(label) + '</span><span>Winner — placeholder</span></li>';
    }).join("");
  })();

  // ---------- the board ----------
  var dim = "overall", value = null;

  function defaultValue(d){
    var mine = you[d];
    if (mine && mine !== T.PNTS && DIMS[d].values.indexOf(mine) > -1) return mine;
    return DIMS[d].values[0];
  }

  function youCard(group){
    var overall = T.groupOf(board, "overall");
    var mineOverall = overall.filter(function(p){ return p.you; })[0];
    var inGroup = group.filter(function(p){ return p.you; })[0];
    var card = $("youCard"), html;
    var mePlayed = you.played + (you.played === 1 ? " day" : " days") + " played";
    if (inGroup){
      var scope = dim === "overall" ? "of " + group.length + " players" :
        "of " + group.length + " in " + esc(value);
      html = '<div class="rk">' + ordinal(inGroup.rank).replace(/(\d+)(\D+)/, '$1<sup>$2</sup>') + '</div>' +
        '<div class="l1">You · ' + scope + '</div>' +
        '<div class="pts"><b>' + num(inGroup.total) + '</b><span>month score</span></div>' +
        '<div class="l2">Top ' + T.topPercent(inGroup.rank, group.length) + '% · ' + mePlayed + '</div>';
    } else {
      // outside this group, or not signed up: still show where they stand
      html = '<div class="rk">' + ordinal(mineOverall.rank).replace(/(\d+)(\D+)/, '$1<sup>$2</sup>') + '</div>' +
        '<div class="l1">You · overall, of ' + overall.length + '</div>' +
        '<div class="pts"><b>' + num(mineOverall.total) + '</b><span>month score</span></div>' +
        '<div class="l2">Top ' + T.topPercent(mineOverall.rank, overall.length) + '% overall · ' + mePlayed + '</div>';
    }
    if (!you.signedUp){
      html += '<div class="hint">You\'re not signed up, so this "You" is a stand-in on dummy days. ' +
        '<a href="index.html' + q + '">Play today\'s question and sign up</a> to put your real scores on the board.</div>';
    }
    card.innerHTML = html;
  }

  function row(p){
    var cls = [];
    if (p.you) cls.push("me");
    if (p.rank <= 3) cls.push("top" + p.rank);
    var tag = p.you ? (p.signedUp ? "" : '<span class="tag">stand-in</span>') : "";
    return '<tr class="' + cls.join(" ") + '"' + (p.you ? ' id="youRow"' : "") + '>' +
      '<td class="rank">' + p.rank + '</td>' +
      '<td>' + esc(p.name) + tag + '</td>' +
      '<td class="n">' + num(p.total) + '</td>' +
      '<td class="n">' + p.played + '</td></tr>';
  }

  function render(){
    var group = T.groupOf(board, dim, value);
    var note = $("groupNote");
    note.classList.add("hidden");
    if (dim !== "overall"){
      var mine = you[dim];
      var msg = "";
      if (!you.signedUp) msg = "Sign up to be placed in a " + DIMS[dim].label.toLowerCase() + " group.";
      else if (mine === T.PNTS) msg = "You chose not to say your " + DIMS[dim].label.toLowerCase() + ", so you appear on the Overall board only.";
      else if (mine !== value) msg = "You're not in this group — your own rank is shown above.";
      if (msg){ note.textContent = msg; note.classList.remove("hidden"); }
    }

    var top = group.slice(0, SHOW);
    var me = group.filter(function(p){ return p.you; })[0];
    var html = top.map(row).join("");
    if (me && me.rank > SHOW){
      html += '<tr class="gap"><td colspan="4">⋯</td></tr>' + row(me);
    }
    if (!group.length) html = '<tr class="gap"><td colspan="4">No players in this group yet</td></tr>';
    $("rows").innerHTML = html;
    $("caption").textContent = (dim === "overall" ? "Everyone" : DIMS[dim].label + ": " + value) +
      " — " + group.length + (group.length === 1 ? " player" : " players") +
      (group.length > SHOW ? ", top " + SHOW + " shown" : "");
    youCard(group);
  }

  var pick = $("pick");
  Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function(b){
    b.addEventListener("click", function(){
      dim = b.getAttribute("data-dim");
      Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function(x){
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      if (dim === "overall"){
        value = null;
        $("pickWrap").classList.add("hidden");
      } else {
        value = defaultValue(dim);
        $("pickLabel").textContent = DIMS[dim].label;
        pick.innerHTML = DIMS[dim].values.map(function(v){
          return '<option' + (v === value ? " selected" : "") + '>' + esc(v) + '</option>';
        }).join("");
        $("pickWrap").classList.remove("hidden");
      }
      render();
    });
  });
  pick.addEventListener("change", function(){ value = pick.value; render(); });

  render();
  // for the sandbox's own tests
  window.__LB = { board: board, you: you, render: render,
    group: function(d, v){ return T.groupOf(board, d, v); } };
})();
