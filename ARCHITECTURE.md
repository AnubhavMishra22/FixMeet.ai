# FixMeet.ai - Architecture Reference

## Overview
FixMeet.ai is a Calendly competitor with AI-powered features. This document serves as the single source of truth for architectural decisions.

---

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with express-async-errors
- **Database**: PostgreSQL 15+ with postgres.js (not Prisma)
- **Cache**: Redis (ioredis)
- **Queue**: BullMQ for background jobs
- **Validation**: Zod
- **Auth**: Custom JWT + refresh tokens (access: 15min, refresh: 7days)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios or fetch with custom wrapper

### Infrastructure
- **Email**: Resend (or SendGrid)
- **SMS**: Twilio
- **File Storage**: S3-compatible
- **Hosting**: Railway/Render (backend), Vercel (frontend)

---

## Project Structure

```
scheduleflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts      # postgres.js connection
│   │   │   ├── redis.ts         # Redis connection
│   │   │   ├── env.ts           # Environment validation with Zod
│   │   │   └── index.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.schema.ts    # Zod schemas
│   │   │   │   └── auth.types.ts
│   │   │   ├── users/
│   │   │   ├── event-types/
│   │   │   ├── bookings/
│   │   │   ├── calendars/
│   │   │   └── organizations/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   ├── utils/
│   │   │   ├── password.ts      # bcrypt helpers
│   │   │   ├── jwt.ts           # JWT helpers
│   │   │   ├── dates.ts         # date-fns-tz helpers
│   │   │   └── errors.ts        # Custom error classes
│   │   ├── jobs/
│   │   │   ├── queue.ts         # BullMQ setup
│   │   │   ├── email.job.ts
│   │   │   └── reminder.job.ts
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── queries/         # Raw SQL query files (optional)
│   │   ├── app.ts               # Express app setup
│   │   └── server.ts            # Entry point
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── stores/
│   ├── package.json
│   └── tsconfig.json
├── packages/
│   └── shared/                  # Shared types between frontend/backend
│       ├── src/
│       │   └── types/
│       └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    username VARCHAR(100) UNIQUE NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar connections
CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- google, outlook, apple
    provider_account_id VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id VARCHAR(255),
    calendar_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_account_id)
);

-- Event types (booking page configurations)
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Location
    location_type VARCHAR(50) DEFAULT 'google_meet',  -- google_meet, zoom, teams, phone, in_person, custom
    location_value TEXT,  -- Phone number, address, or custom link
    
    -- Appearance
    color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Availability
    schedule JSONB NOT NULL DEFAULT '{
        "monday": [{"start": "09:00", "end": "17:00"}],
        "tuesday": [{"start": "09:00", "end": "17:00"}],
        "wednesday": [{"start": "09:00", "end": "17:00"}],
        "thursday": [{"start": "09:00", "end": "17:00"}],
        "friday": [{"start": "09:00", "end": "17:00"}],
        "saturday": [],
        "sunday": []
    }',
    
    -- Booking rules
    buffer_before INTEGER DEFAULT 0,       -- minutes
    buffer_after INTEGER DEFAULT 0,        -- minutes
    min_notice INTEGER DEFAULT 60,         -- minutes (1 hour default)
    slot_interval INTEGER DEFAULT 30,      -- minutes between available slots
    max_bookings_per_day INTEGER,
    
    -- Date range
    range_type VARCHAR(50) DEFAULT 'rolling',  -- rolling, range, indefinite
    range_days INTEGER DEFAULT 60,             -- for rolling
    range_start DATE,                          -- for range
    range_end DATE,                            -- for range
    
    -- Custom questions
    questions JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invitee info
    invitee_name VARCHAR(255) NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    invitee_timezone VARCHAR(100) NOT NULL,
    invitee_notes TEXT,
    
    -- Time (always stored in UTC)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Location
    location_type VARCHAR(50),
    location_value TEXT,
    meeting_url TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'confirmed',  -- confirmed, cancelled, rescheduled, completed, no_show
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),  -- host, invitee
    cancelled_at TIMESTAMPTZ,
    
    -- Responses to custom questions
    responses JSONB DEFAULT '{}',
    
    -- Calendar event IDs (for syncing)
    host_calendar_event_id VARCHAR(255),
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'booking_page',  -- booking_page, embed, api
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability overrides (specific dates)
CREATE TABLE availability_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE,  -- NULL = applies to all
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT true,
    time_ranges JSONB DEFAULT '[]',  -- [{"start": "10:00", "end": "14:00"}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type_id, date)
);

-- Indexes
CREATE INDEX idx_bookings_host_time ON bookings(host_id, start_time);
CREATE INDEX idx_bookings_event_type ON bookings(event_type_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_event_types_user ON event_types(user_id);
CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

---

## API Routes

### Auth
```
POST   /api/auth/register        # Create account
POST   /api/auth/login           # Get tokens
POST   /api/auth/logout          # Invalidate refresh token
POST   /api/auth/refresh         # Refresh access token
GET    /api/auth/me              # Get current user
```

### Users
```
GET    /api/users/me             # Get profile
PATCH  /api/users/me             # Update profile
```

### Event Types
```
GET    /api/event-types          # List user's event types
POST   /api/event-types          # Create event type
GET    /api/event-types/:id      # Get event type
PATCH  /api/event-types/:id      # Update event type
DELETE /api/event-types/:id      # Delete event type
```

### Bookings
```
GET    /api/bookings             # List user's bookings
GET    /api/bookings/:id         # Get booking details
PATCH  /api/bookings/:id         # Update booking
POST   /api/bookings/:id/cancel  # Cancel booking
```

### Calendar Connections
```
GET    /api/calendars                    # List connections
GET    /api/calendars/google/auth-url    # Get OAuth URL
GET    /api/calendars/google/callback    # OAuth callback
DELETE /api/calendars/:id                # Disconnect
```

### Public (No Auth Required)
```
GET    /api/public/:username/:slug              # Get event type info
GET    /api/public/:username/:slug/slots        # Get available slots for date range
POST   /api/public/:username/:slug/book         # Create booking
GET    /api/public/bookings/:id                 # Get booking (with secret token)
POST   /api/public/bookings/:id/cancel          # Cancel (with secret token)
```

---

## Key Design Decisions

### 1. Timezone Handling
- Store ALL times in UTC in database
- Convert to user's timezone only in API responses
- Use `date-fns-tz` for conversions
- Always require timezone from invitee during booking

### 2. Availability Calculation
```
Available slots = (Weekly schedule + Overrides) - Existing bookings - Buffer times - External calendar events
```

### 3. Authentication Flow
- Access token (JWT): 15 minutes, stored in memory
- Refresh token: 7 days, stored in httpOnly cookie
- On refresh token use, rotate it (one-time use)

### 4. Module Pattern
Each module (auth, bookings, etc.) has:
- `*.routes.ts` - Route definitions
- `*.controller.ts` - Request handling, validation
- `*.service.ts` - Business logic
- `*.schema.ts` - Zod schemas
- `*.types.ts` - TypeScript types

---

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgres://user:password@localhost:5432/scheduleflow

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendars/google/callback

# Email (Resend)
RESEND_API_KEY=

# Optional: Encryption key for tokens at rest
ENCRYPTION_KEY=
```
