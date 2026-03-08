const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authenticateToken, requirePermission, userHasPermission } = require('../middleware/auth');

router.get('/', authenticateToken, requirePermission('view_logs'), (req, res) => {
  const db = getDb();
  const { category, limit = 100, offset = 0 } = req.query;
  const canViewIp = userHasPermission(req.user, 'view_logs_ip');
  let query = `SELECT * FROM system_logs`;
  const params = [];
  if (category) { query += ` WHERE category = ?`; params.push(category); }
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  const rows = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM system_logs${category ? ' WHERE category = ?' : ''}`).get(...(category ? [category] : []));
  const logs = canViewIp ? rows : rows.map(({ ip_address, ...rest }) => rest);
  res.json({ logs, total: total.cnt, canViewIp });
});

// GET /api/logs/categories
router.get('/categories', authenticateToken, requirePermission('view_logs'), (req, res) => {
  const db = getDb();
  const cats = db.prepare(`SELECT DISTINCT category FROM system_logs WHERE category IS NOT NULL ORDER BY category`).all();
  res.json(cats.map(c => c.category));
});

module.exports = router;
