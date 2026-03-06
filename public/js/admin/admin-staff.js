async function renderAdminStaff(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>👥 Zarządzanie Sztabem</h2>
      <button class="btn btn-primary" id="btn-add-staff">+ Dodaj członka</button>
    </div>
    <div id="staff-admin-list"><div class="spinner"></div></div>`;

  document.getElementById('btn-add-staff').addEventListener('click', () => showStaffModal(null));
  await loadStaffAdmin();
}

async function loadStaffAdmin() {
  const wrap = document.getElementById('staff-admin-list');
  if (!wrap) return;
  try {
    const members = await API.getAllStaff();
    if (!members.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="emoji">👥</span><h3>Brak członków sztabu</h3></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
        ${members.map(m => `
          <div class="card" style="padding:0;overflow:hidden" data-id="${m.id}">
            <div style="display:flex;align-items:center;gap:16px;padding:20px">
              ${m.photo_url
                ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.name)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--primary-light)" />`
                : `<div style="width:60px;height:60px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">👤</div>`}
              <div style="flex:1;min-width:0">
                <div class="fw-700">${escapeHtml(m.name)}</div>
                <div style="font-size:0.82rem;color:var(--primary);font-weight:600">${escapeHtml(m.role_title || '')}</div>
                ${m.description ? `<div style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.description)}</div>` : ''}
              </div>
              <span class="badge ${m.is_active ? 'badge-success' : 'badge-muted'}">${m.is_active ? 'Aktywny' : 'Ukryty'}</span>
            </div>
            <div style="padding:0 20px 16px;display:flex;gap:8px;border-top:1px solid var(--border);padding-top:12px">
              <button class="btn btn-sm btn-outline btn-edit-staff" data-id="${m.id}" style="flex:1">✏️ Edytuj</button>
              <button class="btn btn-sm btn-danger btn-del-staff" data-id="${m.id}" data-name="${escapeHtml(m.name)}">🗑️</button>
            </div>
          </div>`).join('')}
      </div>`;

    document.querySelectorAll('.btn-edit-staff').forEach(btn => {
      btn.addEventListener('click', () => showStaffModal(members.find(m => m.id == btn.dataset.id)));
    });
    document.querySelectorAll('.btn-del-staff').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteStaff(btn.dataset.id, btn.dataset.name));
    });
  } catch (e) { wrap.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${e.message}</h3></div>`; }
}

function showStaffModal(member) {
  const isEdit = !!member;
  openModal(`
    <h3 class="modal-title">${isEdit ? '✏️ Edytuj członka sztabu' : '+ Dodaj członka sztabu'}</h3>
    <form id="staff-form" enctype="multipart/form-data">
      <div class="form-row">
        <div class="form-group">
          <label>Imię i nazwisko *</label>
          <input type="text" id="s-name" class="form-control" value="${isEdit ? escapeHtml(member.name) : ''}" required placeholder="Jan Kowalski" />
        </div>
        <div class="form-group">
          <label>Rola w sztabie</label>
          <input type="text" id="s-role" class="form-control" value="${isEdit ? escapeHtml(member.role_title || '') : ''}" placeholder="np. Koordynator" />
        </div>
      </div>
      <div class="form-group">
        <label>Opis (opcjonalnie)</label>
        <textarea id="s-desc" class="form-control" rows="3" placeholder="Krótki opis...">${isEdit ? escapeHtml(member.description || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label>Zdjęcie ${isEdit && member.photo_url ? '(zostaw puste żeby zachować obecne)' : ''}</label>
        ${isEdit && member.photo_url ? `<img src="${escapeHtml(member.photo_url)}" alt="" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-bottom:8px" />` : ''}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Kolejność</label>
          <input type="number" id="s-order" class="form-control" value="${isEdit ? member.sort_order : ''}" placeholder="0" />
        </div>
        ${isEdit ? `
          <div class="form-group">
            <label>Status</label>
            <select id="s-active" class="form-control">
              <option value="1" ${member.is_active ? 'selected' : ''}>Aktywny (widoczny)</option>
              <option value="0" ${!member.is_active ? 'selected' : ''}>Ukryty</option>
            </select>
          </div>` : ''}
      </div>
      <div id="staff-form-err" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary">💾 Zapisz</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`, true);

  document.getElementById('staff-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('staff-form-err');
    errEl.style.display = 'none';
    const formData = new FormData();
    formData.append('name', document.getElementById('s-name').value.trim());
    formData.append('role_title', document.getElementById('s-role').value.trim());
    formData.append('description', document.getElementById('s-desc').value.trim());
    const order = document.getElementById('s-order').value;
    if (order !== '') formData.append('sort_order', order);
    if (isEdit && document.getElementById('s-active')) formData.append('is_active', document.getElementById('s-active').value);
    const photo = document.getElementById('s-photo').files[0];
    if (photo) formData.append('photo', photo);

    try {
      if (isEdit) await API.updateStaffMember(member.id, formData);
      else await API.createStaffMember(formData);
      closeModal(); showToast(isEdit ? 'Zaktualizowano' : 'Dodano członka sztabu', 'success');
      await loadStaffAdmin();
    } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
  });
}

async function confirmDeleteStaff(id, name) {
  openModal(`
    <h3 class="modal-title">🗑️ Usuń członka</h3>
    <p>Czy na pewno chcesz usunąć <strong>${name}</strong> ze sztabu?</p>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-danger" id="confirm-del-staff">Usuń</button>
      <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
    </div>`);
  document.getElementById('confirm-del-staff').addEventListener('click', async () => {
    try {
      await API.deleteStaffMember(id);
      closeModal(); showToast('Usunięto', 'success');
      await loadStaffAdmin();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
