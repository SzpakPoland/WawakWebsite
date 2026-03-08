const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken, requirePermission, logAction } = require('../middleware/auth');
const { checkAndRecordUpload, recordDelete, formatBytes } = require('../uploadLimits');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'discounts');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `discount-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Tylko pliki graficzne'), false);
    cb(null, true);
  }
});

// GET /api/discounts (public)
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM discounts WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`).all();
  res.json(rows);
});

// GET /api/discounts/all (admin)
router.get('/all', authenticateToken, requirePermission('manage_discounts'), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM discounts ORDER BY sort_order ASC, created_at DESC`).all();
  res.json(rows);
});

// POST /api/discounts
router.post('/', authenticateToken, requirePermission('manage_discounts'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku' });

  const relativePath = `/uploads/discounts/${req.file.filename}`;
  const quotaResult = checkAndRecordUpload(req.user.id, relativePath, req.file.size, req.user.username);
  if (!quotaResult.allowed) {
    fs.unlinkSync(req.file.path);
    return res.status(413).json({
      error: `Przekroczono limit miejsca na pliki. Dostępne: ${formatBytes(quotaResult.remaining)}, wymagane: ${formatBytes(req.file.size)}`
    });
  }

  const db = getDb();
  const { title = 'Zniżka', description = '' } = req.body;
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as mo FROM discounts`).get();
  const sortOrder = (maxOrder.mo || 0) + 1;

  const stmt = db.prepare(`INSERT INTO discounts (title, description, image_url, sort_order, created_by) VALUES (?, ?, ?, ?, ?)`);
  const result = stmt.run(title, description, relativePath, sortOrder, req.user.id);
  logAction(req.user.id, req.user.username, 'Dodano plakat zniżki', 'discounts', { title }, req.ip);
  res.json({ id: result.lastInsertRowid, image_url: relativePath });
});

// PUT /api/discounts/:id
router.put('/:id', authenticateToken, requirePermission('manage_discounts'), (req, res) => {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM discounts WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Nie znaleziono' });

  const { title, description, is_active } = req.body;
  db.prepare(`UPDATE discounts SET title = ?, description = ?, is_active = ? WHERE id = ?`)
    .run(title ?? item.title, description ?? item.description, is_active !== undefined ? (is_active ? 1 : 0) : item.is_active, item.id);
  logAction(req.user.id, req.user.username, 'Edytowano plakat zniżki', 'discounts', { id: item.id }, req.ip);
  res.json({ success: true });
});

// DELETE /api/discounts/:id
router.delete('/:id', authenticateToken, requirePermission('manage_discounts'), (req, res) => {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM discounts WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Nie znaleziono' });

  const fullPath = path.join(__dirname, '..', '..', 'public', item.image_url);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    recordDelete(item.image_url);
  }

  db.prepare(`DELETE FROM discounts WHERE id = ?`).run(item.id);
  logAction(req.user.id, req.user.username, 'Usunięto plakat zniżki', 'discounts', { title: item.title }, req.ip);
  res.json({ success: true });
});

module.exports = router;
