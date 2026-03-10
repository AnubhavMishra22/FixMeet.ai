module.exports = {
  apps: [{
    name: 'fixmeet-api',
    script: 'dist/server.js',
    cwd: '/root/FixMeet.ai/backend',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      DATABASE_URL: 'postgresql://fixmeet@127.0.0.1:5432/fixmeet',
      JWT_SECRET: 'fixmeet_jwt_secret_min_32_chars_for_production_2024',
      FRONTEND_URL: 'https://fixmeet.app',
      EMAIL_FROM: 'FixMeet <notifications@fixmeet.ai>',
      GOOGLE_REDIRECT_URI: 'https://api.fixmeet.app/api/calendars/google/callback',
    },
  }],
};
