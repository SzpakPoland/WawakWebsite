const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authenticateToken, requirePermission, logAction } = require('../middleware/auth');

// POST /api/suggestions — public, anyone can submit
router.post('/', (req, res) => {
  const { content, category, is_anonymous, author_name, author_contact } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Treść sugestii jest wymagana' });
  if (content.trim().length < 10) return res.status(400).json({ error: 'Sugestia musi mieć co najmniej 10 znaków' });
  if (content.trim().length > 2000) return res.status(400).json({ error: 'Sugestia nie może przekraczać 2000 znaków' });

  const VALID_CATEGORIES = ['pomysł', 'problem', 'pytanie', 'pochwała', 'inne'];
  const cat = VALID_CATEGORIES.includes(category) ? category : 'inne';
  const anon = is_anonymous === false || is_anonymous === 'false' || is_anonymous === 0 ? 0 : 1;

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO suggestions (content, category, is_anonymous, author_name, author_contact)
    VALUES (?, ?, ?, ?, ?)
  `).run(content.trim(), cat, anon, anon ? null : (author_name || null), anon ? null : (author_contact || null));

  res.status(201).json({ id: result.lastInsertRowid, message: 'Sugestia wysłana — dziękujemy!' });
});

// GET /api/suggestions — admin only
router.get('/', authenticateToken, requirePermission('view_suggestions'), (req, res) => {
  const db = getDb();
  const { status, category, page = 1, limit = 25 } = req.query;

  let where = [];
  let params = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (category) { where.push('category = ?'); params.push(category); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM suggestions ${whereStr}`).get(...params);
  const rows = db.prepare(`SELECT * FROM suggestions ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, parseInt(limit), offset);

  res.json({ suggestions: rows, total: total.cnt, page: parseInt(page), limit: parseInt(limit) });
});

// PUT /api/suggestions/:id — update status / admin note
router.put('/:id', authenticateToken, requirePermission('manage_suggestions'), (req, res) => {
  const { status, admin_note } = req.body;
  const VALID_STATUS = ['nowe', 'przeczytane', 'w realizacji', 'zrealizowane', 'odrzucone'];
  const db = getDb();
  const sug = db.prepare(`SELECT * FROM suggestions WHERE id = ?`).get(req.params.id);
  if (!sug) return res.status(404).json({ error: 'Sugestia nie znaleziona' });

  db.prepare(`UPDATE suggestions SET status=?, admin_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(VALID_STATUS.includes(status) ? status : sug.status, admin_note !== undefined ? admin_note : sug.admin_note, req.params.id);

  logAction(req.user.id, req.user.username, 'Zaktualizowano sugestię', 'suggestions', { id: req.params.id, status }, req.ip);
  res.json({ message: 'Sugestia zaktualizowana' });
});

// DELETE /api/suggestions/:id
router.delete('/:id', authenticateToken, requirePermission('manage_suggestions'), (req, res) => {
  const db = getDb();
  const sug = db.prepare(`SELECT id FROM suggestions WHERE id = ?`).get(req.params.id);
  if (!sug) return res.status(404).json({ error: 'Sugestia nie znaleziona' });
  db.prepare(`DELETE FROM suggestions WHERE id = ?`).run(req.params.id);
  logAction(req.user.id, req.user.username, 'Usunięto sugestię', 'suggestions', { id: req.params.id }, req.ip);
  res.json({ message: 'Sugestia usunięta' });
});

module.exports = router;
