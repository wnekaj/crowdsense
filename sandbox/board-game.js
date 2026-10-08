/* =========================================================================
   board-game.js — SANDBOX ONLY. The leaderboard's hooks into the game page.
   Loaded after app.js, menu.js, nav.js and look.js; styles in board.css.

     ranked play  today's question finished on the day, in daily mode, is
                  recorded for the board; archive plays and replays aren't
     menu         Leaderboard, and Sign in / Your account
     result       a card under the result: where you stand this month, or
                  an invitation to join; archive games say they don't count
   ========================================================================= */
(function(){
  "use strict";
  var B = window.CS_BOARD, A = window.CS_ACCOUNT;
  if (!B || !A || typeof setupGame !== "function") return;

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  // links keep the sandbox's ?day=, so the board shows the day being previewed
  var dayQ = (function(){ var m = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search); return m ? "?day=" + m[1] : ""; })();
  var BOARD_URL = "leaderboard.html" + dayQ;
  function num(n){ return (Math.round(n * 10) / 10).toLocaleString("en-GB", { maximumFractionDigits: 1 }); }

  // ---------- the menu ----------
  var SVG = function(p){ return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var nav = document.querySelector("#tgDrawer nav");
  var acctItem = null;
  if (nav){
    var lb = document.createElement("a");
    lb.className = "tg-drawer-item";
    lb.setAttribute("data-item", "leaderboard");
    lb.href = BOARD_URL;
    lb.innerHTML = SVG('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>') + '<span>Leaderboard</span>';
    var home = nav.querySelector('[data-item="home"]');
    nav.insertBefore(lb, home ? home.nextSibling : nav.firstChild);

    acctItem = document.createElement("button");
    acctItem.type = "button";
    acctItem.className = "tg-drawer-item";
    acctItem.setAttribute("data-item", "account");
    acctItem.addEventListener("click", function(){
      var shut = document.querySelector("#tgDrawer [data-tg-shut]");
      if (shut) shut.click();
      A.open(A.signedIn() ? "account" : "signin");
    });
    nav.appendChild(acctItem);
  }
  function paintAcctItem(){
    if (!acctItem) return;
    acctItem.innerHTML = SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>') +
      '<span>' + (A.signedIn() ? "Your account" : "Sign in") + '</span>';
  }
  paintAcctItem();

  // ---------- ranked plays, and the card under the result ----------
  function clearCard(){
    var old = document.getElementById("bgCard");
    if (old) old.remove();
  }
  function paintCard(){
    clearCard();
    if (!state.done || !CUR) return;
    var card = document.createElement("section");
    card.id = "bgCard";
    card.className = "bg-card";
    var ranked = MODE === "daily" && CUR.dayKey === DAY_KEY;
    if (!ranked){
      card.innerHTML = '<p class="bg-note">Archive games don\'t count towards the leaderboard — only today\'s question, played today.</p>';
    } else if (!A.signedIn()){
      card.innerHTML = '<div class="bg-head"><span class="bg-k">Leaderboard</span><span class="bg-m">' + esc(B.monthLabel(DAY_KEY)) + '</span></div>' +
        '<p class="bg-big">How do you rank?</p>' +
        '<p class="bg-sub">Join free to put today\'s ' + num(state.score) + ' off on the monthly leaderboard.</p>' +
        '<button type="button" class="bg-btn" id="bgJoin">Join the leaderboard</button>' +
        '<a class="bg-link" href="' + BOARD_URL + '">See the leaderboard</a>';
    } else {
      var board = B.buildBoard({ todayKey: DAY_KEY, account: B.account(), realDays: B.realDays(DAY_KEY) });
      var month = B.view(board, "month", "overall"), today = B.view(board, "today", "overall");
      var m = month.filter(function(p){ return p.you; })[0], t = today.filter(function(p){ return p.you; })[0];
      card.innerHTML = '<div class="bg-head"><span class="bg-k">Leaderboard</span><span class="bg-m">' + esc(B.monthLabel(DAY_KEY)) + '</span></div>' +
        '<div class="bg-stats">' +
          '<div><b>' + (m ? B.ordinal(m.rank) : "—") + '</b><span>this month</span></div>' +
          '<div><b>' + (t ? B.ordinal(t.rank) : "—") + '</b><span>today, of ' + today.length + '</span></div>' +
          '<div><b>' + (m ? "top " + B.topPercent(m.rank, month.length) + "%" : "—") + '</b><span>of ' + month.length + ' players</span></div>' +
        '</div>' +
        '<a class="bg-btn" href="' + BOARD_URL + '">See the leaderboard</a>';
    }
    var anchor = document.getElementById("shareBtn");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor.nextSibling);
    else els.reveal.appendChild(card);
    var join = card.querySelector("#bgJoin");
    if (join) join.addEventListener("click", function(){ A.open("join", paintCard); });
  }

  var _finishGame = window.finishGame;
  window.finishGame = function(alreadyDone){
    _finishGame(alreadyDone);
    // the first finish of today's question, on the day, is the ranked one
    if (!alreadyDone && MODE === "daily" && CUR && CUR.dayKey === DAY_KEY) B.recordRanked(DAY_KEY, state.score);
    paintCard();
  };
  var _setupGame = window.setupGame;
  window.setupGame = function(dayKey, mode){
    clearCard();
    _setupGame(dayKey, mode);
  };
  if (state.done) paintCard();

  document.addEventListener("cs-account", function(){ paintAcctItem(); if (state.done) paintCard(); });
})();
