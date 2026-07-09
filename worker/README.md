# Crowdsense crowd-layer backend

A tiny Cloudflare Worker that records each player's final guess per puzzle and
serves the guess distribution. The site uses it to show "You were closer than
74% of players today" and the crowd histogram on the reveal. Free tier is
plenty; there is no server to manage.

It uses **D1** (Cloudflare's SQLite) rather than KV because appends are atomic —
with KV, two players guessing at the same moment would overwrite each other.

## Deploy (one-off, ~5 minutes)

You need a free Cloudflare account and Node installed.

```bash
cd worker

# 1. Log in
npx wrangler login

# 2. Create the database (free)
npx wrangler d1 create crowdsense
# Copy the database_id it prints into wrangler.toml,
# replacing REPLACE_WITH_YOUR_DATABASE_ID

# 3. Create the table
npx wrangler d1 execute crowdsense --file=schema.sql --remote

# 4. Deploy the worker
npx wrangler deploy
# Note the URL it prints, e.g. https://crowdsense-crowd.<your-subdomain>.workers.dev
```

## Connect the site

In `index.html`, find the `window.CS_CONFIG` block and paste the Worker URL:

```js
window.CS_CONFIG = {
  CROWD_API_URL: "https://crowdsense-crowd.<your-subdomain>.workers.dev"
};
```

Commit and push. The crowd layer appears on the reveal automatically; while
`CROWD_API_URL` is empty the site simply skips it.

## Notes

- One guess is recorded per player per puzzle (enforced client-side via
  localStorage; there are no accounts, so a determined person can vote twice —
  fine for a game, worth remembering when you use the data).
- The data accumulating in D1 is the perception-gap dataset: per puzzle, the
  full distribution of what people *thought* the public said. Export any time:
  `npx wrangler d1 execute crowdsense --command "SELECT * FROM guesses" --remote --json > guesses.json`
