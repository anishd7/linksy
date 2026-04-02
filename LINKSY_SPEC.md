# Linksy — Custom Connections Game Platform

## Implementation Spec for Claude Code

---

## 1. Product Overview

Linksy is a web application that lets users create and share custom versions of the NYT "Connections" word puzzle game. Users build a game by defining 4 color-coded categories (yellow, green, blue, purple) with 4 words each, then receive a unique shareable URL. Anyone with the link can play the game entirely in-browser.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│                Vercel Edge Network                │
│        (CDN, SSL, global distribution)           │
└──────┬────────────────────────────┬──────────────┘
       │                            │
  Static assets               /api/* routes
  (JS, CSS, HTML shell)       (serverless functions)
       │                            │
┌──────┴──────────────────────┐     │
│  Next.js Client Pages       │     │
│  (client-side rendered,     │     │
│   "use client" components)  │     │
└─────────────────────────────┘     │
                              ┌─────┴──────────────┐
                              │  Next.js API Routes │
                              │  (serverless,       │
                              │   auto-scaled)      │
                              └─────┬──────────────┘
                                    │
                              ┌─────┴──────────────┐
                              │  Vercel Postgres    │
                              │  (Neon-powered,     │
                              │   managed)          │
                              └────────────────────┘
```

### Key decisions:
- **Single platform**: Everything deploys to Vercel — frontend, API, database. One repo, one `git push`, one bill.
- **Client-side rendering**: Both pages use `"use client"`. The server sends a static HTML shell; React hydrates and takes over. All game logic runs in the browser.
- **API routes**: Next.js App Router API routes (`app/api/...`) become Vercel Serverless Functions automatically. No Lambda, no API Gateway to configure.
- **Database**: Vercel Postgres (Neon). Single table, primary key on `game_id`. Single-row lookups by primary key are sub-millisecond.
- **CDN caching**: Vercel's Edge Network caches static assets automatically. The `GET /api/games/:gameId` response should set `Cache-Control: s-maxage=3600, stale-while-revalidate` since games are immutable, so repeated fetches of the same game are served from edge cache without hitting the database.
- **CI/CD**: Vercel's GitHub integration. Connect the repo, and every push to `main` triggers a build and deploy automatically. No GitHub Actions needed.

---

## 3. Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Rendering**: Client-side (`"use client"` directive on page components). These pages behave like an SPA — the server sends a static shell, the browser fetches data and renders.
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui. Initialize with `npx shadcn@latest init` and install components as needed. See Section 8.2 for which components to use.
- **Design quality**: Follow the frontend-design skill at `/mnt/skills/public/frontend-design/SKILL.md` for aesthetic guidance. The UI must be polished and distinctive — NOT generic AI-generated aesthetics. See Section 8 for the full UI spec.
- **ID generation**: nanoid with custom alphabet `abcdefghijklmnopqrstuvwxyz0123456789`, length 8. Install via `npm install nanoid`.
- **State management**: React `useState` and `useReducer` only. No external state library needed.

### Backend
- **API routes**: Next.js App Router route handlers (`app/api/.../route.ts`). Each route handler is automatically deployed as a Vercel Serverless Function.
- **Database**: Vercel Postgres. Use the `@vercel/postgres` SDK. Connection string is provided automatically via Vercel environment variables.
- **Rate limiting**: Use Vercel's built-in rate limiting via `vercel.json` configuration, or implement lightweight in-app rate limiting with Vercel KV if needed. For v1, Vercel's default DDoS protection is sufficient.

### CI/CD
- Connect the GitHub repo to Vercel.
- Every push to `main` automatically triggers: build → deploy.
- Preview deployments are created for every pull request.
- No GitHub Actions, no deploy scripts, no manual steps.

---

## 4. Database Schema

**Provider**: Vercel Postgres (Neon)

### Table: `games`

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

The primary key index on `game_id` ensures single-row lookups are O(log n) — effectively instant at any realistic scale.

### `game_data` JSONB structure:

```json
{
  "yellow": { "category": "Types of Cheese", "words": ["brie", "cheddar", "gouda", "mozzarella"] },
  "green":  { "category": "Programming Languages", "words": ["go", "java", "python", "rust"] },
  "blue":   { "category": "Ocean Animals", "words": ["dolphin", "octopus", "shark", "whale"] },
  "purple": { "category": "Card Games", "words": ["bridge", "poker", "rummy", "solitaire"] }
}
```

**Important**: Words within each category are sorted lexicographically (ascending, case-insensitive) at creation time. This is critical for the frontend hash-matching logic during gameplay (see Section 7).

### Database initialization

Create a migration file or a seed script that runs the `CREATE TABLE` statement. Vercel Postgres supports running SQL directly from the Vercel dashboard, or use a migration tool like Drizzle ORM or raw SQL via `@vercel/postgres`.

For simplicity, use `@vercel/postgres` directly with raw SQL queries (no ORM needed for a single table). Example:

```typescript
import { sql } from '@vercel/postgres';

// Fetch a game
const { rows } = await sql`SELECT * FROM games WHERE game_id = ${gameId}`;

// Atomic counter increment
await sql`UPDATE games SET access_count = access_count + 1 WHERE game_id = ${gameId}`;
```

---

## 5. API Specification

All API routes live under `app/api/` in the Next.js project.

### 5.1 POST /api/games

**File**: `app/api/games/route.ts`

**Purpose**: Create a new game.

**Request body**:
```json
{
  "yellow": { "category": "Category Name", "words": ["word1", "word2", "word3", "word4"] },
  "green":  { "category": "Category Name", "words": ["word5", "word6", "word7", "word8"] },
  "blue":   { "category": "Category Name", "words": ["word9", "word10", "word11", "word12"] },
  "purple": { "category": "Category Name", "words": ["word13", "word14", "word15", "word16"] }
}
```

**Server-side logic**:
1. Validate: all 16 words present, all non-empty strings, all unique (case-insensitive). All 4 category names present and non-empty.
2. Lowercase and trim all words. Sort words within each category lexicographically (ascending).
3. Generate 8-char nanoid (alphabet: `a-z0-9`).
4. Insert into Postgres. On the astronomically unlikely primary key collision, catch the unique constraint violation, generate a new ID, and retry (max 3 retries).
5. Return the game ID and URL.

**Response** (201):
```json
{
  "gameId": "k7x2m9p3",
  "url": "https://linksy.gg/game/k7x2m9p3"
}
```

**Errors**: 400 for validation failures with descriptive error message.

### 5.2 GET /api/games/[gameId]

**File**: `app/api/games/[gameId]/route.ts`

**Purpose**: Fetch a game's data.

**Server-side logic**:
1. Query Postgres: `SELECT game_data, created_at FROM games WHERE game_id = $1`.
2. If no row found, return 404.
3. Return the game data.
4. Set cache header: `Cache-Control: s-maxage=3600, stale-while-revalidate` so Vercel's edge caches the response. Games are immutable, so caching is safe.

**Response** (200):
```json
{
  "gameId": "k7x2m9p3",
  "gameData": { ... },
  "createdAt": "2026-04-01T12:00:00Z"
}
```

**Errors**: 404 if game not found.

**Note**: The access counter is NOT incremented here. The frontend fires a separate event call after the game renders, keeping this GET fast and cacheable.

### 5.3 POST /api/games/[gameId]/events

**File**: `app/api/games/[gameId]/events/route.ts`

**Purpose**: Record analytics events. Fire-and-forget from the frontend.

**Request body** (one of):
```json
{ "type": "accessed" }
{ "type": "completed" }
{ "type": "rating", "stars": 4 }
```

**Server-side logic**:
- `accessed`: `UPDATE games SET access_count = access_count + 1 WHERE game_id = $1`
- `completed`: `UPDATE games SET completion_count = completion_count + 1 WHERE game_id = $1`
- `rating`: Validate `stars` is integer 1–5. Then: `UPDATE games SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE game_id = $2`

All updates are atomic — Postgres handles concurrent increments correctly.

**Response** (200): `{ "ok": true }`

**Errors**: 400 for invalid event type or invalid stars value.

---

## 6. Frontend Routes

### 6.1 `/` — Game Creation Page

**File**: `app/page.tsx` (with `"use client"` directive)

The landing page where users build a custom Connections game.

### 6.2 `/game/[gameId]` — Game Play Page

**File**: `app/game/[gameId]/page.tsx` (with `"use client"` directive)

The playable game board. When this route loads:
1. Parse `gameId` from the URL params.
2. Call `GET /api/games/${gameId}` from the browser (use `fetch` in a `useEffect`).
3. While loading, show a skeleton placeholder grid.
4. On success, render the game board with the fetched data.
5. Fire `POST /api/games/${gameId}/events` with `{ type: "accessed" }` in the background (fire-and-forget — do not await, do not block rendering).
6. On 404, show a friendly "Game not found" message with a link to create one.

---

## 7. Game Logic (All Client-Side)

All game logic runs in the browser after the game data is fetched. No API calls during gameplay.

### 7.1 Board Initialization

When the game data is fetched:
1. Collect all 16 words from all 4 categories into a flat array.
2. Shuffle the array randomly (Fisher-Yates shuffle).
3. Display as a 4×4 grid of clickable word tiles.

### 7.2 Answer Verification via Sorted Hash

Words in each category are already sorted lexicographically (done at creation time). On the frontend, build a lookup map when the game loads:

```typescript
// Build answer key from sorted category words
const answerKey: Map<string, { color: string; category: string; words: string[] }> = new Map();
for (const [color, data] of Object.entries(gameData)) {
  // Words are already sorted from the backend
  const key = data.words.join("|");  // e.g. "brie|cheddar|gouda|mozzarella"
  answerKey.set(key, { color, category: data.category, words: data.words });
}
```

When the user selects 4 words and hits Submit:
```typescript
const selectedKey = [...selectedWords].sort().join("|");
const match = answerKey.get(selectedKey);
if (match) {
  // Correct! Reveal this category.
} else {
  // Wrong. Decrement mistakes remaining.
}
```

### 7.3 Game State

```typescript
interface GameState {
  board: string[];              // Remaining unsolved words (starts at 16, shrinks by 4 per solve)
  solvedCategories: Array<{     // Categories solved so far, in order solved
    color: string;              // "yellow" | "green" | "blue" | "purple"
    category: string;           // Category display name
    words: string[];            // The 4 words in this category
  }>;
  selectedWords: Set<string>;   // Currently selected words (0–4)
  mistakesRemaining: number;    // Starts at 4, decrements on wrong guess
  gameOver: boolean;            // True when all 4 categories solved OR mistakes = 0
  gameWon: boolean;             // True only if all 4 categories are solved
}
```

Use `useReducer` to manage this state with actions like `SELECT_WORD`, `DESELECT_WORD`, `SUBMIT_CORRECT`, `SUBMIT_INCORRECT`, `SHUFFLE`, `DESELECT_ALL`, `REVEAL_REMAINING`.

### 7.4 Interactions

- **Tap a word tile**: Toggle selection on/off. If already 4 selected and tapping an unselected tile, do nothing (block further selection at 4). If tapping an already-selected tile, deselect it.
- **Shuffle button**: Fisher-Yates shuffle of the remaining unsolved words. Enabled any time there are unsolved words.
- **Deselect All button**: Clears all currently selected words. Enabled when at least 1 word is selected.
- **Submit button**: Only enabled when exactly 4 words are selected.
  - If correct: animate the 4 tiles collapsing/flying upward into a colored category banner at the top of the board. Remove those 4 words from the board. If all 4 categories now solved, trigger win state.
  - If incorrect: shake animation on the selected tiles. Decrement `mistakesRemaining`. Deselect all words after the shake animation completes. If mistakes = 0, trigger loss state.

### 7.5 Game Completion

**Win**: All 4 categories solved. Show a brief success message or celebration animation.

**Loss**: Mistakes reach 0. Reveal all remaining unsolved categories — animate each one appearing as a colored banner (with a staggered delay so they appear one by one). Show a "Better luck next time" message.

After win or loss:
1. Fire `POST /api/games/${gameId}/events` with `{ type: "completed" }` (fire-and-forget).
2. After a 1.5 second delay, show a **rating dialog** (see Section 8.4 for UI details):
   - "Rate this puzzle" heading with 5 clickable/hoverable stars.
   - Submit button sends `POST /api/games/${gameId}/events` with `{ type: "rating", stars: N }`.
   - Close/dismiss button (X icon). User can skip rating entirely.
   - Once submitted or dismissed, the dialog does not reappear. Controlled by component state — no persistence needed.

---

## 8. UI/UX Specification

### 8.1 Design Direction

Match the NYT Connections aesthetic: **clean, editorial, confident typography, warm and inviting.** Think newspaper game section — warm backgrounds, tight grid, bold category colors, no visual clutter.

CRITICAL design rules (from the frontend-design skill):
- **DO NOT** use Inter, Roboto, Arial, or system fonts. These are generic and instantly signal "AI-generated."
- **DO NOT** use purple gradients on white backgrounds, excessive centered layouts, or cookie-cutter component styling.
- **DO** commit to a cohesive, distinctive aesthetic direction.

**Typography**:
- Heading / logo font: Choose ONE distinctive serif or display font from Google Fonts. Good options: `"DM Serif Display"`, `"Playfair Display"`, `"Lora"`, or `"Fraunces"`. Import via Google Fonts.
- Body / word tile font: Choose ONE clean but characterful sans-serif. Good options: `"DM Sans"`, `"Plus Jakarta Sans"`, `"Outfit"`, or `"Satoshi"`. Import via Google Fonts.
- Load fonts via `next/font/google` in `app/layout.tsx`.

**Color palette**:
- Page background: warm off-white — `#EFEBE4` or `#FAF8F5`
- Card / tile background: white `#FFFFFF` with subtle box-shadow
- Category colors (match NYT Connections exactly):
  - Yellow: `#F9DF6D`
  - Green: `#A0C35A`
  - Blue: `#B0C4EF`
  - Purple: `#BA81C5`
- Selected tile: dark inverted — near-black background `#2A2A2A`, white text
- Primary text: `#1A1A1A`
- Secondary text / muted: `#6B6B6B`
- Error / mistake: `#E74C3C`

**Layout**:
- Content centered with `max-w-lg` (roughly 512px) for the game board, `max-w-2xl` for the creation form
- Generous vertical padding (`py-8` or more)
- The 4×4 word grid should have small consistent gaps (`gap-2` or `gap-3`)
- Word tiles should be rounded rectangles with consistent sizing, minimum height ~56px

**Animations**:
- Tile selection: background color + subtle scale transition (`transition-all duration-150 ease-out`)
- Correct guess: tiles animate upward / collapse into the category banner (use CSS keyframes, `300ms ease-out`)
- Incorrect guess: horizontal shake on selected tiles (CSS keyframe, `400ms`)
- Solved category banner: slides down + fades in from top
- Use CSS transitions and keyframes primarily. If framer-motion is desired, install it (`npm install framer-motion`), but CSS-only animations are preferred for simplicity.

### 8.2 shadcn/ui Components to Use

Install these via `npx shadcn@latest add <component>`:

- `button` — Shuffle, Deselect All, Submit, Create Game
- `card` — Game board container, creation form wrapper
- `input` — Word entry fields, category name fields
- `label` — Form labels
- `dialog` — Post-game rating popup
- `sonner` — Toast notifications (e.g., "Game created! Link copied to clipboard.")
- `separator` — Visual dividers between category sections in the creation form
- `skeleton` — Loading placeholder for the game grid while fetching data

### 8.3 Creation Page (`/`)

**Layout, top to bottom**:

1. **Header area**:
   - "Linksy" as a styled wordmark (display/serif font, large size)
   - Tagline underneath: "Create your own Connections puzzle" (muted text)

2. **Creation form** (inside a Card component):
   - 4 sections, one per color. Each section contains:
     - A colored indicator on the left (small circle or vertical bar in the category color)
     - A text input for the category name (placeholder: "Category name")
     - 4 text inputs in a row for the words (placeholders: "Word 1", "Word 2", "Word 3", "Word 4")
   - The 4 sections are visually separated (use Separator or spacing)
   - Section order top to bottom: Yellow, Green, Blue, Purple

3. **Create Game button**:
   - Full-width or prominent centered button below the form
   - On click, run client-side validation:
     - All 16 word fields are non-empty (after trimming whitespace)
     - All 16 words are unique (case-insensitive comparison — lowercase both sides)
     - All 4 category names are non-empty
     - Each word is ≤ 20 characters
     - Each category name is ≤ 40 characters
   - If validation fails: show inline error message(s) below the offending fields (red text) AND/OR a toast notification summarizing the issue
   - If validation passes: `POST /api/games` with the form data → on success, show a success state:
     - Display the generated URL prominently
     - "Copy Link" button (uses `navigator.clipboard.writeText()`, shows toast on copy)
     - "Play" button that navigates to `/game/:gameId`

### 8.4 Game Page (`/game/[gameId]`)

**Layout, top to bottom**:

1. **Header**:
   - "Linksy" wordmark (smaller than landing page)
   - "Create your own" link back to `/` (subtle, top-right or below logo)

2. **Solved categories area** (above the grid):
   - Empty at game start
   - As categories are solved, colored banners appear here stacking top-down
   - Each banner: full width of the grid, category color background, bold white text with the category name, smaller text listing the 4 words
   - Banner height ~56px to match tile height

3. **Word tile grid**:
   - 4 columns, number of rows decreases as categories are solved (4 rows → 3 → 2 → 1 → 0)
   - Each tile: rounded rectangle, white background, centered word text, clickable/tappable
   - Selected tile: inverted colors (dark background, white text), slight scale-up
   - Tile text should be uppercase (matching NYT style)
   - All tiles should be the same size regardless of word length

4. **Mistakes indicator** (between grid and buttons):
   - Display as a row of 4 small circles or dots
   - Filled/dark = remaining mistakes, empty/faded = used mistakes
   - Label: "Mistakes remaining:" or just show the dots

5. **Action buttons row** (below mistakes indicator):
   - Three buttons in a horizontal row, evenly spaced:
     - **Shuffle** — secondary/outline style. Always enabled while game is active.
     - **Deselect All** — secondary/outline style. Enabled when ≥1 word selected.
     - **Submit** — primary/solid style. Enabled only when exactly 4 words selected. Visually distinct (darker, bolder).
   - Buttons should be disabled (grayed out, no pointer) when not applicable.
   - All three buttons are hidden/disabled once the game is over.

6. **Game over state**:
   - Win: all 4 banners visible, a "Congratulations!" or similar brief message
   - Loss: all 4 banners visible (remaining ones revealed), "Better luck next time" message
   - Buttons row disappears or is replaced by a "Create your own" CTA

7. **Rating dialog** (appears 1.5s after game completion):
   - shadcn Dialog component, centered modal overlay
   - Heading: "Rate this puzzle"
   - 5 stars in a row, clickable. Hovering highlights stars up to the hovered one. Clicking selects the rating.
   - "Submit Rating" button (enabled only when a star count is selected)
   - X / close button in the corner to dismiss without rating
   - On submit: fire `POST /api/games/${gameId}/events` with `{ type: "rating", stars: N }`, show a thank-you toast, close the dialog
   - On dismiss: close the dialog, no API call
   - Dialog never reappears once closed (state managed by `useState`)

### 8.5 Loading & Error States

- **Game loading** (`/game/:gameId` while fetching): Show a skeleton grid — 16 gray pulsing rounded rectangles in a 4×4 layout. Use shadcn Skeleton component.
- **Game not found** (404 from API): Friendly centered message — "This puzzle doesn't exist." with a Button linking to `/` ("Create your own").
- **API error on game creation**: Toast notification with the error message.
- **Network error on event calls**: Silently swallow — these are fire-and-forget analytics. Do not show errors to the user.

---

## 9. Project Structure

```
linksy/
├── app/
│   ├── layout.tsx               # Root layout: fonts, global styles, Toaster provider
│   ├── page.tsx                 # "/" — Game creation page ("use client")
│   ├── game/
│   │   └── [gameId]/
│   │       └── page.tsx         # "/game/:gameId" — Game play page ("use client")
│   └── api/
│       └── games/
│           ├── route.ts         # POST /api/games (create game)
│           └── [gameId]/
│               ├── route.ts     # GET /api/games/:gameId (fetch game)
│               └── events/
│                   └── route.ts # POST /api/games/:gameId/events (analytics)
│
├── components/
│   ├── ui/                      # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   ├── Header.tsx               # Shared header with Linksy wordmark
│   ├── CreateGameForm.tsx       # The 4-category creation form with validation
│   ├── GameBoard.tsx            # Main game play orchestrator component
│   ├── WordTile.tsx             # Individual clickable word tile
│   ├── CategoryBanner.tsx       # Solved category colored banner
│   ├── MistakesIndicator.tsx    # Remaining mistakes dots
│   ├── ActionButtons.tsx        # Shuffle / Deselect All / Submit row
│   ├── RatingDialog.tsx         # Post-game star rating modal
│   └── GameNotFound.tsx         # 404 state for invalid game IDs
│
├── lib/
│   ├── api.ts                   # Client-side API functions: createGame(), getGame(), sendEvent()
│   ├── gameLogic.ts             # Fisher-Yates shuffle, answer key builder, hash checking
│   ├── gameReducer.ts           # useReducer logic for game state + actions
│   ├── validation.ts            # Client-side form validation functions
│   ├── db.ts                    # Server-side: Postgres query helpers (used by API routes only)
│   └── id.ts                    # nanoid configuration (custom alphabet, length 8)
│
├── public/                      # Static assets (favicon, OG image, etc.)
│
├── components.json              # shadcn/ui config
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── package.json
├── vercel.json                  # Optional: custom headers, redirects, rewrites
└── README.md
```

---

## 10. Environment Variables

Set these in the Vercel dashboard under Project Settings → Environment Variables:

| Variable            | Source                        | Description                      |
|---------------------|-------------------------------|----------------------------------|
| `POSTGRES_URL`      | Auto-set by Vercel Postgres   | Connection string for the DB     |
| `POSTGRES_PRISMA_URL` | Auto-set by Vercel Postgres | Prisma-compatible URL (unused but auto-provided) |
| `NEXT_PUBLIC_BASE_URL` | Manual                     | `https://linksy.gg` (used to construct shareable game URLs) |

For local development, create a `.env.local` file:
```
POSTGRES_URL=postgres://...  (from Vercel CLI: `vercel env pull`)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 11. Local Development

```bash
# 1. Clone the repo
git clone <repo-url> && cd linksy

# 2. Install dependencies
npm install

# 3. Link to Vercel project and pull env vars
npx vercel link
npx vercel env pull .env.local

# 4. Run database migration (create the games table)
# Option A: Run the CREATE TABLE SQL in the Vercel Postgres dashboard
# Option B: Create a script (e.g., scripts/migrate.ts) that runs the SQL via @vercel/postgres

# 5. Start dev server
npm run dev
# App runs on http://localhost:3000
```

---

## 12. Implementation Order

Build in this sequence. Each step should produce a working (if incomplete) app.

### Step 1: Scaffold the project
```bash
npx create-next-app@latest linksy --typescript --tailwind --eslint --app --src=no --import-alias "@/*"
cd linksy
npx shadcn@latest init
npx shadcn@latest add button card input label dialog separator skeleton
npm install nanoid
npm install sonner
```
Set up Google Fonts in `app/layout.tsx` using `next/font/google`. Set up the warm off-white background and CSS color variables in `globals.css`. Add the `<Toaster />` (sonner) provider in the root layout.

### Step 2: Build the Game Board UI with hardcoded data
Create `GameBoard.tsx`, `WordTile.tsx`, `CategoryBanner.tsx`, `MistakesIndicator.tsx`, `ActionButtons.tsx`, and `gameReducer.ts` using hardcoded test game data. Get the full gameplay loop working: tile selection, submit, shuffle, deselect all, correct/incorrect animations, win/loss states. This is the core visual piece — invest time here to make it polished and match the NYT Connections feel.

### Step 3: Build the Creation Form
Create `CreateGameForm.tsx` with the 4-category input form and client-side validation. Wire it up to `app/page.tsx`. For now, on successful validation, just log the output to console.

### Step 4: Build the API routes and database
Set up Vercel Postgres. Create the `games` table. Implement the 3 API route handlers in `app/api/`. Create `lib/db.ts` for query helpers and `lib/id.ts` for nanoid config. Test all endpoints manually (curl or browser).

### Step 5: Wire frontend to backend
Create `lib/api.ts` with `createGame()`, `getGame()`, and `sendEvent()` functions. Connect the creation form to `POST /api/games`. Connect the game page to `GET /api/games/:gameId`. Add the fire-and-forget `accessed` and `completed` event calls.

### Step 6: Add the Rating Dialog
Create `RatingDialog.tsx`. Wire it to appear on game completion. Connect to `POST /api/games/:gameId/events`.

### Step 7: Polish
Add loading skeletons, error states, 404 page, meta tags, favicon. Test the full flow end to end. Review animations and transitions. Ensure mobile responsiveness (the game should work well on phone screens).

### Step 8: Deploy
Push to GitHub. Connect repo to Vercel. Verify the deployment works. Optionally configure a custom domain (`linksy.gg` or similar) in Vercel's domain settings.

---

## 13. Edge Cases & Validation Rules

- **Word uniqueness**: All 16 words must be unique. Comparison is case-insensitive. Words are stored and displayed in lowercase.
- **Word format**: Trimmed, non-empty after trim. Max length: 20 characters. Allow letters, numbers, spaces, and hyphens.
- **Category names**: Trimmed, non-empty. Max length: 40 characters.
- **Game ID collision on insert**: Catch Postgres unique constraint violation, generate a new nanoid, retry. Max 3 retries before returning a 500 (effectively impossible to hit).
- **Game not found**: API returns 404. Frontend shows friendly message with link to create a game.
- **Event spam**: No user accounts means someone could spam the rating endpoint. Acceptable for v1. The rating is directional (average over many submissions), not precise. Can add IP-based deduplication later.
- **Empty board state**: When all 4 categories are solved, the grid is empty and all 4 colored banners are visible. Show win message.
- **Loss state**: When mistakes reach 0, reveal all remaining unsolved categories with staggered animation, then show loss message.
- **Mobile responsiveness**: The 4×4 grid must work on phone screens. Word tiles should wrap text or truncate if necessary. Buttons should be tap-friendly (min 44px touch target).
- **Concurrent counter updates**: Postgres `SET x = x + 1` is atomic and handles concurrent writes correctly. No race conditions.

---

## 14. Caching Strategy

- **Static assets** (JS, CSS, fonts): Cached automatically by Vercel's Edge Network. Immutable content hashes in filenames.
- **Page shells** (`/`, `/game/[gameId]`): Cached at edge. These are the same HTML for every request since they're client-rendered.
- **`GET /api/games/:gameId`**: Set response header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`. This means Vercel's edge serves cached game data for up to 1 hour, and serves stale data for up to 24 hours while revalidating in the background. Games are immutable, so this is safe.
- **`POST` endpoints**: Never cached (POST requests are not cached by default).

---

## 15. Future Considerations (P2, Not in This Spec)

- Game difficulty ranking (derived from `completion_count / access_count` ratio + average rating)
- Daily featured games on the landing page
- User accounts + game history ("My Puzzles" dashboard)
- "One away" hint (tell the user they had 3 of 4 correct — NYT does this)
- Share results as emoji grid (like Wordle: yellow/green/blue/purple squares showing guess order)
- Game expiration TTL (Postgres scheduled job to delete old games)
- IP-based deduplication on ratings to prevent spam
- Social meta tags / OG images for link previews when sharing game URLs
