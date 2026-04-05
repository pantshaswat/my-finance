# my-finance

A personal finance tracker that reads bank notification emails from Gmail, parses them with Gemini, and turns them into categorized transactions with analytics.

Built for Nepali banks out of the box (Nabil, NIC Asia, Global IME, eSewa, Khalti), but any bank can be added via a custom prompt.

## Features

- **Email-driven bookkeeping** — connect Gmail, pick your banks, and let the sync job turn notification emails into structured transactions.
- **Multi-bank support** — configure multiple banks with per-bank prompts and independent sync cursors.
- **Gemini-powered parsing** — uses `gemini-2.5-flash` with a response schema, so extraction is validated server-side (amount, date/time, merchant, reference, currency, balance).
- **Atomic, resumable sync** — each email is claimed exactly once via a unique `(userId, emailId)` index. Stale claims auto-reclaim after 5 minutes, so an interrupted sync (closed tab, crashed process) picks up cleanly.
- **Background jobs** — sync runs server-side; the client just polls a status endpoint. Closing the tab does not abort the job.
- **Manual transactions & categories** — add, edit, delete entries directly; AI-parsed and manual entries live side by side.
- **Analytics** — daily income/expense time-series, category donuts, top merchants, largest transactions, and MoM deltas across 7d / 30d / 90d / 12m windows.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **MongoDB** via Mongoose
- **NextAuth** with Google OAuth (Gmail read-only scope)
- **Google Generative AI SDK** (Gemini)
- **Tailwind CSS 4** with CSS custom properties for theming

## Getting started

### 1. Prerequisites

- Node.js 20+
- A MongoDB database (Atlas or local)
- A Google Cloud project with the Gmail API enabled and OAuth 2.0 credentials
- A Gemini API key

### 2. Install

```bash
npm install
```

### 3. Configure environment

Create `.env.local` in the project root:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>

# Google OAuth (with Gmail read scope)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# NextAuth
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Gemini
GEMINI_API_KEY=...
```

In Google Cloud Console, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI and enable the Gmail API. The app requests the `gmail.readonly` scope.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, then:

1. **Settings** — add one or more banks. Pick a preset (Nabil, NIC Asia, etc.) or write a custom prompt. Set the sender email address the bank uses.
2. **Categories** — create income/expense categories (the AI will map transactions to these).
3. **Overview** — click **Sync emails** to kick off a background job. Watch the banner for live progress.

## How email sync works

1. `POST /api/sync-emails` creates a `SyncJob`, returns `jobId` immediately, and fires the runner in the background.
2. `syncRunner` iterates each configured bank:
   - Queries Gmail for messages from the bank's sender address since `bankPrompt.lastSyncedAt`.
   - For each email, atomically claims a `ProcessedEmail` row (unique on `userId + emailId`). If the row already exists and isn't stale, it's skipped.
   - Sends the email to Gemini with the bank's prompt + the user's category list.
   - Saves the parsed result as a `Transaction` and marks the `ProcessedEmail` as `parsed` / `ignored` / `failed`.
3. The client polls `GET /api/sync-emails/status` for counts and status until `completed` or `failed`.

## Project layout

```
src/
├── app/
│   ├── api/                   # route handlers (transactions, analytics, sync, etc.)
│   ├── auth/signin/           # sign-in page
│   ├── dashboard/             # overview, transactions, analytics, categories, settings
│   └── globals.css            # design tokens + utility classes
├── components/
│   ├── ui.tsx                 # Card, Modal, StatCard, EmptyState, formatters
│   └── charts.tsx             # hand-rolled SVG LineChart + Donut
├── lib/
│   ├── auth.ts                # NextAuth config
│   ├── gemini.ts              # Gemini prompt + schema + parser
│   ├── gmail.ts               # Gmail API client
│   ├── mongodb.ts             # mongoose connection cache
│   ├── bankPresets.ts         # built-in bank configurations
│   └── syncRunner.ts          # background sync orchestrator
└── models/                    # User, Category, Transaction, BankPrompt, ProcessedEmail, SyncJob
```

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # start production server
npm run lint     # eslint
```
