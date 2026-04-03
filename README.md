# Linksy

Linksy is a custom Connections-style puzzle platform. You can create a game with 4 categories of 4 words, share a link, and let anyone play in the browser.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** React 19, Tailwind CSS v4, and `shadcn/ui` components
- **Data layer:** PostgreSQL via `pg` (works with Supabase Postgres or your own Postgres instance)
- **IDs:** `nanoid` for short shareable game IDs
- **Testing:** Playwright end-to-end tests
- **CI:** GitHub Actions workflow for PR validation

## Run Your Own Local Version

### Prerequisites

- Node.js 20+ recommended
- npm
- One database option:
  - Supabase Postgres project, or
  - Local/self-hosted Postgres

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.local.example .env.local
```

Update `.env.local`:

```env
POSTGRES_URL=postgresql://...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Use one of these DB approaches:

- **Supabase Postgres:** Use your project connection string from Supabase dashboard.
- **Own Postgres instance:** Point `POSTGRES_URL` at your DB.

### 3) Create the `games` table

Run the migration script:

```bash
npm run db:migrate
```

### 4) Start the app on localhost

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test Locally (localhost)

### Manual smoke test

1. Create a puzzle on `/`
2. Click **Create Game**
3. Open the generated `/game/:gameId` link
4. Submit guesses and verify game state updates
5. Finish a game and submit a rating

### Playwright E2E

Install browser binaries once:

```bash
npx playwright install chromium
```

Run tests:

```bash
npm run test:e2e
```

Playwright uses `http://localhost:3000` and starts the app using a production build (`npm run build && npm start`) during the test run.

## Playwright + CI Workflows

This repo includes `.github/workflows/ci.yml`:

- Triggers on pull requests to `main`
- Runs on `ubuntu-latest` with Node 20
- Installs dependencies with `npm ci`
- Installs Chromium for Playwright
- Runs `npx playwright test`
- Uploads the Playwright HTML report artifact

Required CI environment values:

- `POSTGRES_URL` as a GitHub Actions secret
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

## shadcn/ui and Webdev Workflow

- UI primitives and components live under `components/ui` and follow `shadcn/ui` patterns.
- Project tooling allows `npx shadcn` and standard npm commands, enabling fast UI iteration.
- The workflow is optimized for practical webdev loops: build UI quickly, validate with Playwright, and enforce quality in CI.

## API Endpoints

| Method | Path                        | Description              |
| ------ | --------------------------- | ------------------------ |
| POST   | `/api/games`                | Create a new game        |
| GET    | `/api/games/:gameId`        | Fetch a game             |
| POST   | `/api/games/:gameId/events` | Record analytics events  |

## License

MIT
