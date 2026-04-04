# Linksy

Linksy is a custom [Connections](https://www.nytimes.com/games/connections)-style word puzzle platform. Create a puzzle with 4 categories of 4 words, share a link, and let anyone play in the browser — no account required.

**[Live demo →](https://linksy.vercel.app)**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL via `pg` (Supabase Postgres) |
| Testing | Playwright end-to-end tests |
| Analytics | Vercel Analytics (page views + custom events) |
| Deployment | Vercel (preview deployments on every PR) |
| CI | GitHub Actions |

---

## Features

- **Create puzzles** — define 4 color-coded categories with 4 words each, with client-side validation and a live preview
- **Play puzzles** — fully client-side game logic with shuffle, selection, mistake tracking, and animated feedback
- **Share** — nanoid-generated 8-character game IDs produce short, shareable URLs
- **Share on X** — one-click pre-filled tweet with the game link, available after creation and during play
- **Rate games** — 1–5 star rating dialog after completing a game, averaged across all players
- **Analytics** — Vercel Analytics tracks page views, game creation, game plays, share clicks, and ratings; geographic breakdowns included automatically

---

## AI-Augmented Development Workflow

A core design goal of this project was building a **GitHub-native AI developer loop** using [Claude Code Action](https://github.com/anthropics/claude-code-action). The key engineering decision was decomposing this into three separate, purpose-scoped workflows rather than a single monolithic one.

### Why three workflows?

Each workflow responds to a distinct trigger class, has different permission requirements, and should fail independently:

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| Issue Handler | `claude.yml` | New issue or `@claude` comment on an issue | Reads the issue, implements the feature, opens a PR |
| PR Review | `claude-pr-review.yml` | `@claude` mention on a PR comment or review | Reviews code, answers questions, applies requested changes |
| CI Auto-Fix | `claude-ci-fix.yml` | CI failure on a `claude/` branch | Downloads Playwright report artifact, diagnoses the failure, pushes a fix |

Keeping them separate means a PR review comment can't accidentally trigger an issue-to-PR flow, and the CI auto-fixer only activates on Claude-authored branches — not developer branches. The CI auto-fixer also includes a retry cap (max 2 fix attempts per branch) to prevent infinite loops.

### End-to-end example

**Share on X** ([issue #5](https://github.com/anishd7/linksy/issues/5), [PR #6](https://github.com/anishd7/linksy/pull/6)):
1. Opened an issue describing the button and desired tweet text
2. The Issue Handler workflow triggered, implemented the feature, and opened a PR automatically
3. After reviewing the PR, left an `@claude` comment asking for the button to also appear on the game page
4. The PR Review workflow picked up the comment and pushed the additional change to the same branch

**Vercel Analytics** ([issue #7](https://github.com/anishd7/linksy/issues/7), [PR #8](https://github.com/anishd7/linksy/pull/8)):
1. Opened an issue listing all the specific events to track (game creation, plays, share clicks, ratings, geographic data)
2. Issue Handler implemented and opened the PR, tracking every requested event using `@vercel/analytics`
3. When the action run hit a turn limit mid-run, left an `@claude` comment on the PR requesting a review — the PR Review workflow verified all events were correctly instrumented and confirmed the build passed

---

## CI Pipeline

Every pull request to `main` runs `ci.yml`:

1. Spins up `ubuntu-latest` with Node 20
2. Installs Chromium via `npx playwright install --with-deps chromium`
3. Builds the app and runs the full Playwright test suite against `http://localhost:3000`
4. Uploads the Playwright HTML report as a build artifact
5. Blocks merge if tests fail

Required GitHub Actions secrets: `POSTGRES_URL`.

Each PR also gets an automatic **Vercel preview deployment**, providing a live URL to test against before merging.

---

## Architecture

Both pages (`/` and `/game/[gameId]`) are fully client-rendered (`"use client"`). The server sends a static shell; React hydrates and fetches data through API routes.

```
app/
  page.tsx                  # Create puzzle page
  game/[gameId]/page.tsx    # Play puzzle page
  api/
    games/
      route.ts              # POST /api/games — create
      [gameId]/
        route.ts            # GET /api/games/:gameId — fetch
        events/route.ts     # POST /api/games/:gameId/events — analytics

components/
  CreateGameForm.tsx         # Form with validation and success state
  GameBoard.tsx              # Board, tile selection, game loop
  RatingDialog.tsx           # Post-game 1–5 star rating
  ActionButtons.tsx          # Deselect / submit guess
  MistakesIndicator.tsx      # Bubble-style mistake counter

lib/
  gameLogic.ts               # Fisher-Yates shuffle, answer key builder
  gameReducer.ts             # useReducer managing full board state
  validation.ts              # Shared input validation (16 unique words, limits)
  db.ts                      # pg Pool — no ORM
  api.ts                     # Client-side fetch wrappers
  id.ts                      # nanoid with a-z0-9 alphabet, length 8
```

**Answer verification** — words are sorted lexicographically at creation time. Guess checking hashes the sorted selection and compares against the stored answer key, making verification O(1) without any API call.

**Database** — single `games` table with JSONB game data and integer counters for access, completion, ratings.

---

## Local Setup

### Prerequisites

- Node.js 20+
- A Postgres database (Supabase free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
POSTGRES_URL=postgresql://...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Create the database table

Run in your Postgres instance (Supabase SQL Editor or `psql`):

```sql
CREATE TABLE IF NOT EXISTS games (
  game_id           VARCHAR(8) PRIMARY KEY,
  game_data         JSONB NOT NULL,
  access_count      INTEGER NOT NULL DEFAULT 0,
  completion_count  INTEGER NOT NULL DEFAULT 0,
  rating_sum        INTEGER NOT NULL DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/games` | Create a new game |
| `GET` | `/api/games/:gameId` | Fetch a game by ID |
| `POST` | `/api/games/:gameId/events` | Record an analytics event |

---

## Running Tests

```bash
# Install browser binaries (once)
npx playwright install chromium

# Run the full E2E suite
npm run test:e2e
```

Playwright builds the app and starts a local server automatically before running.

---

## License

MIT
