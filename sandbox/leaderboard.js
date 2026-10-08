/* =========================================================================
   leaderboard.js — SANDBOX ONLY. The leaderboard page, on dummy players.
   Reads the sandbox's own storage (the page carries the same isolation shim
   as the sandbox game); writes only the mock account, via account.js.
   ========================================================================= */
(function(){
  "use strict";
  var B = window.CS_BOARD, A = window.CS_ACCOUNT;
  if (!B || !A) return;

  var SHOW = 20;   // rows before the list is cut, with you pinned below if lower
  var DIMS = {
    region: { label: "Region", values: B.REGIONS },
    age:    { label: "Age",    values: B.AGES },
    gender: { label: "Gender", values: B.GENDERS }
  };
  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function num(n){ return (Math.round(n * 10) / 10).toLocaleString("en-GB", { maximumFractionDigits: 1 }); }
  // the game's bands, as from 8 Oct 2026, for today's scores
  function band(off){
    if (off <= 3) return "target"; if (off <= 10) return "hot"; if (off <= 15) return "warm";
    if (off < 25) return "cool"; return "cold";
  }

  var todayKey = B.todayKey();
  var dayParam = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search);
  var q = dayParam ? "?day=" + dayParam[1] : "";
  ["backTop", "backBottom", "brandHome"].forEach(function(id){ $(id).setAttribute("href", "index.html" + q); });

  // ---------- the menu: the game's, with Leaderboard current ----------
  if (window.CS_MENU){
    CS_MENU.mount({ into: $("lbTop"), items: [
      { key: "home", label: "Home", href: "index.html" + q },
      { key: "leaderboard", label: "Leaderboard", current: true },
      { key: "archive", label: "Archive", href: "index.html" + q + "#archive" },
      { key: "stats", label: "Your stats", href: "index.html" + q + "#stats" },
      { key: "help", label: "How to play", href: "index.html" + q + "#help" }
    ]});
    var nav = document.querySelector("#tgDrawer nav");
    var acct = document.createElement("button");
    acct.type = "button";
    acct.className = "tg-drawer-item";
    acct.setAttribute("data-item", "account");
    acct.addEventListener("click", function(){
      var shut = document.querySelector("#tgDrawer [data-tg-shut]");
      if (shut) shut.click();
      A.open(A.signedIn() ? "account" : "signin");
    });
    if (nav) nav.appendChild(acct);
    var paintAcct = function(){
      acct.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>' +
        '<span>' + (A.signedIn() ? "Your account" : "Sign in") + '</span>';
    };
    paintAcct();
    document.addEventListener("cs-account", paintAcct);
  }

  // ---------- state ----------
  var board, you, period = "month", dim = "overall", value = null;
  function build(){
    board = B.buildBoard({ todayKey: todayKey, account: B.account(), realDays: B.realDays(todayKey) });
    you = board.players.filter(function(p){ return p.you; })[0] || null;
  }
  build();

  $("monthLabel").textContent = B.monthLabel(todayKey) + " · day " + board.dayCount + " of " + board.daysInMonth;
  $("ruleMissed").textContent = B.MISSED;
  $("ruleDrop").textContent = B.DROP;
  if (board.dayCount <= B.DROP){
    $("ruleEarly").textContent = "It's day " + board.dayCount + ", so every day so far is still being dropped: totals start counting on day " + (B.DROP + 1) + ".";
    $("ruleEarly").classList.remove("hidden");
  }

  // ---------- past winners: placeholders for each finished month ----------
  (function(){
    var y = board.year, m = board.monthNum, items = [];
    for (var i = 0; i < 6; i++){
      m -= 1; if (m < 1){ m = 12; y -= 1; }
      if (y < 2026 || (y === 2026 && m < 7)) break;      // launched July 2026
      items.push(B.monthLabel(y + "-" + String(m).padStart(2, "0") + "-01"));
    }
    $("past").innerHTML = items.length ? items.map(function(label){
      return '<li><span>' + esc(label) + '</span><span class="ph">Winner — placeholder</span></li>';
    }).join("") : '<li><span>No finished months yet</span></li>';
  })();

  // ---------- your card ----------
  function youCard(){
    var card = $("youCard");
    if (!you){
      var a = B.account();
      card.className = "lb-card lb-you lb-join";
      card.innerHTML = '<div class="lb-join-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></div>' +
        '<h2>Get on the board</h2>' +
        '<p>Join free with your email to see your name here and play for the monthly prize.</p>' +
        '<button type="button" class="lb-btn" id="joinBtn">Join the leaderboard</button>' +
        '<p class="lb-switch">' + (a ? "Signed out. " : "Already joined? ") + '<button type="button" class="lb-link" id="signinBtn">Sign in</button></p>';
      $("joinBtn").addEventListener("click", function(){ A.open("join"); });
      $("signinBtn").addEventListener("click", function(){ A.open("signin"); });
      return;
    }
    var month = B.view(board, "month", "overall"), today = B.view(board, "today", "overall");
    var m = month.filter(function(p){ return p.you; })[0];
    var t = today.filter(function(p){ return p.you; })[0];
    card.className = "lb-card lb-you";
    card.innerHTML =
      '<div class="lb-you-top"><span class="lb-av" aria-hidden="true">' + esc(you.name.charAt(0).toUpperCase()) + '</span>' +
        '<div class="lb-you-name"><b>' + esc(you.name) + '</b><button type="button" class="lb-link" id="acctBtn">Your account</button></div></div>' +
      '<div class="lb-you-stats">' +
        '<div><b>' + B.ordinal(m.rank) + '</b><span>of ' + month.length + ' this month</span></div>' +
        '<div><b>top ' + B.topPercent(m.rank, month.length) + '%</b><span>of players</span></div>' +
        '<div><b>' + num(m.total) + '</b><span>points off</span></div>' +
        '<div><b>' + m.played + '/' + board.dayCount + '</b><span>days played</span></div>' +
      '</div>' +
      (t ? '<p class="lb-today"><span class="lb-dot t-' + band(t.today) + '"></span>Today: <b>' + num(t.today) + ' off</b> · ' + B.ordinal(t.rank) + ' of ' + today.length + '</p>'
         : '<p class="lb-today">Today: not played yet. <a class="lb-link" href="index.html' + q + '">Play today\'s question</a></p>');
    $("acctBtn").addEventListener("click", function(){ A.open("account"); });
  }

  // ---------- the board ----------
  function defaultValue(d){
    var mine = you && you[d];
    if (mine && mine !== B.PNTS && DIMS[d].values.indexOf(mine) > -1) return mine;
    return DIMS[d].values[0];
  }
  function row(p, n){
    var cls = ["lb-row"];
    if (p.you) cls.push("me");
    if (p.rank <= 3) cls.push("top" + p.rank);
    var meta = period === "month"
      ? p.played + (p.played === 1 ? " day" : " days") + (p.pulses ? " · 🎯 " + p.pulses : "")
      : "";
    var score = period === "today"
      ? '<span class="lb-dot t-' + band(p.score) + '"></span><b>' + num(p.score) + '</b>'
      : '<b>' + num(p.score) + '</b>';
    return '<li class="' + cls.join(" ") + '"' + (p.you ? ' id="youRow"' : "") + '>' +
      '<span class="lb-rank">' + p.rank + '</span>' +
      '<span class="lb-name">' + esc(p.name) + (p.you ? ' <span class="lb-youtag">You · top ' + B.topPercent(p.rank, n) + '%</span>' : "") +
        (meta ? '<small>' + meta + '</small>' : "") + '</span>' +
      '<span class="lb-score">' + score + '</span></li>';
  }
  function render(){
    var group = B.view(board, period, dim, value);
    var note = $("groupNote"), msg = "";
    if (dim !== "overall"){
      var label = DIMS[dim].label.toLowerCase(), mine = you && you[dim];
      if (!you) msg = "Join and add your " + label + " to be placed in a group.";
      else if (!mine) msg = "Add your " + label + " in Your account to be placed in a group.";
      else if (mine === B.PNTS) msg = "You chose not to say your " + label + ", so you're on the Everyone board only.";
      else if (mine !== value) msg = "You're not in this group.";
    }
    if (period === "today" && you && you.today === null) msg = (msg ? msg + " " : "") + "Play today's question to appear here.";
    note.textContent = msg;
    note.classList.toggle("hidden", !msg);

    var top = group.slice(0, SHOW), me = group.filter(function(p){ return p.you; })[0];
    var html = top.map(function(p){ return row(p, group.length); }).join("");
    if (me && me.rank > SHOW) html += '<li class="lb-gap" aria-hidden="true">⋯</li>' + row(me, group.length);
    if (!group.length) html = '<li class="lb-empty">' + (period === "today" ? "Nobody in this group has played today yet." : "No players in this group yet.") + '</li>';
    $("rows").innerHTML = html;
    $("colScore").textContent = period === "today" ? "Today" : "Points off";
    $("caption").textContent = (dim === "overall" ? "Everyone" : DIMS[dim].label + ": " + value) +
      (period === "today" ? ", today — " : " — ") + group.length + (group.length === 1 ? " player" : " players") +
      (group.length > SHOW ? ", top " + SHOW + " shown" : "");
    youCard();
  }

  var pick = $("pick");
  function pressed(sel, b){
    Array.prototype.forEach.call(document.querySelectorAll(sel), function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".lb-seg button"), function(b){
    b.addEventListener("click", function(){ period = b.getAttribute("data-period"); pressed(".lb-seg button", b); render(); });
  });
  function fillPick(){
    pick.innerHTML = DIMS[dim].values.map(function(v){
      return '<option' + (v === value ? " selected" : "") + '>' + esc(v) + '</option>';
    }).join("");
  }
  Array.prototype.forEach.call(document.querySelectorAll(".lb-tabs button"), function(b){
    b.addEventListener("click", function(){
      dim = b.getAttribute("data-dim");
      pressed(".lb-tabs button", b);
      if (dim === "overall"){ value = null; $("pickWrap").classList.add("hidden"); }
      else { value = defaultValue(dim); $("pickLabel").textContent = DIMS[dim].label; fillPick(); $("pickWrap").classList.remove("hidden"); }
      render();
    });
  });
  pick.addEventListener("change", function(){ value = pick.value; render(); });

  // signing up, in or out, or editing details, all rebuild the board
  document.addEventListener("cs-account", function(){
    build();
    if (dim !== "overall"){ value = defaultValue(dim); fillPick(); }
    render();
    var r = $("youRow");
    if (r && you) try{ r.scrollIntoView({ block: "nearest", behavior: "smooth" }); }catch(_){}
  });

  render();
  // for the sandbox's own tests
  window.__LB = { render: render, get board(){ return board; }, get you(){ return you; } };
})();
