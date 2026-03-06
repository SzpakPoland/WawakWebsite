====================================================
   Shared render helpers (used by multiple pages)
   ===================================================== */
function renderAnnouncementCard(a) {
  const excerpt = a.excerpt
    ? escapeHtml(a.excerpt)
    : (escapeHtml(a.content).slice(0, 160) + (a.content.length > 160 ? '…' : ''));
  return `
    <a class="announcement-card" href="#/announcements/${a.id}" style="--card-color:${escapeHtml(a.color || '#1D4ED8')}">
      ${a.image_url
        ? `<div class="ann-card-img-wrap">
            <img class="announcement-image" src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.image_alt || a.title)}" loading="lazy" />
            ${a.is_pinned ? '<span class="ann-pinned-badge">📌 Przypięte</span>' : ''}
           </div>`
        : `<div class="ann-card-no-img">${a.is_pinned ? '<span class="ann-pinned-badge" style="position:static;display:inline-block;margin:8px 12px">📌 Przypięte</span>' : ''}</div>`
      }
      <div class="ann-card-body">
        <h3 class="ann-card-title">${escapeHtml(a.title)}</h3>
        <div class="announcement-meta">
          <span>📅 ${formatDate(a.created_at)}</span>
          ${a.author_name ? `<span>✍️ ${escapeHtml(a.author_name)}</span>` : ''}
        </div>
        <p class="ann-card-excerpt">${excerpt}</p>
        <span class="announcement-read-more">Czytaj więcej →</span>
      </div>
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
