function getAdminSidebarItems() {
  const items = [
    { id: 'dashboard',    icon: '📊', label: 'Dashboard',        perm: null },
    { id: 'announcements',icon: '📢', label: 'Ogłoszenia',       perm: 'edit_announcements' },
    { id: 'gallery',      icon: '🖼️', label: 'Galeria',          perm: 'manage_gallery' },
    { id: 'staff',        icon: '👥', label: 'Sztab',            perm: 'manage_staff' },
    { id: 'suggestions',  icon: '📨', label: 'Sugestie',         perm: 'view_suggestions' },
    { id: 'users',        icon: '👤', label: 'Użytkownicy',      perm: 'manage_users' },
    { id: 'permissions',  icon: '🔐', label: 'Uprawnienia',      perm: 'manage_permissions' },
    { id: 'logs',         icon: '📋', label: 'Logi systemowe',   perm: 'view_logs' },
  ];
  return items.filter(item => !item.perm || Auth.hasPermission(item.perm) || Auth.isSuperadmin());
}

let _adminSection = 'dashboard';

function renderAdminPanel(container, section = 'dashboard') {
  if (!Auth.isAdmin()) {
    container.innerHTML = `<div class="section"><div class="container"><div class="empty-state"><span class="emoji">🔒</span><h3>Brak dostępu</h3><p>Musisz być zalogowany jako admin.</p><a href="#/login" class="btn btn-primary mt-2">Zaloguj się</a></div></div></div>`;
    return;
  }
  _adminSection = section;
  const items = getAdminSidebarItems();

  container.innerHTML = `
    <div class="admin-layout">
      <nav class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-logo">
          <div class="logo" style="display:flex;align-items:center;gap:10px">
            <img src="/images/logo/logo.png" alt="Logo" class="site-logo site-logo--sm" />
            Panel Admina
          </div>
        </div>
        <div class="sidebar-section-title">Zarządzanie</div>
        ${items.map(item => `
          <button class="sidebar-nav-item${_adminSection === item.id ? ' active' : ''}" data-section="${item.id}">
            <span class="nav-icon">${item.icon}</span>${item.label}
          </button>`).join('')}
        <div style="margin-top:auto;padding:16px 24px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:0.82rem;color:rgba(255,255,255,0.5);">Zalogowany jako:</div>
          <div style="font-size:0.9rem;font-weight:600;color:#fff;margin-top:4px">${escapeHtml(Auth.getUser().display_name)}</div>
          <span class="badge badge-primary" style="margin-top:6px">${escapeHtml(Auth.getUser().role_name || '')}</span>
        </div>
      </nav>
      <div class="admin-main" id="admin-section-content"></div>
    </div>`;

  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate(`/admin/${btn.dataset.section}`);
    });
  });

  loadAdminSection(_adminSection);
}

function loadAdminSection(section) {
  _adminSection = section;
  // Update active state
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  const content = document.getElementById('admin-section-content');
  if (!content) return;

  switch (section) {
    case 'dashboard':    renderAdminDashboard(content); break;
    case 'announcements': renderAdminAnnouncements(content); break;
    case 'gallery':      renderAdminGallery(content); break;
    case 'staff':        renderAdminStaff(content); break;
    case 'suggestions':  renderAdminSuggestions(content); break;
    case 'users':        renderAdminUsers(content); break;
    case 'permissions':  renderAdminPermissions(content); break;
    case 'logs':         renderAdminLogs(content); break;
    default:             renderAdminDashboard(content);
  }
}

async function renderAdminDashboard(container) {
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>📊 Dashboard</h2>
    </div>
    <div class="stats-grid" id="stats-grid">
      ${['','','',''].map(() => `<div class="stat-card"><div class="spinner"></div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;flex-wrap:wrap" id="dash-lower">
      <div>
        <h3 style="margin-bottom:16px">⚡ Najnowsze logi</h3>
        <div id="dash-logs"><div class="spinner"></div></div>
      </div>
      <div>
        <h3 style="margin-bottom:16px">📢 Ostatnie ogłoszenia</h3>
        <div id="dash-ann"><div class="spinner"></div></div>
      </div>
    </div>`;

  try {
    const [announcements, users, gallery, logs] = await Promise.all([
      API.getAllAnnouncements().catch(() => []),
      API.getUsers().catch(() => []),
      API.getGallery().catch(() => []),
      Auth.hasPermission('view_logs') ? API.getLogs({ limit: 5 }) : Promise.resolve({ logs: [] }),
    ]);

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-icon purple">📢</div><div><div class="stat-number">${announcements.length}</div><div class="stat-label">Ogłoszeń</div></div></div>
      <div class="stat-card"><div class="stat-icon pink">👥</div><div><div class="stat-number">${users.length}</div><div class="stat-label">Użytkowników</div></div></div>
      <div class="stat-card"><div class="stat-icon green">🖼️</div><div><div class="stat-number">${gallery.length}</div><div class="stat-label">Zdjęć w galerii</div></div></div>
      <div class="stat-card"><div class="stat-icon yellow">📋</div><div><div class="stat-number">${logs.total || 0}</div><div class="stat-label">Wpisów w logach</div></div></div>`;

    if (logs.logs && logs.logs.length) {
      document.getElementById('dash-logs').innerHTML = `
        <div class="table-wrap">
          <table>
            <tbody>
              ${logs.logs.map(l => `
                <tr>
                  <td><span class="badge badge-${getCategoryColor(l.category)}">${l.category || '?'}</span></td>
                  <td class="log-action">${escapeHtml(l.action)}</td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(l.username || '—')}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted)">${formatDateTime(l.created_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      document.getElementById('dash-logs').innerHTML = `<p style="color:var(--text-muted)">Brak logów</p>`;
    }

    if (announcements.length) {
      document.getElementById('dash-ann').innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${announcements.slice(0,4).map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:var(--radius-sm)">
              <div style="width:10px;height:10px;border-radius:50%;background:${escapeHtml(a.color)};flex-shrink:0"></div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(a.title)}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${formatDate(a.created_at)}</div>
              </div>
              <span class="badge ${a.is_published ? 'badge-success' : 'badge-muted'}">${a.is_published ? 'Opublikowane' : 'Ukryte'}</span>
            </div>`).join('')}
        </div>`;
    } else {
      document.getElementById('dash-ann').innerHTML = `<p style="color:var(--text-muted)">Brak ogłoszeń</p>`;
    }
  } catch (e) {
    console.error(e);
  }
}

function getCategoryColor(cat) {
  const map = { auth: 'primary', users: 'warning', announcements: 'success', gallery: 'primary', staff: 'warning', permissions: 'danger', roles: 'danger' };
  return map[cat] || 'muted';
}
