# FixMeet.ai

A modern, open-source scheduling and booking platform — a self-hostable alternative to Calendly. Create event types, share public booking pages, and manage appointments with Google Calendar integration and email notifications.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **Event Types** — Create customizable event types with configurable durations, buffer times, booking rules, colors, and custom questions
- **Public Booking Pages** — Share clean, public URLs (`/username/event-slug`) with a 4-step booking flow: date → time slot → details → confirmation
- **Smart Availability** — Automatic slot calculation: `Weekly Schedule + Overrides - Existing Bookings - Buffer Times - Calendar Events`
- **Google Calendar Integration** — OAuth-based sync that checks busy times for availability and creates calendar events on booking (with Google Meet link generation)
- **Email Notifications** — Booking confirmations, cancellations, and reschedule notifications for both host and invitee (via Resend)
- **Automated Reminders** — Background job sends 24-hour and 1-hour reminders before meetings
- **Self-Service Cancellation** — Invitees can cancel their own bookings via a unique cancel token link
- **Timezone Aware** — All times stored in UTC, converted at boundaries; invitees see slots in their local timezone
- **Secure Auth** — JWT access tokens (in-memory, not localStorage) + httpOnly refresh tokens with rotation

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 20+** | Runtime |
| **Express.js 4.18** | HTTP framework |
| **TypeScript** | Strict mode, ES modules |
| **PostgreSQL 15+** | Database |
| **postgres.js** | SQL driver (raw SQL, no ORM) |
| **Zod** | Input validation |
| **JWT** | Authentication (15min access + 7d refresh) |
| **bcryptjs** | Password hashing |
| **Resend** | Transactional emails |
| **googleapis** | Google Calendar API |
| **date-fns / date-fns-tz** | Date manipulation & timezone handling |
| **Helmet** | Security headers |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **Radix UI** | Accessible UI primitives (shadcn-style) |
| **Zustand 5** | State management |
| **React Hook Form + Zod** | Form handling & validation |
| **React Router DOM 7** | Client-side routing |
| **Axios** | HTTP client with auth interceptor |
| **Lucide React** | Icons |

---

## Project Structure

```
FixMeet.ai/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection, env validation
│   │   ├── middleware/       # Auth, error handling, validation
│   │   ├── modules/
│   │   │   ├── auth/        # Register, login, refresh, logout, profile
│   │   │   ├── event-types/ # CRUD + availability calculation
│   │   │   ├── bookings/    # Create, cancel, reschedule
│   │   │   ├── public/      # Public booking endpoints (no auth)
│   │   │   ├── calendars/   # Google Calendar OAuth & sync
│   │   │   └── email/       # Resend integration + templates
│   │   ├── db/
│   │   │   ├── migrate.ts           # Migration runner
│   │   │   └── migrations/          # 5 SQL migration files
│   │   ├── jobs/            # Background reminder job
│   │   ├── utils/           # JWT, password, error helpers
│   │   ├── app.ts           # Express app setup
│   │   └── server.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Button, Card, Input, Label, etc.
│   │   │   ├── layout/      # Dashboard sidebar & navigation
│   │   │   └── auth/        # Protected route component
│   │   ├── pages/
│   │   │   ├── auth/        # Login, Register
│   │   │   ├── dashboard/   # Home, Event Types, Bookings, Settings
│   │   │   └── booking/     # Public booking widget
│   │   ├── lib/             # API client, constants, utilities
│   │   ├── stores/          # Zustand stores (auth, toast)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Route definitions
│   │   └── main.tsx         # React entry point
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml       # PostgreSQL container
├── ARCHITECTURE.md          # Architectural design document
└── README.md                # This file
```

Each backend module follows the pattern: `routes → controller → service → schema → types`

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 9.x
- **Docker & Docker Compose** (for PostgreSQL) — or a standalone PostgreSQL 15+ instance
- **Git**

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AnubhavMishra22/FixMeet.ai.git
cd FixMeet.ai
```

### 2. Start PostgreSQL

Using Docker (recommended):

```bash
docker-compose up -d
```

This starts PostgreSQL 15 on port `5432` with database `fixmeet`, user `fixmeet`, password `fixmeet`.

<details>
<summary>Using an existing PostgreSQL instance</summary>

Create a database and user manually:

```sql
CREATE DATABASE fixmeet;
CREATE USER fixmeet WITH PASSWORD 'fixmeet';
GRANT ALL PRIVILEGES ON DATABASE fixmeet TO fixmeet;
```

Update the `DATABASE_URL` in your backend `.env` accordingly.

</details>

### 3. Backend Setup

```bash
cd backend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://fixmeet:fixmeet@localhost:5432/fixmeet
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
FRONTEND_URL=http://localhost:5173

# Email (Optional - falls back to console.log in dev)
RESEND_API_KEY=
EMAIL_FROM=FixMeet <notifications@fixmeet.ai>

# Google Calendar (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendars/google/callback
```

Run database migrations:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run dev
```

The backend runs at `http://localhost:3001`.

### 4. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

The defaults should work for local development:

```env
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

Start the dev server:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.

### 5. Verify Everything Works

1. Open `http://localhost:5173/register` and create an account
2. You'll be redirected to the dashboard
3. Create an event type via **Event Types → New**
4. Copy the public booking link and open it in an incognito window
5. Select a date, time slot, fill in details, and book
6. Check the dashboard **Bookings** tab to see the new booking
7. (Optional) Connect Google Calendar in **Settings** to enable calendar sync

---

## Optional Integrations

### Google Calendar

To enable Google Calendar integration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Set authorized redirect URI to: `http://localhost:3001/api/calendars/google/callback`
6. Copy the Client ID and Secret to your backend `.env`

Once configured, users can connect their Google Calendar from the **Settings** page. This enables:
- Busy time checking for accurate availability
- Automatic calendar event creation on booking
- Google Meet link generation

### Email (Resend)

To enable real email delivery:

1. Sign up at [resend.com](https://resend.com) (free tier available)
2. Get your API key
3. Add it to `RESEND_API_KEY` in your backend `.env`
4. (Optional) Verify a custom sending domain

Without an API key, emails are logged to the console in development — useful for testing the booking flow.

---

## Deployment

<!-- TODO: Add deployment instructions for production environments -->

*Deployment guide coming soon. This section will cover production setup, environment configuration, and hosting options.*

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create a new account |
| `POST` | `/api/auth/login` | No | Login & get tokens |
| `POST` | `/api/auth/refresh` | Cookie | Refresh access token |
| `POST` | `/api/auth/logout` | Cookie | Logout & clear tokens |
| `GET` | `/api/auth/me` | Bearer | Get current user |
| `PATCH` | `/api/auth/me` | Bearer | Update profile |

### Event Types

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/event-types` | Bearer | List user's event types |
| `POST` | `/api/event-types` | Bearer | Create event type |
| `GET` | `/api/event-types/:id` | Bearer | Get event type |
| `PATCH` | `/api/event-types/:id` | Bearer | Update event type |
| `DELETE` | `/api/event-types/:id` | Bearer | Delete event type |

### Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings` | Bearer | List bookings (supports `?upcoming=true`) |
| `GET` | `/api/bookings/:id` | Bearer | Get booking details |
| `PATCH` | `/api/bookings/:id` | Bearer | Update booking |
| `POST` | `/api/bookings/:id/cancel` | Bearer | Cancel booking (host) |
| `POST` | `/api/bookings/:id/reschedule` | Bearer | Reschedule booking |

### Calendar

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/calendars` | Bearer | List calendar connections |
| `GET` | `/api/calendars/google/connect` | Bearer | Get Google OAuth URL |
| `GET` | `/api/calendars/google/callback` | No | OAuth callback handler |
| `DELETE` | `/api/calendars/:id` | Bearer | Disconnect calendar |

### Public (No Auth)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/:username/:slug` | Get event type info |
| `GET` | `/api/public/:username/:slug/slots` | Get available time slots |
| `POST` | `/api/public/:username/:slug/book` | Create a booking |
| `GET` | `/api/public/bookings/:id` | View booking (with cancel token) |
| `POST` | `/api/public/bookings/:id/cancel` | Cancel booking (invitee) |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |

---

## Database Schema

The database consists of **7 tables** managed through 5 sequential migrations:

| Table | Description |
|---|---|
| `users` | User accounts with email, password hash, username, timezone |
| `refresh_tokens` | JWT refresh token storage with expiry tracking |
| `event_types` | Configurable event types with schedule (JSONB), booking rules, questions |
| `availability_overrides` | Date-specific availability overrides for event types |
| `bookings` | Booking records with invitee details, status tracking, cancel tokens |
| `sent_reminders` | Tracks which reminders (24h/1h) have been sent per booking |
| `calendar_connections` | Google Calendar OAuth tokens and calendar metadata |

---

## Frontend Routes

| Route | Page | Auth Required |
|---|---|---|
| `/login` | Login | No |
| `/register` | Register | No |
| `/dashboard` | Dashboard Home | Yes |
| `/dashboard/event-types` | Event Types List | Yes |
| `/dashboard/event-types/new` | Create Event Type | Yes |
| `/dashboard/event-types/:id` | Edit Event Type | Yes |
| `/dashboard/bookings` | Bookings List | Yes |
| `/dashboard/bookings/:id` | Booking Details | Yes |
| `/dashboard/settings` | Settings (Profile + Calendars) | Yes |
| `/:username/:slug` | Public Booking Page | No |

---

## Scripts

### Backend

```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled production build
npm run db:migrate   # Run all pending database migrations
```

### Frontend

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

---

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3001` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret for JWT signing (min 32 chars) |
| `FRONTEND_URL` | **Yes** | — | Frontend URL for CORS |
| `RESEND_API_KEY` | No | — | Resend API key (emails logged to console if absent) |
| `EMAIL_FROM` | No | — | Sender email address |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | No | — | Google OAuth redirect URI |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | **Yes** | Backend API URL |
| `VITE_APP_URL` | **Yes** | Frontend app URL |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Raw SQL over ORM** | Full query control with postgres.js; no Prisma/Sequelize abstraction overhead |
| **Access token in memory** | Prevents XSS attacks (never stored in localStorage) |
| **Refresh token rotation** | One-time use tokens rotated on each refresh for security |
| **UTC everywhere** | All dates stored in UTC; timezone conversion only at API boundaries |
| **Vite + React SPA** | Simpler architecture vs SSR; adequate for a dashboard application |
| **Zustand over Redux** | Lightweight, minimal boilerplate, perfect for this project's scope |
| **setInterval reminders** | Simple background job; no Redis/BullMQ dependency needed at this scale |
| **Zod validation** | Shared schema validation approach for both backend and frontend |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
