/* =====================================================
   Admin: Permissions management
   ===================================================== */
async function renderAdminPermissions(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>🔐 Uprawnienia</h2>
    </div>
    <div class="tabs" id="perm-tabs">
      <button class="tab-btn active" data-tab="roles">Role</button>
      <button class="tab-btn" data-tab="users">Użytkownicy</button>
      <button class="tab-btn" data-tab="manage-roles">Zarządzaj rolami</button>
    </div>
    <div id="perm-tab-content"></div>`;

  document.querySelectorAll('#perm-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#perm-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPermTab(btn.dataset.tab);
    });
  });
  loadPermTab('roles');
}

async function loadPermTab(tab) {
  const content = document.getElementById('perm-tab-content');
  content.innerHTML = `<div class="spinner"></div>`;
  if (tab === 'roles') await loadRolesPermTab(content);
  else if (tab === 'users') await loadUsersPermTab(content);
  else if (tab === 'manage-roles') await loadManageRolesTab(content);
}

async function loadRolesPermTab(container) {
  const roles = await API.getRoles();
  let selectedRole = roles[0];

  function render() {
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:start">
        <div>
          <div style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:10px">Wybierz rolę</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${roles.map(r => `
              <button class="btn ${selectedRole.id === r.id ? 'btn-primary' : 'btn-ghost'} role-sel-btn" data-id="${r.id}" style="text-align:left;justify-content:flex-start">
                <span class="badge badge-${getRoleBadge(r.name)}" style="margin-right:8px">${escapeHtml(r.name)}</span>
              </button>`).join('')}
          </div>
        </div>
        <div id="role-perms-panel"><div class="spinner"></div></div>
      </div>`;

    document.querySelectorAll('.role-sel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedRole = roles.find(r => r.id == btn.dataset.id);
        render();
        loadRolePermissions(selectedRole);
      });
    });
    loadRolePermissions(selectedRole);
  }
  render();
}

async function loadRolePermissions(role) {
  const panel = document.getElementById('role-perms-panel');
  if (!panel) return;
  try {
    const perms = await API.getRolePermissions(role.id);
    const isSuperadmin = role.name === 'superadmin';
    const grouped = groupPermissions(perms);

    panel.innerHTML = `
      <div class="d-flex justify-between align-center mb-3">
        <h3>Uprawnienia roli: <span class="color-primary">${escapeHtml(role.name)}</span></h3>
        ${!isSuperadmin ? `<button class="btn btn-primary btn-sm" id="save-role-perms">💾 Zapisz</button>` : ''}
      </div>
      ${isSuperadmin ? `<div style="background:var(--primary-light);border-radius:var(--radius-sm);padding:12px 16px;color:var(--primary);font-weight:600">✅ Superadmin ma wszystkie uprawnienia automatycznie.</div>` : ''}
      <div id="role-perms-list" class="perms-grid">
        ${Object.entries(grouped).map(([cat, items]) => `
          <div>
            <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:12px 0 6px">${cat}</div>
            ${items.map(p => `
              <div class="perm-item">
                <div class="perm-info">
                  <div class="perm-name">${escapeHtml(p.description || p.name)}</div>
                  <div class="perm-desc"><code style="font-size:0.75rem">${escapeHtml(p.name)}</code></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="perm-toggle" data-id="${p.id}" ${p.granted || isSuperadmin ? 'checked' : ''} ${isSuperadmin ? 'disabled' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>`).join('')}
          </div>`).join('')}
      </div>`;

    if (!isSuperadmin) {
      document.getElementById('save-role-perms').addEventListener('click', async () => {
        const permsToSave = [...document.querySelectorAll('.perm-toggle')].map(cb => ({
          permission_id: parseInt(cb.dataset.id), granted: cb.checked
        }));
        try {
          await API.setRolePermissions(role.id, permsToSave);
          showToast('Uprawnienia roli zapisane', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      });
    }
  } catch (e) { panel.innerHTML = `<p style="color:#ef4444">${e.message}</p>`; }
}

async function loadUsersPermTab(container) {
  try {
    const users = await API.getUsers();
    let selectedUser = users[0];

    function render() {
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start">
          <div>
            <div style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:10px">Wybierz użytkownika</div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto">
              ${users.map(u => `
                <button class="btn ${selectedUser && selectedUser.id === u.id ? 'btn-primary' : 'btn-ghost'} user-sel-btn" data-id="${u.id}" style="text-align:left;justify-content:flex-start;gap:8px">
                  ${renderAvatar(u)} ${escapeHtml(u.display_name)}
                </button>`).join('')}
            </div>
          </div>
          <div id="user-perms-panel"><div class="spinner"></div></div>
        </div>`;

      document.querySelectorAll('.user-sel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedUser = users.find(u => u.id == btn.dataset.id);
          render();
          if (selectedUser) loadUserPermissions(selectedUser);
        });
      });
      if (selectedUser) loadUserPermissions(selectedUser);
    }
    render();
  } catch (e) { container.innerHTML = `<p style="color:#ef4444">${e.message}</p>`; }
}

async function loadUserPermissions(user) {
  const panel = document.getElementById('user-perms-panel');
  if (!panel) return;
  try {
    const perms = await API.getUserPermissions(user.id);
    const grouped = groupPermissions(perms);
    panel.innerHTML = `
      <div class="d-flex justify-between align-center mb-3">
        <h3>Indywidualne uprawnienia: <span class="color-primary">${escapeHtml(user.display_name)}</span></h3>
        <button class="btn btn-primary btn-sm" id="save-user-perms">💾 Zapisz</button>
      </div>
      <p style="font-size:0.85rem;margin-bottom:16px">Ustaw indywidualne uprawnienia dla tego użytkownika (nadpisują uprawnienia roli).</p>
      <div class="perms-grid" id="user-perms-list">
        ${Object.entries(grouped).map(([cat, items]) => `
          <div>
            <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:12px 0 6px">${cat}</div>
            ${items.map(p => `
              <div class="perm-item">
                <div class="perm-info">
                  <div class="perm-name">${escapeHtml(p.description || p.name)}</div>
                  <div class="perm-desc"><code style="font-size:0.75rem">${escapeHtml(p.name)}</code></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="perm-toggle" data-id="${p.id}" ${p.granted ? 'checked' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>`).join('')}
          </div>`).join('')}
      </div>`;

    document.getElementById('save-user-perms').addEventListener('click', async () => {
      const permsToSave = [...document.querySelectorAll('.perm-toggle')].map(cb => ({
        permission_id: parseInt(cb.dataset.id), granted: cb.checked ? 1 : undefined
      }));
      try {
        await API.setUserPermissions(user.id, permsToSave);
        showToast('Uprawnienia użytkownika zapisane', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { panel.innerHTML = `<p style="color:#ef4444">${e.message}</p>`; }
}

async function loadManageRolesTab(container) {
  try {
    const roles = await API.getRoles();
    container.innerHTML = `
      <div class="admin-page-title" style="margin-bottom:24px">
        <h3>Zarządzaj rolami</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-role">+ Nowa rola</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nazwa</th><th>Opis</th><th>Akcje</th></tr></thead>
          <tbody>
            ${roles.map(r => `
              <tr>
                <td><span class="badge badge-${getRoleBadge(r.name)}">${escapeHtml(r.name)}</span></td>
                <td>${escapeHtml(r.description || '')}</td>
                <td>
                  ${r.name !== 'superadmin' ? `<button class="btn btn-sm btn-danger del-role-btn" data-id="${r.id}" data-name="${escapeHtml(r.name)}">🗑️ Usuń</button>` : '<span class="badge badge-muted">Chroniona</span>'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    document.getElementById('btn-add-role').addEventListener('click', () => {
      openModal(`
        <h3 class="modal-title">+ Nowa rola</h3>
        <form id="add-role-form">
          <div class="form-group"><label>Nazwa roli</label><input type="text" id="role-name" class="form-control" required placeholder="np. reporter" /></div>
          <div class="form-group"><label>Opis</label><input type="text" id="role-desc" class="form-control" placeholder="Opis roli" /></div>
          <div class="d-flex gap-2 mt-3">
            <button type="submit" class="btn btn-primary">Utwórz</button>
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
          </div>
        </form>`);
      document.getElementById('add-role-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await API.createRole({ name: document.getElementById('role-name').value.trim(), description: document.getElementById('role-desc').value.trim() });
          closeModal(); showToast('Rola utworzona', 'success'); await loadManageRolesTab(container);
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    container.querySelectorAll('.del-role-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Usuń rolę "${btn.dataset.name}"?`)) return;
        try { await API.deleteRole(btn.dataset.id); showToast('Rola usunięta', 'success'); await loadManageRolesTab(container); }
        catch (e) { showToast(e.message, 'error'); }
      });
    });
  } catch (e) { container.innerHTML = `<p style="color:#ef4444">${e.message}</p>`; }
}

function groupPermissions(perms) {
  const grouped = {};
  for (const p of perms) {
    const cat = p.category || 'inne';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }
  return grouped;
}
