// Wczytaj zmienne środowiskowe z pliku .env (jeśli istnieje)
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  // Initialize database (async with sql.js WASM)
  await initializeDatabase();
  console.log('✅ Database initialized');

  // Zaufaj nagłówkom proxy od Nginx (potrzebne do poprawnego req.ip)
  if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
  }

  // Nagłówki bezpieczeństwa
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/announcements', require('./routes/announcements'));
  app.use('/api/gallery', require('./routes/gallery'));
  app.use('/api/staff', require('./routes/staff'));
  app.use('/api/logs', require('./routes/logs'));
  app.use('/api/suggestions', require('./routes/suggestions'));

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Błąd serwera' });
  });

  // Serve SPA for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 Sztab Wawaka uruchomiony na http://localhost:${PORT}`);
    console.log(`📋 Dane logowania: login: superadmin / hasło: Admin@2026\n`);
  });
}

startServer().catch(err => {
  console.error('❌ Błąd uruchomienia serwera:', err);
  process.exit(1);
});
