import app, { mountRoutes } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './config/migrate.js';
import { processReminders } from './jobs/reminder.job.js';
import { processBriefGeneration } from './jobs/brief-generator.job.js';
import { processFollowupGeneration } from './jobs/followup-generator.job.js';

async function start() {
  // Run database migrations before starting the server
  await runMigrations();

  // Mount all routes (dynamic imports to catch import-time errors)
  await mountRoutes();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Start reminder job scheduler (only in production/development, not in test)
  if (env.NODE_ENV !== 'test') {
    // Run reminder check every 15 minutes
    const REMINDER_INTERVAL = 15 * 60 * 1000; // 15 minutes

    setInterval(() => {
      processReminders().catch((err) => {
        console.error('Reminder job error:', err);
      });
    }, REMINDER_INTERVAL);

    // Also run once on startup (after a short delay to let DB connect)
    setTimeout(() => {
      processReminders().catch((err) => {
        console.error('Initial reminder job error:', err);
      });
    }, 5000);

    // Run brief generation every hour
    const BRIEF_INTERVAL = 60 * 60 * 1000; // 1 hour

    setInterval(() => {
      processBriefGeneration().catch((err) => {
        console.error('Brief generator job error:', err);
      });
    }, BRIEF_INTERVAL);

    setTimeout(() => {
      processBriefGeneration().catch((err) => {
        console.error('Initial brief generator job error:', err);
      });
    }, 10000);

    // Run followup generation every 30 minutes
    const FOLLOWUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

    setInterval(() => {
      processFollowupGeneration().catch((err) => {
        console.error('Followup generator job error:', err);
      });
    }, FOLLOWUP_INTERVAL);

    setTimeout(() => {
      processFollowupGeneration().catch((err) => {
        console.error('Initial followup generator job error:', err);
      });
    }, 15000);

    console.log('Background jobs scheduled (reminders: 15m, briefs: 1h, followups: 30m)');
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
