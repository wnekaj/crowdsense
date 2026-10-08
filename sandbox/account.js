/* =========================================================================
   account.js — SANDBOX ONLY. A mock of the real sign-up, for the design.
   Shared by the game page and leaderboard.html; styles in board.css.

     Join      display name + email + "I'm 18 or over" -> a sign-in link
     Sign in   email -> a sign-in link (back on a new device)
     Check     "we've sent you a link" — the sandbox has a button to
               pretend you tapped it; no email is sent
     About     age, gender and region, each optional, for the group boards
     Account   change your name or details, sign out, delete the account

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
  var root = null, onDone = null, pending = null;
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
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && root && !root.classList.contains("hidden")) close();
    });
  }
  function open(screen, done){
    build();
    onDone = done || null;
    root.classList.remove("hidden");
    document.documentElement.classList.add("ac-open");
    show(screen || "join");
  }
  function close(){
    if (!root) return;
    root.classList.add("hidden");
    document.documentElement.classList.remove("ac-open");
  }
  function finish(msg){
    close();
    if (msg) toast(msg);
    var cb = onDone; onDone = null;
    if (cb) cb();
    document.dispatchEvent(new CustomEvent("cs-account"));
  }
  function toast(msg){
    var t = document.getElementById("acToast");
    if (!t){
      t = document.createElement("div");
      t.id = "acToast"; t.className = "ac-toast"; t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function(){ t.classList.remove("show"); }, 2600);
  }
  function err(form, msg){
    var e = form.querySelector(".ac-err");
    e.textContent = msg;
    e.classList.toggle("hidden", !msg);
  }
  function focusFirst(){
    var f = root.querySelector(".ac-body input:not([type=hidden]), .ac-body select, .ac-body .ac-btn");
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
    focusFirst();
  }

  function chips(name, options, current){
    return '<div class="ac-chips" role="radiogroup">' + options.map(function(o){
      return '<label class="ac-chip"><input type="radio" name="' + name + '" value="' + esc(o) + '"' +
        (o === current ? " checked" : "") + '><span>' + esc(o) + '</span></label>';
    }).join("") + '</div>';
  }
  function details(a){
    a = a || {};
    return '<fieldset><legend>Age</legend>' + chips("age", B.AGES.concat([B.PNTS]), a.age) + '</fieldset>' +
      '<fieldset><legend>Gender</legend>' + chips("gender", B.GENDERS.concat([B.PNTS]), a.gender) + '</fieldset>' +
      '<fieldset><legend><label for="acRegion">Where do you live?</label></legend>' +
        '<select id="acRegion" name="region"><option value="">Choose…</option>' +
        B.REGIONS.concat([B.PNTS]).map(function(r){ return '<option' + (r === a.region ? " selected" : "") + '>' + esc(r) + '</option>'; }).join("") +
        '</select></fieldset>';
  }
  function readDetails(form){
    return {
      age: (form.querySelector('input[name="age"]:checked') || {}).value || null,
      gender: (form.querySelector('input[name="gender"]:checked') || {}).value || null,
      region: form.querySelector("#acRegion").value || null
    };
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
    about: function(a){
      return '<h2 id="acTitle">You\'re in, ' + esc(a && a.name) + '!</h2>' +
        '<p class="ac-sub">A bit about you, so you can see how you rank against people like you. ' +
        'All optional, and never shown next to your name.</p>' +
        '<form novalidate>' + details(a) +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Save and see the board</button>' +
        '</form>' +
        '<p class="ac-switch"><button type="button" class="ac-link" id="acSkip">Skip for now</button></p>';
    },
    details: function(a){
      return '<h2 id="acTitle">Your details</h2>' +
        '<p class="ac-sub">Used only to place you in the Region, Age and Gender boards.</p>' +
        '<form novalidate>' + details(a) +
          '<p class="ac-err hidden" role="alert"></p>' +
          '<button type="submit" class="ac-btn">Save</button>' +
        '</form>' +
        '<p class="ac-switch"><button type="button" class="ac-link" data-ac-go="account">Back</button></p>';
    },
    account: function(a){
      var d = [a.age, a.gender, a.region].filter(function(x){ return x && x !== B.PNTS; });
      return '<div class="ac-icon">' + ICON.person + '</div>' +
        '<h2 id="acTitle">Your account</h2>' +
        '<form novalidate>' +
          '<label class="ac-label" for="acName">Display name</label>' +
          '<div class="ac-row"><input class="ac-input" id="acName" name="name" maxlength="20" value="' + esc(a.name) + '">' +
          '<button type="submit" class="ac-btn ac-btn-sm">Save</button></div>' +
          '<p class="ac-err hidden" role="alert"></p>' +
        '</form>' +
        '<dl class="ac-dl"><dt>Email</dt><dd>' + esc(a.email) + '</dd>' +
          '<dt>Details</dt><dd>' + (d.length ? esc(d.join(" · ")) : "Not given") +
          ' <button type="button" class="ac-link" data-ac-go="details">Edit</button></dd></dl>' +
        '<div class="ac-actions">' +
          '<button type="button" class="ac-btn ac-btn-ghost" id="acSignOut">Sign out</button>' +
          '<button type="button" class="ac-link ac-danger" data-ac-go="delete">Delete my account</button>' +
        '</div>';
    },
    delete: function(){
      return '<h2 id="acTitle">Delete your account?</h2>' +
        '<p class="ac-sub">Your name comes off every leaderboard and your scores and details are deleted. This can\'t be undone. ' +
        'Your stats and streak on this device stay as they are.</p>' +
        '<button type="button" class="ac-btn ac-btn-danger" id="acDeleteYes">Delete my account</button>' +
        '<p class="ac-switch"><button type="button" class="ac-link" data-ac-go="account">Keep my account</button></p>';
    }
  };

  var HANDLERS = {
    join: function(form){
      var mk = B.todayKey().slice(0, 7);
      var n = B.checkName(form.name.value, mk);
      var email = form.email.value.trim();
      pending = { mode: "join", name: form.name.value, email: email, adult: form.adult.checked };
      if (n.error) return err(form, n.error);
      if (!emailOk(email)) return err(form, "That email doesn't look right.");
      if (!form.adult.checked) return err(form, "The leaderboard is for over-18s.");
      var a = B.account();
      if (a && a.email.toLowerCase() === email.toLowerCase()) return err(form, "You've already joined with that email — sign in instead.");
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
      var a = B.account();
      Object.assign(a, readDetails(form));
      B.saveAccount(a);
      finish("You're on the leaderboard");
    },
    details: function(form){
      var a = B.account();
      Object.assign(a, readDetails(form));
      B.saveAccount(a);
      toast("Details saved");
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
        var p = pending || {}, a = B.account();
        if (p.mode === "signin"){
          if (!a || a.email.toLowerCase() !== String(p.email).toLowerCase()) return show("nouser");
          a.signedIn = true;
          B.saveAccount(a);
          pending = null;
          return finish("Welcome back, " + a.name);
        }
        B.saveAccount({ name: p.name, email: p.email, age: null, gender: null, region: null,
          signedIn: true, joined: B.todayKey() });
        pending = null;
        show("about");
      });
    },
    about: function(body){
      body.querySelector("#acSkip").addEventListener("click", function(){ finish("You're on the leaderboard"); });
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

  window.CS_ACCOUNT = {
    open: open, close: close, toast: toast,
    signedIn: function(){ var a = B.account(); return !!(a && a.signedIn); }
  };
})();
