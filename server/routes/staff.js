const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken, requirePermission, logAction } = require('../middleware/auth');
const { checkAndRecordUpload, recordDelete, formatBytes } = require('../uploadLimits');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'staff');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `staff-${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Tylko obrazy'));
  cb(null, true);
}});

// GET /api/staff (public)
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM staff_members WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`).all();
  res.json(rows);
});

// GET /api/staff/all (admin)
router.get('/all', authenticateToken, requirePermission('manage_staff'), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM staff_members ORDER BY sort_order ASC, name ASC`).all();
  res.json(rows);
});

// POST /api/staff
router.post('/', authenticateToken, requirePermission('manage_staff'), upload.single('photo'), (req, res) => {
  const { name, role_title, description, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Imię i nazwisko jest wymagane' });

  // Quota check for photo
  if (req.file) {
    const relativePath = `/uploads/staff/${req.file.filename}`;
    const quotaResult  = checkAndRecordUpload(req.user.id, relativePath, req.file.size, req.user.username);
    if (!quotaResult.allowed) {
      fs.unlinkSync(req.file.path);
      return res.status(413).json({
        error: `Przekroczono limit miejsca na pliki. Dostępne: ${formatBytes(quotaResult.remaining)}, wymagane: ${formatBytes(req.file.size)}`
      });
    }
  }

  const db = getDb();
  const photo_url = req.file ? `/uploads/staff/${req.file.filename}` : null;
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as mo FROM staff_members`).get();
  const result = db.prepare(`INSERT INTO staff_members (name, role_title, description, photo_url, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .run(name, role_title || '', description || '', photo_url, sort_order !== undefined ? sort_order : (maxOrder.mo || 0) + 1);

  logAction(req.user.id, req.user.username, 'Dodano członka sztabu', 'staff', { name }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Członek dodany' });
});

// PUT /api/staff/:id
router.put('/:id', authenticateToken, requirePermission('manage_staff'), upload.single('photo'), (req, res) => {
  const { name, role_title, description, sort_order, is_active } = req.body;
  const db = getDb();
  const member = db.prepare(`SELECT * FROM staff_members WHERE id = ?`).get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Członek nie znaleziony' });

  let photo_url = member.photo_url;
  if (req.file) {
    // Quota check before accepting new photo
    const relativePath = `/uploads/staff/${req.file.filename}`;
    const quotaResult  = checkAndRecordUpload(req.user.id, relativePath, req.file.size, req.user.username);
    if (!quotaResult.allowed) {
      fs.unlinkSync(req.file.path);
      return res.status(413).json({
        error: `Przekroczono limit miejsca na pliki. Dostępne: ${formatBytes(quotaResult.remaining)}, wymagane: ${formatBytes(req.file.size)}`
      });
    }

    // Remove old photo
    if (member.photo_url) {
      const old = path.join(__dirname, '..', '..', 'public', member.photo_url);
      if (fs.existsSync(old)) fs.unlinkSync(old);
      recordDelete(member.photo_url);
    }
    photo_url = relativePath;
  }

  db.prepare(`UPDATE staff_members SET name=?, role_title=?, description=?, photo_url=?, sort_order=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name || member.name, role_title !== undefined ? role_title : member.role_title,
         description !== undefined ? description : member.description, photo_url,
         sort_order !== undefined ? sort_order : member.sort_order,
         is_active !== undefined ? is_active : member.is_active, req.params.id);

  logAction(req.user.id, req.user.username, 'Edytowano członka sztabu', 'staff', { name: name || member.name }, req.ip);
  res.json({ message: 'Zaktualizowano' });
});

// DELETE /api/staff/:id
router.delete('/:id', authenticateToken, requirePermission('manage_staff'), (req, res) => {
  const db = getDb();
  const member = db.prepare(`SELECT * FROM staff_members WHERE id = ?`).get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Członek nie znaleziony' });

  if (member.photo_url) {
    const fp = path.join(__dirname, '..', '..', 'public', member.photo_url);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    recordDelete(member.photo_url);
  }
  db.prepare(`DELETE FROM staff_members WHERE id = ?`).run(req.params.id);
  logAction(req.user.id, req.user.username, 'Usunięto członka sztabu', 'staff', { name: member.name }, req.ip);
  res.json({ message: 'Usunięto' });
});

module.exports = router;
