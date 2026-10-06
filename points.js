/* =========================================================================
   points.js — SANDBOX TRIAL. Shared by the game page and the leaderboard.

   Copied into sandbox/ by tools/build-sandbox.js. Nothing here reaches the
   live game: the live index.html never loads this file.

     scoring        the day's score, in points off (lower is better)
     UK dates       "today" in London time, honouring the sandbox's ?day=
     dummy board    ~60 made-up players, plus a "You" row near rank 23
     monthly total  points off added up, a missed day = 50 off, the 3
                    worst days dropped; lowest total wins
   ========================================================================= */
(function(){
  "use strict";

  // ---------- scoring ----------
  // The original game's scoring, for two guesses. A guess scores how many
  // points it is off. The day scores the first guess's error, minus half of
  // however much closer the second guess gets: 6 off then 1 off is
  // 6 - 5/2 = 3.5 off. A second guess that's no closer takes nothing off,
  // so it can never make the day worse. Lower is better; 0 is perfect.
  // Errors are whole numbers, so the day lands on a whole or a half.
  function dayOff(e1, e2){
    e1 = Math.abs(e1);
    if (e2 === null || e2 === undefined) return e1;
    return e1 - 0.5 * Math.max(0, e1 - Math.abs(e2));
  }
  // "3.5", "6", "0" — a half shows as .5, a whole number as itself
  function fmtOff(x){
    return (Math.round(x * 10) / 10).toLocaleString("en-GB", { maximumFractionDigits: 1 });
  }
  // A day saved by the earlier, points-out-of-100 version of the trial:
  // points = 100 - 2 x off, so the conversion back is exact.
  function asOffDay(e){
    if (!e) return null;
    if (typeof e.off === "number") return e;
    if (typeof e.score === "number"){
      return { e1: (100 - e.s1) / 2, e2: e.s2 === null || e.s2 === undefined ? null : (100 - e.s2) / 2,
               off: (100 - e.score) / 2 };
    }
    return null;
  }

  // ---------- UK dates ----------
  var TZ = "Europe/London";
  function londonParts(date){
    var f = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    });
    var p = {};
    f.formatToParts(date).forEach(function(x){ p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
  }
  function pad(n){ return String(n).padStart(2, "0"); }
  function keyOf(y, m, d){ return y + "-" + pad(m) + "-" + pad(d); }
  // the sandbox's ?day= sets "today"; otherwise it is the London date now
  function todayKey(){
    var m = /[?&]day=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (m) return m[1];
    var p = londonParts(new Date());
    return keyOf(p.y, p.m, p.d);
  }
  function monthKeyOf(key){ return key.slice(0, 7); }
  function daysInMonth(y, m){ return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

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
  var ABROAD = ["Ireland", "France", "Spain", "United States", "Australia", "Germany", "Canada"];

  var FIRST = ["Priya","Tom","Aisha","Callum","Grace","Rhys","Fatima","Oliver","Niamh","Jamal",
    "Harriet","Kwame","Sophie","Euan","Leila","Ben","Chloe","Arjun","Megan","Dan","Zara","Owen",
    "Isla","Tariq","Ruth","Josh","Amara","Finn","Hannah","Imran","Molly","Sam","Eilidh","Kai",
    "Beth","Nathan","Yasmin","George","Freya","Marcus","Rosie","Ade","Lucy","Connor","Nadia",
    "Hugh","Ellie","Rohan","Kate","Liam","Maya","Gareth","Sienna","Yusuf","Poppy","Declan",
    "Alice","Theo","Carys","Idris"];
  var INITIALS = "ABCDEFGHJKLMNOPRSTW";

  // ---------- the board ----------
  // One player-day: the two guesses' errors and the day's score.
  function fakeDay(r, sigma, skip2){
    var e1 = Math.min(60, Math.round(Math.abs(gauss(r)) * sigma));
    var e2;
    if (skip2 || e1 === 0) e2 = null;             // exact first guess: no second
    else if (r() < 0.15) e2 = e1 + Math.round(r() * 4);   // talked themselves out of it
    else e2 = Math.round(e1 * (0.1 + r() * 0.8)); // Higher/Lower usually helps
    return { e1: e1, e2: e2, off: dayOff(e1, e2) };
  }

  // Monthly total: every day of the month so far, a missed day counting as
  // 50 off, then the 3 worst days dropped. Lowest total wins; the tiebreak
  // is first-guess error over the days that counted, lowest first.
  var DROP = 3, MISSED = 50;
  function monthTotal(days, dayCount){
    var list = [];
    for (var d = 1; d <= dayCount; d++){
      var e = days[d];
      list.push(e ? { d: d, off: e.off, e1: e.e1 } : { d: d, off: MISSED, e1: MISSED });
    }
    // worst first; on equal scores drop the day with the worse first guess
    list.sort(function(a, b){ return b.off - a.off || b.e1 - a.e1 || a.d - b.d; });
    var kept = list.slice(DROP);
    var total = 0, first = 0;
    kept.forEach(function(x){ total += x.off; first += x.e1; });
    var played = 0;
    for (var k in days) if (days[k]) played++;
    return { total: total, firstOff: first, played: played,
             dropped: list.slice(0, DROP).map(function(x){ return x.d; }) };
  }

  function buildFakePlayers(monthKey, dayCount){
    var r = rng(hashStr("crowdsense-board-" + monthKey));
    var used = {}, players = [];
    for (var i = 0; i < 60; i++){
      var name;
      do {
        name = FIRST[Math.floor(r() * FIRST.length)] + " " + INITIALS[Math.floor(r() * INITIALS.length)] + ".";
      } while (used[name]);
      used[name] = 1;
      var region = pickWeighted(r, REGION_W);
      var p = {
        id: "p" + i, name: name, you: false,
        age: pickWeighted(r, AGE_W),
        gender: pickWeighted(r, GENDER_W),
        region: region,
        country: region === "Outside the UK" ? ABROAD[Math.floor(r() * ABROAD.length)] : "",
        days: {}
      };
      var sigma = 3 + r() * 14;            // how far off this player usually is
      var turnout = 0.3 + r() * 0.68;      // share of days they play
      for (var d = 1; d <= dayCount; d++){
        // fewer have got round to it yet on the current day
        var chance = d === dayCount ? turnout * 0.7 : turnout;
        if (r() < chance) p.days[d] = fakeDay(r, sigma, r() < 0.04);
      }
      players.push(p);
    }
    return players;
  }

  function rankPlayers(players, dayCount){
    players.forEach(function(p){
      var t = monthTotal(p.days, dayCount);
      p.total = t.total; p.firstOff = t.firstOff; p.played = t.played; p.dropped = t.dropped;
    });
    // fewest points off first
    players.sort(function(a, b){
      return a.total - b.total || a.firstOff - b.firstOff || (a.you ? -1 : b.you ? 1 : a.name.localeCompare(b.name));
    });
    // shared rank only when both the total and the tiebreak are level
    players.forEach(function(p, i){
      var prev = players[i - 1];
      p.rank = (prev && prev.total === p.total && prev.firstOff === p.firstOff) ? prev.rank : i + 1;
    });
    return players;
  }

  // The whole board for a month. "You" is seeded from the player sitting at
  // rank 23, nudged a touch, so it lands around there; the real sandbox plays
  // of a signed-up player then replace the dummy days they cover.
  function buildBoard(opts){
    var key = opts.todayKey;
    var y = +key.slice(0, 4), m = +key.slice(5, 7), dayCount = +key.slice(8, 10);
    var mk = monthKeyOf(key);
    var players = rankPlayers(buildFakePlayers(mk, dayCount), dayCount);

    var template = players[Math.min(22, players.length - 1)];
    var r = rng(hashStr("crowdsense-you-" + mk));
    var youDays = {};
    for (var d in template.days){
      var t = template.days[d];
      // a small wobble on each guess
      var e1 = Math.max(0, t.e1 + Math.round(r() * 2) - 1);
      var e2 = t.e2 === null ? null : Math.max(0, t.e2 + Math.round(r() * 2) - 1);
      youDays[d] = { e1: e1, e2: e2, off: dayOff(e1, e2), dummy: true };
    }
    // the current day is left to the player: only a real play fills it
    delete youDays[dayCount];

    var su = opts.signup || null;
    var real = opts.realDays || {};
    if (su){
      for (var rd in real){
        var e = asOffDay(real[rd]);
        if (e) youDays[rd] = { e1: e.e1, e2: e.e2, off: e.off, dummy: false };
      }
    }
    var you = {
      id: "you", name: "You", you: true,
      age: su ? su.age : null, gender: su ? su.gender : null,
      region: su ? su.region : null, country: su ? (su.country || "") : "",
      signedUp: !!su, days: youDays
    };
    players.push(you);
    players = rankPlayers(players, dayCount);
    return { month: mk, year: y, monthNum: m, dayCount: dayCount,
             daysInMonth: daysInMonth(y, m), players: players };
  }

  // players in one group; "overall" is everyone. A player who preferred not
  // to say is left out of that dimension's groups (but stays in Overall).
  function groupOf(board, dim, value){
    var list = board.players.filter(function(p){
      if (dim === "overall") return true;
      return p[dim] && p[dim] !== PNTS && p[dim] === value;
    });
    // ranked on copies: ranking a group must not overwrite the ranks another
    // group (or the overall board) has already handed out
    return rankPlayers(list.map(function(p){ return Object.assign({}, p); }), board.dayCount);
  }
  // "top 38%": the share of the group at or above your rank
  function topPercent(rank, n){ return Math.max(1, Math.ceil(100 * rank / n)); }

  window.CS_TRIAL = {
    dayOff: dayOff, fmtOff: fmtOff, asOffDay: asOffDay, MISSED: MISSED,
    todayKey: todayKey, monthKeyOf: monthKeyOf, keyOf: keyOf, londonParts: londonParts,
    daysInMonth: daysInMonth,
    buildBoard: buildBoard, groupOf: groupOf, monthTotal: monthTotal, topPercent: topPercent,
    rng: rng, hashStr: hashStr, gauss: gauss,
    PNTS: PNTS, AGES: AGES, GENDERS: GENDERS, REGIONS: REGIONS, DROP: DROP,
    // storage keys (the sandbox shim prefixes them with sbx:)
    SIGNUP_KEY: "cs-signup",
    POINTS_PREFIX: "cs-points-"
  };
})();
