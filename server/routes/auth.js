const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { generateToken, authenticateToken, logAction } = require('../middleware/auth');
const { checkAndRecordUpload, recordDelete, formatBytes } = require('../uploadLimits');

const avatarDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => cb(null, `avatar-${uuidv4()}${path.extname(file.originalname)}`)
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Tylko obrazy'));
    cb(null, true);
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Podaj login i hasło' });

  const db = getDb();
  const user = db.prepare(`
    SELECT u.*, r.name as role_name FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.username = ? AND u.is_active = 1
  `).get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAction(null, username, 'Nieudane logowanie', 'auth', { username }, req.ip);
    return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
  }

  const token = generateToken(user);
  logAction(user.id, user.username, 'Zalogowano', 'auth', null, req.ip);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role_id: user.role_id,
      role_name: user.role_name,
      avatar_url: user.avatar_url
    }
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  logAction(req.user.id, req.user.username, 'Wylogowano', 'auth', null, req.ip);
  res.json({ message: 'Wylogowano pomyślnie' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.role_id, u.avatar_url, u.created_at, r.name as role_name
    FROM users u LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.is_active = 1
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  // Get permissions
  const permissions = db.prepare(`
    SELECT DISTINCT p.name FROM permissions p
    LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
    LEFT JOIN user_permissions up ON up.permission_id = p.id AND up.user_id = ? AND up.granted = 1
    WHERE rp.role_id IS NOT NULL OR up.user_id IS NOT NULL
  `).all(user.role_id, user.id).map(r => r.name);

  res.json({ ...user, permissions });
});

// PUT /api/auth/profile — user edits their own profile
router.put('/profile', authenticateToken, (req, res) => {
  const { display_name, username, current_password, new_password } = req.body;
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  // If changing username, check uniqueness
  if (username && username !== user.username) {
    const taken = db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(username, user.id);
    if (taken) return res.status(409).json({ error: 'Ten login jest już zajęty' });
  }

  // If changing password, require current password
  let newHash = user.password_hash;
  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Podaj aktualne hasło aby je zmienić' });
    if (!bcrypt.compareSync(current_password, user.password_hash))
      return res.status(401).json({ error: 'Aktualne hasło jest nieprawidłowe' });
    if (new_password.length < 4) return res.status(400).json({ error: 'Nowe hasło musi mieć co najmniej 4 znaki' });
    newHash = bcrypt.hashSync(new_password, 10);
  }

  db.prepare(`UPDATE users SET display_name=?, username=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(display_name || user.display_name, username || user.username, newHash, user.id);

  logAction(user.id, user.username, 'Edytowano profil', 'auth', { fields: Object.keys(req.body) }, req.ip);

  const updated = db.prepare(`SELECT id, username, display_name, role_id, avatar_url, r.name as role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(user.id);
  res.json({ message: 'Profil zaktualizowany', user: updated });
});

// POST /api/auth/avatar — upload profile picture
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);

  // Quota check
  const relativePath = `/uploads/avatars/${req.file.filename}`;
  const quotaResult  = checkAndRecordUpload(req.user.id, relativePath, req.file.size, req.user.username);
  if (!quotaResult.allowed) {
    fs.unlinkSync(req.file.path);
    return res.status(413).json({
      error: `Przekroczono limit miejsca na pliki. Dostępne: ${formatBytes(quotaResult.remaining)}, wymagane: ${formatBytes(req.file.size)}`
    });
  }

  // Remove old avatar file if it's in uploads/avatars
  if (user.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
    const oldPath = path.join(__dirname, '..', '..', 'public', user.avatar_url);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    recordDelete(user.avatar_url);
  }

  const avatarUrl = relativePath;
  db.prepare(`UPDATE users SET avatar_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(avatarUrl, user.id);
  logAction(user.id, user.username, 'Zmieniono zdjęcie profilowe', 'auth', null, req.ip);
  res.json({ avatar_url: avatarUrl });
});

module.exports = router;
