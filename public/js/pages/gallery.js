====================================================
   Gallery public page
   ===================================================== */
let _galleryItems = [];

async function renderGallery(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="container" style="position:relative">
        <h1>🖼️ Galeria</h1>
        <p>Zdjęcia z kampanii i wydarzeń Sztabu Wawaka</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div id="gallery-grid-container">
          <div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </section>`;

  try {
    _galleryItems = await API.getGallery();
    const gridEl = document.getElementById('gallery-grid-container');
    if (!_galleryItems.length) {
      gridEl.innerHTML = `<div class="empty-state"><span class="emoji">📷</span><h3>Galeria jest pusta</h3><p>Zdjęcia pojawią się wkrótce!</p></div>`;
      return;
    }
    gridEl.innerHTML = `<div class="gallery-grid">
      ${_galleryItems.map((item, idx) => `
        <div class="gallery-item" data-index="${idx}">
          <img src="/uploads/gallery/${escapeHtml(item.filename)}" alt="${escapeHtml(item.description || item.original_name || '')}" loading="lazy" />
          <div class="gallery-item-overlay">
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
          </div>
        </div>`).join('')}
    </div>`;

    document.querySelectorAll('.gallery-item').forEach(el => {
      el.addEventListener('click', () => openLightbox(parseInt(el.dataset.index)));
    });
  } catch (e) {
    document.getElementById('gallery-grid-container').innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>Błąd ładowania galerii</h3></div>`;
  }
}

let _currentLbIndex = 0;
function openLightbox(index) {
  _currentLbIndex = index;
  updateLightbox();
  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function updateLightbox() {
  const item = _galleryItems[_currentLbIndex];
  if (!item) return;
  document.getElementById('lightbox-img').src = `/uploads/gallery/${item.filename}`;
  document.getElementById('lightbox-img').alt = item.description || '';
  document.getElementById('lightbox-caption').textContent = item.description || '';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

// Setup lightbox controls
document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev').addEventListener('click', () => {
  _currentLbIndex = (_currentLbIndex - 1 + _galleryItems.length) % _galleryItems.length;
  updateLightbox();
});
document.getElementById('lightbox-next').addEventListener('click', () => {
  _currentLbIndex = (_currentLbIndex + 1) % _galleryItems.length;
  updateLightbox();
});
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('hidden')) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { _currentLbIndex = (_currentLbIndex - 1 + _galleryItems.length) % _galleryItems.length; updateLightbox(); }
    if (e.key === 'ArrowRight') { _currentLbIndex = (_currentLbIndex + 1) % _galleryItems.length; updateLightbox(); }
  }
});
