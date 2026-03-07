function renderLogin(container) {
  if (Auth.isLoggedIn()) { Router.navigate('/'); return; }
  container.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <img src="/images/logo/logo.png" alt="Logo" class="site-logo site-logo--lg" style="margin-bottom:8px" />
          <h2>Sztab Wawaka</h2>
          <p>Zaloguj się do panelu</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label>Nazwa użytkownika</label>
            <div class="input-icon">
              <span class="icon">👤</span>
              <input type="text" id="login-username" class="form-control" placeholder="login" autocomplete="username" required />
            </div>
          </div>
          <div class="form-group">
            <label>Hasło</label>
            <div class="input-icon">
              <span class="icon">🔒</span>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••" autocomplete="current-password" required />
            </div>
          </div>
          <div id="login-error" style="color:#ef4444;font-size:0.88rem;margin-bottom:12px;display:none"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">Zaloguj się</button>
        </form>
        <p style="text-align:center;margin-top:20px;font-size:0.85rem">
          <a href="/" style="color:var(--primary)">← Wróć na stronę główną</a>
        </p>
      </div>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Logowanie...';

    try {
      await Auth.login(username, password);
      showToast('Zalogowano pomyślnie!', 'success');
      if (Auth.isAdmin()) Router.navigate('/admin');
      else Router.navigate('/');
    } catch (err) {
      errEl.textContent = err.message || 'Błąd logowania';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Zaloguj się';
    }
  });
}
