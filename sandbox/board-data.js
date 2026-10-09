/* =========================================================================
   board-data.js — SANDBOX ONLY. The leaderboard's data, on dummy players,
   and the mock account. Shared by the game page and leaderboard.html.

   Copied into sandbox/ by tools/build-sandbox.js. Nothing here reaches the
   live game, and nothing is sent anywhere: the account, the details and
   the ranked plays live in the sandbox's own (prefixed) storage.

     ranked plays   today's question, finished on the day in daily mode:
                    cs-ranked-YYYY-MM-DD = { off }. Archive plays never count.
     monthly board  points off added up over the month so far, a missed day
                    counting as 50 off (today only once it's played, so
                    nobody is charged for a day still going), everyone's
                    3 worst days dropped;
                    lowest total wins. Ties go to more days played, then
                    more days On the pulse, then share the rank.
     today's board  today's points off, lowest first, for those who played.
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
  function pickWeighted(r, items){
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += items[i][1];
    var x = r() * total;
    for (i = 0; i < items.length; i++){ x -= items[i][1]; if (x < 0) return items[i][0]; }
    return items[items.length - 1][0];
  }

  // ---------- demographics ----------
  var PNTS = "Prefer not to say";
  var AGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  var GENDERS = ["Male", "Female", "In another way"];
  var REGIONS = ["North East", "North West", "Yorkshire and the Humber", "East Midlands",
    "West Midlands", "East of England", "London", "South East", "South West",
    "Wales", "Scotland", "Northern Ireland", "Outside the UK"];
  // rough population shares, so the dummy board looks like a UK audience
  var REGION_W = [["North East",4],["North West",11],["Yorkshire and the Humber",8],
    ["East Midlands",7],["West Midlands",9],["East of England",9],["London",13],
    ["South East",14],["South West",8],["Wales",5],["Scotland",8],
    ["Northern Ireland",3],["Outside the UK",2],[PNTS,3]];
  var AGE_W = [["18-24",10],["25-34",18],["35-44",18],["45-54",17],["55-64",16],["65+",17],[PNTS,4]];
  var GENDER_W = [["Male",47],["Female",47],["In another way",2],[PNTS,4]];
  var FIRST = ["Priya","Tom","Aisha","Callum","Grace","Rhys","Fatima","Oliver","Niamh","Jamal",
    "Harriet","Kwame","Sophie","Euan","Leila","Ben","Chloe","Arjun","Megan","Dan","Zara","Owen",
    "Isla","Tariq","Ruth","Josh","Amara","Finn","Hannah","Imran","Molly","Sam","Eilidh","Kai",
    "Beth","Nathan","Yasmin","George","Freya","Marcus","Rosie","Ade","Lucy","Connor","Nadia",
    "Hugh","Ellie","Rohan","Kate","Liam","Maya","Gareth","Sienna","Yusuf","Poppy","Declan",
    "Alice","Theo","Carys","Idris"];
  var INITIALS = "ABCDEFGHJKLMNOPRSTW";
  // some players pick a handle instead of a name
  var HANDLES = ["pollster_pete", "MedianMum", "the_swingometer", "GuessWho", "Brexit_Bingo",
    "YouGovMyHeart", "margin_of_error", "Crowd_Pleaser"];

  // ---------- scoring ----------
  var DROP = 3, MISSED = 50;
  function monthTotal(days, dayCount, mk){
    var list = [], played = 0, pulses = 0;
    for (var d = 1; d <= dayCount; d++){
      var off = days[d];
      if (off === undefined || off === null){
        // today isn't missed until it's over
        if (d < dayCount) list.push({ d: d, off: MISSED });
        continue;
      }
      played++;
      if (pulse(off, mk + "-" + pad(d))) pulses++;
      list.push({ d: d, off: off });
    }
    // worst first; the 3 worst go
    list.sort(function(a, b){ return b.off - a.off || a.d - b.d; });
    var total = 0;
    list.slice(DROP).forEach(function(x){ total += x.off; });
    return { total: total, played: played, pulses: pulses, counted: list.length,
             dropped: list.slice(0, DROP).map(function(x){ return x.d; }) };
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
      do {
        name = r() < 0.12 ? HANDLES[Math.floor(r() * HANDLES.length)]
          : FIRST[Math.floor(r() * FIRST.length)] + " " + INITIALS[Math.floor(r() * INITIALS.length)] + ".";
      } while (used[name.toLowerCase()]);
      used[name.toLowerCase()] = 1;
      players.push({ id: "p" + i, name: name, you: false,
        age: pickWeighted(r, AGE_W), gender: pickWeighted(r, GENDER_W), region: pickWeighted(r, REGION_W),
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
        var t = monthTotal(p.days, dayCount, mk);
        return { name: p.name, days: p.days, total: t.total, played: t.played, pulses: t.pulses };
      }), "total")[22];
      var r = rng(hashStr("crowdsense-you-1g-" + mk));
      var days = {};
      for (var d in seed.days) days[d] = Math.max(0, seed.days[d] + Math.round(r() * 2) - 1);
      delete days[dayCount];                // today is only ever a real play
      var real = opts.realDays || {};
      for (var rd in real) days[rd] = real[rd];
      players.push({ id: "you", name: acct.name, you: true,
        age: acct.age || null, gender: acct.gender || null, region: acct.region || null,
        days: days, realDays: real });
    }
    players.forEach(function(p){
      var t = monthTotal(p.days, dayCount, mk);
      p.total = t.total; p.played = t.played; p.pulses = t.pulses; p.dropped = t.dropped; p.counted = t.counted;
      p.today = (p.days[dayCount] === undefined) ? null : p.days[dayCount];
    });
    return { key: key, month: mk, year: y, monthNum: m, dayCount: dayCount,
             daysInMonth: daysInMonth(y, m), players: players };
  }
  // one board view: a period ("month" or "today") and a group
  function view(board, period, dim, value){
    var list = board.players.filter(function(p){
      if (period === "today" && p.today === null) return false;
      if (dim === "overall") return true;
      return p[dim] && p[dim] !== PNTS && p[dim] === value;
    }).map(function(p){
      // ranked on copies, so one view can't overwrite another's ranks
      var c = Object.assign({}, p);
      c.score = period === "today" ? p.today : p.total;
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
    PNTS: PNTS, AGES: AGES, GENDERS: GENDERS, REGIONS: REGIONS, DROP: DROP, MISSED: MISSED
  };
})();
