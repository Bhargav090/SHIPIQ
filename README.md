# ShipIQ — Cargo Optimization Service

Node.js service for the SHIPIQ assignment. You send in a list of cargos and tanks, run the optimizer, and get back which cargo goes into which tank.

The goal is simple: load as much cargo volume as possible.

## The problem (in short)

You have cargos with volumes and tanks with capacities. Three rules matter:

- A cargo can be split across multiple tanks
- But each tank can only hold one cargo ID (no mixing C3 and C7 in the same tank)
- Maximize total loaded volume

## How I solved it

I used a greedy approach with sorting. Nothing fancy like ILP — wanted something fast, easy to test, and easy to explain in a walkthrough.

Here's what the allocator does:

1. Sort cargos biggest → smallest
2. Sort tanks biggest → smallest
3. For each cargo, grab the next free tank(s) and put in `min(remaining cargo, tank capacity)` until that cargo is done or tanks run out

The actual logic lives in `src/domain/CargoOptimizer.js`. It's a pure function — no HTTP, no database — so unit tests are straightforward.

### Why not exact optimization?

Greedy won't guarantee the mathematically perfect answer in every edge case. But it's O(n log n), runs fine on 10k+ items (there's a test for that), and the API stays responsive. If we ever need provably optimal results, I'd only swap the domain layer and keep routes/services as they are.

### One thing I had to assume

The assignment PDF lists the same C1–C10 table under "Tanks" — pretty sure that's a copy-paste mistake. I treated tanks as separate entities (T1–T10) with their own capacities. Sample data is in `src/domain/types.js`. You can also POST your own via the API.

Other assumptions: positive integer volumes, in-memory session store (fine for single instance), no auth on endpoints.

## Project layout

```
src/
  domain/       CargoOptimizer + input validation
  services/     ties domain logic to the store
  store/        in-memory input/results (swap for Redis later)
  api/          routes + middleware
  config/       env vars
  utils/        winston logger
public/         simple UI
tests/
  unit/         optimizer + validation
  integration/  full API flow
```

Routes don't touch the algorithm directly. Optimizer doesn't know about Express. That was intentional — makes testing and future changes easier.

## API

Base URL locally: `http://localhost:3000`

| Endpoint | What it does |
|----------|--------------|
| `POST /input` | Send your cargo + tank JSON |
| `POST /input/sample` | Load the C1–C10 demo data from the brief |
| `POST /optimize` | Run allocation on whatever was last saved |
| `GET /results` | Fetch the last optimization output |
| `POST /reset` | Clear saved input and results |
| `GET /health` | Health check for Docker/cloud |
| `GET /` | Basic UI to load data and see results |

Typical flow:

```bash
curl -X POST http://localhost:3000/input/sample
curl -X POST http://localhost:3000/optimize
curl http://localhost:3000/results
```

Custom input example:

```bash
curl -X POST http://localhost:3000/input \
  -H "Content-Type: application/json" \
  -d '{
    "cargos": [
      { "id": "C1", "volume": 5000 },
      { "id": "C2", "volume": 1000 }
    ],
    "tanks": [
      { "id": "T1", "capacity": 3000 },
      { "id": "T2", "capacity": 3000 },
      { "id": "T3", "capacity": 1000 }
    ]
  }'
```

Call `/optimize` after `/input`. Results get cleared if you POST new input — didn't want stale data hanging around.

## Run locally

Need Node 18+ (I used 20).

```bash
cp .env.example .env
npm install
npm test        # run this first — should see 25 passing
npm start
```

Server starts on port 3000. Open http://localhost:3000 for the UI.

Dev mode with file watching:

```bash
npm run dev
```

Test coverage if you want it:

```bash
npm run test:coverage
```

## Docker

```bash
docker compose up --build
```

Same port, same endpoints. Healthcheck hits `/health` inside the container.

## Deploy (optional)

Included configs for Fly.io and Render if you want a live URL.

**Fly.io** — `fly launch` then `fly deploy`

**Render** — connect the GitHub repo, it picks up `render.yaml`. Set health check path to `/health`.

## Logging

Using Winston. Every request and optimization run gets logged. Log level is controlled via `LOG_LEVEL` in `.env` (default `info`). There's also basic rate limiting (100 req/min per IP) so a public deploy doesn't get hammered.

Env vars are in `.env.example` — `PORT`, `LOG_LEVEL`, `RATE_LIMIT_MAX`, etc.

## UI

Plain HTML page at `/`. Load sample data, hit optimize, see summary numbers and tank fill bars. No React, no build step — just static files served by Express.

## If I had more time

- Redis for session storage (multi-instance deploys)
- Auth on write endpoints
- Metrics endpoint (Prometheus-style)
- Try ILP behind a flag and compare results vs greedy

## License

MIT
