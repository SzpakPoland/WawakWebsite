// Konfiguracja PM2 - Process Manager dla Node.js
// Uruchomienie: pm2 start ecosystem.config.js
// Dokumentacja: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'sztab-wawaka',
      script: 'server/index.js',
      instances: 1,              // SQLite nie obsługuje wielu procesów równoległych
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Restart automatyczny przy awarii
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logi
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
