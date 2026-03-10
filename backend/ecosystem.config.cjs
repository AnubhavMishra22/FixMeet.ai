/**
 * PM2 ecosystem config for FixMeet backend.
 * Secrets (DATABASE_URL, JWT_SECRET, GOOGLE_AI_API_KEY) must be in .env.
 * dotenv/config loads .env from cwd before app starts.
 * Note: cwd is droplet-specific; droplet-full-setup.sh deploys to /root/FixMeet.ai/backend.
 */
module.exports = {
  apps: [{
    name: 'fixmeet-api',
    script: 'dist/server.js',
    cwd: '/root/FixMeet.ai/backend',
    node_args: '-r dotenv/config',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      FRONTEND_URL: 'https://fixmeet.app',
      EMAIL_FROM: 'FixMeet <notifications@fixmeet.ai>',
      GOOGLE_REDIRECT_URI: 'https://api.fixmeet.app/api/calendars/google/callback',
      // GOOGLE_AI_API_KEY: must be in .env for AI chat/insights
    },
  }],
};
