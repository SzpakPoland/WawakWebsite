async function renderHome(container) {
  container.innerHTML = `
    <!-- HERO -->
    <section class="hero">
      <div class="container">
        <div class="hero-inner">
          <div class="hero-content anim-fade-left">
            <div class="hero-badge">🗳️ Kampania Wyborcza 2026</div>
            <h1>Głosuj na<br/><span class="highlight">Wawaka!</span></h1>
            <p>Razem zmieniamy naszą szkołę na lepsze. Więcej głosu dla uczniów, lepsza przestrzeń, ciekawsze eventy.</p>
            <div class="hero-btns">
              <a href="/announcements" class="btn btn-lg btn-white">📢 Ogłoszenia</a>
              <a href="/staff" class="btn btn-lg btn-ghost-white">👥 Poznaj Sztab</a>
            </div>
          </div>
          <div class="hero-visual anim-fade-right">
            <div class="hero-card-float">
              <img src="/images/logo/logo.png" alt="Logo" class="site-logo site-logo--xl" style="margin-bottom:16px" />
              <h3>Sztab Wawaka</h3>
              <p>Centrum kampanii wyborczej</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="section-sm" style="background:white;">
      <div class="container">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:28px;text-align:center;">
          ${[
            {emoji:'⚡', label:'Zadania i działanie', desc:'Konkretne kroki, realne zmiany w szkole każdego dnia'},
            {emoji:'🤝', label:'Współpraca',          desc:'Razem z uczniami, nauczycielami i dyrekcją'},
            {emoji:'💬', label:'Rozmowa',             desc:'Słuchamy, rozmawiamy, reagujemy na Twoje potrzeby'},
            {emoji:'🏆', label:'Wyzwania',            desc:'Odważnie podejmujemy nowe inicjatywy i projekty'},
          ].map((item, i) => {
            const colors = ['var(--primary-light)','var(--secondary-light)','var(--accent-light)','var(--yellow-light)'];
            const delay = i * 0.12;
            return `<div class="reveal" style="padding:28px 20px;border-radius:var(--radius);background:${colors[i]};transition-delay:${delay}s;">
              <span style="font-size:2.5rem">${item.emoji}</span>
              <h3 style="margin:12px 0 8px;color:var(--text)">${item.label}</h3>
              <p style="font-size:0.88rem">${item.desc}</p>
            </div>`;
          }).join('')}
        </div>
      </div>
    </section>

    <!-- LATEST ANNOUNCEMENTS -->
    <section class="section">
      <div class="container">
        <div class="section-title-row reveal">
          <div>
            <h2>Najnowsze ogłoszenia</h2>
            <p>Bądź na bieżąco z aktualnościami kampanii</p>
          </div>
          <a href="/announcements" class="btn btn-outline">Wszystkie ogłoszenia →</a>
        </div>
        <div id="home-announcements" class="reveal" style="transition-delay:0.1s">
          <div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </section>

    <!-- STAFF PREVIEW -->
    <section class="section-sm" style="background:white;">
      <div class="container">
        <div class="section-title-row reveal">
          <div>
            <h2>Nasz Sztab</h2>
            <p>Poznaj ludzi, którzy stoją za kampanią</p>
          </div>
          <a href="/staff" class="btn btn-outline">Cały zespół →</a>
        </div>
        <div id="home-staff" class="reveal" style="transition-delay:0.1s">
          <div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      </div>
    </section>
  `;

  try {
    const announcements = await API.getAnnouncements();
    const annContainer = document.getElementById('home-announcements');
    if (!announcements.length) {
      annContainer.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><h3>Brak ogłoszeń</h3></div>`;
    } else {
      annContainer.innerHTML = `<div class="announcement-grid">${announcements.slice(0,3).map(renderAnnouncementCard).join('')}</div>`;
    }
  } catch (e) {
    document.getElementById('home-announcements').innerHTML = `<p style="color:#ef4444">Błąd ładowania ogłoszeń</p>`;
  }

  try {
    const staff = await API.getStaff();
    const staffContainer = document.getElementById('home-staff');
    if (!staff.length) {
      staffContainer.innerHTML = `<div class="empty-state"><span class="emoji">👥</span><h3>Brak członków sztabu</h3></div>`;
    } else {
      staffContainer.innerHTML = `<div class="staff-grid">${staff.slice(0,3).map(renderStaffCard).join('')}</div>`;
    }
  } catch (e) {
    document.getElementById('home-staff').innerHTML = `<p style="color:#ef4444">Błąd ładowania sztabu</p>`;
  }
}
