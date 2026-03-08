const COLORS = ['#1D4ED8','#DC2626','#16a34a','#ca8a04','#0891b2','#ea580c','#7c3aed','#0f766e','#db2777','#9333ea','#0369a1','#b45309'];

async function renderAdminAnnouncements(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>📢 Ogłoszenia</h2>
      <button class="btn btn-primary" id="btn-add-ann">+ Nowe ogłoszenie</button>
    </div>
    <div id="ann-admin-list"><div class="spinner"></div></div>`;

  document.getElementById('btn-add-ann').addEventListener('click', () => showAnnouncementModal(null));
  await loadAnnouncementsAdmin();
}

async function loadAnnouncementsAdmin() {
  const wrap = document.getElementById('ann-admin-list');
  if (!wrap) return;
  try {
    const anns = await API.getAllAnnouncements();
    if (!anns.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><h3>Brak ogłoszeń</h3></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tytuł</th><th>Autor</th><th>Status</th><th>Data</th><th>Akcje</th></tr>
          </thead>
          <tbody>
            ${anns.map(a => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                    <div style="width:14px;height:14px;border-radius:4px;background:${escapeHtml(a.color)};flex-shrink:0"></div>
                    <span class="fw-700">${escapeHtml(a.title)}</span>
                    ${a.is_pinned ? '<span style="font-size:0.72rem;background:#fee2e2;color:#b91c1c;padding:2px 7px;border-radius:999px;font-weight:700">📌</span>' : ''}
                  </div>
                </td>
                <td>${escapeHtml(a.author_name || '—')}</td>
                <td><span class="badge ${a.is_published ? 'badge-success' : 'badge-muted'}">${a.is_published ? 'Opublikowane' : 'Ukryte'}</span></td>
                <td style="font-size:0.85rem">${formatDate(a.created_at)}</td>
                <td>
                  <div class="actions-cell">
                    <button class="btn btn-sm btn-outline btn-edit-ann" data-id="${a.id}" title="Edytuj">✏️</button>
                    <button class="btn btn-sm btn-${a.is_published ? 'ghost' : 'success'} btn-toggle-ann" data-id="${a.id}" data-pub="${a.is_published}" title="${a.is_published ? 'Ukryj' : 'Opublikuj'}">${a.is_published ? '👁️' : '✅'}</button>
                    <button class="btn btn-sm btn-danger btn-del-ann" data-id="${a.id}" data-title="${escapeHtml(a.title)}" title="Usuń">🗑️</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    document.querySelectorAll('.btn-edit-ann').forEach(btn => {
      btn.addEventListener('click', () => showAnnouncementModal(anns.find(a => a.id == btn.dataset.id)));
    });
    document.querySelectorAll('.btn-toggle-ann').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await API.updateAnnouncement(btn.dataset.id, { is_published: btn.dataset.pub == '1' ? 0 : 1 });
          showToast('Status ogłoszenia zmieniony', 'success');
          await loadAnnouncementsAdmin();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
    document.querySelectorAll('.btn-del-ann').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteAnnouncement(btn.dataset.id, btn.dataset.title));
    });
  } catch (e) { wrap.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${e.message}</h3></div>`; }
}

function showAnnouncementModal(ann) {
  const isEdit = !!ann;
  const currentColor = ann ? ann.color : '#1D4ED8';
  openModal(`
    <h3 class="modal-title">${isEdit ? '✏️ Edytuj ogłoszenie' : '+ Nowe ogłoszenie'}</h3>
    <form id="ann-form">
      <div class="form-row">
        <div class="form-group">
          <label>Tytuł <span style="color:#ef4444">*</span></label>
          <input type="text" id="ann-title" class="form-control" value="${isEdit ? escapeHtml(ann.title) : ''}" required placeholder="Tytuł ogłoszenia" />
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;gap:12px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px">
            <input type="checkbox" id="ann-pinned" ${isEdit && ann.is_pinned ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--secondary)" />
            <span style="font-weight:600">📌 Przypnij na górze</span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Krótki opis <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(opcjonalny — widoczny na karcie i liście)</span></label>
        <textarea id="ann-excerpt" class="form-control" rows="2" placeholder="Krótkie streszczenie ogłoszenia (maks. ~200 znaków)...">${isEdit && ann.excerpt ? escapeHtml(ann.excerpt) : ''}</textarea>
      </div>
      <div class="form-group">
        <label>Treść <span style="color:#ef4444">*</span></label>
        <textarea id="ann-content" class="form-control" required rows="7" placeholder="Pełna treść ogłoszenia...">${isEdit ? escapeHtml(ann.content) : ''}</textarea>
      </div>
      <div class="form-group">
        <label>Grafika ogłoszenia</label>
        <div class="ann-image-upload-area" id="ann-image-preview-area">
          ${isEdit && ann.image_url ? `<div class="ann-img-preview"><img src="${escapeHtml(ann.image_url)}" alt="podgląd" /><button type="button" class="ann-img-remove" id="ann-img-remove" title="Usuń grafikę">&times;</button></div>` : '<div class="ann-img-placeholder">🖼️ Brak grafiki</div>'}
        </div>
        <input type="hidden" id="ann-image" value="${isEdit && ann.image_url ? escapeHtml(ann.image_url) : ''}" />
        <div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <label class="btn btn-sm btn-outline" style="margin:0;cursor:pointer" for="ann-image-file">
            📤 Wgraj plik
          </label>
          <input type="file" id="ann-image-file" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none" />
          <span style="color:var(--text-muted);font-size:0.82rem">lub</span>
          <input type="text" id="ann-image-url" class="form-control" style="flex:1;min-width:180px" value="${isEdit && ann.image_url && !ann.image_url.startsWith('/uploads/') ? escapeHtml(ann.image_url) : ''}" placeholder="Wklej URL obrazka..." />
        </div>
        <p class="form-hint">JPG, PNG, GIF, WebP</p>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tekst alternatywny (alt)</label>
          <input type="text" id="ann-image-alt" class="form-control" value="${isEdit && ann.image_alt ? escapeHtml(ann.image_alt) : ''}" placeholder="Opis zdjęcia dla czytników ekranu..." />
        </div>
        <div class="form-group">
          <label>Rozmiar zdjęcia</label>
          <select id="ann-image-size" class="form-control">
            <option value="full" ${!isEdit || ann.image_size === 'full' ? 'selected' : ''}>Pełna szerokość</option>
            <option value="contained" ${isEdit && ann.image_size === 'contained' ? 'selected' : ''}>Wyśrodkowany (max 700px)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Pozycja zdjęcia na stronie ogłoszenia</label>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px" id="ann-pos-group">
          ${[['top','⬆️ Góra'],['left','◀️ Lewa strona'],['right','▶️ Prawa strona'],['bg','🖼️ Tło nagłówka']].map(([val, label]) => `
          <label style="border:2px solid ${isEdit && ann.image_position === val ? 'var(--primary)' : 'var(--border)'};border-radius:var(--radius-sm);padding:10px 8px;text-align:center;cursor:pointer;font-size:0.82rem;font-weight:600;background:${isEdit && ann.image_position === val ? 'var(--primary-light)' : 'white'}" id="ann-pos-label-${val}">
            <input type="radio" name="ann-pos" value="${val}" ${(!isEdit && val === 'top') || (isEdit && ann.image_position === val) ? 'checked' : ''} style="display:none" />
            ${label}
          </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Kolor karty</label>
        <input type="hidden" id="ann-color" value="${escapeHtml(currentColor)}" />
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div class="color-swatches" style="margin:0">
            ${COLORS.map(c => `<div class="color-swatch${c === currentColor ? ' selected' : ''}" style="background:${c}" data-color="${c}" title="${c}"></div>`).join('')}
          </div>
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:600;color:var(--text-muted);cursor:pointer">
            🎨 Własny:
            <input type="color" id="ann-color-custom" value="${escapeHtml(currentColor)}" style="width:36px;height:32px;border:2px solid var(--border);border-radius:6px;cursor:pointer;padding:2px" />
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="ann-published" class="form-control">
          <option value="1" ${!ann || ann.is_published ? 'selected' : ''}>Opublikowane</option>
          <option value="0" ${ann && !ann.is_published ? 'selected' : ''}>Ukryte</option>
        </select>
      </div>
      <div id="ann-form-err" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary">💾 Zapisz</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`, true);

  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      document.getElementById('ann-color').value = sw.dataset.color;
      document.getElementById('ann-color-custom').value = sw.dataset.color;
    });
  });

  // Custom color picker sync
  document.getElementById('ann-color-custom').addEventListener('input', (e) => {
    document.getElementById('ann-color').value = e.target.value;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  });

  // File upload handler
  document.getElementById('ann-image-file').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      showLoading(true);
      const res = await API.uploadAnnouncementImage(fd);
      document.getElementById('ann-image').value = res.image_url;
      document.getElementById('ann-image-url').value = '';
      document.getElementById('ann-image-preview-area').innerHTML =
        `<div class="ann-img-preview"><img src="${escapeHtml(res.image_url)}" alt="podgląd" /><button type="button" class="ann-img-remove" id="ann-img-remove" title="Usuń grafikę">&times;</button></div>`;
      bindRemoveBtn();
      showToast('Grafika wgrana pomyślnie', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { showLoading(false); e.target.value = ''; }
  });

  // URL field sync
  document.getElementById('ann-image-url').addEventListener('input', (e) => {
    const url = e.target.value.trim();
    document.getElementById('ann-image').value = url;
    if (url) {
      document.getElementById('ann-image-preview-area').innerHTML =
        `<div class="ann-img-preview"><img src="${escapeHtml(url)}" alt="podgląd" onerror="this.style.display='none'" /><button type="button" class="ann-img-remove" id="ann-img-remove" title="Usuń grafikę">&times;</button></div>`;
      bindRemoveBtn();
    } else {
      document.getElementById('ann-image-preview-area').innerHTML = '<div class="ann-img-placeholder">🖼️ Brak grafiki</div>';
    }
  });

  function bindRemoveBtn() {
    const btn = document.getElementById('ann-img-remove');
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.getElementById('ann-image').value = '';
      document.getElementById('ann-image-url').value = '';
      document.getElementById('ann-image-preview-area').innerHTML = '<div class="ann-img-placeholder">🖼️ Brak grafiki</div>';
    });
  }
  bindRemoveBtn();

  // Image position radio styling
  document.querySelectorAll('input[name="ann-pos"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('input[name="ann-pos"]').forEach(r => {
        const lbl = document.getElementById(`ann-pos-label-${r.value}`);
        if (lbl) { lbl.style.borderColor = r.checked ? 'var(--primary)' : 'var(--border)'; lbl.style.background = r.checked ? 'var(--primary-light)' : 'white'; }
      });
    });
  });

  document.getElementById('ann-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('ann-form-err');
    errEl.style.display = 'none';
    // URL field takes precedence if filled, otherwise use hidden value (uploaded file)
    const urlField = document.getElementById('ann-image-url').value.trim();
    const imageVal = urlField || document.getElementById('ann-image').value.trim() || null;
    const posEl = document.querySelector('input[name="ann-pos"]:checked');
    const data = {
      title: document.getElementById('ann-title').value.trim(),
      content: document.getElementById('ann-content').value.trim(),
      excerpt: document.getElementById('ann-excerpt').value.trim() || null,
      image_url: imageVal,
      image_alt: document.getElementById('ann-image-alt').value.trim() || null,
      image_position: posEl ? posEl.value : 'top',
      image_size: document.getElementById('ann-image-size').value,
      is_pinned: document.getElementById('ann-pinned').checked ? 1 : 0,
      color: document.getElementById('ann-color').value,
      is_published: parseInt(document.getElementById('ann-published').value),
    };
    try {
      if (isEdit) await API.updateAnnouncement(ann.id, data);
      else await API.createAnnouncement(data);
      closeModal(); showToast(isEdit ? 'Ogłoszenie zaktualizowane' : 'Ogłoszenie dodane', 'success');
      await loadAnnouncementsAdmin();
    } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
  });
}

async function confirmDeleteAnnouncement(id, title) {
  openModal(`
    <h3 class="modal-title">🗑️ Usuń ogłoszenie</h3>
    <p>Czy na pewno chcesz usunąć ogłoszenie <strong>"${title}"</strong>?</p>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-danger" id="confirm-del-ann">Usuń</button>
      <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
    </div>`);
  document.getElementById('confirm-del-ann').addEventListener('click', async () => {
    try {
      await API.deleteAnnouncement(id);
      closeModal(); showToast('Ogłoszenie usunięte', 'success');
      await loadAnnouncementsAdmin();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
