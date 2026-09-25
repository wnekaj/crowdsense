/* =========================================================================
   menu.js — SANDBOX TRIAL. One Menu button on the left of the header,
   opening a side bar that slides in from the left.

   Shared by the game page and the leaderboard. Copied into sandbox/ by
   tools/build-sandbox.js; the live game never loads it. Brings its own
   styles, using the page's colour tokens.
   ========================================================================= */
(function(){
  "use strict";

  var ICONS = {
    leaderboard: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    archive: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 3.7 2.7c-.7.3-1 .8-1 1.6v.4"/><circle cx="12" cy="17" r="0.4" fill="currentColor" stroke="none"/>'
  };
  function svg(path, size){
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  var CSS = [
    '.tg-menubtn{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;padding:0;',
    ' border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);cursor:pointer;flex:none}',
    '.tg-menubtn svg{display:block;color:var(--accent)}',
    '.tg-menubtn:hover{border-color:var(--accent);background:var(--accent-soft)}',
    '.tg-menubtn:focus-visible{outline:3px solid rgba(242,101,34,.35);outline-offset:2px}',
    '.tg-drawer{position:fixed;inset:0;z-index:90;visibility:hidden}',
    '.tg-drawer.open{visibility:visible}',
    '.tg-drawer-back{position:absolute;inset:0;background:rgba(18,18,18,.45);opacity:0;transition:opacity .22s ease}',
    '.tg-drawer.open .tg-drawer-back{opacity:1}',
    '.tg-drawer-panel{position:absolute;top:0;left:0;bottom:0;width:min(300px,84vw);background:#fff;',
    ' box-shadow:2px 0 24px rgba(0,0,0,.18);transform:translateX(-100%);transition:transform .24s ease;',
    ' display:flex;flex-direction:column;padding:18px 0 24px}',
    '.tg-drawer.open .tg-drawer-panel{transform:none}',
    '@media (prefers-reduced-motion: reduce){.tg-drawer-back,.tg-drawer-panel{transition:none}}',
    '.tg-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:0 18px 14px;',
    ' border-bottom:1px solid var(--hairline)}',
    '.tg-drawer-brand{font-family:var(--display);font-size:15px;font-weight:500;letter-spacing:.3em;text-transform:uppercase}',
    '.tg-drawer-brand i{color:var(--accent);font-style:normal}',
    '.tg-drawer-close{border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:var(--muted);padding:6px}',
    '.tg-drawer nav{display:flex;flex-direction:column;padding:8px 0}',
    '.tg-drawer-item{display:flex;align-items:center;gap:14px;padding:15px 20px;border:0;background:transparent;',
    ' font:inherit;font-size:17px;color:var(--ink);text-decoration:none;text-align:left;cursor:pointer;width:100%}',
    '.tg-drawer-item svg{color:var(--muted);flex:none}',
    '.tg-drawer-item:hover,.tg-drawer-item:focus-visible{background:var(--accent-soft);outline:none}',
    '.tg-drawer-item:hover svg,.tg-drawer-item:focus-visible svg{color:var(--accent)}',
    '.tg-drawer-item[aria-current="page"]{font-weight:700;box-shadow:inset 3px 0 0 var(--accent)}',
    '.tg-drawer-item[aria-current="page"] svg{color:var(--accent)}'
  ].join("\n");

  function mount(opts){
    if (!document.getElementById("tgMenuCss")){
      var st = document.createElement("style");
      st.id = "tgMenuCss";
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "tgMenuBtn";
    btn.className = "tg-menubtn";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "tgDrawer");
    // icon only; the label is for screen readers
    btn.setAttribute("aria-label", "Menu");
    btn.title = "Menu";
    btn.innerHTML = svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 28);
    opts.into.insertBefore(btn, opts.into.firstChild);

    var drawer = document.createElement("div");
    drawer.id = "tgDrawer";
    drawer.className = "tg-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "Menu");
    drawer.innerHTML =
      '<div class="tg-drawer-back" data-tg-shut></div>' +
      '<div class="tg-drawer-panel">' +
        '<div class="tg-drawer-head"><span class="tg-drawer-brand">Crowdsense<i>.</i></span>' +
        '<button type="button" class="tg-drawer-close" data-tg-shut aria-label="Close menu">✕</button></div>' +
        '<nav></nav>' +
      '</div>';
    var nav = drawer.querySelector("nav");
    opts.items.forEach(function(it){
      var a = document.createElement(it.href ? "a" : "button");
      a.className = "tg-drawer-item";
      a.setAttribute("data-item", it.key);
      if (it.href) a.href = it.href; else a.type = "button";
      if (it.current) a.setAttribute("aria-current", "page");
      a.innerHTML = svg(ICONS[it.key], 20) + '<span>' + it.label + '</span>';
      a.addEventListener("click", function(e){
        if (it.current){ e.preventDefault(); close(); return; }
        if (it.onClick){ e.preventDefault(); close(); it.onClick(); }
      });
      nav.appendChild(a);
    });
    document.body.appendChild(drawer);

    function open(){
      drawer.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      var first = nav.querySelector(".tg-drawer-item");
      if (first) setTimeout(function(){ try{ first.focus(); }catch(_){} }, 60);
    }
    function close(){
      if (!drawer.classList.contains("open")) return;
      drawer.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      try{ btn.focus(); }catch(_){}
    }
    btn.addEventListener("click", open);
    drawer.addEventListener("click", function(e){
      if (e.target.hasAttribute && e.target.hasAttribute("data-tg-shut")) close();
    });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") close(); });
    return { button: btn, open: open, close: close };
  }

  window.CS_MENU = { mount: mount };
})();
