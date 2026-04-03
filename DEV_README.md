# Linksy — Custom Connections Puzzle Platform

Build and share custom **Connections** word puzzles. Create 4 categories of 4 words each, get a unique link, and challenge anyone to play.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase Postgres** (managed database)
- **nanoid** for game ID generation

---

## Local Development

### Prerequisites

- **Node.js 18+**
- A **Supabase** project ([supabase.com/dashboard](https://supabase.com/dashboard))

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database table

Go to your Supabase dashboard → **SQL Editor** and run:

```sql
CREATE TABLE games (
  game_id        VARCHAR(8) PRIMARY KEY,
  game_data      JSONB NOT NULL,
  access_count   INTEGER NOT NULL DEFAULT 0,
  completion_count INTEGER NOT NULL DEFAULT 0,
  rating_sum     INTEGER NOT NULL DEFAULT 0,
  rating_count   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase connection string. Find it in **Supabase Dashboard → Settings → Database → Connection string**:

```env
POSTGRES_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the Linksy creation form.

### 5. Test the full flow

1. Fill in 4 categories with 4 words each on the home page
2. Click **Create Game** — you'll get a shareable link
3. Click **Play** to open the game board
4. Play the game: select 4 words, submit guesses, try to find all 4 categories
5. After winning or losing, rate the puzzle in the dialog

---

## Project Structure

```
app/
├── layout.tsx                  # Root layout (fonts, Toaster)
├── page.tsx                    # "/" — Game creation page
├── game/[gameId]/page.tsx      # "/game/:id" — Game play page
└── api/games/
    ├── route.ts                # POST /api/games — create game
    └── [gameId]/
        ├── route.ts            # GET /api/games/:id — fetch game
        └── events/route.ts     # POST /api/games/:id/events — analytics

components/
├── ui/                         # shadcn/ui components
├── Header.tsx                  # Shared header wordmark
├── CreateGameForm.tsx          # 4-category creation form
├── GameBoard.tsx               # Game play orchestrator
├── WordTile.tsx                # Clickable word tile
├── CategoryBanner.tsx          # Solved category banner
├── MistakesIndicator.tsx       # Remaining mistakes dots
├── ActionButtons.tsx           # Shuffle / Deselect All / Submit
├── RatingDialog.tsx            # Post-game star rating modal
└── GameNotFound.tsx            # 404 state

lib/
├── api.ts                      # Client-side fetch helpers
├── db.ts                       # Server-side Postgres queries
├── gameLogic.ts                # Shuffle, answer key, guess checking
├── gameReducer.ts              # useReducer for game state
├── validation.ts               # Input validation
└── id.ts                       # nanoid config

scripts/
└── migrate.ts                  # Database migration (creates games table)
```

---

## Production Deployment (Vercel)

1. Push the repo to GitHub
2. Connect it to Vercel at [vercel.com/new](https://vercel.com/new)
3. Add these environment variables in Vercel's project settings:
   - `POSTGRES_URL` — your Supabase connection string (use the **Transaction pooler** on port 6543)
   - `NEXT_PUBLIC_BASE_URL` — your production domain (e.g., `https://linksy.gg`)
4. Make sure the `games` table exists in Supabase (see step 2 under Local Development)
5. Deploy — every push to `main` auto-deploys

### Environment Variables

| Variable               | Required | Description                                       |
|------------------------|----------|---------------------------------------------------|
| `POSTGRES_URL`         | Yes      | Supabase Postgres connection string (pooler, port 6543) |
| `NEXT_PUBLIC_BASE_URL` | Yes      | Base URL for shareable links (`http://localhost:3000` locally) |

---

## API Endpoints

| Method | Path                          | Description           |
|--------|-------------------------------|-----------------------|
| POST   | `/api/games`                  | Create a new game     |
| GET    | `/api/games/:gameId`          | Fetch a game          |
| POST   | `/api/games/:gameId/events`   | Record analytics event|

---

## License

MIT
