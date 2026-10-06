/* =========================================================================
   poll.js — A one-off pop-up after the reveal, before the
   stats: "Would you rather play with one guess or two?"

   Each device is asked once. Answers are stored with the existing crowd
   Worker, so nothing new has to be deployed: a vote is recorded as a
   "guess" on a reserved puzzle number far beyond any real puzzle (real
   puzzles are numbered by day, so they won't reach 90,000 for centuries).
   The guess value is the answer: 1 = one guess, 2 = two guesses.

     90001  the live game's vote (for when this goes live)
     90002  the sandbox's vote, kept apart so test plays never mix in

   Results: crowdsense.uk/poll-results.html reads both buckets back.
   ========================================================================= */
(function(){
  "use strict";

  var API = "https://crowdsense-crowd.crowdsense-game.workers.dev";
  // the sandbox's storage shim sets __SBX_ISOLATED; the live game has none
  var BUCKET = window.__SBX_ISOLATED ? 90002 : 90001;
  var KEY = "cs-poll-guesses";        // this device's answer: "one", "two" or "skip"
  var VALUE = { one: 1, two: 2 };

  function asked(){ try{ return !!localStorage.getItem(KEY); }catch(_){ return true; } }
  function remember(v){ try{ localStorage.setItem(KEY, v); }catch(_){} }

  var CSS = [
    '#tgPoll .modal-card{text-align:center;max-width:380px}',
    '.tg-poll-q{font-size:17px;line-height:1.45;margin:4px 0 18px}',
    '.tg-poll-opts{display:flex;flex-direction:column;gap:10px}',
    '.tg-poll-opt{display:block;width:100%;border:none;border-radius:4px;cursor:pointer;',
    ' background:var(--accent);color:#fff;font:inherit;font-size:16px;font-weight:500;padding:14px 20px}',
    '.tg-poll-opt:hover{background:var(--accent-deep)}',
    '.tg-poll-opt:disabled{opacity:.6;cursor:default}',
    '.tg-poll-skip{margin-top:14px;border:0;background:transparent;color:var(--muted);font:inherit;',
    ' font-size:13.5px;text-decoration:underline;cursor:pointer;padding:6px}',
    '.tg-poll-thanks{font-size:17px;font-weight:500;margin:10px 0 6px}'
  ].join("\n");

  function build(){
    if (document.getElementById("tgPoll")) return document.getElementById("tgPoll");
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    var m = document.createElement("div");
    m.id = "tgPoll";
    m.className = "modal-root hidden";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-labelledby", "tgPollTitle");
    m.innerHTML =
      '<div class="modal-backdrop"></div>' +
      '<div class="modal-card">' +
        '<h2 class="modal-title" id="tgPollTitle">Quick question</h2>' +
        '<div class="modal-body" id="tgPollBody">' +
          '<p class="tg-poll-q">Would you rather play Crowdsense with <b>one guess</b> or <b>two</b>?</p>' +
          '<div class="tg-poll-opts">' +
            '<button type="button" class="tg-poll-opt" data-vote="one">One guess</button>' +
            '<button type="button" class="tg-poll-opt" data-vote="two">Two guesses</button>' +
          '</div>' +
          '<button type="button" class="tg-poll-skip" data-vote="skip">Skip</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    return m;
  }

  // the stats open as they would have, once the poll is out of the way
  function thenStats(){
    if (typeof renderStats === "function") renderStats();
    if (typeof openModal === "function") openModal("statsModal");
  }

  function send(v){
    try{
      fetch(API + "/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle: BUCKET, guess: VALUE[v] }),
        keepalive: true
      }).catch(function(){});
    }catch(_){}
  }

  function open(){
    var m = build();
    var done = false;
    function finish(v){
      if (done) return;
      done = true;
      remember(v);
      if (VALUE[v]){
        send(v);
        document.getElementById("tgPollBody").innerHTML = '<p class="tg-poll-thanks">Thanks — noted!</p>';
        setTimeout(function(){ m.classList.add("hidden"); thenStats(); }, 900);
      } else {
        m.classList.add("hidden");
        thenStats();
      }
    }
    m.addEventListener("click", function(e){
      var b = e.target.closest("[data-vote]");
      if (b) finish(b.getAttribute("data-vote"));
      else if (e.target.classList.contains("modal-backdrop")) finish("skip");
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && !m.classList.contains("hidden")) finish("skip");
    });
    m.classList.remove("hidden");
    var first = m.querySelector(".tg-poll-opt");
    if (first) setTimeout(function(){ try{ first.focus(); }catch(_){} }, 60);
  }

  // Shown once the reveal has landed, a moment before the engine would open
  // the stats; with the poll up, the engine leaves the stats alone, and the
  // poll opens them itself when it closes.
  var _finishGame = window.finishGame;
  window.finishGame = function(alreadyDone){
    _finishGame(alreadyDone);
    if (alreadyDone || asked() || STATS_SEEN) return;
    if (typeof isMulti === "function" && isMulti()) return;
    var staged = els.reveal.classList.contains("staging");
    var delay = staged ? CONFIG.REVEAL_MS + 1800 : 1000;
    setTimeout(function(){
      if (STATS_SEEN || asked() || document.querySelector(".modal-root:not(.hidden)")) return;
      open();
    }, delay);
  };

  // for the sandbox's own tests
  window.CS_POLL = { BUCKET: BUCKET, KEY: KEY, open: open };
})();
