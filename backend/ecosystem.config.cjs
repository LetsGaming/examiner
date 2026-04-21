module.exports = {
  apps: [
    {
      name: 'examiner-backend',
      script: './dist/server.js',
      cwd: '/home/sudoberry/projects/examiner/backend',
      interpreter: 'node',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env_production: {
        NODE_ENV: 'production',
        PORT: 8031,
        TRUST_PROXY: 'true',
        OPENAI_API_KEY: 'sk-REPLACE_ME',
        FRONTEND_URLS: 'https://REPLACE_ME.com',
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 8031,
        TRUST_PROXY: 'false',
        OPENAI_API_KEY: 'sk-REPLACE_ME',
        FRONTEND_URLS: 'http://localhost:8030,http://localhost:5173',
      },
    },
  ],
}
