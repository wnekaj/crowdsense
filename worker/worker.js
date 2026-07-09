// Crowdsense crowd-layer API — Cloudflare Worker + D1
//
// Endpoints:
//   POST /guess  body {"puzzle": 12, "guess": 47}
//                Records one player's final guess, returns the distribution.
//   GET  /dist?puzzle=12
//                Returns the distribution without recording anything.
//
// Response shape for both:
//   { "puzzle": 12, "total": 214, "counts": [/* 101 ints, index = guessed % */] }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

async function distribution(env, puzzle) {
  const { results } = await env.DB
    .prepare("SELECT guess, COUNT(*) AS n FROM guesses WHERE puzzle = ?1 GROUP BY guess")
    .bind(puzzle)
    .all();
  const counts = new Array(101).fill(0);
  let total = 0;
  for (const row of results) {
    if (row.guess >= 0 && row.guess <= 100) {
      counts[row.guess] = row.n;
      total += row.n;
    }
  }
  return { puzzle, total, counts };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/guess") {
      let body;
      try { body = await request.json(); } catch (_) { return json({ error: "Bad JSON" }, 400); }
      const puzzle = Math.round(Number(body.puzzle));
      const guess = Math.round(Number(body.guess));
      if (!Number.isFinite(puzzle) || puzzle < 1 || puzzle > 100000) return json({ error: "Bad puzzle" }, 400);
      if (!Number.isFinite(guess) || guess < 0 || guess > 100) return json({ error: "Bad guess" }, 400);
      await env.DB
        .prepare("INSERT INTO guesses (puzzle, guess, ts) VALUES (?1, ?2, unixepoch())")
        .bind(puzzle, guess)
        .run();
      return json(await distribution(env, puzzle));
    }

    if (request.method === "GET" && url.pathname === "/dist") {
      const puzzle = Math.round(Number(url.searchParams.get("puzzle")));
      if (!Number.isFinite(puzzle) || puzzle < 1) return json({ error: "Bad puzzle" }, 400);
      return json(await distribution(env, puzzle));
    }

    return json({ error: "Not found" }, 404);
  }
};
