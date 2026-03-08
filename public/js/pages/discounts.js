async function renderDiscounts(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="container" style="position:relative">
        <h1>🏷️ Zniżki</h1>
        <p>Specjalne oferty i rabaty dla uczniów popierających kampanię</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div id="discounts-grid">
          <div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </section>`;

  try {
    const items = await API.getDiscounts();
    const grid = document.getElementById('discounts-grid');
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state"><span class="emoji">🏷️</span><h3>Brak zniżek</h3><p>Niedługo się tu pojawią!</p></div>`;
      return;
    }
    grid.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:32px">
        ${items.map(item => `
          <div class="card" style="padding:0;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 12px 40px rgba(29,78,216,0.18)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="background:#f1f5f9;overflow:hidden">
              <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}"
                style="width:100%;height:auto;display:block;object-fit:contain;max-height:420px" loading="lazy" />
            </div>
            ${item.title || item.description ? `
            <div style="padding:20px 24px">
              ${item.title ? `<h3 style="font-size:1.1rem;margin-bottom:6px">${escapeHtml(item.title)}</h3>` : ''}
              ${item.description ? `<p style="font-size:0.9rem">${escapeHtml(item.description)}</p>` : ''}
            </div>` : ''}
          </div>`).join('')}
      </div>`;
  } catch (e) {
    document.getElementById('discounts-grid').innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>${escapeHtml(e.message)}</h3></div>`;
  }
}
