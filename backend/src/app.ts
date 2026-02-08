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

// Debug: check env variables are loaded
console.log('ENV CHECK:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
});

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

// CORS - allow all origins temporarily for debugging
// TODO: Restrict to FRONTEND_URL once deployment is stable
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
console.log('CORS OK (all origins allowed)');

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

// Debug: request logger - traces every request through middleware
app.use((req, _res, next) => {
  console.log(`REQUEST: ${req.method} ${req.path}`);
  next();
});

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

// Error handling - always log full details for debugging
app.use(errorMiddleware);

console.log('APP.TS FULLY LOADED');

export default app;
