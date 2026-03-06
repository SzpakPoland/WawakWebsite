const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'sztab-wawaka-secret-key-2026-change-in-production';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role_id: user.role_id }, JWT_SECRET, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Brak tokenu autoryzacji' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Nieprawidłowy lub wygasły token' });
    req.user = decoded;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) { req.user = null; return next(); }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    req.user = err ? null : decoded;
    next();
  });
}

function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Nieautoryzowany' });
    const db = getDb();

    // Check if superadmin role
    const roleRow = db.prepare(`SELECT name FROM roles WHERE id = ?`).get(req.user.role_id);
    if (roleRow && roleRow.name === 'superadmin') return next();

    // Check role permissions
    const rolePerm = db.prepare(`
      SELECT rp.permission_id FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.name = ?
    `).get(req.user.role_id, permissionName);

    if (rolePerm) return next();

    // Check individual user permissions
    const userPerm = db.prepare(`
      SELECT up.granted FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = ? AND p.name = ? AND up.granted = 1
    `).get(req.user.id, permissionName);

    if (userPerm) return next();

    return res.status(403).json({ error: 'Brak uprawnień do tej operacji' });
  };
}

function logAction(userId, username, action, category, details, ip) {
  try {
    const db = getDb();
    db.prepare(`INSERT INTO system_logs (user_id, username, action, category, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(userId || null, username || 'System', action, category || 'general', details ? JSON.stringify(details) : null, ip || null);
  } catch (e) {
    console.error('Log error:', e.message);
  }
}

module.exports = { generateToken, authenticateToken, optionalAuth, requirePermission, logAction, JWT_SECRET };
