/* =========================================================================
   points.js — SANDBOX TRIAL. Shared by the game page and the leaderboard.

   Copied into sandbox/ by tools/build-sandbox.js. Nothing here reaches the
   live game: the live index.html never loads this file.

     scoring        per-guess points and the daily score
     UK dates       "today" in London time, honouring the sandbox's ?day=
     dummy board    ~60 made-up players, plus a "You" row near rank 23
     monthly total  each player's 3 lowest days dropped, a missed day = 0
   ========================================================================= */
(function(){
  "use strict";

  // ---------- scoring ----------
  // One guess is worth max(0, 100 - 2 x error): 100 when exact, 0 at 50 off.
  function guessPoints(err){ return Math.max(0, 100 - 2 * Math.abs(err)); }

  // The day scores the first guess, plus half of any improvement the second
  // makes on it. A worse second guess adds nothing, so it can never lower the
  // score. Errors are whole numbers, so every term here is even and the
  // result is always a whole number.
  function dayScore(s1, s2){
    if (s2 === null || s2 === undefined) return s1;
    return s1 + 0.5 * Math.max(0, s2 - s1);
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
  // One player-day: the two guesses' points and the day's score.
  function fakeDay(r, sigma, skip2){
    var e1 = Math.min(60, Math.round(Math.abs(gauss(r)) * sigma));
    var e2;
    if (skip2 || e1 === 0) e2 = null;             // exact first guess: no second
    else if (r() < 0.15) e2 = e1 + Math.round(r() * 4);   // talked themselves out of it
    else e2 = Math.round(e1 * (0.1 + r() * 0.8)); // Higher/Lower usually helps
    var s1 = guessPoints(e1), s2 = e2 === null ? null : guessPoints(e2);
    return { s1: s1, s2: s2, score: dayScore(s1, s2) };
  }

  // Monthly total: every day of the month so far, a missed day scoring 0,
  // then the 3 lowest dropped. The tiebreak is first-guess points over the
  // days that counted.
  var DROP = 3;
  function monthTotal(days, dayCount){
    var list = [];
    for (var d = 1; d <= dayCount; d++){
      var e = days[d];
      list.push(e ? { d: d, score: e.score, s1: e.s1 } : { d: d, score: 0, s1: 0 });
    }
    // lowest first; on equal scores drop the day with fewer first-guess points
    list.sort(function(a, b){ return a.score - b.score || a.s1 - b.s1 || a.d - b.d; });
    var kept = list.slice(DROP);
    var total = 0, first = 0;
    kept.forEach(function(x){ total += x.score; first += x.s1; });
    var played = 0;
    for (var k in days) if (days[k]) played++;
    return { total: total, firstPts: first, played: played,
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
      p.total = t.total; p.firstPts = t.firstPts; p.played = t.played; p.dropped = t.dropped;
    });
    players.sort(function(a, b){
      return b.total - a.total || b.firstPts - a.firstPts || (a.you ? -1 : b.you ? 1 : a.name.localeCompare(b.name));
    });
    // shared rank only when both the total and the tiebreak are level
    players.forEach(function(p, i){
      var prev = players[i - 1];
      p.rank = (prev && prev.total === p.total && prev.firstPts === p.firstPts) ? prev.rank : i + 1;
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
      // a small wobble, kept on the even-point grid the formula produces
      var s1 = Math.max(0, Math.min(100, t.s1 + 2 * (Math.round(r() * 2) - 1)));
      var s2 = t.s2 === null ? null : Math.max(0, Math.min(100, t.s2 + 2 * (Math.round(r() * 2) - 1)));
      youDays[d] = { s1: s1, s2: s2, score: dayScore(s1, s2), dummy: true };
    }
    // the current day is left to the player: only a real play fills it
    delete youDays[dayCount];

    var su = opts.signup || null;
    var real = opts.realDays || {};
    if (su){
      for (var rd in real){
        var e = real[rd];
        youDays[rd] = { s1: e.s1, s2: e.s2, score: e.score, dummy: false };
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
    guessPoints: guessPoints, dayScore: dayScore,
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
