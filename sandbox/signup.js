/* =========================================================================
   signup.js — SANDBOX TRIAL. The leaderboard signup: three questions, each
   with "Prefer not to say", and a country picker behind "Outside the UK".

   Copied into sandbox/ by tools/build-sandbox.js and loaded by the
   leaderboard page. Front-end only: the answers go into the sandbox's own
   storage and nowhere else. Brings its own styles.
   ========================================================================= */
(function(){
  "use strict";
  var T = window.CS_TRIAL;
  if (!T) return;

  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(_){ return null; } }
  function writeJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }

  var CSS = '.tg-signup{ position:fixed; inset:0; z-index:95 }\n.tg-signup.hidden{ display:none !important }\n.tg-signup .tg-sb-back{ position:absolute; inset:0; background:rgba(28,25,23,.45) }\n.tg-signup .tg-sb-card{\n  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);\n  width:min(440px,92vw); max-height:88vh; overflow-y:auto;\n  background:#fff; border:1px solid var(--line); border-radius:8px;\n  box-shadow:0 25px 60px rgba(0,0,0,.25); padding:22px; text-align:left;\n}\n.tg-signup .tg-sb-close{\n  position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:4px;\n  border:1px solid var(--line); background:#fff; cursor:pointer; color:#4b4f52; font-size:15px;\n}\n.tg-signup .hidden{ display:none !important }\n.tg-signup .tg-btn{\n  display:block; width:100%; margin-top:14px; border:0; border-radius:999px; cursor:pointer;\n  background:var(--accent); color:#fff; font:inherit; font-size:15px; font-weight:500; padding:12px;\n}\n.tg-signup .tg-btn:hover{ background:var(--accent-deep) }\n.tg-signup h2{ font-family:var(--display); font-size:20px; margin:4px 30px 4px 0 }\n.tg-sub{ margin:0 0 10px; font-size:13.5px; color:var(--muted); line-height:1.45 }\n.tg-signup fieldset{ border:0; margin:0; padding:16px 0 4px }\n.tg-signup legend{ padding:0; margin-bottom:8px; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase }\n.tg-chips{ display:flex; flex-wrap:wrap; gap:6px }\n.tg-chip{ position:relative; cursor:pointer }\n.tg-chip input{ position:absolute; opacity:0; inset:0; margin:0; cursor:pointer }\n.tg-chip span{\n  display:inline-block; padding:7px 12px; border-radius:999px;\n  border:1px solid var(--line); font-size:14px; background:#fff;\n}\n.tg-chip input:checked + span{ background:var(--ink); border-color:var(--ink); color:#fff }\n.tg-chip input:focus-visible + span{ outline:2px solid var(--accent); outline-offset:2px }\n.tg-signup select{\n  width:100%; font:inherit; font-size:15px; padding:9px 10px;\n  border:1px solid var(--line); border-radius:6px; background:#fff; color:var(--ink);\n}\n.tg-country{ margin-top:10px }\n.tg-country label{ display:block; font-size:13px; color:var(--muted); margin-bottom:4px }\n.tg-err{ margin:10px 0 0; font-size:13.5px; color:#b3261e }\n.tg-fine{ margin:8px 0 0; font-size:12px; color:var(--muted); text-align:center }\n';
  if (!document.getElementById("tgSignupCss")){
    var st = document.createElement("style");
    st.id = "tgSignupCss";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---------- signup mock ----------
  var COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh",
    "Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina",
    "Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
    "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros",
    "Congo","Costa Rica","Côte d'Ivoire","Croatia","Cuba","Cyprus","Czechia",
    "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
    "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada",
    "Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India",
    "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
    "Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
    "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia",
    "Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
    "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru",
    "Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea",
    "North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea",
    "Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
    "São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone",
    "Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea",
    "South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan",
    "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
    "Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates",
    "United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam",
    "Yemen","Zambia","Zimbabwe"];

  function chips(name, options){
    return '<div class="tg-chips" role="radiogroup">' + options.map(function(o){
      return '<label class="tg-chip"><input type="radio" name="' + name + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>';
    }).join("") + '</div>';
  }
  function buildSignup(){
    if (document.getElementById("tgSignup")) return;
    var root = el("div", "tg-signup hidden");
    root.id = "tgSignup";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "tgSignupTitle");
    root.innerHTML =
      '<div class="tg-sb-back" data-tg-close></div>' +
      '<div class="tg-sb-card">' +
        '<button class="tg-sb-close" type="button" data-tg-close aria-label="Close">✕</button>' +
        '<h2 id="tgSignupTitle">Put today\'s score on the leaderboard</h2>' +
        '<p class="tg-sub">So we can show where you rank in your group. Every question has "Prefer not to say".</p>' +
        '<form id="tgSignupForm" novalidate>' +
          '<fieldset><legend>Age</legend>' + chips("age", T.AGES.concat([T.PNTS])) + '</fieldset>' +
          '<fieldset><legend>Gender</legend>' + chips("gender", T.GENDERS.concat([T.PNTS])) + '</fieldset>' +
          '<fieldset><legend><label for="tgRegion">Where do you live?</label></legend>' +
            '<select id="tgRegion" name="region"><option value="">Choose…</option>' +
            T.REGIONS.concat([T.PNTS]).map(function(r){ return '<option>' + esc(r) + '</option>'; }).join("") +
            '</select>' +
            '<div class="tg-country hidden" id="tgCountryWrap"><label for="tgCountry">Which country?</label>' +
            '<select id="tgCountry" name="country"><option value="">Choose a country…</option>' +
            COUNTRIES.map(function(c){ return '<option>' + esc(c) + '</option>'; }).join("") +
            '</select></div>' +
          '</fieldset>' +
          '<p class="tg-err hidden" id="tgSignupErr" role="alert"></p>' +
          '<button type="submit" class="tg-btn">Sign up</button>' +
          '<p class="tg-fine">Sandbox mock: stored only in this browser, nothing is sent anywhere.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener("click", function(e){
      if (e.target.hasAttribute && e.target.hasAttribute("data-tg-close")) closeSignup();
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && !root.classList.contains("hidden")) closeSignup();
    });
    var region = root.querySelector("#tgRegion");
    region.addEventListener("change", function(){
      root.querySelector("#tgCountryWrap").classList.toggle("hidden", region.value !== "Outside the UK");
    });
    root.querySelector("#tgSignupForm").addEventListener("submit", submitSignup);
  }
  var onDone = null;
  function openSignup(done){
    onDone = done || null;
    buildSignup();
    var root = document.getElementById("tgSignup");
    root.querySelector("#tgSignupErr").classList.add("hidden");
    root.classList.remove("hidden");
    var first = root.querySelector('input[name="age"]');
    if (first) try{ first.focus(); }catch(_){}
  }
  function closeSignup(){
    var root = document.getElementById("tgSignup");
    if (root) root.classList.add("hidden");
  }
  function submitSignup(e){
    e.preventDefault();
    var f = e.target;
    var age = (f.querySelector('input[name="age"]:checked') || {}).value;
    var gender = (f.querySelector('input[name="gender"]:checked') || {}).value;
    var region = f.querySelector("#tgRegion").value;
    var country = f.querySelector("#tgCountry").value;
    var missing = [];
    if (!age) missing.push("your age");
    if (!gender) missing.push("your gender");
    if (!region) missing.push("where you live");
    else if (region === "Outside the UK" && !country) missing.push("your country");
    var err = f.querySelector("#tgSignupErr");
    if (missing.length){
      err.textContent = "Please choose " + missing.join(", ").replace(/, ([^,]*)$/, " and $1") +
        " — or pick \"Prefer not to say\".";
      err.classList.remove("hidden");
      return;
    }
    writeJSON(T.SIGNUP_KEY, {
      age: age, gender: gender, region: region,
      country: region === "Outside the UK" ? country : "",
      at: new Date().toISOString()
    });
    closeSignup();
    if (onDone) onDone();
  }


  window.CS_SIGNUP = {
    open: openSignup,
    get: function(){ return readJSON(T.SIGNUP_KEY); }
  };
})();
