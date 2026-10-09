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
  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function num(n){ return (Math.round(n * 10) / 10).toLocaleString("en-GB", { maximumFractionDigits: 1 }); }
  // a Crowdsense score is an average: always one decimal, so 4.0 sits with 4.3
  function avg(n){ return n.toFixed(1); }
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
    // these open a panel in the game: tell it to skip its front door
    ["archive", "stats", "help"].forEach(function(k){
      var a = document.querySelector('#tgDrawer [data-item="' + k + '"]');
      if (a) a.addEventListener("click", function(){ try{ localStorage.setItem("cs-skip-door", "1"); }catch(_){} });
    });
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
  var board, you, period = "month";
  function build(){
    board = B.buildBoard({ todayKey: todayKey, account: B.account(), realDays: B.realDays(todayKey) });
    you = board.players.filter(function(p){ return p.you; })[0] || null;
  }
  build();

  $("monthLabel").textContent = B.monthLabel(todayKey) + " · day " + board.dayCount + " of " + board.daysInMonth;

  // ---------- your card ----------
  function youCard(){
    var card = $("youCard");
    if (!you){
      var a = B.account();
      card.className = "lb-card lb-you lb-join";
      card.innerHTML = '<div class="lb-join-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></div>' +
        '<h2>Get on the board</h2>' +
        '<p>Join free with your email to see your name on the leaderboard.</p>' +
        '<button type="button" class="lb-btn" id="joinBtn">Join the leaderboard</button>' +
        '<p class="lb-switch">' + (a ? "Signed out. " : "Already joined? ") + '<button type="button" class="lb-link" id="signinBtn">Sign in</button></p>';
      $("joinBtn").addEventListener("click", function(){ A.open("join"); });
      $("signinBtn").addEventListener("click", function(){ A.open("signin"); });
      return;
    }
    var month = B.view(board, "month"), today = B.view(board, "today");
    var m = month.filter(function(p){ return p.you; })[0];
    var t = today.filter(function(p){ return p.you; })[0];
    var top = m ? B.topLine(m.rank, month.length) : "";
    card.className = "lb-card lb-you";
    card.innerHTML =
      '<div class="lb-you-top"><span class="lb-av" aria-hidden="true">' + esc(you.name.charAt(0).toUpperCase()) + '</span>' +
        '<div class="lb-you-name"><b>' + esc(you.name) + '</b><button type="button" class="lb-link" id="acctBtn">Your account</button></div></div>' +
      '<div class="lb-you-stats">' +
        '<div><b>' + (m ? B.ordinal(m.rank) : "—") + '</b><span>of ' + month.length + ' this month</span></div>' +
        '<div><b>' + (m ? avg(m.avg) : "—") + '</b><span>Crowdsense score</span></div>' +
        '<div><b>' + you.played + '</b><span>' + (you.played === 1 ? "day" : "days") + ' played</span></div>' +
      '</div>' +
      (you.played > B.BEST ? '<p class="lb-top">Your lowest ' + B.BEST + ' of ' + you.played + ' scores count.</p>' : "") +
      (top ? '<p class="lb-top">You\'re in the <b>' + top + '</b> of players this month.</p>' : "") +
      (t ? '<p class="lb-today"><span class="lb-dot t-' + band(t.today) + '"></span>Today: <b>' + num(t.today) + ' off</b> · ' + B.ordinal(t.rank) + ' of ' + today.length + '</p>'
         : '<p class="lb-today">Today: not played yet. <a class="lb-link" href="index.html' + q + '">Play today\'s question</a></p>');
    $("acctBtn").addEventListener("click", function(){ A.open("account"); });
  }

  // ---------- the board ----------
  function row(p){
    var cls = ["lb-row"];
    if (p.you) cls.push("me");
    if (p.rank <= 3) cls.push("top" + p.rank);
    var meta = period === "month"
      ? p.played + (p.played === 1 ? " day" : " days") +
        (p.pulses ? ' · <span aria-hidden="true">🎯 ' + p.pulses + '</span><span class="vh">, ' + p.pulses +
          (p.pulses === 1 ? " day" : " days") + ' On the pulse</span>' : "")
      : "";
    var score = period === "today"
      ? '<span class="lb-dot t-' + band(p.score) + '" aria-hidden="true"></span><b>' + num(p.score) + '</b><span class="vh"> off today</span>'
      : '<b>' + avg(p.score) + '</b><span class="vh"> Crowdsense score</span>';
    return '<li class="' + cls.join(" ") + '"' + (p.you ? ' id="youRow"' : "") + '>' +
      '<span class="lb-rank"><span class="vh">Rank </span>' + p.rank + '</span>' +
      '<span class="lb-name"><span class="lb-n">' + esc(p.name) + '</span>' +
        (meta ? '<small>' + meta + '</small>' : "") + '</span>' +
      (p.you ? '<span class="lb-youtag">You</span>' : "") +
      '<span class="lb-score">' + score + '</span></li>';
  }
  function render(){
    var list = B.view(board, period);
    var note = $("boardNote"), msg = "";
    if (period === "today" && you && you.today === null) msg = "Play today's question to appear on today's board.";
    note.textContent = msg;
    note.classList.toggle("hidden", !msg);

    var top = list.slice(0, SHOW), me = list.filter(function(p){ return p.you; })[0];
    var html = top.map(row).join("");
    if (me && me.rank > SHOW) html += '<li class="lb-gap" aria-hidden="true">⋯</li>' + row(me);
    if (!list.length) html = '<li class="lb-empty">' + (period === "today" ? "Nobody has played today yet." : "Nobody has played this month yet.") + '</li>';
    $("rows").innerHTML = html;
    $("colScore").textContent = period === "today" ? "Points off" : "Crowdsense score";
    $("caption").textContent = (period === "today" ? "Today" : "This month") + " — " +
      list.length + (list.length === 1 ? " player" : " players") +
      (list.length > SHOW ? ", top " + SHOW + " shown" : "");
    youCard();
  }

  Array.prototype.forEach.call(document.querySelectorAll(".lb-seg button"), function(b){
    b.addEventListener("click", function(){
      period = b.getAttribute("data-period");
      Array.prototype.forEach.call(document.querySelectorAll(".lb-seg button"), function(x){
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      render();
    });
  });

  // signing up, in or out, all rebuild the board
  document.addEventListener("cs-account", function(){
    build();
    render();
    var r = $("youRow");
    if (r && you) try{ r.scrollIntoView({ block: "nearest", behavior: "smooth" }); }catch(_){}
  });

  render();
  // for the sandbox's own tests
  window.__LB = { render: render, get board(){ return board; }, get you(){ return you; } };
})();
