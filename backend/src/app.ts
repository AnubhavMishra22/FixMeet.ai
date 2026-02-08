import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { AppError } from './utils/errors.js';
import { errorMiddleware } from './middleware/error.middleware.js';

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Security middleware
app.use(helmet());

// CORS - allow all origins temporarily for debugging
// TODO: Restrict to FRONTEND_URL once deployment is stable
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// Body parsing
app.use(express.json());
app.use(cookieParser());

// Debug: request logger
app.use((req, _res, next) => {
  console.log(`REQUEST: ${req.method} ${req.path}`);
  next();
});

// Simple test route to confirm routing works
app.get('/api/test', (_req, res) => {
  res.json({ test: 'working', timestamp: new Date().toISOString() });
});

// Mount routes with dynamic imports to catch import-time errors
async function mountRoutes() {
  try {
    const { authMiddleware } = await import('./middleware/auth.middleware.js');
    console.log('AUTH MIDDLEWARE IMPORTED OK');

    const authRoutes = await import('./modules/auth/auth.routes.js');
    app.use('/api/auth', authRoutes.default);
    console.log('AUTH ROUTES MOUNTED');

    const eventTypesRoutes = await import('./modules/event-types/event-types.routes.js');
    app.use('/api/event-types', authMiddleware, eventTypesRoutes.default);
    console.log('EVENT TYPES ROUTES MOUNTED');

    const bookingsRoutes = await import('./modules/bookings/bookings.routes.js');
    app.use('/api/bookings', authMiddleware, bookingsRoutes.default);
    console.log('BOOKINGS ROUTES MOUNTED');

    const calendarsRoutes = await import('./modules/calendars/calendars.routes.js');
    app.use('/api/calendars', calendarsRoutes.default);
    console.log('CALENDARS ROUTES MOUNTED');

    const publicRoutes = await import('./modules/public/public.routes.js');
    app.use('/api/public', publicRoutes.default);
    console.log('PUBLIC ROUTES MOUNTED');
  } catch (e) {
    console.error('FAILED TO MOUNT ROUTES:', e);
  }

  // 404 catch-all - MUST be after all routes
  app.use((req, _res, next) => {
    console.log(`NO ROUTE MATCHED: ${req.method} ${req.path}`);
    next(new AppError(`Route not found: ${req.method} ${req.path}`, 404, 'NOT_FOUND'));
  });

  // Error handling
  app.use(errorMiddleware);

  console.log('ALL ROUTES MOUNTED');
}

export { mountRoutes };
export default app;
