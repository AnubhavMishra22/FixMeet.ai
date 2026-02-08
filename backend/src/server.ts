import app from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './config/migrate.js';
import { processReminders } from './jobs/reminder.job.js';

async function start() {
  // Run database migrations before starting the server
  await runMigrations();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
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

    console.log('Reminder job scheduled (every 15 min)');
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
