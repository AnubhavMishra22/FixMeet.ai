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
    const [
      { authMiddleware },
      authRoutes,
      eventTypesRoutes,
      bookingsRoutes,
      calendarsRoutes,
      publicRoutes,
    ] = await Promise.all([
      import('./middleware/auth.middleware.js'),
      import('./modules/auth/auth.routes.js'),
      import('./modules/event-types/event-types.routes.js'),
      import('./modules/bookings/bookings.routes.js'),
      import('./modules/calendars/calendars.routes.js'),
      import('./modules/public/public.routes.js'),
    ]);

    app.use('/api/auth', authRoutes.default);
    app.use('/api/event-types', authMiddleware, eventTypesRoutes.default);
    app.use('/api/bookings', authMiddleware, bookingsRoutes.default);
    app.use('/api/calendars', calendarsRoutes.default);
    app.use('/api/public', publicRoutes.default);

    // AI routes - only mount if ANTHROPIC_API_KEY is configured
    if (process.env.ANTHROPIC_API_KEY) {
      const { initializeAI } = await import('./modules/ai/ai.service.js');
      const aiRoutes = await import('./modules/ai/ai.routes.js');
      initializeAI(process.env.ANTHROPIC_API_KEY);
      app.use('/api/ai', authMiddleware, aiRoutes.default);
      console.log('AI routes mounted (ANTHROPIC_API_KEY configured).');
    } else {
      console.log('AI routes skipped (no ANTHROPIC_API_KEY).');
    }

    console.log('All routes imported and mounted successfully.');
  } catch (e) {
    console.error('FAILED TO MOUNT ROUTES:', e);
    throw e;
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
