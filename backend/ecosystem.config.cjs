/**
 * PM2 ecosystem config for FixMeet backend.
 * Secrets (DATABASE_URL, JWT_SECRET) must be loaded from .env at runtime.
 * Do not add secrets here—use: pm2 start ecosystem.config.cjs (with .env in cwd)
 * or ensure dotenv loads .env before app start.
 * Note: cwd is droplet-specific; droplet-full-setup.sh deploys to /root/FixMeet.ai/backend.
 */
module.exports = {
  apps: [{
    name: 'fixmeet-api',
    script: 'dist/server.js',
    cwd: '/root/FixMeet.ai/backend',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      FRONTEND_URL: 'https://fixmeet.app',
      EMAIL_FROM: 'FixMeet <notifications@fixmeet.ai>',
      GOOGLE_REDIRECT_URI: 'https://api.fixmeet.app/api/calendars/google/callback',
    },
  }],
};
