async function renderSuggestions(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="container">
        <h1>Skrzynka Sugestii</h1>
        <p>Masz pomysł, pytanie lub chcesz nam coś powiedzieć? Wszystkie wiadomości są w pełni anonimowe.</p>
      </div>
    </div>
    <div class="section">
      <div class="container" style="max-width:700px">

        <div id="sug-success" class="hidden" style="
          background:#dcfce7;border:2px solid #16a34a;border-radius:var(--radius);
          padding:32px;text-align:center;margin-bottom:32px">
          <p style="color:#166534;font-size:1.1rem;font-weight:600">Dziękujemy za Twój głos. Przeczytamy każdą wiadomość.</p>
          <button class="btn btn-primary mt-3" id="sug-send-another">Wyślij kolejną</button>
        </div>

        <div id="sug-form-wrap">
          <div class="card" style="margin-bottom:28px">
            <div class="card-body">
              <h3 style="margin-bottom:4px">Napisz do nas</h3>
              <p style="margin-bottom:20px;font-size:0.9rem">Wiadomość jest w pełni anonimowa — nie zbieramy żadnych danych.</p>

              <form id="suggestion-form">
                <div class="form-group">
                  <label>Treść wiadomości <span style="color:#ef4444">*</span></label>
                  <textarea id="sug-content" class="form-control" rows="7"
                    placeholder="Opisz swój pomysł, problem lub pytanie... (min. 10 znaków)"
                    maxlength="2000" required></textarea>
                  <div style="display:flex;justify-content:flex-end">
                    <span id="sug-char-count" style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">0 / 2000</span>
                  </div>
                </div>

                <div id="sug-error" class="form-error" style="display:none;margin-bottom:12px"></div>
                <div style="text-align:center">
                  <button type="submit" class="btn btn-primary btn-lg" id="sug-submit-btn">
                    Wyślij anonimowo
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="card">
            <div class="card-body" style="text-align:center;padding:28px">
              <h4 style="margin-bottom:8px">Twoje bezpieczeństwo</h4>
              <p style="font-size:0.88rem;max-width:480px;margin:0 auto">
                Wiadomości nie zawierają żadnych danych identyfikujących.
                Sugestie są widoczne tylko dla administratorów Sztabu Wawaka.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  const textarea = document.getElementById('sug-content');
  const counter = document.getElementById('sug-char-count');
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = len + ' / 2000';
    counter.style.color = len > 1800 ? '#ef4444' : 'var(--text-muted)';
  });

  document.getElementById('sug-send-another').addEventListener('click', () => {
    document.getElementById('sug-success').classList.add('hidden');
    document.getElementById('sug-form-wrap').classList.remove('hidden');
    document.getElementById('suggestion-form').reset();
    counter.textContent = '0 / 2000';
  });

  document.getElementById('suggestion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('sug-error');
    errEl.style.display = 'none';
    const payload = { content: textarea.value.trim(), category: 'inne', is_anonymous: true };
    const btn = document.getElementById('sug-submit-btn');
    btn.disabled = true; btn.textContent = 'Wysyłanie...';
    try {
      await API.submitSuggestion(payload);
      document.getElementById('sug-form-wrap').classList.add('hidden');
      document.getElementById('sug-success').classList.remove('hidden');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false; btn.textContent = 'Wyślij anonimowo';
    }
  });
}
