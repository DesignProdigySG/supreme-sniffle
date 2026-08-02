# yw-intel-graph-v1

A standalone POC: a property graph over "who do we know" and "who's in the
buying group at an account." It covers the one genuinely graph-shaped slice
of a colleague's account-intelligence engine — buying-group mapping,
warm-intro path-finding, and signal propagation — without duplicating the
rest of that engine, which is AI classification/generation and stays out of
scope here.

Design reasoning (why this is graph-shaped, why a property graph and not an
ontology, worked examples): see the linked design memo shared alongside this
repo.

## Data model

Property graph, not a fixed global schema — same-labeled nodes can carry
different properties, and edges carry properties, not just a type.

**Nodes:** `Person` (internal + external), `Account`, `Event` (optional)

**Edges:**
- `works_at` (Person → Account) — `role`, `confirmation`, `start_date`/`end_date`. A job change closes the old edge and opens a new one rather than adding a new edge type.
- `knows` / `interacted_with` (Person ↔ Person) — `weight` (higher = stronger), `distance` (`1/weight`, used for strongest-path search)
- `attended` (Person → Event)
- `referred_by` (Person → Person) — when an intro actually happened
- `investor_of` (Account ↔ Account, optional)

## Setup

1. Bring up Neo4j — either locally (`docker compose up -d`, community edition
   with the APOC plugin) or a free AuraDB instance
   (https://neo4j.com/product/auradb — recommended for the POC, no infra to run).
2. `cp .env.example .env` and fill in `NEO4J_URI` / `NEO4J_USERNAME` /
   `NEO4J_PASSWORD` (and `ANTHROPIC_API_KEY` for brief extraction).
3. `npm install`
4. `npm run setup-schema` — creates uniqueness constraints/indexes.

## Seeding

Two independent sources feed two different halves of the graph:

**"Who do we know"** — LinkedIn's official personal data export
(`Settings > Get a copy of your data > Connections`), first-degree only.
Each internal team member needs their own `Person` node created first
(`is_internal: true`) before importing their export:

```
npx tsx src/cli.ts import-linkedin --file data/Connections.csv --owner-id person-yuan-wen
```

**Buying group at an account** — an AI extraction pass over a Jocelyn brief
(prose → `{person, account, role, confirmation}`):

```
npx tsx src/cli.ts extract-brief \
  --file data/acme-brief.txt \
  --account-id account-acme \
  --account-name "Acme Corp"
```

## Querying

```
npx tsx src/cli.ts buying-group --account-id account-acme

npx tsx src/cli.ts warm-intro --from person-yuan-wen --to person-target
npx tsx src/cli.ts warm-intro --from person-yuan-wen --to person-target --strongest
```

`warm-intro` defaults to fewest hops; `--strongest` optimizes for connection
strength (recency/frequency) instead, via APOC Dijkstra over the
precomputed `distance` property.

## Web UI

A small Next.js app (`app/`) wraps the same buying-group/warm-intro queries
as HTTP endpoints with simple forms on top, for demoing without the CLI:

```
npm run dev
```

- `/buying-group` — look up the current buying group at an account
- `/warm-intro` — find a path between two people (fewest hops or `--strongest`)
- `GET /api/buying-group?accountId=...`
- `GET /api/warm-intro?from=...&to=...&strongest=true|false`

It reads the same `NEO4J_URI`/`NEO4J_USERNAME`/`NEO4J_PASSWORD` env vars as
the CLI. Seeding is still CLI-only — there's no import/extract UI.

## Status

Design/staging project. Not yet shared with Jocelyn — share once it
demonstrably works, not before.
