let _logsPage = 0;
let _canViewIp = false;
const LOGS_PER_PAGE = 25;

async function renderAdminLogs(container) {
  _logsPage = 0;
  container.innerHTML = `
    <div class="admin-page-title">
      <h2>📋 Logi systemowe</h2>
    </div>
    <div class="filters-bar">
      <div class="search-input" style="min-width:200px">
        <select id="log-category-filter" class="form-control">
          <option value="">Wszystkie kategorie</option>
        </select>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-refresh-logs">🔄 Odśwież</button>
    </div>
    <div id="logs-table-wrap"><div class="spinner"></div></div>
    <div id="logs-pagination" class="pagination mt-3"></div>`;

  try {
    const cats = await API.getLogCategories();
    const sel = document.getElementById('log-category-filter');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { _logsPage = 0; loadLogs(); });
  } catch {}

  document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);
  loadLogs();
}

async function loadLogs() {
  const wrap = document.getElementById('logs-table-wrap');
  const pag = document.getElementById('logs-pagination');
  if (!wrap) return;
  wrap.innerHTML = `<div class="spinner"></div>`;

  const category = document.getElementById('log-category-filter')?.value || '';
  try {
    const data = await API.getLogs({ limit: LOGS_PER_PAGE, offset: _logsPage * LOGS_PER_PAGE, ...(category ? { category } : {}) });
    const logs = data.logs || [];
    _canViewIp = !!data.canViewIp;

    if (!logs.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="emoji">📋</span><h3>Brak logów</h3></div>`;
      pag.innerHTML = '';
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Kategoria</th>
              <th>Akcja</th>
              <th>Użytkownik</th>
              <th>Szczegóły</th>
              ${_canViewIp ? '<th>Adres IP</th>' : ''}
              <th>Data i godzina</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => {
              let detailsStr = '';
              try { const d = JSON.parse(l.details || '{}'); detailsStr = Object.entries(d).map(([k,v]) => `${k}: ${v}`).join(', '); } catch {}
              return `<tr>
                <td style="color:var(--text-muted);font-size:0.8rem">${l.id}</td>
                <td><span class="badge badge-${getCategoryColor(l.category)}">${escapeHtml(l.category || '?')}</span></td>
                <td class="log-action">${escapeHtml(l.action)}</td>
                <td>
                  <div style="font-weight:600;font-size:0.88rem">${escapeHtml(l.username || '—')}</div>
                </td>
                <td class="log-details">${escapeHtml(detailsStr).substring(0, 80)}</td>
                ${_canViewIp ? `<td style="font-size:0.8rem;font-family:monospace;white-space:nowrap">${escapeHtml(l.ip_address || '—')}</td>` : ''}
                <td style="font-size:0.82rem;white-space:nowrap">${formatDateTime(l.created_at)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    // Pagination
    const total = data.total || 0;
    const pages = Math.ceil(total / LOGS_PER_PAGE);
    if (pages > 1) {
      pag.innerHTML = `
        <button class="page-btn" id="page-prev" ${_logsPage === 0 ? 'disabled' : ''}>←</button>
        <span style="padding:0 12px;font-size:0.9rem">Strona ${_logsPage + 1} / ${pages} (${total} wpisów)</span>
        <button class="page-btn" id="page-next" ${_logsPage >= pages - 1 ? 'disabled' : ''}>→</button>`;
      document.getElementById('page-prev')?.addEventListener('click', () => { _logsPage--; loadLogs(); });
      document.getElementById('page-next')?.addEventListener('click', () => { _logsPage++; loadLogs(); });
    } else {
      pag.innerHTML = `<span style="font-size:0.88rem;color:var(--text-muted)">${total} wpisów łącznie</span>`;
    }
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${escapeHtml(e.message)}</h3></div>`;
  }
}
