/* =========================================================================
   leagues.js — SANDBOX ONLY. Private leagues, the Leagues tab of the
   leaderboard page (next to Monthly and Daily). Data in board-data.js;
   the sheets use account.js's, so focus and keyboard behave the same.

     signed out   what leagues are, and Join / Sign in
     your leagues each one's name, period, members and where you stand;
                  Create a league, Join with a code
     a league     its standings over its period (weekly, monthly or
                  all-time), the rule, the invite code and link, and
                  Leave (or Delete, for the league you made)
     sheets       create (name, then Weekly / Monthly / All-time), the
                  invite once it's made, join with a code, leave / delete

   Mock only: a league you make has just you until someone joins with its
   code; the sandbox's ready-made leagues (PUB-QUIZ, OFFICE-POLL,
   UNI-MATES) show one with players. Nothing is sent anywhere.
   ========================================================================= */
(function(){
  "use strict";
  var B = window.CS_BOARD, A = window.CS_ACCOUNT;
  if (!B || !A || !A.register) return;
  var esc = A.esc;
  var current = null;        // the league open, or null for the list
  var host = null;           // the panel the tab draws into
  var settle = null;         // after a step: "title" or "list" gets focus and scroll
  var todayKey = B.todayKey();
  // the sandbox's own leaderboard, which opens Join with the code filled in
  // (the real thing would have its own crowdsense.uk/join/CODE page)
  var INVITE = location.origin + location.pathname + "?join=";
  var pendingCode = (/[?&]join=([A-Za-z0-9-]+)/.exec(location.search) || [])[1] || null;

  var TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';
  var PEOPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21.5 19"/></svg>';

  function score(n){ return n === null || n === undefined ? "—" : n.toFixed(1); }
  function code(c){ return '<b class="lg-nowrap">' + esc(c) + '</b>'; }
  function members(n){ return n + (n === 1 ? " member" : " members"); }
  function chip(period){ return '<span class="lg-chip lg-' + period + '">' + B.PERIODS[period].label + '</span>'; }

  // ---------- the panel ----------
  function render(panel){
    host = panel || host;
    if (!host) return;
    if (!A.signedIn()){ current = null; return paintSignedOut(); }
    if (current && !B.findLeague(current)) current = null;
    if (current) paintLeague(B.findLeague(current)); else paintList();
    if (settle){ settle = null; focusTop(); }
  }
  function paintSignedOut(){
    var known = B.account();
    host.innerHTML =
      '<div class="lg-icon">' + PEOPLE + '</div>' +
      '<h2 class="lg-h">Private leagues</h2>' +
      '<p class="lg-p">Make a league for friends, family or work and see who knows Britain best, week by week, month by month or all-time.</p>' +
      '<button type="button" class="lb-btn" id="lgSignedOutJoin">Join to start a league</button>' +
      '<p class="lb-switch">' + (known ? "Signed out. " : "Already joined? ") + '<button type="button" class="lb-link" id="lgSignin">Sign in</button></p>';
    host.querySelector("#lgSignedOutJoin").addEventListener("click", function(){ A.open("join"); });
    host.querySelector("#lgSignin").addEventListener("click", function(){ A.open("signin"); });
  }
  function actions(){
    return '<div class="lg-actions">' +
      '<button type="button" class="lb-btn" id="lgCreate">Create a league</button>' +
      '<button type="button" class="lb-btn lb-btn-ghost" id="lgJoin">Join with a code</button>' +
    '</div>';
  }
  function wireActions(){
    host.querySelector("#lgCreate").addEventListener("click", function(){ A.open("leagueCreate"); });
    host.querySelector("#lgJoin").addEventListener("click", function(){ A.open("leagueJoin"); });
  }
  function paintList(){
    var list = B.leagues();
    if (!list.length){
      host.innerHTML =
        '<div class="lg-icon">' + PEOPLE + '</div>' +
        '<h2 class="lg-h">No leagues yet</h2>' +
        '<p class="lg-p">Start one for friends, family or work, or join one with the code someone sent you.</p>' +
        actions() +
        '<p class="lg-sandbox">Sandbox: join with ' + code("PUB-QUIZ") + ', ' + code("OFFICE-POLL") + ' or ' + code("UNI-MATES") + ' to see a league with players.</p>';
      return wireActions();
    }
    host.innerHTML =
      '<h2 class="lg-h lg-h-left">Your leagues</h2>' +
      '<ul class="lg-list">' + list.map(function(lg){
        var st = B.leagueStandings(lg, todayKey), me = st.rows.filter(function(r){ return r.you; })[0];
        var anyone = st.rows.some(function(r){ return r.rank; });
        var where = me && me.rank ? "You're " + B.ordinal(me.rank) : anyone ? "You haven't played yet" : "No scores yet";
        return '<li><button type="button" class="lg-item" data-id="' + esc(lg.id) + '">' +
          '<span class="lg-name">' + esc(lg.name) + '</span>' +
          '<span class="lg-meta">' + chip(lg.period) + '<span>' + members(st.members) + ' · ' + where + '</span></span>' +
          '<span class="lg-go" aria-hidden="true">›</span></button></li>';
      }).join("") + '</ul>' +
      actions() +
      '<p class="lg-sandbox">Sandbox: try ' + code("PUB-QUIZ") + ', ' + code("OFFICE-POLL") + ' or ' + code("UNI-MATES") + '.</p>';
    Array.prototype.forEach.call(host.querySelectorAll(".lg-item"), function(b){
      b.addEventListener("click", function(){ open(b.getAttribute("data-id")); });
    });
    wireActions();
  }
  function paintLeague(lg){
    var st = B.leagueStandings(lg, todayKey);
    var rows = st.rows.map(function(r){
      var cls = ["lb-row"];
      if (r.you) cls.push("me");
      if (r.rank && r.rank <= 3) cls.push("top" + r.rank);
      return '<li class="' + cls.join(" ") + '">' +
        '<span class="lb-rank">' + (r.rank ? '<span class="vh">Rank </span>' + r.rank : '<span class="vh">Not ranked yet</span>–') + '</span>' +
        '<span class="lb-name"><span class="lb-n">' + esc(r.name) + '</span></span>' +
        (r.you ? '<span class="lb-youtag">You</span>' : "") +
        '<span class="lb-score"><b aria-hidden="' + (r.score === null ? "true" : "false") + '">' + score(r.score) + '</b>' +
          '<span class="vh">' + (r.score === null ? "No score yet" : " Crowdsense score") + '</span></span></li>';
    }).join("");
    host.innerHTML =
      '<button type="button" class="lg-back" id="lgBack">‹ Your leagues</button>' +
      '<h2 class="lg-title" tabindex="-1" id="lgTitle">' + esc(lg.name) + '</h2>' +
      '<p class="lg-when">' + chip(lg.period) + '<span>' + esc(st.window.label) + '</span></p>' +
      '<div class="lb-colhead"><span>Player</span><span>Crowdsense score</span></div>' +
      '<ol class="lb-rows">' + rows + '</ol>' +
      (st.members === 1 ? '<p class="lg-p lg-alone">Just you so far. Send your invite code to get people in.</p>' : "") +
      '<p class="lg-rule">' + B.PERIODS[lg.period].rule + '</p>' +
      '<div class="lg-invite"><div><span>Invite code</span>' + code(lg.code) + '</div>' +
        '<button type="button" class="lb-btn lg-copy" id="lgCopy">Copy invite link</button></div>' +
      '<button type="button" class="lb-link lg-leave" id="lgLeave">' + (lg.owner ? "Delete this league" : "Leave this league") + '</button>';
    host.querySelector("#lgBack").addEventListener("click", back);
    host.querySelector("#lgCopy").addEventListener("click", function(){ copyInvite(lg); });
    host.querySelector("#lgLeave").addEventListener("click", function(){ A.open("leagueLeave"); });
  }
  function focusTop(){
    try{ host.scrollIntoView({ block: "start" }); }catch(_){}
    var t = host.querySelector("#lgTitle, .lg-h");
    if (t){ if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1"); try{ t.focus({ preventScroll: true }); }catch(_){} }
  }
  // a league has its own address (#league=ID), so the phone's Back button
  // returns to the list instead of leaving the leaderboard
  function open(id){
    current = id;
    try{ history.pushState({ league: id }, "", location.pathname + location.search + "#league=" + encodeURIComponent(id)); }catch(_){}
    settle = "title";
    render();
  }
  function back(){
    if (history.state && history.state.league) history.back();
    else { current = null; settle = "list"; render(); }
  }
  window.addEventListener("popstate", function(){
    var m = /#league=([^&]+)/.exec(location.hash);
    current = m ? decodeURIComponent(m[1]) : null;
    settle = current ? "title" : "list";
    render();
  });
  // opened at #league=ID (a link, or Back/Forward): that league
  (function(){ var m = /#league=([^&]+)/.exec(location.hash); if (m) current = decodeURIComponent(m[1]); })();
  function copyInvite(lg){
    var text = "Join my Crowdsense league, " + lg.name + ": " + INVITE + lg.code + " (code " + lg.code + ")";
    var done = function(){ A.toast("Invite link copied"); };
    try{
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    }catch(_){ done(); }
  }

  // ---------- the sheets ----------
  var made = null;    // the league just created, for its invite screen
  function periodChoice(){
    return '<fieldset><legend>Scores over</legend><div class="lg-periods">' +
      [["week", "Weekly", "Starts again every Monday. Your best two-thirds of days count."],
       ["month", "Monthly", "Starts again on the 1st. Play a minimum of 20 days."],
       ["all", "All-time", "From the day the league starts. Your best two-thirds of days count."]].map(function(o, i){
        return '<label class="lg-period"><input type="radio" name="period" value="' + o[0] + '"' + (i === 0 ? " checked" : "") + '>' +
          '<span><b>' + o[1] + '</b><small>' + o[2] + '</small></span></label>';
      }).join("") + '</div></fieldset>';
  }
  A.register("leagueCreate", {
    render: function(){
      return '<div class="ac-icon">' + TROPHY + '</div>' +
        '<h2 id="acTitle">Create a league</h2>' +
        '<p class="ac-sub">For friends, family or work. Everyone in it needs to have joined the leaderboard.</p>' +
        '<form novalidate>' +
          '<label class="ac-label" for="lgName">League name</label>' +
          '<input class="ac-input" id="lgName" name="name" maxlength="30" placeholder="e.g. The Pub Quiz Lot" autocomplete="off">' +
          periodChoice() +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Create league</button>' +
        '</form>';
    },
    submit: function(form){
      var name = String(form.name.value || "").replace(/\s+/g, " ").trim();
      if (name.length < 2) return A.err(form, "Give your league a name of at least 2 characters.");
      if (!/^[\p{L}\p{N}][\p{L}\p{N} '’&!.,_-]*$/u.test(name)) return A.err(form, "Use letters, numbers, spaces and simple punctuation only.");
      var period = (form.querySelector('input[name="period"]:checked') || {}).value || "week";
      made = B.createLeague(name, period);
      current = made.id;
      try{ history.pushState({ league: made.id }, "", location.pathname + location.search + "#league=" + encodeURIComponent(made.id)); }catch(_){}
      settle = "title";
      A.show("leagueMade");
    }
  });
  A.register("leagueMade", {
    render: function(){
      var lg = made || {};
      return '<div class="ac-icon">' + PEOPLE + '</div>' +
        '<h2 id="acTitle">' + esc(lg.name) + ' is ready</h2>' +
        '<p class="lg-ready-chip">' + chip(lg.period || "week") + '</p>' +
        '<p class="ac-sub">Send people the link, or the code to type in.</p>' +
        '<div class="lg-invite lg-invite-big"><div><span>Invite code</span>' + code(lg.code) + '</div></div>' +
        '<button type="button" class="ac-btn" id="lgMadeCopy">Copy invite link</button>' +
        '<p class="ac-switch"><button type="button" class="ac-link" id="lgMadeDone" data-ac-focus>Go to the league</button></p>';
    },
    wire: function(body){
      body.querySelector("#lgMadeCopy").addEventListener("click", function(){ copyInvite(made); });
      body.querySelector("#lgMadeDone").addEventListener("click", function(){ A.close(); });
    }
  });
  A.register("leagueJoin", {
    render: function(){
      return '<div class="ac-icon">' + PEOPLE + '</div>' +
        '<h2 id="acTitle">Join a league</h2>' +
        '<p class="ac-sub">Type the code from your invite.</p>' +
        '<form novalidate>' +
          '<label class="ac-label" for="lgCode">League code</label>' +
          '<input class="ac-input lg-code-input" id="lgCode" name="code" placeholder="e.g. PUB-QUIZ" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(pendingCode || "") + '">' +
          '<p class="ac-hint">You can paste the whole invite. Sandbox: ' + code("PUB-QUIZ") + ', ' + code("OFFICE-POLL") + ' and ' + code("UNI-MATES") + ' are ready-made leagues.</p>' +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Join league</button>' +
        '</form>';
    },
    submit: function(form){
      var res = B.joinLeague(form.code.value);
      if (res.error) return A.err(form, res.error);
      pendingCode = null;
      current = res.league.id;
      try{ history.pushState({ league: current }, "", location.pathname + location.search + "#league=" + encodeURIComponent(current)); }catch(_){}
      settle = "title";
      A.finish("You've joined " + res.league.name);
    }
  });
  A.register("leagueLeave", {
    render: function(){
      var lg = B.findLeague(current) || {};
      return lg.owner
        ? '<h2 id="acTitle">Delete ' + esc(lg.name) + '?</h2>' +
          '<p class="ac-sub">The league goes for everyone in it. Their own scores and the main leaderboard aren\'t affected.</p>' +
          '<button type="button" class="ac-btn ac-btn-danger" id="lgLeaveYes">Delete the league</button>' +
          '<p class="ac-switch"><button type="button" class="ac-link" data-ac-close data-ac-focus>Keep it</button></p>'
        : '<h2 id="acTitle">Leave ' + esc(lg.name) + '?</h2>' +
          '<p class="ac-sub">You can join again with its code.</p>' +
          '<button type="button" class="ac-btn ac-btn-danger" id="lgLeaveYes">Leave the league</button>' +
          '<p class="ac-switch"><button type="button" class="ac-link" data-ac-close data-ac-focus>Stay in it</button></p>';
    },
    wire: function(body){
      body.querySelector("#lgLeaveYes").addEventListener("click", function(){
        var lg = B.findLeague(current);
        if (lg && lg.owner) B.deleteLeague(current); else B.leaveLeague(current);
        current = null;
        settle = "list";
        try{ if (history.state && history.state.league) history.replaceState(null, "", location.pathname + location.search); }catch(_){}
        A.finish(lg && lg.owner ? "League deleted" : "You've left " + (lg ? lg.name : "the league"));
      });
    }
  });

  // arriving from an invite link: signed in, the Join sheet opens with the
  // code in; signed out, it opens once you've joined or signed in
  function offerPending(){
    if (pendingCode && A.signedIn()) setTimeout(function(){ A.open("leagueJoin"); }, 0);
  }
  document.addEventListener("cs-account", offerPending);

  window.CS_LEAGUES = {
    render: render, offerPending: offerPending,
    reset: function(){ if (!/#league=/.test(location.hash)) current = null; },
    wantsTab: function(){ return !!pendingCode || /#league=/.test(location.hash); }
  };
})();
