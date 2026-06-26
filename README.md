# ShipIQ — Cargo Optimization Service

A Node.js REST API that allocates maritime cargo into vessel tanks. Given a list of cargos (with volumes) and tanks (with capacities), the service figures out how to load **as much cargo as possible** while respecting the problem constraints.

Built for the SHIPIQ senior engineer assignment.

---

## Problem (quick recap)

| Rule | Meaning |
|------|---------|
| Cargo splitting allowed | One cargo can be spread across multiple tanks |
| One cargo per tank | Each tank holds only a single cargo ID (no mixing) |
| Objective | Maximize total loaded cargo volume |

---

## Approach & algorithm

I went with a **greedy allocator + sorting** rather than full mathematical optimization (ILP / branch-and-bound).

### Why greedy?

- **Fast** — sorts + single pass, handles 10k+ items in milliseconds
- **Easy to reason about** in an interview walkthrough
- **Good enough** for most real loading scenarios when you prioritise large cargos into large tanks

### Steps

1. Sort cargos by volume **descending** (biggest first)
2. Sort tanks by capacity **descending** (biggest first)
3. For each cargo, assign it to the next available tank(s) until:
   - the cargo is fully loaded, or
   - we run out of tanks

Each tank gets `min(remaining cargo, tank capacity)` and is then marked used.

### Trade-offs

| Greedy + sorting | Exact optimization (ILP) |
|------------------|--------------------------|
| O(C log C + T log T) | Can be much slower |
| Simple to extend | Harder to maintain |
| May miss global optimum in edge cases | Guaranteed optimal |

If the business later needs provably optimal allocations, I'd swap the domain layer (`CargoOptimizer.js`) for an ILP solver and keep the API unchanged.

---

## Assumptions

1. **Tank data in the brief** — the assignment PDF repeats the cargo table under "Tanks". I assumed tanks are separate entities (`T1`–`T10`) with their own capacities. Sample tanks are in `src/domain/types.js`.
2. **Volumes are positive numbers** — no fractional cubic units in v1.
3. **Single-instance memory store** — one optimization session in memory. Fine for demo; use Redis/DB for multi-instance production.
4. **One cargo ID per tank** — even if a tank isn't full, it can't be shared with another cargo.
5. **Input via API** — no hard dependency on the sample C1–C10 list; any valid payload works.

---

## Project structure

```
src/
  config/          → env-based configuration
  domain/          → pure business logic (optimizer, validation)
  services/        → orchestration layer
  store/           → in-memory session state
  api/             → routes + middleware
  utils/           → logging
public/            → simple visualization UI
tests/
  unit/            → optimizer + validation tests
  integration/     → full API flow tests
```

Clean separation: routes don't know about algorithm details; the optimizer doesn't know about HTTP.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/input` | Submit cargo + tank data |
| `POST` | `/input/sample` | Load assignment demo data |
| `POST` | `/optimize` | Run allocation on stored input |
| `GET` | `/results` | Get last optimization result |
| `GET` | `/health` | Health check (Docker / cloud) |
| `GET` | `/` | Web UI |

### Example: full flow

```bash
# 1. Load sample data
curl -X POST http://localhost:3000/input/sample

# 2. Run optimizer
curl -X POST http://localhost:3000/optimize

# 3. Fetch results
curl http://localhost:3000/results
```

### Custom input

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

---

## Setup & run locally

### Prerequisites

- Node.js 18+ (20 recommended)
- npm

### Install & run

```bash
cp .env.example .env
npm install
npm start
```

Dev mode with auto-reload (Node 18+):

```bash
npm run dev
```

Open **http://localhost:3000** for the UI.

### Run tests

```bash
npm test
npm run test:coverage
```

---

## Docker

```bash
docker compose up --build
```

API + UI at http://localhost:3000

---

## Cloud deployment

Configs included for **Fly.io** and **Render**.

### Fly.io

```bash
# install flyctl, then:
fly launch    # pick app name + region
fly deploy
```

Your live URL will look like: `https://shipiq-cargo-optimizer.fly.dev`

### Render

1. Push repo to GitHub
2. New → Blueprint → connect repo (uses `render.yaml`)
3. Deploy

Health check path: `/health`

---

## Logging & monitoring

- **Winston** structured logs on every request and optimization run
- **`GET /health`** — uptime + timestamp for load balancers
- **Rate limiting** — 100 req/min per IP (configurable via env)

Env vars (see `.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Server port |
| `LOG_LEVEL` | info | Log verbosity |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |

---

## UI

A lightweight static page at `/` lets you:

1. Load sample data
2. Run optimization
3. See summary stats, tank fill bars, and allocation table

No build step — plain HTML/CSS/JS served by Express.

---

## Large datasets

The greedy approach scales well. There's a unit test that runs 10k cargos × 10k tanks and expects completion under 5 seconds. Sorting dominates; allocation is a single linear walk.

---

## What I'd do next (production hardening)

- Persist sessions in Redis
- Auth on `/input` and `/optimize`
- Prometheus metrics endpoint
- Optional ILP backend behind a feature flag

---

## License

MIT
