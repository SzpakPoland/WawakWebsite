async function renderAdminDiscounts(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>🏷️ Zniżki</h2>
      <button class="btn btn-primary" id="btn-add-discount">➕ Dodaj plakat</button>
    </div>
    <div id="discounts-admin-grid"><div class="spinner"></div></div>`;

  document.getElementById('btn-add-discount').addEventListener('click', showAddDiscountModal);
  await loadAdminDiscounts();
}

async function loadAdminDiscounts() {
  const wrap = document.getElementById('discounts-admin-grid');
  if (!wrap) return;
  try {
    const items = await API.getAllDiscounts();
    if (!items.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="emoji">🏷️</span><h3>Brak plakatów zniżek</h3><p>Dodaj pierwszy plakat!</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px">
        ${items.map(item => `
          <div class="card" style="padding:0;overflow:hidden;opacity:${item.is_active ? '1' : '0.55'}">
            <div style="background:#f1f5f9;overflow:hidden;position:relative">
              <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}"
                style="width:100%;max-height:300px;object-fit:contain;display:block" loading="lazy" />
              ${!item.is_active ? `<div style="position:absolute;top:10px;left:10px"><span class="badge badge-muted">Ukryty</span></div>` : ''}
            </div>
            <div style="padding:14px 16px">
              <div style="font-weight:700;font-size:0.97rem;margin-bottom:4px">${escapeHtml(item.title)}</div>
              ${item.description ? `<div style="font-size:0.83rem;color:var(--text-muted);margin-bottom:8px">${escapeHtml(item.description)}</div>` : ''}
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-sm btn-outline btn-edit-discount"
                  data-id="${item.id}"
                  data-title="${escapeHtml(item.title)}"
                  data-desc="${escapeHtml(item.description || '')}"
                  data-active="${item.is_active}">✏️ Edytuj</button>
                <button class="btn btn-sm btn-danger btn-del-discount" data-id="${item.id}" data-title="${escapeHtml(item.title)}">🗑️</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;

    document.querySelectorAll('.btn-edit-discount').forEach(btn => {
      btn.addEventListener('click', () => showEditDiscountModal(btn.dataset.id, btn.dataset.title, btn.dataset.desc, btn.dataset.active === '1'));
    });
    document.querySelectorAll('.btn-del-discount').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteDiscount(btn.dataset.id, btn.dataset.title));
    });
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${escapeHtml(e.message)}</h3></div>`;
  }
}

function showAddDiscountModal() {
  openModal(`
    <h3 class="modal-title">➕ Dodaj plakat zniżki</h3>
    <form id="add-discount-form" enctype="multipart/form-data">
      <div class="form-group">
        <label>Tytuł</label>
        <input type="text" id="discount-title" class="form-control" placeholder="Nazwa zniżki..." required />
      </div>
      <div class="form-group">
        <label>Opis (opcjonalnie)</label>
        <input type="text" id="discount-desc" class="form-control" placeholder="Krótki opis..." />
      </div>
      <div class="form-group">
        <label>Plik plakatu</label>
        <input type="file" id="discount-file" class="form-control" accept="image/jpeg,image/png,image/gif,image/webp" required />
        <div class="form-hint">Formaty: JPG, PNG, GIF, WebP</div>
      </div>
      <div id="discount-preview" style="margin:12px 0;display:none">
        <img id="discount-preview-img" style="max-height:200px;border-radius:var(--radius-sm);object-fit:contain" />
      </div>
      <div id="add-discount-err" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary" id="add-discount-btn">➕ Dodaj</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`);

  document.getElementById('discount-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('discount-preview-img').src = ev.target.result;
        document.getElementById('discount-preview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('add-discount-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('add-discount-err');
    const btn = document.getElementById('add-discount-btn');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Dodawanie...';

    const formData = new FormData();
    formData.append('image', document.getElementById('discount-file').files[0]);
    formData.append('title', document.getElementById('discount-title').value.trim());
    const desc = document.getElementById('discount-desc').value.trim();
    if (desc) formData.append('description', desc);

    try {
      await API.uploadDiscount(formData);
      closeModal(); showToast('Plakat dodany', 'success');
      await loadAdminDiscounts();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = '➕ Dodaj';
    }
  });
}

function showEditDiscountModal(id, title, desc, isActive) {
  openModal(`
    <h3 class="modal-title">✏️ Edytuj plakat</h3>
    <form id="edit-discount-form">
      <div class="form-group">
        <label>Tytuł</label>
        <input type="text" id="edit-discount-title" class="form-control" value="${escapeHtml(title)}" required />
      </div>
      <div class="form-group">
        <label>Opis</label>
        <input type="text" id="edit-discount-desc" class="form-control" value="${escapeHtml(desc)}" />
      </div>
      <div class="form-group">
        <label class="d-flex align-center gap-2" style="gap:10px;cursor:pointer">
          <input type="checkbox" id="edit-discount-active" ${isActive ? 'checked' : ''} />
          Widoczny publicznie
        </label>
      </div>
      <div id="edit-discount-err" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary">Zapisz</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`);

  document.getElementById('edit-discount-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('edit-discount-err');
    errEl.style.display = 'none';
    try {
      await API.updateDiscount(id, {
        title: document.getElementById('edit-discount-title').value.trim(),
        description: document.getElementById('edit-discount-desc').value.trim(),
        is_active: document.getElementById('edit-discount-active').checked ? 1 : 0,
      });
      closeModal(); showToast('Zapisano', 'success');
      await loadAdminDiscounts();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = 'block';
    }
  });
}

function confirmDeleteDiscount(id, title) {
  openModal(`
    <h3 class="modal-title">🗑️ Usuń plakat</h3>
    <p>Czy na pewno chcesz usunąć <strong>${escapeHtml(title)}</strong>? Operacja jest nieodwracalna.</p>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-danger" id="confirm-del-discount">Usuń</button>
      <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
    </div>`);
  document.getElementById('confirm-del-discount').addEventListener('click', async () => {
    try {
      await API.deleteDiscount(id);
      closeModal(); showToast('Plakat usunięty', 'success');
      await loadAdminDiscounts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
