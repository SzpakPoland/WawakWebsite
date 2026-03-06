async function renderAdminGallery(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>🖼️ Galeria</h2>
      <button class="btn btn-primary" id="btn-upload-photo">📤 Dodaj zdjęcie</button>
    </div>
    <div id="gallery-admin-grid"><div class="spinner"></div></div>`;

  document.getElementById('btn-upload-photo').addEventListener('click', showUploadModal);
  await loadGalleryAdmin();
}

async function loadGalleryAdmin() {
  const wrap = document.getElementById('gallery-admin-grid');
  if (!wrap) return;
  try {
    const items = await API.getGallery();
    if (!items.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="emoji">📷</span><h3>Galeria jest pusta</h3><p>Dodaj pierwsze zdjęcie!</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
        ${items.map(item => `
          <div class="card" style="padding:0;overflow:hidden">
            <div style="position:relative;aspect-ratio:4/3;background:var(--border)">
              <img src="/uploads/gallery/${escapeHtml(item.filename)}" alt="${escapeHtml(item.description || '')}"
                style="width:100%;height:100%;object-fit:cover" loading="lazy" />
            </div>
            <div style="padding:12px 14px">
              <div style="font-size:0.82rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.original_name || item.filename)}</div>
              ${item.description ? `<div style="font-size:0.88rem;margin-top:4px">${escapeHtml(item.description)}</div>` : ''}
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-sm btn-outline btn-edit-photo" data-id="${item.id}" data-desc="${escapeHtml(item.description || '')}">✏️ Opis</button>
                <button class="btn btn-sm btn-danger btn-del-photo" data-id="${item.id}" data-name="${escapeHtml(item.original_name || item.filename)}">🗑️</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;

    document.querySelectorAll('.btn-edit-photo').forEach(btn => {
      btn.addEventListener('click', () => showEditPhotoModal(btn.dataset.id, btn.dataset.desc));
    });
    document.querySelectorAll('.btn-del-photo').forEach(btn => {
      btn.addEventListener('click', () => confirmDeletePhoto(btn.dataset.id, btn.dataset.name));
    });
  } catch (e) { wrap.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${e.message}</h3></div>`; }
}

function showUploadModal() {
  openModal(`
    <h3 class="modal-title">📤 Dodaj zdjęcie</h3>
    <form id="upload-form" enctype="multipart/form-data">
      <div class="form-group">
        <label>Plik graficzny</label>
        <input type="file" id="photo-file" class="form-control" accept="image/*" required />
        <div class="form-hint">Formaty: JPG, PNG, GIF, WebP</div>
      </div>
      <div class="form-group">
        <label>Opis (opcjonalnie)</label>
        <input type="text" id="photo-desc" class="form-control" placeholder="Opis zdjęcia..." />
      </div>
      <div id="upload-preview" style="margin:12px 0;display:none">
        <img id="preview-img" style="max-height:180px;border-radius:var(--radius-sm);object-fit:contain" />
      </div>
      <div id="upload-err" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary" id="upload-btn">📤 Prześlij</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`);

  document.getElementById('photo-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('preview-img').src = ev.target.result;
        document.getElementById('upload-preview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('upload-err');
    const btn = document.getElementById('upload-btn');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Przesyłanie...';

    const formData = new FormData();
    formData.append('image', document.getElementById('photo-file').files[0]);
    const desc = document.getElementById('photo-desc').value.trim();
    if (desc) formData.append('description', desc);

    try {
      await API.uploadPhoto(formData);
      closeModal(); showToast('Zdjęcie dodane do galerii', 'success');
      await loadGalleryAdmin();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = '📤 Prześlij';
    }
  });
}

function showEditPhotoModal(id, desc) {
  openModal(`
    <h3 class="modal-title">✏️ Edytuj opis</h3>
    <form id="edit-photo-form">
      <div class="form-group">
        <label>Opis zdjęcia</label>
        <input type="text" id="edit-desc" class="form-control" value="${escapeHtml(desc)}" placeholder="Opis zdjęcia..." />
      </div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary">Zapisz</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`);
  document.getElementById('edit-photo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.updatePhoto(id, { description: document.getElementById('edit-desc').value.trim() });
      closeModal(); showToast('Zaktualizowano', 'success');
      await loadGalleryAdmin();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function confirmDeletePhoto(id, name) {
  openModal(`
    <h3 class="modal-title">🗑️ Usuń zdjęcie</h3>
    <p>Czy na pewno chcesz usunąć <strong>"${name}"</strong>?</p>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-danger" id="confirm-del-photo">Usuń</button>
      <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
    </div>`);
  document.getElementById('confirm-del-photo').addEventListener('click', async () => {
    try {
      await API.deletePhoto(id);
      closeModal(); showToast('Zdjęcie usunięte', 'success');
      await loadGalleryAdmin();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
