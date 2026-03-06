async function renderAnnouncements(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="container" style="position:relative">
        <h1>📢 Ogłoszenia</h1>
        <p>Wszystkie aktualności kampanii Sztabu Wawaka</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="filters-bar">
          <div class="search-input">
            <input type="text" id="ann-search" class="form-control" placeholder="Szukaj ogłoszenia..." />
          </div>
        </div>
        <div id="announcements-list">
          <div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </section>`;

  try {
    const announcements = await API.getAnnouncements();
    const listEl = document.getElementById('announcements-list');

    function renderList(items) {
      if (!items.length) {
        listEl.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><h3>Brak ogłoszeń</h3><p>Na razie nic tu nie ma. Zajrzyj później!</p></div>`;
        return;
      }
      listEl.innerHTML = `<div class="announcement-grid">${items.map(renderAnnouncementCard).join('')}</div>`;
    }

    renderList(announcements);

    document.getElementById('ann-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      renderList(announcements.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)));
    });
  } catch (e) {
    document.getElementById('announcements-list').innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>Błąd ładowania ogłoszeń</h3></div>`;
  }
}

async function renderAnnouncementDetail(container, id) {
  container.innerHTML = `<div class="section"><div class="container"><div class="spinner" style="margin:60px auto"></div></div></div>`;
  try {
    const a = await API.getAnnouncement(id);
    const pos = a.image_position || 'top';
    const size = a.image_size || 'full';
    const isBg = pos === 'bg' && a.image_url;
    const isLeft = pos === 'left' && a.image_url;
    const isRight = pos === 'right' && a.image_url;
    const isSplit = isLeft || isRight;

    const imgTag = a.image_url
      ? `<img src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.image_alt || a.title)}" class="ann-detail-img ann-detail-img--size-${escapeHtml(size)}" />`
      : '';

    const bgStyle = isBg
      ? `style="--card-color:${escapeHtml(a.color || '#1D4ED8')};background-image:linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url('${escapeHtml(a.image_url)}');background-size:cover;background-position:center"`
      : `style="--card-color:${escapeHtml(a.color || '#1D4ED8')}"`;

    container.innerHTML = `
      <div class="ann-detail-header" ${bgStyle}>
        <div class="container">
          <a href="/announcements" class="ann-back-btn">← Wszystkie ogłoszenia</a>
          <h1>${escapeHtml(a.title)}</h1>
          <div class="ann-detail-meta">
            <span>📅 ${formatDate(a.created_at)}</span>
            ${a.author_name ? `<span>✍️ ${escapeHtml(a.author_name)}</span>` : ''}
            ${a.is_pinned ? '<span>📌 Przypięte</span>' : ''}
          </div>
        </div>
      </div>
      <div class="section">
        <div class="container" style="max-width:900px">
          ${pos === 'top' && a.image_url ? `<div class="ann-detail-img-wrap ann-detail-img-wrap--top">${imgTag}</div>` : ''}
          ${isSplit ? `<div class="ann-detail-split ann-detail-split--${escapeHtml(pos)}">${imgTag}<div>` : ''}
          ${a.excerpt ? `<p class="ann-detail-excerpt">${escapeHtml(a.excerpt)}</p>` : ''}
          <div class="ann-detail-body">${escapeHtml(a.content).replace(/\n/g, '<br/>')}</div>
          ${isSplit ? '</div></div>' : ''}
          <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--border)">
            <a href="/announcements" class="btn btn-outline">← Wróć do ogłoszeń</a>
          </div>
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = `
      <div class="section"><div class="container">
        <div class="empty-state">
          <span class="emoji">🔍</span>
          <h3>Nie znaleziono ogłoszenia</h3>
          <p>Ogłoszenie mogło zostać usunięte lub link jest nieprawidłowy.</p>
          <a href="/announcements" class="btn btn-primary mt-2">← Wróć do ogłoszeń</a>
        </div>
      </div></div>`;
  }
}
