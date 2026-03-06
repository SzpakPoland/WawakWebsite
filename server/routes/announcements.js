const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken, optionalAuth, requirePermission, logAction } = require('../middleware/auth');

const imgDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'announcements');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, imgDir),
    filename: (req, file, cb) => cb(null, `ann-${uuidv4()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Tylko obrazy'));
    cb(null, true);
  }
});

// POST /api/announcements/upload-image
router.post('/upload-image', authenticateToken, requirePermission('edit_announcements'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
  res.json({ image_url: `/uploads/announcements/${req.file.filename}` });
});

// DELETE old announcement image
router.delete('/image', authenticateToken, requirePermission('edit_announcements'), (req, res) => {
  const { file_path } = req.body;
  if (file_path && file_path.startsWith('/uploads/announcements/')) {
    const full = path.join(__dirname, '..', '..', 'public', file_path);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  res.json({ ok: true });
});

// GET /api/announcements (public)
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.*, u.display_name as author_name FROM announcements a
    LEFT JOIN users u ON u.id = a.author_id
    WHERE a.is_published = 1
    ORDER BY a.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/announcements/all (admin - all including unpublished)
router.get('/all', authenticateToken, requirePermission('edit_announcements'), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.*, u.display_name as author_name FROM announcements a
    LEFT JOIN users u ON u.id = a.author_id
    ORDER BY a.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/announcements/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT a.*, u.display_name as author_name FROM announcements a
    LEFT JOIN users u ON u.id = a.author_id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ogłoszenie nie znalezione' });
  res.json(row);
});

// POST /api/announcements
router.post('/', authenticateToken, requirePermission('create_announcements'), (req, res) => {
  const { title, content, excerpt, image_url, image_alt, image_position, image_size, is_pinned, color, is_published } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Tytuł i treść są wymagane' });

  const db = getDb();
  const result = db.prepare(`INSERT INTO announcements (title, content, excerpt, author_id, image_url, image_alt, image_position, image_size, is_pinned, color, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(title, content, excerpt || null, req.user.id, image_url || null, image_alt || null, image_position || 'top', image_size || 'full', is_pinned ? 1 : 0, color || '#1D4ED8', is_published !== undefined ? is_published : 1);

  logAction(req.user.id, req.user.username, 'Dodano ogłoszenie', 'announcements', { title }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Ogłoszenie dodane' });
});

// PUT /api/announcements/:id
router.put('/:id', authenticateToken, requirePermission('edit_announcements'), (req, res) => {
  const { title, content, excerpt, image_url, image_alt, image_position, image_size, is_pinned, color, is_published } = req.body;
  const db = getDb();
  const ann = db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(req.params.id);
  if (!ann) return res.status(404).json({ error: 'Ogłoszenie nie znalezione' });

  db.prepare(`UPDATE announcements SET title=?, content=?, excerpt=?, image_url=?, image_alt=?, image_position=?, image_size=?, is_pinned=?, color=?, is_published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(
      title || ann.title, content || ann.content,
      excerpt !== undefined ? (excerpt || null) : ann.excerpt,
      image_url !== undefined ? image_url : ann.image_url,
      image_alt !== undefined ? (image_alt || null) : ann.image_alt,
      image_position || ann.image_position || 'top',
      image_size || ann.image_size || 'full',
      is_pinned !== undefined ? (is_pinned ? 1 : 0) : ann.is_pinned,
      color || ann.color, is_published !== undefined ? is_published : ann.is_published,
      req.params.id
    );

  logAction(req.user.id, req.user.username, 'Edytowano ogłoszenie', 'announcements', { title: title || ann.title }, req.ip);
  res.json({ message: 'Ogłoszenie zaktualizowane' });
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticateToken, requirePermission('delete_announcements'), (req, res) => {
  const db = getDb();
  const ann = db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(req.params.id);
  if (!ann) return res.status(404).json({ error: 'Ogłoszenie nie znalezione' });

  // remove uploaded image file if it's from our server
  if (ann.image_url && ann.image_url.startsWith('/uploads/announcements/')) {
    const fp = path.join(__dirname, '..', '..', 'public', ann.image_url);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.prepare(`DELETE FROM announcements WHERE id = ?`).run(req.params.id);
  logAction(req.user.id, req.user.username, 'Usunięto ogłoszenie', 'announcements', { title: ann.title }, req.ip);
  res.json({ message: 'Ogłoszenie usunięte' });
});

module.exports = router;
