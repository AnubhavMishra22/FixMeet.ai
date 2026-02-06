import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import eventTypesRoutes from './modules/event-types/event-types.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import calendarsRoutes from './modules/calendars/calendars.routes.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/event-types', authMiddleware, eventTypesRoutes);
app.use('/api/bookings', authMiddleware, bookingsRoutes);
app.use('/api/calendars', calendarsRoutes);
app.use('/api/public', publicRoutes);

// Error handling
app.use(errorMiddleware);

export default app;
