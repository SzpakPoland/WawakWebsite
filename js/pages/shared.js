/* =====================================================
   Shared render helpers (used by multiple pages)
   ===================================================== */
function renderAnnouncementCard(a) {
  const excerpt = a.excerpt
    ? escapeHtml(a.excerpt)
    : (escapeHtml(a.content).slice(0, 160) + (a.content.length > 160 ? '…' : ''));
  return `
    <a class="announcement-card" href="#/announcements/${a.id}" style="--card-color:${escapeHtml(a.color || '#1D4ED8')};text-decoration:none;display:block;color:inherit">
      ${a.is_pinned ? '<div class="ann-pinned-badge">📌 Przypinne</div>' : ''}
      ${a.image_url ? `<img class="announcement-image" src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.image_alt || a.title)}" />` : ''}
      <div class="announcement-header">
        <h3>${escapeHtml(a.title)}</h3>
        <div class="announcement-meta">
          <span>📅 ${formatDate(a.created_at)}</span>
          ${a.author_name ? `<span>✍️ ${escapeHtml(a.author_name)}</span>` : ''}
        </div>
      </div>
      <div class="announcement-body">
        <p>${excerpt}</p>
      </div>
      <div class="announcement-read-more">Czytaj więcej →</div>
    </a>`;
}

function renderStaffCard(m) {
  const photo = m.photo_url
    ? `<img class="staff-avatar" src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.name)}" />`
    : `<div class="staff-avatar-default">👤</div>`;
  return `
    <div class="staff-card">
      ${photo}
      <div class="staff-name">${escapeHtml(m.name)}</div>
      <div class="staff-role">${escapeHtml(m.role_title || '')}</div>
      ${m.description ? `<div class="staff-desc">${escapeHtml(m.description)}</div>` : ''}
    </div>`;
}
