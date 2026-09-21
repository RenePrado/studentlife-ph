# StudentLife PH

AI-powered student productivity platform built for Filipino college students. Plan your semester, track tasks and attendance, manage your budget, generate AI study plans and quizzes, and track internship applications — all in one place.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (base-nova), Zustand, Framer Motion
- **Backend:** Express 4, PostgreSQL (`pg`), Passport.js (Google OAuth), JWT auth, bcryptjs, Multer (avatar uploads)
- **AI:** Google Gemini via `@google/genai` (study planner, document analyzer, quiz generator, budget advisor, dashboard nudge, career chat)

## Features

| Area | Pages |
|------|-------|
| Overview | Dashboard, Calendar |
| Academics | Academic Planner, Tasks, Attendance |
| AI Tools | AI Study Planner, AI Document Analyzer, AI Quiz Generator |
| Productivity | Flashcards, Pomodoro Timer, Notes |
| Finance | Budget Tracker (with AI advice) |
| Career | Resume Builder, Internship Tracker |
| Account | Profile (with avatar upload, password change, theme settings) |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Database

Create a PostgreSQL database and load the schema:

```bash
psql -U your_user -d your_database -f backend/src/config/schema.sql
```

### 2. Google OAuth (optional but recommended)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:4000/auth/google/callback`

### 3. Environment variables

**Backend** (`backend/.env`) — see `backend/env.example`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/studentlife_ph
SESSION_SECRET=<generate a long random string>
JWT_SECRET=<generate a different long random string>
GOOGLE_CLIENT_ID=<your google client id>
GOOGLE_CLIENT_SECRET=<your google client secret>
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
FRONTEND_URL=http://localhost:3000
PORT=4000
```

> **Required:** `JWT_SECRET` and `SESSION_SECRET` must be set — the backend will refuse to start without them.

**Frontend** (`.env.local`) — see `env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
GEMINI_API_KEY=<your gemini api key>
```

### 4. Install dependencies

```bash
npm install        # frontend
cd backend && npm install && cd ..   # backend
```

### 5. Run

```bash
npm run dev
```

This starts both servers via `concurrently`:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## Project structure

```
studentlife-ph/
├── src/                      # Next.js frontend
│   ├── app/                  # App Router (route groups: (auth), (dashboard))
│   ├── components/           # UI + shared + layout components
│   ├── lib/                  # api-client, nav-config, utils, status-colors
│   ├── store/                # Zustand stores (auth, ui)
│   ├── types/                # Domain types mirroring backend API shapes
│   └── proxy.ts              # Next.js 16 proxy (edge auth guard)
├── backend/                  # Express + PostgreSQL API
│   └── src/
│       ├── config/           # database, passport, env, schema.sql
│       ├── middleware/       # JWT auth
│       └── routes/           # 15 route modules
└── package.json              # concurrently runs both servers
```

## Auth flow

- Email/password: register or login → access token (15 min) + refresh token (30 d) issued → stored in localStorage + `accessToken` cookie
- Google OAuth: redirect to backend `/auth/google` → callback to `/google-callback?accessToken=...&refreshToken=...` → frontend captures tokens and hydrates user
- Edge guard: `src/proxy.ts` checks `accessToken` cookie presence for protected routes (no backend round-trip)
- Client hydration: `AuthListener` calls `/auth/me` on mount to populate the auth store
- Token refresh: on a 401, the API client calls `/auth/refresh` (rotates the refresh token, issues a new pair) and retries the original request once; concurrent 401s share a single in-flight refresh
- Rate limiting: `express-rate-limit` caps auth-sensitive endpoints at 5 req / 15 min / IP and the API globally at 100 req / 15 min / IP (in-memory store)

## Notes

- See `MIGRATION_STATUS.md` for the history of the Supabase → PostgreSQL migration and post-migration fixes.
- Password reset in development returns a reset URL in the API response (no email server wired up). In production, wire up email delivery.
