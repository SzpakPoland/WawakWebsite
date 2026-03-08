const Router = (() => {

  const routes = {
    '/':              (c) => renderHome(c),
    '/announcements': (c, params) => params[0] ? renderAnnouncementDetail(c, params[0]) : renderAnnouncements(c),
    '/gallery':       (c) => renderGallery(c),
    '/staff':         (c) => renderStaff(c),
    '/suggestions':   (c) => renderSuggestions(c),
    '/discounts':     (c) => renderDiscounts(c),
    '/login':         (c) => renderLogin(c),
    '/admin':         (c, params) => renderAdminPanel(c, params[0] || 'dashboard'),
  };

  function parsePath() {
    const pathname = window.location.pathname || '/';
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return { path: '/', params: [] };
    const path = '/' + parts[0];
    const params = parts.slice(1);
    return { path, params };
  }

  async function render() {
    const { path, params } = parsePath();
    const content = document.getElementById('page-content');
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      const linkPage = link.dataset.page;
      const active = (path === '/' && linkPage === 'home') || (path === `/${linkPage}`);
      link.classList.toggle('active', active);
    });

    const handler = routes[path];
    if (!handler) {
      content.innerHTML = `
        <div class="section">
          <div class="container">
            <div class="empty-state">
              <span class="emoji">🔍</span>
              <h3>Strona nie znaleziona</h3>
              <p>Nie ma takiej strony. Sprawdź adres URL.</p>
              <a href="/" class="btn btn-primary mt-2">← Wróć na start</a>
            </div>
          </div>
        </div>`;
      return;
    }

    showLoading(true);
    try {
      content.innerHTML = '';
      await handler(content, params);
    } catch (e) {
      console.error('Route render error:', e);
      content.innerHTML = `
        <div class="section"><div class="container">
          <div class="empty-state">
            <span class="emoji">❌</span>
            <h3>Błąd ładowania strony</h3>
            <p>${escapeHtml(e.message)}</p>
          </div>
        </div></div>`;
    } finally {
      showLoading(false);
      window.scrollTo(0, 0);
    }
  }

  function navigate(path) {
    history.pushState({}, '', path);
    render();
  }

  function init() {
    window.addEventListener('popstate', render);
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link && !link.getAttribute('href').startsWith('//') && link.getAttribute('target') !== '_blank') {
        e.preventDefault();
        navigate(link.getAttribute('href'));
      }
    });
    render();
  }

  return { navigate, init, render };
})();

// Modal global close
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Hamburger (public nav)
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});

// Global click — close public nav + close profile dropdown
document.addEventListener('click', (e) => {
  const nav = document.getElementById('nav-links');
  const ham = document.getElementById('hamburger');
  if (nav && ham && !nav.contains(e.target) && !ham.contains(e.target)) nav.classList.remove('open');

  const dropdown = document.getElementById('nav-profile-dropdown');
  const toggle   = document.getElementById('btn-profile-toggle');
  if (dropdown && toggle && !dropdown.contains(e.target) && !toggle.contains(e.target)) {
    dropdown.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

// Boot
(async () => {
  await Auth.init();
  Router.init();
})();

// Liquid glass navbar — scroll effect
(function () {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const onScroll = () => {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}());

// Scroll-reveal Intersection Observer
(function () {
  const selectors = '.reveal, .reveal-left, .reveal-right, .reveal-scale';
  const observe = () => {
    document.querySelectorAll(selectors).forEach(el => {
      if (!el._revealObserved) {
        revealObs.observe(el);
        el._revealObserved = true;
      }
    });
  };
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  observe();
  const mo = new MutationObserver(observe);
  mo.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
}());
