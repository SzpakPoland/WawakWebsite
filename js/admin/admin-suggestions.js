/* =====================================================
   Admin: Skrzynka Sugestii
   ===================================================== */
const STATUS_CONFIG = {
  'nowe':        { label: 'Nowe',         badge: 'badge-danger',  icon: '🆕' },
  'przeczytane': { label: 'Przeczytane',  badge: 'badge-warning', icon: '👁️' },
  'w realizacji':{ label: 'W realizacji', badge: 'badge-primary', icon: '⚙️' },
  'zrealizowane':{ label: 'Zrealizowane', badge: 'badge-success', icon: '✅' },
  'odrzucone':   { label: 'Odrzucone',    badge: 'badge-muted',   icon: '❌' },
};
let _sugPage = 1;
let _sugStatus = '';

async function renderAdminSuggestions(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>📬 Skrzynka Sugestii</h2>
      <span id="sug-unread-badge"></span>
    </div>

    <div class="filters-bar" style="margin-bottom:20px">
      <select id="sug-filter-status" class="form-control" style="max-width:180px">
        <option value="">Wszystkie statusy</option>
        ${Object.entries(STATUS_CONFIG).map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
      </select>
      <button class="btn btn-outline" id="sug-refresh-btn">🔄 Odśwież</button>
    </div>

    <div id="sug-list"></div>
    <div id="sug-pagination" style="margin-top:20px"></div>`;

  document.getElementById('sug-filter-status').addEventListener('change', (e) => { _sugStatus = e.target.value; _sugPage = 1; loadSuggestions(); });
  document.getElementById('sug-refresh-btn').addEventListener('click', loadSuggestions);

  _sugPage = 1; _sugStatus = '';
  await loadSuggestions();
}

async function loadSuggestions() {
  const list = document.getElementById('sug-list');
  if (!list) return;
  list.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

  try {
    const data = await API.getSuggestions({ status: _sugStatus, page: _sugPage, limit: 20 });
    const { suggestions, total } = data;

    // Unread badge
    const unreadBadge = document.getElementById('sug-unread-badge');
    if (unreadBadge) {
      const newCount = suggestions.filter(s => s.status === 'nowe').length;
      if (newCount) unreadBadge.innerHTML = `<span class="badge badge-danger">${newCount} nowych</span>`;
      else unreadBadge.innerHTML = '';
    }

    if (!suggestions.length) {
      list.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><h3>Brak sugestii</h3><p>Nic nie znaleziono dla wybranych filtrów.</p></div>`;
      document.getElementById('sug-pagination').innerHTML = '';
      return;
    }

    list.innerHTML = suggestions.map(s => {
      const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG['nowe'];
      const authorInfo = s.is_anonymous
        ? '<span style="color:var(--text-muted);font-size:0.82rem">🔒 Anonimowy</span>'
        : `<span style="font-size:0.82rem;font-weight:600">${escapeHtml(s.author_name || 'Bez nazwy')}</span>${s.author_contact ? `<span style="color:var(--text-muted);font-size:0.78rem;margin-left:6px">${escapeHtml(s.author_contact)}</span>` : ''}`;

      return `
        <div class="suggestion-card ${s.status === 'nowe' ? 'suggestion-card--new' : ''}" id="sug-card-${s.id}">
          <div class="suggestion-card-header">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="badge ${cfg.badge}">${cfg.icon} ${cfg.label}</span>
              <span style="color:var(--text-muted);font-size:0.8rem;margin-left:auto">${formatDateTime(s.created_at)}</span>
            </div>
            <div style="margin-top:6px">${authorInfo}</div>
          </div>
          <div class="suggestion-card-body">
            <p style="white-space:pre-wrap;font-size:0.92rem;color:var(--text);line-height:1.65">${escapeHtml(s.content)}</p>
            ${s.admin_note ? `<div class="suggestion-admin-note">💬 Notatka admina: ${escapeHtml(s.admin_note)}</div>` : ''}
          </div>
          <div class="suggestion-card-footer">
            <select class="form-control form-control-sm sug-status-select" data-id="${s.id}" title="Zmień status">
              ${Object.entries(STATUS_CONFIG).map(([k,v]) => `<option value="${k}" ${s.status===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-outline sug-note-btn" data-id="${s.id}" data-note="${escapeHtml(s.admin_note||'')}">📝 Notatka</button>
            <button class="btn btn-sm btn-danger sug-del-btn" data-id="${s.id}">🗑️</button>
          </div>
        </div>`;
    }).join('');

    // Status change
    list.querySelectorAll('.sug-status-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        try {
          await API.updateSuggestion(sel.dataset.id, { status: e.target.value });
          showToast('Status zmieniony', 'success');
          await loadSuggestions();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    // Note
    list.querySelectorAll('.sug-note-btn').forEach(btn => {
      btn.addEventListener('click', () => openSuggestionNoteModal(btn.dataset.id, btn.dataset.note));
    });

    // Delete
    list.querySelectorAll('.sug-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Usunąć tę sugestię?')) return;
        try {
          await API.deleteSuggestion(btn.dataset.id);
          showToast('Sugestia usunięta', 'success');
          await loadSuggestions();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    // Pagination
    const totalPages = Math.ceil(total / 20);
    const pag = document.getElementById('sug-pagination');
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    pag.innerHTML = `<div class="pagination">
      ${_sugPage > 1 ? `<button class="page-btn" id="sug-prev">←</button>` : ''}
      <span style="padding:0 12px;font-size:0.9rem;color:var(--text-muted)">Strona ${_sugPage} z ${totalPages} (${total} szt.)</span>
      ${_sugPage < totalPages ? `<button class="page-btn" id="sug-next">→</button>` : ''}
    </div>`;
    document.getElementById('sug-prev')?.addEventListener('click', () => { _sugPage--; loadSuggestions(); });
    document.getElementById('sug-next')?.addEventListener('click', () => { _sugPage++; loadSuggestions(); });

  } catch (err) {
    list.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${escapeHtml(err.message)}</h3></div>`;
  }
}

function openSuggestionNoteModal(id, currentNote) {
  openModal(`
    <h3 class="modal-title">📝 Notatka admina</h3>
    <p style="margin-bottom:16px;font-size:0.88rem;color:var(--text-muted)">Wewnętrzna notatka widoczna tylko dla adminów.</p>
    <div class="form-group">
      <textarea id="sug-note-text" class="form-control" rows="5" placeholder="Wpisz notatkę...">${escapeHtml(currentNote)}</textarea>
    </div>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-primary" id="sug-note-save">💾 Zapisz</button>
      <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
    </div>`);

  document.getElementById('sug-note-save').addEventListener('click', async () => {
    try {
      await API.updateSuggestion(id, { admin_note: document.getElementById('sug-note-text').value.trim() || null });
      closeModal(); showToast('Notatka zapisana', 'success');
      await loadSuggestions();
    } catch (err) { showToast(err.message, 'error'); }
  });
}
