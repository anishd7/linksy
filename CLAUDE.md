# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Development Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npm run test:e2e` — run Playwright end-to-end tests (builds first, uses port 3000)
- `npx playwright test tests/game-flow.spec.ts` — run a single e2e test file

## Environment Variables

Requires `.env.local` with:
- `POSTGRES_URL` — Supabase Postgres connection string
- `NEXT_PUBLIC_BASE_URL` — base URL for shareable links (http://localhost:3000 locally)

## Architecture

Linksy is a custom Connections word puzzle builder/player. Next.js 16 App Router with React 19, Tailwind CSS v4, shadcn/ui, and Supabase Postgres via the `pg` driver.

### Rendering model
Both pages (`app/page.tsx` and `app/game/[gameId]/page.tsx`) are `"use client"` — fully client-rendered. The server sends a static shell; React hydrates and fetches data via API routes.

### Data flow
- **Create**: `CreateGameForm` → `lib/api.ts:createGame()` → `POST /api/games` → `lib/db.ts:insertGame()` → Postgres
- **Play**: Game page `useEffect` → `lib/api.ts:getGame()` → `GET /api/games/[gameId]` → `lib/db.ts:getGame()` → Postgres
- **Analytics**: Fire-and-forget POSTs to `/api/games/[gameId]/events` for access, completion, and rating events

### Game logic (all client-side, no API calls during play)
- `lib/gameLogic.ts` — Fisher-Yates shuffle, answer key builder (sorted word hash matching)
- `lib/gameReducer.ts` — `useReducer` managing board state, selections, mistakes, solved categories
- `lib/validation.ts` — shared input validation (16 unique words, length limits)
- `lib/id.ts` — nanoid with custom alphabet `a-z0-9`, length 8

### Database
Single `games` table in Supabase Postgres. `lib/db.ts` uses `pg` Pool directly (no ORM). Game data stored as JSONB with 4 color-keyed categories. Words are sorted lexicographically at creation time for hash-based answer verification.

### Key conventions
- Fonts: DM Serif Display (headings) + DM Sans (body) via `next/font/google`
- Category colors: Yellow `#F9DF6D`, Green `#A0C35A`, Blue `#B0C4EF`, Purple `#BA81C5`
- UI components in `components/ui/` are shadcn/ui — modify custom components in `components/` directly
- E2E tests in `tests/` use Playwright (Chromium only, serial execution)

### CI / GitHub Actions environment
When running in CI (e.g., via claude-code-action), remember:
- Install Playwright browsers first: `npx playwright install --with-deps chromium`
- Environment variables `POSTGRES_URL` and `NEXT_PUBLIC_BASE_URL` are available as secrets/env in the workflow
- Always run `npm run build` and `npm run lint` before opening a PR to catch errors early
- Run `npx playwright test` to execute e2e tests (the Playwright config handles building and starting the server)
- If CI fails on a PR, read the failing workflow logs via `gh run view` and fix the issue
