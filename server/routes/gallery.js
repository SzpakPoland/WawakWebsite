const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken, requirePermission, logAction } = require('../middleware/auth');
const { checkAndRecordUpload, recordDelete, formatBytes } = require('../uploadLimits');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'gallery');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `gallery-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Tylko pliki graficzne'), false);
    cb(null, true);
  }
});

// GET /api/gallery (public)
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM gallery ORDER BY sort_order ASC, uploaded_at DESC`).all();
  res.json(rows);
});

// POST /api/gallery (upload)
router.post('/', authenticateToken, requirePermission('manage_gallery'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku' });

  // Quota check
  const relativePath = `/uploads/gallery/${req.file.filename}`;
  const quotaResult  = checkAndRecordUpload(req.user.id, relativePath, req.file.size, req.user.username);
  if (!quotaResult.allowed) {
    fs.unlinkSync(req.file.path);
    return res.status(413).json({
      error: `Przekroczono limit miejsca na pliki. Dostępne: ${formatBytes(quotaResult.remaining)}, wymagane: ${formatBytes(req.file.size)}`
    });
  }

  const db = getDb();
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as mo FROM gallery`).get();
  const description = req.body.description || '';
  const result = db.prepare(`INSERT INTO gallery (filename, original_name, description, sort_order, uploaded_by) VALUES (?, ?, ?, ?, ?)`)
    .run(req.file.filename, req.file.originalname, description, (maxOrder.mo || 0) + 1, req.user.id);

  logAction(req.user.id, req.user.username, 'Dodano zdjęcie do galerii', 'gallery', { filename: req.file.originalname }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, filename: req.file.filename, message: 'Zdjęcie dodane' });
});

// PUT /api/gallery/:id
router.put('/:id', authenticateToken, requirePermission('manage_gallery'), (req, res) => {
  const { description, sort_order } = req.body;
  const db = getDb();
  const item = db.prepare(`SELECT * FROM gallery WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Zdjęcie nie znalezione' });

  db.prepare(`UPDATE gallery SET description=?, sort_order=? WHERE id=?`)
    .run(description !== undefined ? description : item.description,
         sort_order !== undefined ? sort_order : item.sort_order, req.params.id);

  logAction(req.user.id, req.user.username, 'Edytowano zdjęcie w galerii', 'gallery', { id: req.params.id }, req.ip);
  res.json({ message: 'Zaktualizowano' });
});

// DELETE /api/gallery/:id
router.delete('/:id', authenticateToken, requirePermission('manage_gallery'), (req, res) => {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM gallery WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Zdjęcie nie znalezione' });

  const filePath = path.join(uploadDir, item.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  recordDelete(`/uploads/gallery/${item.filename}`);

  db.prepare(`DELETE FROM gallery WHERE id = ?`).run(req.params.id);
  logAction(req.user.id, req.user.username, 'Usunięto zdjęcie z galerii', 'gallery', { filename: item.original_name }, req.ip);
  res.json({ message: 'Zdjęcie usunięte' });
});

module.exports = router;
