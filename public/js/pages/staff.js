/* =====================================================
   Staff public page
   ===================================================== */
async function renderStaff(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="container" style="position:relative">
        <h1>👥 Sztab</h1>
        <p>Poznaj ludzi stojących za kampanią Wawaki</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div id="staff-list">
          <div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </section>`;

  try {
    const members = await API.getStaff();
    const staffEl = document.getElementById('staff-list');
    if (!members.length) {
      staffEl.innerHTML = `<div class="empty-state"><span class="emoji">👥</span><h3>Brak członków sztabu</h3><p>Niedługo się tu pojawią!</p></div>`;
      return;
    }
    staffEl.innerHTML = `<div class="staff-grid">${members.map(renderStaffCard).join('')}</div>`;
  } catch (e) {
    document.getElementById('staff-list').innerHTML = `<div class="empty-state"><span class="emoji">❌</span><h3>Błąd ładowania</h3></div>`;
  }
}
