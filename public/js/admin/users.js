====================================================
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
    const [users, roles, quotaData] = await Promise.all([
      API.getUsers(),
      API.getRoles(),
      API.getUploadLimits().catch(() => null),
    ]);

    const quotaMap    = quotaData ? Object.fromEntries(quotaData.map(q => [q.id, q])) : {};
    const isSuperAdmin = !!quotaData;

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Login</th>
              <th>Rola</th>
              <th>Status</th>
              ${isSuperAdmin ? '<th>Limit plików</th>' : ''}
              <th>Data założenia</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const q = quotaMap[u.id];
              return `
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
                ${isSuperAdmin ? `<td>${q ? renderQuotaCell(q) : '<span style="color:var(--color-muted)">—</span>'}</td>` : ''}
                <td style="font-size:0.85rem">${formatDate(u.created_at)}</td>
                <td>
                  <div class="actions-cell">
                    <button class="btn btn-sm btn-outline btn-edit-user" data-id="${u.id}" title="Edytuj">✏️</button>
                    ${isSuperAdmin ? `<button class="btn btn-sm btn-outline btn-quota" data-id="${u.id}" data-name="${escapeHtml(u.display_name)}" title="Limit plików">📦</button>` : ''}
                    ${u.username !== 'superadmin' ? `<button class="btn btn-sm btn-danger btn-del-user" data-id="${u.id}" data-name="${escapeHtml(u.display_name)}" title="Usuń">🗑️</button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    document.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => showUserModal(users.find(u => u.id == btn.dataset.id)));
    });
    document.querySelectorAll('.btn-quota').forEach(btn => {
      const q = quotaMap[Number(btn.dataset.id)];
      btn.addEventListener('click', () => showQuotaModal(btn.dataset.id, btn.dataset.name, q));
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

/** Human-readable byte size (used for quota display). */
function fmtBytes(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)       return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function renderQuotaCell(q) {
  const pct   = q.limit_bytes > 0 ? Math.min(100, Math.round(q.usage_bytes / q.limit_bytes * 100)) : 0;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return `
    <div style="min-width:130px">
      <div style="font-size:0.78rem;margin-bottom:3px;white-space:nowrap">
        ${fmtBytes(q.usage_bytes)} / ${fmtBytes(q.limit_bytes)}
      </div>
      <div style="background:#e5e7eb;border-radius:3px;height:5px;overflow:hidden">
        <div style="background:${color};width:${pct}%;height:100%;border-radius:3px"></div>
      </div>
    </div>`;
}

async function showQuotaModal(userId, name, q) {
  const currentLimitMb = q ? Math.round(q.limit_bytes / 1048576) : 100;

  openModal(`
    <h3 class="modal-title">📦 Limit plików &mdash; ${escapeHtml(name)}</h3>
    ${q ? `
      <div style="background:var(--color-bg-alt,#f3f4f6);border-radius:8px;padding:12px 16px;margin-bottom:16px">
        <div style="font-size:0.85rem;color:var(--color-muted)">
          Aktualne zużycie:
          <strong>${fmtBytes(q.usage_bytes)}</strong>
          z <strong>${fmtBytes(q.limit_bytes)}</strong>
          (${q.limit_bytes > 0 ? Math.round(q.usage_bytes / q.limit_bytes * 100) : 0}%)
        </div>
      </div>` : ''}
    <form id="quota-form">
      <div class="form-group">
        <label>Nowy limit (MB)</label>
        <input type="number" id="q-limit" class="form-control" value="${currentLimitMb}"
               min="1" max="102400" step="1" required />
        <small style="color:var(--color-muted)">
          Domyślny limit: 100 MB dla użytkowników, 500 MB dla superadmina.
        </small>
      </div>
      <div id="quota-form-error" class="form-error" style="display:none"></div>
      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn btn-primary">Zapisz limit</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
      </div>
    </form>`);

  document.getElementById('quota-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('quota-form-error');
    errEl.style.display = 'none';
    try {
      const newLimitMb = parseFloat(document.getElementById('q-limit').value);
      await API.setUserUploadLimit(userId, newLimitMb);
      closeModal();
      showToast('Limit plików zaktualizowany', 'success');
      await loadUsersTable();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });
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
