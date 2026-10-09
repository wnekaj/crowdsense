/* =========================================================================
   account.js — SANDBOX ONLY. A mock of the real sign-up, for the design.
   Shared by the game page and leaderboard.html; styles in board.css.

     Join      display name, email, then age, gender, region and political
               leaning (each with "Prefer not to say"), and "I'm 18 or over"
               -> a sign-in link. Political opinions are special category
               data under UK GDPR, so a position on the scale also needs an
               explicit consent tick.
     Sign in   email -> a sign-in link (back on a new device)
     Check     "we've sent you a link" — the sandbox has a button to
               pretend you tapped it; no email is sent
     Account   change your name or your answers, sign out, delete the account

   No passwords: the real thing signs people in with a one-time link by
   email. Everything here is stored in the sandbox's own storage only.
   ========================================================================= */
(function(){
  "use strict";
  var B = window.CS_BOARD;
  if (!B) return;

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function emailOk(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  var ICON = {
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  };

  // ---------- the sheet ----------
  var root = null, onDone = null, pending = null, opener = null, inerted = [];
  function build(){
    if (root) return;
    root = document.createElement("div");
    root.className = "ac-root hidden";
    root.id = "acSheet";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "acTitle");
    root.innerHTML = '<div class="ac-back" data-ac-close></div>' +
      '<div class="ac-card"><button type="button" class="ac-close" data-ac-close aria-label="Close">✕</button>' +
      '<div class="ac-body" id="acBody"></div></div>';
    document.body.appendChild(root);
    root.addEventListener("click", function(e){
      var t = e.target.closest ? e.target.closest("[data-ac-close],[data-ac-go]") : null;
      if (!t) return;
      if (t.hasAttribute("data-ac-close")) close();
      else show(t.getAttribute("data-ac-go"));
    });
    // Escape closes the sheet and nothing behind it (the game's own handler
    // would close an open panel underneath too); Tab stays inside the sheet
    document.addEventListener("keydown", function(e){
      if (!root || root.classList.contains("hidden")) return;
      if (e.key === "Escape"){ e.stopPropagation(); close(); }
      else if (e.key === "Tab") trapTab(e);
    }, true);
  }
  function trapTab(e){
    var f = Array.prototype.filter.call(root.querySelectorAll("button, a[href], input, select"), function(x){
      return !x.disabled && x.offsetParent !== null;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))){ e.preventDefault(); first.focus(); }
  }
  // the page behind can't be reached while the sheet is up
  function setInert(on){
    if (on){
      inerted = Array.prototype.filter.call(document.body.children, function(el){
        return el !== root && el.id !== "acToast" && !el.hasAttribute("inert");
      });
      inerted.forEach(function(el){ el.setAttribute("inert", ""); });
    } else {
      inerted.forEach(function(el){ el.removeAttribute("inert"); });
      inerted = [];
    }
  }
  function open(screen, done){
    build();
    // already open: just change screen, keeping where focus goes back to
    // and what was made inert
    if (root.classList.contains("hidden")){
      opener = document.activeElement;
      onDone = done || null;
      root.classList.remove("hidden");
      document.documentElement.classList.add("ac-open");
      setInert(true);
    } else if (done) onDone = done;
    show(screen || "join");
  }
  // However the sheet closes, the page catches up with the account: closing
  // on the optional "You're in" step still leaves you signed in.
  function close(){
    if (!root || root.classList.contains("hidden")) return;
    root.classList.add("hidden");
    document.documentElement.classList.remove("ac-open");
    setInert(false);
    var cb = onDone; onDone = null;
    if (cb) cb();
    document.dispatchEvent(new CustomEvent("cs-account"));
    // back to whatever opened the sheet, or its replacement if the page
    // rebuilt it, or the menu button
    var back = (opener && document.body.contains(opener)) ? opener
      : ["#acctBtn", "#joinBtn", "#bgStats .bg-btn", "#tgMenuBtn"].map(function(q){ return document.querySelector(q); })
          .filter(Boolean)[0];
    opener = null;
    if (back) try{ back.focus(); }catch(_){}
  }
  function finish(msg){
    close();
    if (msg) toast(msg);
  }
  // the live region is in the page from the start and filled a moment later,
  // so screen readers announce it
  var toastEl = document.createElement("div");
  toastEl.id = "acToast"; toastEl.className = "ac-toast";
  toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastEl);
  function toast(msg){
    toastEl.textContent = "";
    clearTimeout(toastEl._h); clearTimeout(toastEl._s);
    toastEl._s = setTimeout(function(){
      toastEl.textContent = msg;
      toastEl.classList.add("show");
      toastEl._h = setTimeout(function(){ toastEl.classList.remove("show"); }, 2600);
    }, 60);
  }
  function err(form, msg){
    var e = form.querySelector(".ac-err");
    e.textContent = msg;
    e.classList.toggle("hidden", !msg);
  }
  function focusFirst(){
    var f = root.querySelector(".ac-body [data-ac-focus]") ||
      root.querySelector(".ac-body input:not([type=hidden]), .ac-body select, .ac-body .ac-btn");
    if (f) setTimeout(function(){ try{ f.focus(); }catch(_){} }, 40);
  }

  // ---------- screens ----------
  function show(screen){
    var body = root.querySelector("#acBody"), a = B.account();
    if (screen === "account" && !(a && a.signedIn)) screen = "join";
    body.innerHTML = SCREENS[screen](a);
    var form = body.querySelector("form");
    if (form && HANDLERS[screen]) form.addEventListener("submit", function(e){ e.preventDefault(); HANDLERS[screen](form); });
    if (WIRE[screen]) WIRE[screen](body);
    wirePolitics(body);
    focusFirst();
  }

  // ---------- age, gender, region, politics ----------
  // Native radios under a fieldset and legend (no extra radiogroup role:
  // the fieldset already names the group), and a select for the region.
  function chips(name, options, current){
    return '<div class="ac-chips">' + options.map(function(o){
      return '<label class="ac-chip"><input type="radio" name="' + name + '" value="' + esc(o) + '"' +
        (o === current ? " checked" : "") + '><span>' + esc(o) + '</span></label>';
    }).join("") + '</div>';
  }
  function aboutFields(a){
    a = a || {};
    return '<fieldset><legend>Age</legend>' + chips("age", B.AGES.concat([B.PNTS]), a.age) + '</fieldset>' +
      '<fieldset><legend>Gender</legend>' + chips("gender", B.GENDERS.concat([B.PNTS]), a.gender) + '</fieldset>' +
      '<fieldset><legend><label for="acRegion">Where do you live?</label></legend>' +
        '<select id="acRegion" name="region"><option value="">Choose…</option>' +
        B.REGIONS.concat([B.PNTS]).map(function(r){ return '<option' + (r === a.region ? " selected" : "") + '>' + esc(r) + '</option>'; }).join("") +
        '</select></fieldset>' +
      politicsField(a);
  }
  // Seven points from left to right, as pollsters ask it: each point is a
  // radio with its full wording for screen readers, the chosen wording shows
  // under the scale, and "Don't know" / "Prefer not to say" sit beneath.
  function politicsField(a){
    var cur = a.politics, onScale = B.POLITICS.indexOf(cur) > -1;
    return '<fieldset class="ac-pol"><legend>Politically, where would you put yourself?</legend>' +
      '<div class="ac-scale">' + B.POLITICS.map(function(o, i){
        return '<label class="ac-dot" title="' + esc(o) + '"><input type="radio" name="politics" value="' + esc(o) + '"' +
          (o === cur ? " checked" : "") + '><span class="ac-dot-mark" aria-hidden="true"></span><span class="vh">' + esc(o) + '</span></label>';
      }).join("") + '</div>' +
      '<div class="ac-scale-ends" aria-hidden="true"><span>Left</span><span>Centre</span><span>Right</span></div>' +
      '<p class="ac-scale-pick" id="acPolPick">' + (onScale ? esc(cur) : "Tap a point on the scale") + '</p>' +
      '<div class="ac-chips">' + [B.DK, B.PNTS].map(function(o){
        return '<label class="ac-chip"><input type="radio" name="politics" value="' + esc(o) + '"' +
          (o === cur ? " checked" : "") + '><span>' + esc(o) + '</span></label>';
      }).join("") + '</div>' +
      '<label class="ac-check ac-consent' + (onScale ? "" : " hidden") + '" id="acPolConsentWrap">' +
        '<input type="checkbox" name="polConsent"' + (onScale && a.politicsConsent ? " checked" : "") + '>' +
        '<span>I agree to Crowdsense keeping my political leaning to compare how different groups guess. ' +
        'It\'s sensitive information: it\'s never shown to anyone, and you can remove it any time.</span></label>' +
    '</fieldset>';
  }
  // the chosen point's wording, and the consent tick only for a position
  function wirePolitics(body){
    var radios = body.querySelectorAll('input[name="politics"]');
    if (!radios.length) return;
    function sync(){
      var v = (body.querySelector('input[name="politics"]:checked') || {}).value;
      var onScale = B.POLITICS.indexOf(v) > -1;
      body.querySelector("#acPolPick").textContent = onScale ? v : "Tap a point on the scale";
      body.querySelector("#acPolConsentWrap").classList.toggle("hidden", !onScale);
    }
    Array.prototype.forEach.call(radios, function(r){ r.addEventListener("change", sync); });
  }
  function readAbout(form){
    return {
      age: (form.querySelector('input[name="age"]:checked') || {}).value || null,
      gender: (form.querySelector('input[name="gender"]:checked') || {}).value || null,
      region: form.querySelector("#acRegion").value || null,
      politics: (form.querySelector('input[name="politics"]:checked') || {}).value || null,
      politicsConsent: !!(form.querySelector('input[name="polConsent"]') || {}).checked
    };
  }
  // every question needs an answer, even if it's "Prefer not to say"
  function aboutMissing(d){
    var m = [];
    if (!d.age) m.push("your age");
    if (!d.gender) m.push("your gender");
    if (!d.region) m.push("where you live");
    if (!d.politics) m.push("where you are politically");
    if (m.length) return "Please choose " + m.join(", ").replace(/, ([^,]*)$/, " and $1") + ' — or "Prefer not to say".';
    if (B.POLITICS.indexOf(d.politics) > -1 && !d.politicsConsent)
      return 'Please tick the box to let us keep your political leaning — or choose "Prefer not to say".';
    return "";
  }
  function aboutSummary(a){
    var d = [a.age, a.gender, a.region, a.politics].filter(function(x){ return x && x !== B.PNTS && x !== B.DK; });
    return d.length ? d.join(" · ") : "Prefer not to say";
  }

  var SCREENS = {
    join: function(){
      var p = pending || {};
      return '<div class="ac-icon">' + ICON.trophy + '</div>' +
        '<h2 id="acTitle">Join the leaderboard</h2>' +
        '<p class="ac-sub">It\'s free. Your name goes on the board; your email stays private.</p>' +
        '<form novalidate>' +
          '<label class="ac-label" for="acName">Display name</label>' +
          '<input class="ac-input" id="acName" name="name" maxlength="20" autocomplete="nickname" placeholder="e.g. Priya K." value="' + esc(p.name || "") + '">' +
          '<p class="ac-hint">Shown on the leaderboard. You can change it later.</p>' +
          '<label class="ac-label" for="acEmail">Email</label>' +
          '<input class="ac-input" id="acEmail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" value="' + esc(p.email || "") + '">' +
          '<p class="ac-hint">We\'ll email you a link to sign in — no password to remember.</p>' +
          '<div class="ac-section"><h3>About you</h3>' +
            '<p class="ac-hint">Crowdsense is about how well we know each other. Your answers let us compare how different groups guess. ' +
            'They\'re never shown next to your name.</p>' +
            aboutFields(p) +
          '</div>' +
          '<label class="ac-check"><input type="checkbox" name="adult"' + (p.adult ? " checked" : "") + '><span>I\'m 18 or over</span></label>' +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Send my sign-in link</button>' +
          '<p class="ac-fine">By joining you agree to the <u>Terms</u> and <u>Privacy notice</u> (placeholders).</p>' +
        '</form>' +
        '<p class="ac-switch">Already joined? <button type="button" class="ac-link" data-ac-go="signin">Sign in</button></p>';
    },
    signin: function(){
      var p = pending || {};
      return '<div class="ac-icon">' + ICON.person + '</div>' +
        '<h2 id="acTitle">Sign in</h2>' +
        '<p class="ac-sub">Enter the email you joined with and we\'ll send you a sign-in link.</p>' +
        '<form novalidate>' +
          '<label class="ac-label" for="acEmail">Email</label>' +
          '<input class="ac-input" id="acEmail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" value="' + esc(p.email || "") + '">' +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Send my sign-in link</button>' +
        '</form>' +
        '<p class="ac-switch">New here? <button type="button" class="ac-link" data-ac-go="join">Join the leaderboard</button></p>';
    },
    check: function(){
      var p = pending || {};
      return '<div class="ac-icon">' + ICON.mail + '</div>' +
        '<h2 id="acTitle">Check your email</h2>' +
        '<p class="ac-sub">We\'ve sent a sign-in link to <b>' + esc(p.email) + '</b>. Tap it on this device within 15 minutes.</p>' +
        '<div class="ac-mock"><span>Sandbox: no email is sent.</span>' +
          '<button type="button" class="ac-btn" id="acTapLink">Pretend I tapped the link</button></div>' +
        '<p class="ac-switch">Didn\'t get it? <button type="button" class="ac-link" id="acResend">Send it again</button> · ' +
          '<button type="button" class="ac-link" data-ac-go="' + (p.mode === "signin" ? "signin" : "join") + '">Use a different email</button></p>';
    },
    nouser: function(){
      var p = pending || {};
      return '<div class="ac-icon">' + ICON.person + '</div>' +
        '<h2 id="acTitle">No account for that email</h2>' +
        '<p class="ac-sub">We couldn\'t find an account for <b>' + esc(p.email) + '</b>. Want to join instead?</p>' +
        '<button type="button" class="ac-btn" data-ac-go="join">Join the leaderboard</button>' +
        '<p class="ac-switch"><button type="button" class="ac-link" data-ac-go="signin">Try a different email</button></p>';
    },
    account: function(a){
      return '<div class="ac-icon">' + ICON.person + '</div>' +
        '<h2 id="acTitle">Your account</h2>' +
        '<form novalidate>' +
          '<label class="ac-label" for="acName">Display name</label>' +
          '<div class="ac-row"><input class="ac-input" id="acName" name="name" maxlength="20" value="' + esc(a.name) + '">' +
          '<button type="submit" class="ac-btn ac-btn-sm">Save</button></div>' +
          '<p class="ac-err hidden" role="alert"></p>' +
        '</form>' +
        '<dl class="ac-dl"><dt>Email</dt><dd>' + esc(a.email) + '</dd>' +
          '<dt>About you</dt><dd>' + esc(aboutSummary(a)) +
          ' <button type="button" class="ac-link" data-ac-go="about">Edit</button></dd></dl>' +
        '<div class="ac-actions">' +
          '<button type="button" class="ac-btn ac-btn-ghost" id="acSignOut">Sign out</button>' +
          '<button type="button" class="ac-link ac-danger" data-ac-go="delete">Delete my account</button>' +
        '</div>';
    },
    about: function(a){
      return '<h2 id="acTitle">About you</h2>' +
        '<p class="ac-sub">Used to compare how different groups guess. Never shown next to your name.</p>' +
        '<form novalidate>' + aboutFields(a) +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Save</button>' +
        '</form>' +
        '<p class="ac-switch"><button type="button" class="ac-link" data-ac-go="account">Back</button></p>';
    },
    delete: function(){
      return '<h2 id="acTitle">Delete your account?</h2>' +
        '<p class="ac-sub">Your name comes off every leaderboard and your scores and answers are deleted. This can\'t be undone. ' +
        'Your stats and streak on this device stay as they are.</p>' +
        '<button type="button" class="ac-btn ac-btn-danger" id="acDeleteYes">Delete my account</button>' +
        '<p class="ac-switch"><button type="button" class="ac-link" data-ac-go="account" data-ac-focus>Keep my account</button></p>';
    }
  };

  var HANDLERS = {
    join: function(form){
      var mk = B.todayKey().slice(0, 7);
      var n = B.checkName(form.name.value, mk);
      var email = form.email.value.trim(), about = readAbout(form);
      pending = Object.assign({ mode: "join", name: form.name.value, email: email, adult: form.adult.checked }, about);
      if (n.error) return err(form, n.error);
      if (!emailOk(email)) return err(form, "That email doesn't look right.");
      var miss = aboutMissing(about);
      if (miss) return err(form, miss);
      if (!form.adult.checked) return err(form, "The leaderboard is for over-18s.");
      if (B.findAccount(email)) return err(form, "You've already joined with that email — sign in instead.");
      pending.name = n.name;
      show("check");
    },
    signin: function(form){
      var email = form.email.value.trim();
      pending = { mode: "signin", email: email };
      if (!emailOk(email)) return err(form, "That email doesn't look right.");
      show("check");
    },
    about: function(form){
      var d = readAbout(form), miss = aboutMissing(d);
      if (miss) return err(form, miss);
      // consent goes with the leaning: dropped with it, dated when first given
      if (B.POLITICS.indexOf(d.politics) < 0){ d.politicsConsent = false; d.politicsConsentAt = null; }
      else d.politicsConsentAt = B.account().politicsConsentAt || new Date().toISOString();
      var a = B.account();
      Object.assign(a, d);
      B.saveAccount(a);
      toast("Saved");
      show("account");
      document.dispatchEvent(new CustomEvent("cs-account"));
    },
    account: function(form){
      var a = B.account();
      var n = B.checkName(form.name.value, B.todayKey().slice(0, 7));
      if (n.error) return err(form, n.error);
      a.name = n.name;
      B.saveAccount(a);
      err(form, "");
      toast("Name saved");
      document.dispatchEvent(new CustomEvent("cs-account"));
    }
  };

  var WIRE = {
    check: function(body){
      body.querySelector("#acResend").addEventListener("click", function(){ toast("Sent again (sandbox: nothing is sent)"); });
      body.querySelector("#acTapLink").addEventListener("click", function(){
        var p = pending || {};
        if (p.mode === "signin"){
          var a = B.findAccount(p.email);
          if (!a) return show("nouser");
          a.signedIn = true;
          B.saveAccount(a);
          pending = null;
          return finish("Welcome back, " + a.name);
        }
        var onScale = B.POLITICS.indexOf(p.politics) > -1;
        B.saveAccount({ name: p.name, email: p.email, age: p.age, gender: p.gender, region: p.region,
          politics: p.politics, politicsConsent: onScale && p.politicsConsent,
          politicsConsentAt: onScale && p.politicsConsent ? new Date().toISOString() : null,
          signedIn: true, joined: B.todayKey() });
        pending = null;
        finish("You're on the leaderboard");
      });
    },
    account: function(body){
      body.querySelector("#acSignOut").addEventListener("click", function(){
        var a = B.account();
        a.signedIn = false;
        B.saveAccount(a);
        finish("Signed out");
      });
    },
    delete: function(body){
      body.querySelector("#acDeleteYes").addEventListener("click", function(){
        B.deleteAccount();
        finish("Account deleted");
      });
    }
  };

  // other sheets (the leagues) use the same sheet, focus handling and all:
  // register(name, { render(account), submit(form), wire(body) })
  function register(name, def){
    SCREENS[name] = def.render;
    if (def.submit) HANDLERS[name] = def.submit;
    if (def.wire) WIRE[name] = def.wire;
  }

  window.CS_ACCOUNT = {
    open: open, close: close, toast: toast, register: register, show: show, err: err, finish: finish, esc: esc,
    signedIn: function(){ var a = B.account(); return !!(a && a.signedIn); }
  };
})();
