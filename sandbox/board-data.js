/* =========================================================================
   board-data.js — SANDBOX ONLY. The leaderboard's data, on dummy players,
   and the mock account. Shared by the game page and leaderboard.html.

   Copied into sandbox/ by tools/build-sandbox.js. Nothing here reaches the
   live game, and nothing is sent anywhere: the account and the ranked
   plays live in the sandbox's own (prefixed) storage.

     ranked plays   today's question, finished on the day in daily mode:
                    cs-ranked-YYYY-MM-DD = { off }. Archive plays never count.
     monthly board  your Crowdsense score for the month: the average of your
                    lowest 20 scores, where a day gone by without a play
                    counts as 25 off (today only once it's over). Until 20
                    days have passed, that's every day so far. You're on the
                    board from your first play. Lowest wins; ties go to more
                    days played, then more days On the pulse, then share.
     daily board    today's points off, lowest first, for those who played.
     dummy board    ~60 made-up players, stable for the month; a signed-up
                    "You" is seeded near 23rd so the board looks lived in,
                    with the days you really played in the sandbox on top.
   ========================================================================= */
(function(){
  "use strict";

  // ---------- UK dates ----------
  function londonKey(date){
    var o = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date).forEach(function(x){ o[x.type] = x.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }
  // the sandbox's ?day= sets "today"; otherwise it is the London date now
  function todayKey(){
    var m = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    return m ? m[1] : londonKey(new Date());
  }
  function daysInMonth(y, m){ return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function pad(n){ return String(n).padStart(2, "0"); }
  function monthLabel(key){
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, 1)));
  }
  // On the pulse: within 3 from 8 Oct 2026 (the wide bands), within 2 before
  function pulse(off, dayKey){ return off <= (dayKey >= "2026-10-08" ? 3 : 2); }

  // ---------- seeded randomness, so the dummy board is stable ----------
  function hashStr(s){
    var h = 2166136261;
    for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed){
    var a = seed >>> 0;
    return function(){
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r){
    var u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // ---------- the dummy players' names ----------
  // ---------- the questions at sign-up, each with "Prefer not to say" ----------
  var PNTS = "Prefer not to say";
  var AGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  var GENDERS = ["Male", "Female", "In another way"];
  var REGIONS = ["North East", "North West", "Yorkshire and the Humber", "East Midlands",
    "West Midlands", "East of England", "London", "South East", "South West",
    "Wales", "Scotland", "Northern Ireland", "Outside the UK"];

  // a left-to-right scale, as pollsters ask it
  var POLITICS = ["Very left-wing", "Fairly left-wing", "Slightly left of centre", "Centre",
    "Slightly right of centre", "Fairly right-wing", "Very right-wing"];
  var DK = "Don't know";

  // ---------- the dummy players' names ----------
  // The mix of styles people really pick (names, initials, handles,
  // numbers, places, in-jokes), so the board doesn't look generated.
  var FIRST = ["Priya","Tom","Aisha","Callum","Grace","Rhys","Fatima","Oliver","Niamh","Jamal",
    "Harriet","Kwame","Sophie","Euan","Leila","Ben","Chloe","Arjun","Megan","Dan","Zara","Owen",
    "Isla","Tariq","Ruth","Josh","Amara","Finn","Hannah","Imran","Molly","Sam","Eilidh","Kai",
    "Beth","Nathan","Yasmin","George","Freya","Marcus","Rosie","Ade","Lucy","Connor","Nadia",
    "Hugh","Ellie","Rohan","Kate","Liam","Maya","Gareth","Sienna","Yusuf","Poppy","Declan",
    "Alice","Theo","Carys","Idris","Bex","Steve","Jen","Mo","Gemma","Ravi","Siobhan","Pete","Wiktoria","Femi"];
  var LAST = ["Walker","Patel","Hughes","Okafor","Morgan","Ahmed","Fletcher","Byrne","Campbell","Khan",
    "Evans","Doyle","Reid","Shah","Price","Murphy","Begum","Clarke","Nowak","Ali","Jones","Kaur",
    "Davies","Hall","Mensah","Wright","Lewis","Singh","Ward","Owusu"];
  var ADJ = ["quiet","lucky","grumpy","nosy","sunny","soggy","cosmic","sleepy","tidy","brave",
    "chunky","salty","fizzy","witty","rogue","smug","feral","polite"];
  var NOUN = ["otter","pigeon","badger","teapot","crumpet","heron","walrus","biscuit","fox","kipper",
    "owl","puffin","gnome","scone","wombat","parsnip","hedgehog","seagull"];
  var PLACE = ["Leeds","Brum","Geordie","Scouse","Cardiff","Bristol","Glasgow","Kent","Norfolk",
    "Essex","Derry","Hull","Devon","Fife","Wigan","Croydon"];
  var ROLE = ["Lass","Lad","Guesser","Pundit","Nerd","Mum","Dad","Gran","Oracle","Punter"];
  var TITLE = ["Big","Dr","Wee","Old","Lil","Captain"];
  var HANDLES = ["pollster_pete", "MedianMum", "the_swingometer", "GuessWho", "Brexit_Bingo",
    "YouGovMyHeart", "margin_of_error", "Crowd_Pleaser", "exit_poll_ellie", "HungParliament",
    "spoilt_ballot", "BellCurveBev"];
  function cap(w){ return w.charAt(0).toUpperCase() + w.slice(1); }
  function makeName(r){
    function pick(a){ return a[Math.floor(r() * a.length)]; }
    var f = pick(FIRST), l = pick(LAST);
    switch (Math.floor(r() * 11)){
      case 0:  return f + " " + l.charAt(0) + ".";                                   // Priya W.
      case 1:  return f.toLowerCase() + (r() < 0.5 ? 1958 + Math.floor(r() * 47) : 10 + Math.floor(r() * 90));   // priya1987
      case 2:  return f + (r() < 0.5 ? "_" : ".") + l;                                // Priya_Walker
      case 3:  return cap(pick(ADJ)) + cap(pick(NOUN));                                // QuietOtter
      case 4:  return pick(ADJ) + "_" + pick(NOUN) + (r() < 0.4 ? Math.floor(r() * 100) : "");   // lucky_pigeon42
      case 5:  return pick(PLACE) + (r() < 0.5 ? "" : "_") + pick(ROLE);               // LeedsLass
      case 6:  return f + l.charAt(0);                                                 // PriyaW
      case 7:  return pick(HANDLES);
      case 8:  return (f.charAt(0) + pick(LAST).charAt(0) + l.charAt(0)).toLowerCase() + "_" + Math.floor(r() * 100);   // pkw_77
      case 9:  return pick(TITLE) + " " + f;                                           // Auntie Priya
      default: return f;                                                               // Priya
    }
  }

  // ---------- scoring ----------
  var BEST = 20, MISSED = 25;
  function monthScore(days, dayCount, mk){
    var list = [], played = 0, pulses = 0;
    for (var d = 1; d <= dayCount; d++){
      var off = days[d];
      if (off === undefined || off === null){
        if (d < dayCount) list.push(MISSED);    // today isn't missed until it's over
        continue;
      }
      played++;
      if (pulse(off, mk + "-" + pad(d))) pulses++;
      list.push(off);
    }
    if (!played) return { avg: null, played: 0, slots: list.length, counted: 0, pulses: 0 };
    // the lowest 20 count, averaged; to one decimal, as shown, so equal
    // scores on screen are equal in the ranking too
    list.sort(function(a, b){ return a - b; });
    var best = list.slice(0, BEST), sum = 0;
    best.forEach(function(x){ sum += x; });
    return { avg: Math.round(10 * sum / best.length) / 10, played: played, slots: list.length,
             counted: best.length, pulses: pulses };
  }
  function rank(list, key){
    list.sort(function(a, b){
      return a[key] - b[key] || b.played - a.played || b.pulses - a.pulses ||
        (a.you ? -1 : b.you ? 1 : a.name.localeCompare(b.name));
    });
    list.forEach(function(p, i){
      var prev = list[i - 1];
      p.rank = (prev && prev[key] === p[key] && prev.played === p.played && prev.pulses === p.pulses) ? prev.rank : i + 1;
    });
    return list;
  }

  // ---------- the dummy players ----------
  // Who the players are comes from one seed for the month; each player-day
  // from its own seed, so a day already played never changes as the month
  // goes on, and the names are the same whatever the day.
  function fakePlayers(mk, dayCount){
    var r = rng(hashStr("crowdsense-board-1g-" + mk));
    var used = {}, players = [];
    for (var i = 0; i < 60; i++){
      var name;
      do { name = makeName(r); } while (used[name.toLowerCase()] || name.length > 20);
      used[name.toLowerCase()] = 1;
      players.push({ id: "p" + i, name: name, you: false,
        sigma: 4 + r() * 13,             // how far off this player usually is
        turnout: 0.3 + r() * 0.68,       // share of days they play
        days: {} });
    }
    players.forEach(function(p, i){
      for (var d = 1; d <= dayCount; d++){
        var rd = rng(hashStr("crowdsense-day-1g-" + mk + "-" + i + "-" + d));
        // fewer have got round to it yet on the current day
        if (rd() < (d === dayCount ? p.turnout * 0.7 : p.turnout)) p.days[d] = Math.min(60, Math.round(Math.abs(gauss(rd)) * p.sigma));
      }
    });
    return players;
  }
  function takenNames(mk){
    var out = {};
    fakePlayers(mk, 0).forEach(function(p){ out[p.name.toLowerCase()] = 1; });
    return out;
  }

  // ---------- the board ----------
  function buildBoard(opts){
    var key = opts.todayKey, mk = key.slice(0, 7);
    var y = +key.slice(0, 4), m = +key.slice(5, 7), dayCount = +key.slice(8, 10);
    var players = fakePlayers(mk, dayCount);
    var acct = opts.account;
    if (acct && acct.signedIn){
      // seeded from the player sitting 23rd, nudged a touch, so "You" lands
      // around there; the days you really played replace the made-up ones
      var seed = rank(players.map(function(p){
        var t = monthScore(p.days, dayCount, mk);
        return { name: p.name, days: p.days, avg: t.avg, played: t.played, pulses: t.pulses };
      }).filter(function(p){ return p.avg !== null; }), "avg")[22];
      var r = rng(hashStr("crowdsense-you-1g-" + mk));
      var days = {};
      for (var d in seed.days) days[d] = Math.max(0, seed.days[d] + Math.round(r() * 2) - 1);
      delete days[dayCount];                // today is only ever a real play
      var real = opts.realDays || {};
      for (var rd in real) days[rd] = real[rd];
      players.push({ id: "you", name: acct.name, you: true, days: days, realDays: real });
    }
    players.forEach(function(p){
      var t = monthScore(p.days, dayCount, mk);
      p.avg = t.avg; p.played = t.played; p.pulses = t.pulses; p.counted = t.counted; p.slots = t.slots;
      p.today = (p.days[dayCount] === undefined) ? null : p.days[dayCount];
    });
    return { key: key, month: mk, year: y, monthNum: m, dayCount: dayCount,
             daysInMonth: daysInMonth(y, m), players: players };
  }
  // one board: "month" (everyone with a play this month) or "today"
  function view(board, period){
    var list = board.players.filter(function(p){
      return period === "today" ? p.today !== null : p.avg !== null;
    }).map(function(p){
      // ranked on copies, so one view can't overwrite another's ranks
      var c = Object.assign({}, p);
      c.score = period === "today" ? p.today : p.avg;
      if (period === "today"){ c.played = 0; c.pulses = 0; }
      return c;
    });
    return rank(list, "score");
  }
  // "top 38%": the share of the group at or above your rank
  function topPercent(rankN, n){ return Math.max(1, Math.ceil(100 * rankN / n)); }
  // only worth saying in the top half of a group big enough for it to mean
  // something: in a group of 3 the leader would read "top 34%"
  function topLine(rankN, n){
    var pc = topPercent(rankN, n);
    return (n >= 10 && pc <= 50) ? "top " + pc + "%" : "";
  }
  function ordinal(n){
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ---------- storage (the sandbox shim prefixes every key with sbx:) ----------
  // The mock keeps every account made on this device by email, like the real
  // thing would, so joining with a second email doesn't wipe the first.
  //   cs-accounts = { byEmail: { email: account }, current: email|null, last: email|null }
  var ACCOUNTS_KEY = "cs-accounts", RANKED_PREFIX = "cs-ranked-";
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(_){ return null; } }
  function writeJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
  function norm(email){ return String(email || "").trim().toLowerCase(); }
  function store(){
    var s = readJSON(ACCOUNTS_KEY);
    return (s && s.byEmail) ? s : { byEmail: {}, current: null, last: null };
  }
  function withState(a, signedIn){ return a ? Object.assign({}, a, { signedIn: signedIn }) : null; }
  // the signed-in account, or the last one used here (signed out), or null
  function account(){
    var s = store(), k = s.current || s.last;
    return withState(k && s.byEmail[k], !!s.current);
  }
  function findAccount(email){ return withState(store().byEmail[norm(email)], false); }
  function saveAccount(a){
    var s = store(), k = norm(a.email), copy = Object.assign({}, a);
    delete copy.signedIn;
    s.byEmail[k] = copy;
    s.last = k;
    if (a.signedIn) s.current = k; else if (s.current === k) s.current = null;
    writeJSON(ACCOUNTS_KEY, s);
  }
  function deleteAccount(){
    var s = store();
    if (s.current) delete s.byEmail[s.current];
    s.current = null; s.last = null;
    writeJSON(ACCOUNTS_KEY, s);
    try{
      var gone = [];
      for (var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if (k && k.indexOf(RANKED_PREFIX) === 0) gone.push(k);
      }
      gone.forEach(function(k){ localStorage.removeItem(k); });
    }catch(_){}
  }
  function rankedToday(dayKey){ return readJSON(RANKED_PREFIX + dayKey); }
  function recordRanked(dayKey, off){
    if (readJSON(RANKED_PREFIX + dayKey)) return false;    // the first finish is the one that counts
    writeJSON(RANKED_PREFIX + dayKey, { off: off });
    return true;
  }
  // this month's ranked plays, by day of the month, up to today
  function realDays(key){
    var out = {}, mk = key.slice(0, 7), now = +key.slice(8, 10);
    try{
      for (var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if (!k || k.indexOf(RANKED_PREFIX) !== 0) continue;
        var day = k.slice(RANKED_PREFIX.length);
        if (day.slice(0, 7) !== mk || +day.slice(8, 10) > now) continue;
        var e = readJSON(k);
        if (e && typeof e.off === "number") out[+day.slice(8, 10)] = e.off;
      }
    }catch(_){}
    return out;
  }

  // ---------- display names ----------
  // Public names need rules and moderation in the real thing; the mock checks
  // the shape, a tiny word list and the dummy board's names.
  var BLOCK = ["fuck", "shit", "cunt", "nigg", "fag", "wank", "twat", "admin", "crowdsense"];
  function checkName(raw, mk){
    var n = String(raw || "").replace(/\s+/g, " ").trim();
    if (n.length < 2) return { error: "Your name needs at least 2 characters." };
    if (n.length > 20) return { error: "Keep your name to 20 characters or fewer." };
    if (!/^[\p{L}\p{N}][\p{L}\p{N} '._-]*$/u.test(n)) return { error: "Use letters, numbers, spaces and . ' _ - only." };
    var low = n.toLowerCase().replace(/[^a-z]/g, "");
    for (var i = 0; i < BLOCK.length; i++) if (low.indexOf(BLOCK[i]) > -1) return { error: "Please choose a different name." };
    if (takenNames(mk)[n.toLowerCase()]) return { error: "That name's taken — try adding an initial." };
    return { name: n };
  }

  window.CS_BOARD = {
    todayKey: todayKey, monthLabel: monthLabel, pulse: pulse,
    buildBoard: buildBoard, view: view, topPercent: topPercent, topLine: topLine, ordinal: ordinal,
    account: account, findAccount: findAccount, saveAccount: saveAccount, deleteAccount: deleteAccount,
    recordRanked: recordRanked, rankedToday: rankedToday, realDays: realDays, checkName: checkName,
    BEST: BEST, MISSED: MISSED, PNTS: PNTS, DK: DK, AGES: AGES, GENDERS: GENDERS, REGIONS: REGIONS, POLITICS: POLITICS
  };
})();
