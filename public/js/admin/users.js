/* =====================================================
   Admin: Users management
   ===================================================== */
async function renderAdminUsers(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>👤 Użytkownicy</h2>
      <button class="btn btn-primary" id="btn-add-user">+ Dodaj użytkownika</button>
    </div>
    <div id="users-table-wrap"><div class="spinner"></div></div>`;

  document.getElementById('btn-add-user').addEventListener('click', () => showUserModal(null));
  await loadUsersTable();
}

async function loadUsersTable() {
  const wrap = document.getElementById('users-table-wrap');
  if (!wrap) return;
  try {
    const [users, roles] = await Promise.all([API.getUsers(), API.getRoles()]);
    const rolesMap = Object.fromEntries(roles.map(r => [r.id, r]));

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Login</th>
              <th>Rola</th>
              <th>Status</th>
              <th>Data założenia</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div class="d-flex align-center gap-2">
                    ${renderAvatar(u)}
                    <span class="fw-700">${escapeHtml(u.display_name)}</span>
                  </div>
                </td>
                <td><code style="font-size:0.85rem">${escapeHtml(u.username)}</code></td>
                <td><span class="badge badge-${getRoleBadge(u.role_name)}">${escapeHtml(u.role_name || '—')}</span></td>
                <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Aktywny' : 'Nieaktywny'}</span></td>
                <td style="font-size:0.85rem">${formatDate(u.created_at)}</td>
                <td>
                  <div class="actions-cell">
                    <button class="btn btn-sm btn-outline btn-edit-user" data-id="${u.id}" title="Edytuj">✏️</button>
                    ${u.username !== 'superadmin' ? `<button class="btn btn-sm btn-danger btn-del-user" data-id="${u.id}" data-name="${escapeHtml(u.display_name)}" title="Usuń">🗑️</button>` : ''}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    document.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => showUserModal(users.find(u => u.id == btn.dataset.id)));
    });
    document.querySelectorAll('.btn-del-user').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.id, btn.dataset.name));
    });
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${escapeHtml(e.message)}</h3></div>`;
  }
}

function getRoleBadge(role) {
  const map = { superadmin: 'danger', admin: 'warning', redaktor: 'success', moderator: 'primary' };
  return map[role] || 'muted';
}

async function showUserModal(user) {
  const roles = await API.getRoles();
  const isEdit = !!user;
  openModal(`
    <h3 class="modal-title">${isEdit ? '✏️ Edytuj użytkownika' : '+ Nowy użytkownik'}</h3>
    <form id="user-form">
      <div class="form-group">
        <label>Imię i nazwisko</label>
        <input type="text" id="u-display" class="form-control" value="${isEdit ? escapeHtml(user.display_name) : ''}" required placeholder="Jan Kowalski" />
      </div>
      ${!isEdit ? `
        <div class="form-group">
          <label>Nazwa użytkownika</label>
          <input type="text" id="u-username" class="form-control" required placeholder="jkowalski" />
        </div>` : ''}
      <div class="form-group">
        <label>${isEdit ? 'Nowe hasło (zostaw puste żeby nie zmieniać)' : 'Hasło'}</label>
        <input type="password" id="u-password" class="form-control" ${!isEdit ? 'required' : ''} placeholder="••••••••" autocomplete="new-password" />
      </div>
      <div class="form-group">
        <label>Rola</label>
        <select id="u-role" class="form-control">
          <option value="">— bez roli —</option>
          ${roles.map(r => `<option value="${r.id}" ${isEdit && user.role_id == r.id ? 'selected' : ''}>${escapeHtml(r.name)} — ${escapeHtml(r.description || '')}</option>`).join('')}
        </select>
      </div>
      ${isEdit ? `
        <div class="form-group">
          <label>Status konta</label>
          <select id="u-active" class="form-control">
            <option value="1" ${user.is_active ? 'selected' : ''}>Aktywny</option>
            <option value="0" ${!user.is_active ? 'selected' : ''}>Nieaktywny</option>
          </select>
        </div>` : ''}
      <div id="user-form-error" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary">${isEdit ? 'Zapisz zmiany' : 'Utwórz użytkownika'}</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`);

  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('user-form-error');
    errEl.style.display = 'none';
    try {
      const data = {
        display_name: document.getElementById('u-display').value.trim(),
        role_id: document.getElementById('u-role').value || null,
      };
      const password = document.getElementById('u-password').value;
      if (password) data.password = password;
      if (!isEdit) { data.username = document.getElementById('u-username').value.trim(); }
      else { data.is_active = parseInt(document.getElementById('u-active').value); }

      if (isEdit) await API.updateUser(user.id, data);
      else await API.createUser(data);

      closeModal();
      showToast(isEdit ? 'Użytkownik zaktualizowany' : 'Użytkownik utworzony', 'success');
      await loadUsersTable();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });
}

async function confirmDeleteUser(id, name) {
  openModal(`
    <h3 class="modal-title">🗑️ Usuń użytkownika</h3>
    <p>Czy na pewno chcesz usunąć użytkownika <strong>${name}</strong>? Tej operacji nie można cofnąć.</p>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-danger" id="confirm-del-btn">Usuń</button>
      <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
    </div>`);
  document.getElementById('confirm-del-btn').addEventListener('click', async () => {
    try {
      await API.deleteUser(id);
      closeModal();
      showToast('Użytkownik usunięty', 'success');
      await loadUsersTable();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
