const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authenticateToken, requirePermission, logAction } = require('../middleware/auth');
const { getLimitsData, getUserLimit, getUserUsage, setUserLimit, formatBytes, DEFAULT_LIMIT_BYTES, SUPERADMIN_DEFAULT_BYTES } = require('../uploadLimits');

router.get('/', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.role_id, u.avatar_url, u.is_active, u.created_at, u.updated_at, r.name as role_name
    FROM users u LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

router.post('/', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const { username, display_name, password, role_id } = req.body;
  if (!username || !display_name || !password) return res.status(400).json({ error: 'Wypełnij wszystkie wymagane pola' });

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
  if (existing) return res.status(409).json({ error: 'Użytkownik o tej nazwie już istnieje' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`INSERT INTO users (username, display_name, password_hash, role_id) VALUES (?, ?, ?, ?)`)
    .run(username, display_name, hash, role_id || null);

  logAction(req.user.id, req.user.username, 'Utworzono użytkownika', 'users', { new_user: username, role_id }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Użytkownik utworzony' });
});

router.put('/:id', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const { display_name, role_id, is_active, password } = req.body;
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  if (user.username === 'superadmin' && role_id) {
    const superRole = db.prepare(`SELECT id FROM roles WHERE name = 'superadmin'`).get();
    if (superRole && role_id != superRole.id) {
      const superadminCount = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role_id = ? AND is_active = 1`).get(superRole.id);
      if (superadminCount.cnt <= 1) {
        return res.status(400).json({ error: 'Nie można zmienić roli jedynego superadmina' });
      }
    }
  }

  let hash = user.password_hash;
  if (password) hash = bcrypt.hashSync(password, 10);

  db.prepare(`UPDATE users SET display_name=?, role_id=?, is_active=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(display_name || user.display_name, role_id !== undefined ? role_id : user.role_id,
         is_active !== undefined ? is_active : user.is_active, hash, req.params.id);

  logAction(req.user.id, req.user.username, 'Edytowano użytkownika', 'users', { target_user: user.username }, req.ip);
  res.json({ message: 'Użytkownik zaktualizowany' });
});

router.delete('/:id', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Nie możesz usunąć własnego konta' });
  if (user.username === 'superadmin') return res.status(400).json({ error: 'Nie można usunąć głównego superadmina' });

  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  logAction(req.user.id, req.user.username, 'Usunięto użytkownika', 'users', { deleted_user: user.username }, req.ip);
  res.json({ message: 'Użytkownik usunięty' });
});

router.get('/:id/permissions', authenticateToken, requirePermission('manage_permissions'), (req, res) => {
  const db = getDb();
  const perms = db.prepare(`
    SELECT p.*, up.granted FROM permissions p
    LEFT JOIN user_permissions up ON up.permission_id = p.id AND up.user_id = ?
    ORDER BY p.category, p.name
  `).all(req.params.id);
  res.json(perms);
});

router.put('/:id/permissions', authenticateToken, requirePermission('manage_permissions'), (req, res) => {
  const { permissions } = req.body;
  const db = getDb();
  const setUserPerm = db.prepare(`INSERT OR REPLACE INTO user_permissions (user_id, permission_id, granted) VALUES (?, ?, ?)`);
  const deleteUserPerm = db.prepare(`DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?`);

  for (const p of permissions) {
    if (p.granted === null || p.granted === undefined) {
      deleteUserPerm.run(req.params.id, p.permission_id);
    } else {
      setUserPerm.run(req.params.id, p.permission_id, p.granted ? 1 : 0);
    }
  }
  logAction(req.user.id, req.user.username, 'Zmieniono uprawnienia użytkownika', 'permissions', { target_user_id: req.params.id }, req.ip);
  res.json({ message: 'Uprawnienia zaktualizowane' });
});

router.get('/roles/list', authenticateToken, (req, res) => {
  const db = getDb();
  const roles = db.prepare(`SELECT * FROM roles ORDER BY name`).all();
  res.json(roles);
});

router.get('/roles/:id/permissions', authenticateToken, requirePermission('manage_permissions'), (req, res) => {
  const db = getDb();
  const perms = db.prepare(`
    SELECT p.*, CASE WHEN rp.role_id IS NOT NULL THEN 1 ELSE 0 END as granted
    FROM permissions p
    LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
    ORDER BY p.category, p.name
  `).all(req.params.id);
  res.json(perms);
});

router.put('/roles/:id/permissions', authenticateToken, requirePermission('manage_permissions'), (req, res) => {
  const { permissions } = req.body;
  const db = getDb();
  const role = db.prepare(`SELECT * FROM roles WHERE id = ?`).get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });

  db.prepare(`DELETE FROM role_permissions WHERE role_id = ?`).run(req.params.id);
  const insertRolePerm = db.prepare(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`);
  for (const p of permissions.filter(p => p.granted)) {
    insertRolePerm.run(req.params.id, p.permission_id);
  }
  logAction(req.user.id, req.user.username, 'Zmieniono uprawnienia roli', 'permissions', { role: role.name }, req.ip);
  res.json({ message: 'Uprawnienia roli zaktualizowane' });
});

router.post('/roles', authenticateToken, requirePermission('manage_roles'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Podaj nazwę roli' });
  const db = getDb();
  const result = db.prepare(`INSERT INTO roles (name, description) VALUES (?, ?)`).run(name, description || '');
  logAction(req.user.id, req.user.username, 'Utworzono rolę', 'roles', { role: name }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Rola utworzona' });
});

router.delete('/roles/:id', authenticateToken, requirePermission('manage_roles'), (req, res) => {
  const db = getDb();
  const role = db.prepare(`SELECT * FROM roles WHERE id = ?`).get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Rola nie znaleziona' });
  if (role.name === 'superadmin') return res.status(400).json({ error: 'Nie można usunąć roli superadmina' });
  db.prepare(`DELETE FROM roles WHERE id = ?`).run(req.params.id);
  logAction(req.user.id, req.user.username, 'Usunięto rolę', 'roles', { role: role.name }, req.ip);
  res.json({ message: 'Rola usunięta' });
});

router.get('/permissions/all', authenticateToken, requirePermission('manage_permissions'), (req, res) => {
  const db = getDb();
  const perms = db.prepare(`SELECT * FROM permissions ORDER BY category, name`).all();
  res.json(perms);
});

router.get('/upload-limits', authenticateToken, (req, res) => {
  const db = getDb();
  const roleRow = db.prepare(`SELECT name FROM roles WHERE id = ?`).get(req.user.role_id);
  if (!roleRow || roleRow.name !== 'superadmin') {
    return res.status(403).json({ error: 'Tylko superadmin może zarządzać limitami plików' });
  }

  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name, r.name as role_name
    FROM users u LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.display_name
  `).all();

  const result = users.map(u => ({
    id:           u.id,
    username:     u.username,
    display_name: u.display_name,
    role_name:    u.role_name,
    limit_bytes:  getUserLimit(u.id, u.username),
    usage_bytes:  getUserUsage(u.id),
  }));

  res.json(result);
});

router.get('/:id/upload-limit', authenticateToken, (req, res) => {
  const db = getDb();
  const roleRow = db.prepare(`SELECT name FROM roles WHERE id = ?`).get(req.user.role_id);
  const isSuperAdmin = roleRow && roleRow.name === 'superadmin';

  if (!isSuperAdmin && req.user.id != req.params.id) {
    return res.status(403).json({ error: 'Brak uprawnień' });
  }

  const user = db.prepare(`SELECT id, username FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  res.json({
    userId:      user.id,
    limit_bytes: getUserLimit(user.id, user.username),
    usage_bytes: getUserUsage(user.id),
  });
});

router.put('/:id/upload-limit', authenticateToken, (req, res) => {
  const db = getDb();
  const roleRow = db.prepare(`SELECT name FROM roles WHERE id = ?`).get(req.user.role_id);
  if (!roleRow || roleRow.name !== 'superadmin') {
    return res.status(403).json({ error: 'Tylko superadmin może zmieniać limity plików' });
  }

  const limitMb = parseFloat(req.body.limit_mb);
  if (isNaN(limitMb) || limitMb < 0) {
    return res.status(400).json({ error: 'Podaj prawidłową wartość limitu w MB (liczba >= 0)' });
  }

  const user = db.prepare(`SELECT id, username FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  const limitBytes = Math.round(limitMb * 1024 * 1024);
  setUserLimit(user.id, limitBytes);

  logAction(req.user.id, req.user.username, 'Zmieniono limit plików użytkownika', 'users',
    { target_user: user.username, limit_mb: limitMb }, req.ip);

  res.json({ message: 'Limit zaktualizowany', limit_bytes: limitBytes });
});

module.exports = router;
