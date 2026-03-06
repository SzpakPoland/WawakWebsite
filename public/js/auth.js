/* =====================================================
   Auth state management
   ===================================================== */
const Auth = (() => {
  let _user = null;
  let _permissions = [];

  function getUser() { return _user; }
  function getPermissions() { return _permissions; }
  function isLoggedIn() { return !!_user; }

  function hasPermission(name) {
    if (!_user) return false;
    if (_user.role_name === 'superadmin') return true;
    return _permissions.includes(name);
  }

  function isSuperadmin() {
    return _user && _user.role_name === 'superadmin';
  }

  function isAdmin() {
    return _user && (_user.role_name === 'superadmin' || _user.role_name === 'admin');
  }

  async function init() {
    const token = localStorage.getItem('sw_token');
    if (!token) { _user = null; _permissions = []; updateNavbar(); return false; }
    try {
      const data = await API.me();
      _user = data;
      _permissions = data.permissions || [];
      updateNavbar();
      return true;
    } catch (e) {
      localStorage.removeItem('sw_token');
      _user = null; _permissions = [];
      updateNavbar();
      return false;
    }
  }

  async function login(username, password) {
    const data = await API.login(username, password);
    localStorage.setItem('sw_token', data.token);
    _user = data.user;
    _permissions = [];
    await init();
    return _user;
  }

  async function logout() {
    try { await API.logout(); } catch {}
    localStorage.removeItem('sw_token');
    _user = null; _permissions = [];
    updateNavbar();
  }

  function updateNavbar() {
    const navAuth = document.getElementById('nav-auth');
    const navAdminLink = document.getElementById('nav-admin-link');
    if (_user) {
      navAuth.innerHTML = `
        <div class="d-flex align-center gap-2">
          <button class="nav-profile-btn" id="btn-profile" title="Edytuj profil">
            ${renderAvatar(_user)}
            <span class="nav-profile-name">${escapeHtml(_user.display_name)}</span>
            <span class="nav-profile-caret">▾</span>
          </button>
          <button class="btn btn-sm btn-outline" id="btn-logout">Wyloguj</button>
        </div>`;
      document.getElementById('btn-profile').addEventListener('click', openProfileModal);
      document.getElementById('btn-logout').addEventListener('click', async () => {
        await logout();
        showToast('Wylogowano pomyślnie', 'info');
        Router.navigate('/');
      });
      if (navAdminLink && isAdmin()) navAdminLink.classList.remove('hidden');
      else if (navAdminLink) navAdminLink.classList.add('hidden');
    } else {
      navAuth.innerHTML = `<button class="btn btn-outline" id="btn-login">Zaloguj</button>`;
      document.getElementById('btn-login').addEventListener('click', () => Router.navigate('/login'));
      if (navAdminLink) navAdminLink.classList.add('hidden');
    }
  }

  function openProfileModal() {
    if (!_user) return;
    openModal(`
      <h2 class="modal-title">👤 Mój profil</h2>
      <div class="profile-avatar-area" id="profile-avatar-area">
        ${renderAvatar(_user)}
        <label class="profile-avatar-edit" title="Zmień zdjęcie profilowe">
          📷
          <input type="file" id="profile-avatar-input" accept="image/*" style="display:none" />
        </label>
      </div>
      <p style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-bottom:24px">Kliknij ikonę aparatu, aby zmienić zdjęcie</p>

      <div id="profile-form">
        <div class="form-row">
          <div class="form-group">
            <label>Nazwa wyświetlana</label>
            <input class="form-control" id="pf-display-name" value="${escapeHtml(_user.display_name)}" placeholder="Twoje imię i nazwisko" />
          </div>
          <div class="form-group">
            <label>Login (nazwa użytkownika)</label>
            <input class="form-control" id="pf-username" value="${escapeHtml(_user.username)}" placeholder="Login" />
          </div>
        </div>

        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
        <p style="font-size:0.82rem;font-weight:600;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">Zmiana hasła (zostaw puste, jeśli nie chcesz zmieniać)</p>

        <div class="form-group">
          <label>Aktualne hasło</label>
          <div style="position:relative">
            <input class="form-control" type="password" id="pf-current-pass" placeholder="••••••••" autocomplete="off" style="padding-right:2.6rem" />
            <button type="button" id="pf-toggle-pass" title="Pokaż/ukryj hasło"
              style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;color:var(--text-muted);padding:0;line-height:1">👁</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nowe hasło</label>
            <input class="form-control" type="password" id="pf-new-pass" placeholder="••••••••" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label>Potwierdź nowe hasło</label>
            <input class="form-control" type="password" id="pf-confirm-pass" placeholder="••••••••" autocomplete="new-password" />
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-ghost" onclick="closeModal()">Anuluj</button>
          <button class="btn btn-primary" id="pf-save-btn">💾 Zapisz zmiany</button>
        </div>
      </div>
    `);

    // Avatar preview & upload
    function bindAvatarInput() {
      const input = document.getElementById('profile-avatar-input');
      if (!input) return;
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('avatar', file);
        try {
          showLoading(true);
          const res = await API.uploadAvatar(fd);
          _user.avatar_url = res.avatar_url;
          document.getElementById('profile-avatar-area').innerHTML =
            renderAvatar(_user) +
            `<label class="profile-avatar-edit" title="Zmień zdjęcie profilowe">📷<input type="file" id="profile-avatar-input" accept="image/*" style="display:none" /></label>`;
          bindAvatarInput();
          updateNavbar();
          showToast('Zdjęcie profilowe zaktualizowane', 'success');
        } catch(err) {
          showToast(err.message, 'error');
        } finally { showLoading(false); }
      });
    }
    bindAvatarInput();

    // Show/hide current-password toggle
    document.getElementById('pf-toggle-pass').addEventListener('click', () => {
      const inp = document.getElementById('pf-current-pass');
      const btn = document.getElementById('pf-toggle-pass');
      if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
      else { inp.type = 'password'; btn.textContent = '👁'; }
    });

    document.getElementById('pf-save-btn').addEventListener('click', async () => {
      const display_name = document.getElementById('pf-display-name').value.trim();
      const username     = document.getElementById('pf-username').value.trim();
      const current_password = document.getElementById('pf-current-pass').value;
      const new_password     = document.getElementById('pf-new-pass').value;
      const confirm_password = document.getElementById('pf-confirm-pass').value;

      if (!display_name || !username) { showToast('Wypełnij nazwę i login', 'error'); return; }
      if (new_password && new_password !== confirm_password) { showToast('Hasła nie są takie same', 'error'); return; }

      const payload = { display_name, username };
      if (new_password) { payload.current_password = current_password; payload.new_password = new_password; }

      try {
        showLoading(true);
        const res = await API.updateProfile(payload);
        _user = { ..._user, ...res.user };
        updateNavbar();
        closeModal();
        showToast('Profil zaktualizowany pomyślnie', 'success');
      } catch(err) {
        showToast(err.message, 'error');
      } finally { showLoading(false); }
    });
  }

  return { getUser, getPermissions, isLoggedIn, hasPermission, isSuperadmin, isAdmin, init, login, logout, updateNavbar, openProfileModal };
})();
