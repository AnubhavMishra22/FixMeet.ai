import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import eventTypesRoutes from './modules/event-types/event-types.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import calendarsRoutes from './modules/calendars/calendars.routes.js';

console.log('APP.TS LOADING...');

const app = express();

console.log('EXPRESS APP CREATED');

// Health check FIRST - before any middleware
app.get('/health', (_req, res) => {
  console.log('HEALTH ENDPOINT HIT');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Security middleware
try {
  app.use(helmet());
  console.log('HELMET OK');
} catch (e) {
  console.error('HELMET FAILED:', e);
}

// CORS - allow multiple origins for production
try {
  const allowedOrigins = [env.FRONTEND_URL].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow origin-less requests in dev (curl, Postman), enforce in production
        const isAllowed = allowedOrigins.includes(origin!) || (!origin && !isProd);
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
  console.log('CORS OK');
} catch (e) {
  console.error('CORS FAILED:', e);
}

// Body parsing
try {
  app.use(express.json());
  console.log('JSON OK');
} catch (e) {
  console.error('JSON FAILED:', e);
}

try {
  app.use(cookieParser());
  console.log('COOKIE PARSER OK');
} catch (e) {
  console.error('COOKIE PARSER FAILED:', e);
}

// Routes
try {
  app.use('/api/auth', authRoutes);
  console.log('AUTH ROUTES OK');
} catch (e) {
  console.error('AUTH ROUTES FAILED:', e);
}

try {
  app.use('/api/event-types', authMiddleware, eventTypesRoutes);
  console.log('EVENT TYPES ROUTES OK');
} catch (e) {
  console.error('EVENT TYPES ROUTES FAILED:', e);
}

try {
  app.use('/api/bookings', authMiddleware, bookingsRoutes);
  console.log('BOOKINGS ROUTES OK');
} catch (e) {
  console.error('BOOKINGS ROUTES FAILED:', e);
}

try {
  app.use('/api/calendars', calendarsRoutes);
  console.log('CALENDARS ROUTES OK');
} catch (e) {
  console.error('CALENDARS ROUTES FAILED:', e);
}

try {
  app.use('/api/public', publicRoutes);
  console.log('PUBLIC ROUTES OK');
} catch (e) {
  console.error('PUBLIC ROUTES FAILED:', e);
}

// Error handling
app.use(errorMiddleware);

console.log('APP.TS FULLY LOADED');

export default app;
