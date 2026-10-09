/* =========================================================================
   board-data.js — SANDBOX ONLY. The leaderboard's data, on dummy players,
   and the mock account. Shared by the game page and leaderboard.html.

   Copied into sandbox/ by tools/build-sandbox.js. Nothing here reaches the
   live game, and nothing is sent anywhere: the account and the ranked
   plays live in the sandbox's own (prefixed) storage.

     ranked plays   today's question, finished on the day in daily mode:
                    cs-ranked-YYYY-MM-DD = { off }. Archive plays never count.
     monthly board  your Crowdsense score for the month: the average of your
                    scores with your worst 10 days forgiven (so your lowest
                    20 count in a 30-day month, 21 in a 31-day one), where a
                    day gone by without a play counts as 25 off (today only
                    once it's over). Until that many days have passed, every
                    day so far counts. The rules don't spell out the
                    forgiving: they say to play at least 20 days. You're on the
                    board from your first play. Lowest wins; ties go to more
                    days played, then more days On the pulse, then share.
     daily board    today's points off, lowest first, for those who played.
     dummy board    ~60 made-up players, stable for the month. A signed-up
                    "You" gets made-up past days so the board looks lived in
                    (the same ones everywhere: the board and every league),
                    with the days you really played in the sandbox on top.
     leagues        private leagues for friends, scored weekly (lowest 5
                    days count), monthly (as the board) or all-time (lowest
                    two-thirds of the days since it began); a missed day is
                    25 off. Kept per account in the sandbox's storage, with
                    three demo leagues to join by code.
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
  function keyUTC(key){ return Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)); }
  function addDays(key, n){ return new Date(keyUTC(key) + n * 86400000).toISOString().slice(0, 10); }
  function weekStart(key){ return addDays(key, -((new Date(keyUTC(key)).getUTCDay() + 6) % 7)); }   // Monday
  function shortDate(key, withMonth){
    var o = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
      .formatToParts(new Date(keyUTC(key))).forEach(function(x){ o[x.type] = x.value; });
    return o.weekday + " " + o.day + (withMonth ? " " + o.month : "");
  }
  function longDate(key){
    return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(keyUTC(key)));
  }
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
  var FORGIVE = 10, MISSED = 25;
  // how many of a month's days count: all but the worst 10
  function monthBest(mk){ return daysInMonth(+mk.slice(0, 4), +mk.slice(5, 7)) - FORGIVE; }
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
    // the lowest count (all but the worst 10 of the month), averaged; to one
    // decimal, as shown, so equal scores on screen are equal in the ranking too
    list.sort(function(a, b){ return a - b; });
    var best = list.slice(0, monthBest(mk)), sum = 0;
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

  // ---------- your made-up past days (sandbox only) ----------
  // One per date, so your score agrees between the board and your leagues.
  function youDummy(dayKey){
    var r = rng(hashStr("crowdsense-you-day-" + dayKey));
    return r() < 0.7 ? Math.min(60, Math.round(Math.abs(gauss(r)) * 10)) : null;
  }
  function otherDummy(email, dayKey){
    var r = rng(hashStr("crowdsense-other-day-" + email + "-" + dayKey));
    return r() < 0.7 ? Math.min(60, Math.round(Math.abs(gauss(r)) * 10)) : null;
  }
  // a real ranked play if there is one; before today, a made-up one
  function yourDay(dayKey, today, real){
    if (real[dayKey] !== undefined) return real[dayKey];
    return dayKey < today ? youDummy(dayKey) : null;
  }

  // ---------- the board ----------
  function buildBoard(opts){
    var key = opts.todayKey, mk = key.slice(0, 7);
    var y = +key.slice(0, 4), m = +key.slice(5, 7), dayCount = +key.slice(8, 10);
    var players = fakePlayers(mk, dayCount);
    var acct = opts.account;
    if (acct && acct.signedIn){
      var real = allRanked(), days = {};
      for (var d = 1; d <= dayCount; d++){
        var v = yourDay(mk + "-" + pad(d), key, real);
        if (v !== null) days[d] = v;
      }
      players.push({ id: "you", name: acct.name, you: true, days: days });
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
    if (s.current){
      var all = leagueStore();
      (all[s.current] || []).forEach(function(l){ if (l.owner) dropEverywhere(all, l.code); });
      delete all[s.current];
      writeJSON(LEAGUES_KEY, all);
      delete s.byEmail[s.current];
    }
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
  // every ranked play, by date
  function allRanked(){
    var out = {};
    try{
      for (var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if (!k || k.indexOf(RANKED_PREFIX) !== 0) continue;
        var e = readJSON(k);
        if (e && typeof e.off === "number") out[k.slice(RANKED_PREFIX.length)] = e.off;
      }
    }catch(_){}
    return out;
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

  // ---------- private leagues (mock) ----------
  //   cs-leagues = { email: [ { id, code, name, period, started, size, owner } ] }
  var LEAGUES_KEY = "cs-leagues";
  var PERIODS = {
    week:  { label: "Weekly",   best: 5,    rule: "Your lowest 5 days of the week count, and a day you miss counts as 25 off. It starts again every Monday." },
    month: { label: "Monthly",  best: null, rule: "Play a minimum of 20 days in the month; after that a day you miss counts as 25 off. It starts again on the 1st." },
    all:   { label: "All-time", best: null, rule: "Your lowest two-thirds of days since the league began count, and a day you miss counts as 25 off." }
  };
  // the sandbox's ready-made leagues, to join by code and see one with players
  var DEMO = {
    "PUB-QUIZ":    { name: "The Pub Quiz Lot", period: "week",  size: 6, started: "2026-08-03" },
    "OFFICE-POLL": { name: "Office Pollsters", period: "month", size: 9, started: "2026-07-20" },
    "UNI-MATES":   { name: "Uni Mates",        period: "all",   size: 5, started: "2026-07-20" }
  };
  function leagueStore(){ return readJSON(LEAGUES_KEY) || {}; }
  function leagues(){
    var a = account();
    return (a && a.signedIn) ? (leagueStore()[norm(a.email)] || []) : [];
  }
  function saveLeagues(list){
    var a = account(), all = leagueStore();
    all[norm(a.email)] = list;
    writeJSON(LEAGUES_KEY, all);
  }
  function normCode(c){ return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  // a code on its own, or inside a pasted invite: "...?join=CODE", "(code CODE)"
  function extractCode(raw){
    var t = String(raw || "").trim();
    var m = /[?&#]join=([A-Za-z0-9-]+)/.exec(t) || /\(code\s+([A-Za-z0-9-]+)\)/i.exec(t) || /\/join\/([A-Za-z0-9-]+)/.exec(t);
    return m ? m[1] : t;
  }
  // a league everyone made on this device knows about, by code
  function dropEverywhere(all, code){
    var c = normCode(code);
    for (var e in all) all[e] = (all[e] || []).filter(function(l){ return normCode(l.code) !== c; });
  }
  function newCode(){
    var A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", out = "";
    for (var i = 0; i < 8; i++){ out += A.charAt(Math.floor(Math.random() * A.length)); if (i === 3) out += "-"; }
    return out;
  }
  function createLeague(name, period){
    var code = newCode();
    var lg = { id: code, code: code, name: name, period: period, started: todayKey(), size: 1, owner: true };
    saveLeagues(leagues().concat([lg]));
    return lg;
  }
  // { league } or { error }
  function joinLeague(raw){
    var c = normCode(extractCode(raw)), mine = leagues();
    if (c.length < 4) return { error: "That code looks too short — check it and try again." };
    var demo = null, dc;
    for (var k in DEMO) if (normCode(k) === c){ demo = DEMO[k]; dc = k; }
    var made = null;
    for (var e in leagueStore()) (leagueStore()[e] || []).forEach(function(l){ if (normCode(l.code) === c) made = l; });
    if (mine.some(function(l){ return normCode(l.code) === c; })) return { error: "You're already in that league." };
    var lg = demo ? { id: dc, code: dc, name: demo.name, period: demo.period, started: demo.started, size: demo.size, owner: false }
      : made ? Object.assign({}, made, { owner: false }) : null;
    if (!lg) return { error: "No league found with that code." };
    saveLeagues(mine.concat([lg]));
    return { league: lg };
  }
  function leaveLeague(id){ saveLeagues(leagues().filter(function(l){ return l.id !== id; })); }
  // the owner deleting a league: it goes for everyone in it
  function deleteLeague(id){
    var lg = findLeague(id), all = leagueStore();
    if (lg) dropEverywhere(all, lg.code);
    writeJSON(LEAGUES_KEY, all);
  }
  function findLeague(id){ return leagues().filter(function(l){ return l.id === id; })[0] || null; }
  function renameLeague(id, name){ saveLeagues(leagues().map(function(l){ return l.id === id ? Object.assign({}, l, { name: name }) : l; })); }

  // the window a league scores over, as of today
  function leagueWindow(lg, today){
    var from = lg.period === "week" ? weekStart(today) : lg.period === "month" ? today.slice(0, 8) + "01" : lg.started;
    var periodStart = from;
    if (from < lg.started) from = lg.started;
    var label = lg.period !== "all" && from > periodStart ? "Since " + shortDate(from, true)
      : lg.period === "week"
      ? shortDate(weekStart(today), weekStart(today).slice(5, 7) !== addDays(weekStart(today), 6).slice(5, 7)) +
        " – " + shortDate(addDays(weekStart(today), 6), true)
      : lg.period === "month" ? monthLabel(today) : "Since " + longDate(lg.started);
    return { from: from, to: today, label: label };
  }
  // a player's score over a window: the lowest N count (N = the period's,
  // or two-thirds of the days so far for all-time), a missed day is 25 off,
  // today only once played; no plays, no score
  function windowScore(dayFn, from, today, best){
    var list = [], played = 0;
    for (var k = from; k <= today; k = addDays(k, 1)){
      var off = dayFn(k);
      if (off === null || off === undefined){ if (k < today) list.push(MISSED); continue; }
      played++;
      list.push(off);
    }
    if (!played) return { avg: null, played: 0 };
    var n = Math.min(list.length, best || Math.ceil(list.length * 2 / 3));
    list.sort(function(a, b){ return a - b; });
    var sum = 0;
    list.slice(0, n).forEach(function(x){ sum += x; });
    return { avg: Math.round(10 * sum / n) / 10, played: played };
  }
  // members other than you: their own names and habits, stable per league
  function leagueMembers(lg){
    var r = rng(hashStr("crowdsense-league-" + lg.id)), used = {}, out = [];
    for (var j = 0; j < (lg.size || 1) - 1; j++){
      var name;
      do { name = makeName(r); } while (used[name.toLowerCase()] || name.length > 20);
      used[name.toLowerCase()] = 1;
      out.push({ name: name, sigma: 4 + r() * 12, turnout: 0.45 + r() * 0.5, j: j });
    }
    return out;
  }
  function leagueStandings(lg, today){
    var w = leagueWindow(lg, today);
    // weekly: lowest 5; monthly: as the board, all but the worst 10 of the
    // month; all-time: lowest two-thirds
    var best = lg.period === "week" ? 5 : lg.period === "month" ? monthBest(today.slice(0, 7)) : null;
    var rows = leagueMembers(lg).map(function(m){
      var sc = windowScore(function(k){
        if (k < lg.started) return null;
        var rd = rng(hashStr("crowdsense-league-day-" + lg.id + "-" + m.j + "-" + k));
        // fewer have got round to it yet today
        return rd() < (k === today ? m.turnout * 0.7 : m.turnout) ? Math.min(60, Math.round(Math.abs(gauss(rd)) * m.sigma)) : null;
      }, w.from, today, best);
      return { name: m.name, you: false, score: sc.avg, played: sc.played, pulses: 0 };
    });
    var a = account(), real = allRanked(), me = a && a.signedIn ? norm(a.email) : null, all = leagueStore(), people = store().byEmail;
    for (var e in all){
      if (e === me || !people[e]) continue;
      if (!(all[e] || []).some(function(l){ return normCode(l.code) === normCode(lg.code); })) continue;
      var sc = windowScore(function(k){ return k < lg.started ? null : (k < today ? otherDummy(e, k) : null); }, w.from, today, best);
      rows.push({ name: people[e].name, you: false, score: sc.avg, played: sc.played, pulses: 0 });
    }
    if (a && a.signedIn){
      var mine = windowScore(function(k){ return yourDay(k, today, real); }, w.from, today, best);
      rows.push({ name: a.name, you: true, score: mine.avg, played: mine.played, pulses: 0 });
    }
    var ranked = rank(rows.filter(function(r){ return r.score !== null; }), "score");
    var waiting = rows.filter(function(r){ return r.score === null; }).map(function(r){ r.rank = null; return r; });
    return { window: w, rows: ranked.concat(waiting), members: rows.length };
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
    leagues: leagues, createLeague: createLeague, joinLeague: joinLeague, leaveLeague: leaveLeague, deleteLeague: deleteLeague,
    findLeague: findLeague, renameLeague: renameLeague, leagueStandings: leagueStandings, PERIODS: PERIODS, DEMO: DEMO,
    FORGIVE: FORGIVE, monthBest: monthBest, MISSED: MISSED, PNTS: PNTS, DK: DK, AGES: AGES, GENDERS: GENDERS, REGIONS: REGIONS, POLITICS: POLITICS
  };
})();
