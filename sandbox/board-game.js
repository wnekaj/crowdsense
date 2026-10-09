/* =========================================================================
   board-game.js — SANDBOX ONLY. The leaderboard's hooks into the game page.
   Loaded after app.js, menu.js, nav.js and look.js; styles in board.css.

     ranked play  today's question finished on the day, in daily mode, is
                  recorded for the board; archive plays and replays aren't.
                  "On the day" is the London date when the game finishes,
                  not when the page loaded
     menu         Leaderboard, and Sign in / Your account
     stats        the leaderboard takes the place of the daily-email sign-up
                  at the foot of Your stats: where you stand and a button to
                  the board, or an invitation to join. Nothing on the game's
                  own screen.
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

  // The leaderboard's Menu links to Archive, Your stats and How to play
  // land here with the panel open; it shouldn't sit under the front door.
  try{
    if (localStorage.getItem("cs-skip-door")){
      localStorage.removeItem("cs-skip-door");
      var door = document.querySelector(".lk-splash .lk-play");
      if (door) door.click();
    }
  }catch(_){}

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

  // ---------- the leaderboard, in Your stats ----------
  // It replaces the "Tomorrow's question straight to your inbox" form there.
  var subscribe = document.querySelector("#statsModal .subscribe");
  var box = document.createElement("section");
  box.id = "bgStats";
  box.className = "bg-card bg-instats";
  if (subscribe){
    subscribe.classList.add("hidden");
    subscribe.parentNode.insertBefore(box, subscribe);
  }
  function paintBox(){
    if (!box.parentNode) return;
    var dayNow = getDayKey();
    var head = '<div class="bg-head"><span class="bg-k">Leaderboard</span><span class="bg-m">' + esc(B.monthLabel(dayNow)) + '</span></div>';
    if (!A.signedIn()){
      var known = B.account();
      box.innerHTML = head +
        '<p class="bg-sub">See how you rank against everyone who plays, or in a private league with friends.</p>' +
        '<a class="bg-btn" href="' + BOARD_URL + '">See the leaderboard</a>' +
        '<p class="bg-switch"><button type="button" class="bg-linkbtn" id="bgJoin">Join</button> · ' +
          (known ? "Signed out? " : "Already joined? ") + '<button type="button" class="bg-linkbtn" id="bgSignin">Sign in</button></p>';
      box.querySelector("#bgJoin").addEventListener("click", function(){ A.open("join"); });
      box.querySelector("#bgSignin").addEventListener("click", function(){ A.open("signin"); });
      return;
    }
    var board = B.buildBoard({ todayKey: dayNow, account: B.account(), realDays: B.realDays(dayNow) });
    var month = B.view(board, "month"), today = B.view(board, "today");
    var m = month.filter(function(p){ return p.you; })[0], t = today.filter(function(p){ return p.you; })[0];
    box.innerHTML = head +
      '<div class="bg-stats">' +
        '<div><b>' + (m ? B.ordinal(m.rank) : "—") + '</b><span>this month</span></div>' +
        '<div><b>' + (t ? B.ordinal(t.rank) : "—") + '</b><span>today</span></div>' +
        '<div><b>' + (m ? m.avg.toFixed(1) : "—") + '</b><span>score</span></div>' +
      '</div>' +
      '<a class="bg-btn" href="' + BOARD_URL + '">See the leaderboard</a>';
  }
  // Your stats is drawn fresh each time it opens; the box follows
  var _renderStats = window.renderStats;
  window.renderStats = function(){
    _renderStats.apply(this, arguments);
    paintBox();
  };
  paintBox();

  // ---------- ranked plays ----------
  var _finishGame = window.finishGame;
  window.finishGame = function(alreadyDone){
    _finishGame(alreadyDone);
    // the first finish of today's question, on the day, is the ranked one
    if (!alreadyDone && MODE === "daily" && CUR && CUR.dayKey === getDayKey()) B.recordRanked(CUR.dayKey, state.score);
    paintBox();
  };

  document.addEventListener("cs-account", function(){ paintAcctItem(); paintBox(); });
})();
