import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { AppError } from './utils/errors.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// Health check FIRST - before any middleware
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Security middleware
app.use(helmet());

// TODO: Restrict CORS origin to FRONTEND_URL in production.
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

// Request logger — dev only to avoid Railway rate limits
if (!isProd) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

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
      briefsRoutes,
      followupsRoutes,
      insightsRoutes,
    ] = await Promise.all([
      import('./middleware/auth.middleware.js'),
      import('./modules/auth/auth.routes.js'),
      import('./modules/event-types/event-types.routes.js'),
      import('./modules/bookings/bookings.routes.js'),
      import('./modules/calendars/calendars.routes.js'),
      import('./modules/public/public.routes.js'),
      import('./modules/briefs/briefs.routes.js'),
      import('./modules/followups/followups.routes.js'),
      import('./modules/insights/insights.routes.js'),
    ]);

    app.use('/api/auth', authRoutes.default);
    app.use('/api/event-types', authMiddleware, eventTypesRoutes.default);
    app.use('/api/bookings', authMiddleware, bookingsRoutes.default);
    app.use('/api/calendars', calendarsRoutes.default);
    app.use('/api/public', publicRoutes.default);
    app.use('/api/briefs', authMiddleware, briefsRoutes.default);
    app.use('/api/followups', authMiddleware, followupsRoutes.default);
    app.use('/api/insights', authMiddleware, insightsRoutes.default);

    // MCP API key management routes
    const mcpKeysRoutes = await import('./mcp/api-keys.routes.js');
    app.use('/api/mcp-keys', authMiddleware, mcpKeysRoutes.default);

    // AI routes - only mount if GOOGLE_AI_API_KEY is configured
    if (env.GOOGLE_AI_API_KEY) {
      const { initializeAI } = await import('./modules/ai/ai.service.js');
      const aiRoutes = await import('./modules/ai/ai.routes.js');
      initializeAI({
        apiKey: env.GOOGLE_AI_API_KEY,
        modelName: env.GOOGLE_AI_MODEL_NAME,
        maxTokens: env.GOOGLE_AI_MAX_TOKENS,
      });
      app.use('/api/ai', authMiddleware, aiRoutes.default);
      console.log('AI routes mounted.');
    } else {
      console.log('AI routes skipped (GOOGLE_AI_API_KEY not configured).');
    }

    // MCP HTTP transport — mount Streamable HTTP endpoint at /mcp
    if (env.MCP_ENABLED) {
      const { mountMcpRoutes } = await import('./mcp/http-transport.js');
      mountMcpRoutes(app);
    } else {
      console.log('MCP HTTP transport skipped (MCP_ENABLED=false).');
    }

    console.log('All routes mounted successfully.');
  } catch (e) {
    console.error('FAILED TO MOUNT ROUTES:', e);
    throw e;
  }

  // 404 catch-all - MUST be after all routes
  app.use((req, _res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.path}`, 404, 'NOT_FOUND'));
  });

  // Error handling
  app.use(errorMiddleware);
}

export { mountRoutes };
export default app;
