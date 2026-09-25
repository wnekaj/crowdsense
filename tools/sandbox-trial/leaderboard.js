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

  // the same Menu as the game; the game's panels open there via a #hash
  if (window.CS_MENU){
    CS_MENU.mount({ into: $("lbTop"), items: [
      { key: "home", label: "Home", href: "index.html" + q },
      { key: "leaderboard", label: "Leaderboard", current: true },
      { key: "archive", label: "Archive", href: "index.html" + q + "#archive" },
      { key: "stats", label: "Your stats", href: "index.html" + q + "#stats" },
      { key: "help", label: "How to play", href: "index.html" + q + "#help" }
    ]});
  }

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

  // built again in place when the player signs up from this page
  var signup, board, you;
  function build(){
    signup = readJSON(T.SIGNUP_KEY);
    board = T.buildBoard({ todayKey: todayKey, signup: signup, realDays: realDays() });
    you = board.players.filter(function(p){ return p.you; })[0];
  }
  build();

  var monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(board.year, board.monthNum - 1, 1)));
  $("monthLabel").textContent = monthName + " · day " + board.dayCount + " of " + board.daysInMonth;

  var early = board.dayCount <= T.DROP;
  $("rulesMonth").textContent = "Your daily scores add up across the month. Everyone's " + T.DROP +
    " lowest days are dropped, and a day you miss counts as 0 — so a few missed or bad days won't sink you." +
    (early ? " It's day " + board.dayCount + ", so every day so far is still being dropped: scores start counting on day " +
      (T.DROP + 1) + "." : "");

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

  // Above the board: just the sign-up button, until the player has signed up.
  // Their rank and percentile ride on their own row in the table.
  function youCard(){
    var card = $("youCard");
    card.innerHTML = you.signedUp ? "" :
      '<button type="button" class="joinbtn" id="joinBtn">Sign up to get on the leaderboard</button>';
    var jb = $("joinBtn");
    if (jb) jb.addEventListener("click", function(){ if (window.CS_SIGNUP) CS_SIGNUP.open(joined); });
  }

  // after signing up: rebuild with the player's real scores, and show the
  // group tabs from their own groups
  function joined(){
    build();
    if (dim !== "overall"){
      value = defaultValue(dim);
      pick.innerHTML = DIMS[dim].values.map(function(v){
        return '<option' + (v === value ? " selected" : "") + '>' + esc(v) + '</option>';
      }).join("");
    }
    render();
    var card = $("youCard");
    card.classList.add("flash");
    setTimeout(function(){ card.classList.remove("flash"); }, 1600);
  }

  function row(p, n){
    var cls = [];
    if (p.you) cls.push("me");
    if (p.rank <= 3) cls.push("top" + p.rank);
    var tag = p.you ? '<span class="tag">top ' + T.topPercent(p.rank, n) + '%</span>' : "";
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
      else if (mine !== value) msg = "You're not in this group.";
      if (msg){ note.textContent = msg; note.classList.remove("hidden"); }
    }

    var top = group.slice(0, SHOW);
    var me = group.filter(function(p){ return p.you; })[0];
    var html = top.map(function(p){ return row(p, group.length); }).join("");
    if (me && me.rank > SHOW){
      html += '<tr class="gap"><td colspan="4">⋯</td></tr>' + row(me, group.length);
    }
    if (!group.length) html = '<tr class="gap"><td colspan="4">No players in this group yet</td></tr>';
    $("rows").innerHTML = html;
    $("caption").textContent = (dim === "overall" ? "Everyone" : DIMS[dim].label + ": " + value) +
      " — " + group.length + (group.length === 1 ? " player" : " players") +
      (group.length > SHOW ? ", top " + SHOW + " shown" : "");
    youCard();
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
  window.__LB = { render: render,
    get board(){ return board; }, get you(){ return you; },
    group: function(d, v){ return T.groupOf(board, d, v); } };
})();
