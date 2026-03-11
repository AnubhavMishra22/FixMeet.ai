# FixMeet.app - Architecture Reference

## Overview
FixMeet.app is a Calendly competitor — a scheduling/booking platform where users create event types, share public booking pages, and manage appointments. Includes Google Calendar integration, email notifications, and an AI copilot for natural-language scheduling.

---

## Tech Stack

### Backend (Node.js + Express + TypeScript)
- **Runtime**: Node.js 20+ with TypeScript (strict mode, ES modules)
- **Framework**: Express.js 4.18+ with express-async-errors
- **Database**: PostgreSQL 15+ with `postgres.js` (raw SQL, NOT Prisma/ORM)
- **Validation**: Zod for all input validation
- **Auth**: Custom JWT (15min access token + 7day refresh token with rotation)
- **Password**: bcryptjs
- **Email**: Resend (graceful fallback to console.log in dev)
- **Calendar**: Google Calendar API via `googleapis`
- **AI**: LangChain + Google Gemini (gemini-2.5-flash-lite) with DynamicStructuredTool
- **Dates/Timezone**: date-fns + date-fns-tz (all stored UTC)
- **Security**: Helmet, CORS, httpOnly cookies, cancel tokens

### Frontend (React + Vite + TypeScript)
- **Framework**: React 19 + Vite 7 (SPA, NOT Next.js)
- **Styling**: Tailwind CSS 4 + Radix UI primitives (shadcn-style)
- **State**: Zustand 5
- **Forms**: React Hook Form + Zod
- **Routing**: React Router DOM 7
- **HTTP**: Axios with auth interceptor (access token in memory)
- **Icons**: Lucide React

### Infrastructure
- **Email**: Resend (falls back to console.log without API key)
- **Background Jobs**: Simple setInterval (no Redis/BullMQ)
- **Hosting**: Railway (backend), Vercel (frontend)

---

## Project Structure

```
FixMeet.app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # PostgreSQL connection (postgres.js)
│   │   │   ├── env.ts               # Zod-validated environment variables
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    # JWT authentication
│   │   │   ├── error.middleware.ts   # Global error handler
│   │   │   └── validate.middleware.ts
│   │   ├── modules/
│   │   │   ├── auth/                # register, login, refresh, logout, me
│   │   │   ├── event-types/         # CRUD + availability calculation
│   │   │   ├── bookings/            # create, cancel, reschedule
│   │   │   ├── public/              # public booking pages (no auth)
│   │   │   ├── calendars/           # Google Calendar OAuth + sync
│   │   │   │   └── google/          # google-auth.service + google-calendar.service
│   │   │   ├── email/               # Resend integration + templates
│   │   │   └── ai/                  # AI Copilot
│   │   │       ├── ai.routes.ts
│   │   │       ├── ai.controller.ts
│   │   │       ├── ai.service.ts    # LangChain agent loop, rate limiter
│   │   │       ├── ai.schema.ts
│   │   │       ├── prompts/
│   │   │       │   └── system-prompt.ts
│   │   │       └── tools/
│   │   │           ├── index.ts
│   │   │           ├── check-availability.tool.ts
│   │   │           ├── create-booking.tool.ts
│   │   │           ├── list-meetings.tool.ts
│   │   │           └── cancel-meeting.tool.ts
│   │   ├── db/
│   │   │   ├── migrate.ts
│   │   │   └── migrations/          # 5 migration files (001-005)
│   │   ├── jobs/
│   │   │   └── reminder.job.ts      # setInterval every 15 min
│   │   ├── utils/
│   │   │   ├── errors.ts            # AppError, RateLimitError, etc.
│   │   │   ├── jwt.ts
│   │   │   └── password.ts
│   │   ├── app.ts                   # Express app + route mounting
│   │   └── server.ts               # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Input, Card, Label, etc.
│   │   │   ├── layout/             # dashboard-layout.tsx (sidebar + nav)
│   │   │   ├── ai/                 # chat-message.tsx, chat-input.tsx
│   │   │   └── auth/               # protected-route.tsx
│   │   ├── pages/
│   │   │   ├── auth/               # login, register
│   │   │   ├── dashboard/          # home, event-types, bookings, ai, settings
│   │   │   └── booking/            # public-booking.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios + token refresh interceptor
│   │   │   ├── constants.ts
│   │   │   ├── utils.ts            # cn() helper
│   │   │   └── markdown.tsx        # Markdown formatting for AI chat
│   │   ├── stores/
│   │   │   ├── auth-store.ts       # Zustand: auth state
│   │   │   └── toast-store.ts      # Zustand: toast notifications
│   │   ├── types/index.ts
│   │   ├── App.tsx                 # Route definitions
│   │   ├── main.tsx
│   │   └── index.css               # Tailwind + CSS variables
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── ARCHITECTURE.md                  # This file
└── docker-compose.yml
```

---

## Database Schema (7 tables, 5 migrations)

### Migration 001: users + refresh_tokens
- `users` — id (UUID), email, password_hash, name, username, timezone, created_at, updated_at
- `refresh_tokens` — id, user_id (FK), token_hash, expires_at

### Migration 002: event_types + availability_overrides
- `event_types` — id, user_id, slug, title, description, duration_minutes, location_type/value, color, schedule (JSONB), buffer_before/after, min_notice_minutes, slot_interval, max_bookings_per_day, range_type/days/start/end, questions (JSONB), is_active. UNIQUE(user_id, slug)
- `availability_overrides` — id, user_id, event_type_id (nullable), date, is_available, time_ranges (JSONB)

### Migration 003: bookings
- `bookings` — id, event_type_id, host_id, invitee_name/email/timezone/notes, start_time/end_time (UTC), location_type/value, meeting_url, status, cancellation_reason, cancelled_by, responses (JSONB), cancel_token, host_calendar_event_id, source

### Migration 004: sent_reminders
- `sent_reminders` — id, booking_id (FK), reminder_type (24h/1h), sent_at. UNIQUE(booking_id, reminder_type)

### Migration 005: calendar_connections
- `calendar_connections` — id, user_id, provider, provider_account_id, access_token, refresh_token, token_expires_at, calendar_id, calendar_name, is_primary, is_active. UNIQUE(user_id, provider)

---

## API Routes

### Auth (`/api/auth`)
```
POST   /register     # Create account (auto-generates username)
POST   /login        # Get tokens + set refresh cookie
POST   /refresh      # Refresh access token (rotates refresh token)
POST   /logout       # Clear refresh token
GET    /me           # Current user (auth required)
PATCH  /me           # Update profile (auth required)
```

### Event Types (`/api/event-types` — auth required)
```
GET    /             # List user's event types
POST   /             # Create event type
GET    /:id          # Get single
PATCH  /:id          # Update
DELETE /:id          # Delete
```

### Bookings (`/api/bookings` — auth required)
```
GET    /             # List bookings (?upcoming=true supported)
GET    /:id          # Details
PATCH  /:id          # Update
POST   /:id/cancel   # Cancel (host)
POST   /:id/reschedule  # Reschedule
```

### Calendar (`/api/calendars`)
```
GET    /                  # List connections (auth required)
GET    /google/connect    # OAuth URL (auth required)
GET    /google/callback   # OAuth callback (public)
DELETE /:id               # Disconnect (auth required)
```

### AI Copilot (`/api/ai` — auth required, conditionally mounted)
```
POST   /chat         # Send message to AI copilot
```
- Only mounted if `GOOGLE_AI_API_KEY` env var is set
- Body: `{ message: string, conversationHistory: [{role, content}] }`
- Returns: `{ response: string }`
- Rate limited: token bucket (10 RPM), returns 429
- Timeout: 60 seconds, returns 504

### Public (`/api/public` — no auth)
```
GET    /:username/:slug          # Event type info
GET    /:username/:slug/slots    # Available slots (?date=YYYY-MM-DD&timezone=...)
POST   /:username/:slug/book     # Create booking
GET    /bookings/:id             # Booking (with cancel token)
POST   /bookings/:id/cancel      # Cancel (with cancel token)
```

---

## AI Copilot Architecture

The AI copilot uses **LangChain + Google Gemini** with an agent loop pattern.

### Agent Loop
```
User message → Model (with tools) → Tool calls? → Execute tools → ToolMessage → Model formulates response
                                                                    ↑ (max 3 rounds)
```

### 4 AI Tools (DynamicStructuredTool)
| Tool | Description |
|------|-------------|
| `check_availability` | Query active event types + availability service for free slots |
| `create_booking` | Create real bookings with 2-step confirmation flow |
| `list_meetings` | Query bookings by timeframe (today/tomorrow/this_week/next_week) |
| `cancel_meeting` | Find meetings by name/date/ID, cancel with confirmation |

### Key Features
- Dynamic system prompt with user context (name, timezone, current datetime)
- Token bucket rate limiter (10 tokens, 60s refill)
- 60s timeout wrapper with 504 response
- Tool execution errors caught and fed back to AI for user-friendly explanation
- Conditionally mounted: routes only load if `GOOGLE_AI_API_KEY` is set

### Frontend Chat UI
- Message bubbles (user/AI/error), typing indicator, markdown formatting
- Error messages with Retry button
- Conversation persisted in sessionStorage
- Clear chat button, send debounce (500ms)

---

## Key Design Decisions

### 1. Raw SQL over ORM
`postgres.js` for full query control, no Prisma.

### 2. Authentication
- Access token (JWT, 15min) stored in memory (NOT localStorage)
- Refresh token (7 days) in httpOnly cookie, rotated on each use

### 3. Timezone Handling
- Store ALL times in UTC in database
- Convert to user's timezone only at API boundary
- Use `date-fns-tz` (`fromZonedTime` / `toZonedTime`) for conversions

### 4. Availability Formula
```
Available slots = (Weekly schedule + Overrides) - Bookings - Buffers - Calendar events
```

### 5. Frontend: Vite+React SPA
Simple SPA approach instead of Next.js. No SSR needed for a dashboard app.

### 6. Background Jobs
Simple `setInterval` for reminder jobs (every 15 min). No Redis/BullMQ.

### 7. Module Pattern
Each backend feature: `routes.ts → controller.ts → service.ts → schema.ts → types.ts`

### 8. AI Routes Conditionally Mounted
AI module only loads if `GOOGLE_AI_API_KEY` environment variable is set. Without it, the app runs normally without AI features.

---

## Frontend Routes

| Route | Component | Auth |
|-------|-----------|------|
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/dashboard/event-types` | EventTypesPage | Yes |
| `/dashboard/event-types/new` | NewEventTypePage | Yes |
| `/dashboard/event-types/:id` | EditEventTypePage | Yes |
| `/dashboard/bookings` | BookingsPage | Yes |
| `/dashboard/bookings/:id` | BookingDetailsPage | Yes |
| `/dashboard/ai` | AIChatPage | Yes |
| `/dashboard/settings` | SettingsPage | Yes |
| `/:username/:slug` | PublicBookingPage | No |

---

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgres://fixmeet:fixmeet@localhost:5432/fixmeet
JWT_SECRET=<min 32 chars>

# Optional — falls back to console.log
RESEND_API_KEY=re_xxxx
EMAIL_FROM=FixMeet <notifications@fixmeet.app>

# Optional — for Google Calendar integration
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendars/google/callback

# Optional — enables AI copilot
GOOGLE_AI_API_KEY=AIza...
GOOGLE_AI_MODEL_NAME=gemini-2.5-flash-lite   # default
GOOGLE_AI_MAX_TOKENS=1024               # default
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

---

## Development

```bash
# Start PostgreSQL
docker-compose up -d

# Backend
cd backend && npm install
npm run db:migrate
npm run dev                # port 3001

# Frontend
cd frontend && npm install
npm run dev                # port 5173
```

---

## Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Auth (register, login, JWT, refresh tokens) | Done |
| 2 | Event Types (CRUD, schedule, booking rules) | Done |
| 3 | Bookings (create, cancel, conflict detection) | Done |
| 4 | Email (confirmations, cancellations, reminders) | Done |
| 5 | Google Calendar (OAuth, sync, Meet links) | Done |
| 6 | Frontend Foundation (auth, dashboard, API client) | Done |
| 7 | Feature Pages (event types, bookings, settings, public booking) | Done |
| 11 | AI Copilot (LangChain + Gemini, 4 tools, chat UI) | Done |
