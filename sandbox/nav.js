/* =========================================================================
   nav.js — the Menu button on the left of the header, in place of the three
   header icons. Kept from the two-guess trial (7 Oct 2026); loaded after
   app.js together with menu.js, which draws the button and its side bar.

   The three header buttons stay in the page, hidden, so the menu hands off
   to exactly what they already do.
   ========================================================================= */
(function(){
  "use strict";
  var bar = document.querySelector(".sitebar");
  if (!bar || !window.CS_MENU) return;

  var st = document.createElement("style");
  st.textContent = ".sitebar.tg-hasmenu{ justify-content:flex-start; gap:14px; align-items:center }";
  document.head.appendChild(st);

  // back to today's question from anywhere: the archive, a panel, lower down the page
  function goHome(){
    document.querySelectorAll(".modal-root:not(.hidden)").forEach(function(m){ m.classList.add("hidden"); });
    if (MODE !== "daily" || !CUR || CUR.dayKey !== DAY_KEY) setupGame(DAY_KEY, "daily");
    try{ window.scrollTo({ top: 0, behavior: "smooth" }); }catch(_){ window.scrollTo(0, 0); }
  }
  function tap(b){ return function(){ if (b) b.click(); }; }

  var icons = bar.querySelector(".iconbtns");
  if (icons) icons.classList.add("hidden");
  bar.classList.add("tg-hasmenu");
  var menu = CS_MENU.mount({ into: bar, items: [
    { key: "home", label: "Home", onClick: goHome },
    { key: "archive", label: "Archive", onClick: tap(els.archiveBtn) },
    { key: "stats", label: "Your stats", onClick: tap(els.statsBtn) },
    { key: "help", label: "How to play", onClick: tap(els.helpBtn) }
  ]});

  // the one-off tour pointed at the three header buttons; now there is one
  window.startTour = function(){
    if (!els.tour || tourSeen()) return;
    TOUR_PENDING = false;
    TOUR_STEPS = [{ el: menu.button,
      text: "<b>Menu.</b> Past questions, your stats and how to play are all in here." }];
    TOUR_STEP = 0;
    els.tour.classList.remove("hidden");
    paintTourStep();
    window.addEventListener("resize", paintTourStep);
  };

  // links straight to a panel: #archive, #stats or #help
  var deep = { "#archive": els.archiveBtn, "#stats": els.statsBtn, "#help": els.helpBtn }[location.hash];
  if (deep){
    try{ history.replaceState(null, "", location.pathname + location.search); }catch(_){}
    setTimeout(function(){ deep.click(); }, 0);
  }

  window.CS_NAV = { menu: menu, goHome: goHome };
})();
