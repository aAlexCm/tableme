(function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  const titleEl = document.getElementById('wedding-title');
  const subtitleEl = document.getElementById('wedding-subtitle');
  const noWeddingEl = document.getElementById('no-wedding');
  const weddingPickerEl = document.getElementById('wedding-picker');
  const noWeddingEmptyEl = document.getElementById('no-wedding-empty');
  const searchSectionEl = document.getElementById('search-section');
  const formEl = document.getElementById('search-form');
  const inputEl = document.getElementById('guest-input');
  const resultEl = document.getElementById('result');
  const matchListEl = document.getElementById('match-list');

  function showWeddingPicker() {
    const weddings = Storage.getWeddings();
    noWeddingEl.hidden = false;
    searchSectionEl.hidden = true;

    if (weddings.length === 0) {
      noWeddingEmptyEl.hidden = false;
      return;
    }

    weddings.forEach((w) => {
      const li = document.createElement('li');
      li.className = 'wedding-item';
      const a = document.createElement('a');
      a.href = `index.html?id=${encodeURIComponent(w.id)}`;
      a.textContent = w.name;
      li.appendChild(a);
      weddingPickerEl.appendChild(li);
    });
  }

  function clearResult() {
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    matchListEl.innerHTML = '';
  }

  function showSingleGuest(guest) {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <p class="guest-name">${escapeHtml(guest.name)}</p>
      <p class="table-number">Table ${escapeHtml(guest.table)}</p>
    `;
  }

  function showMatchList(guests) {
    clearResult();
    guests.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'guest-match';
      li.innerHTML = `<span>${escapeHtml(g.name)}</span><span class="muted">Choisir</span>`;
      li.addEventListener('click', () => showSingleGuest(g));
      matchListEl.appendChild(li);
    });
  }

  function showNoMatch() {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `<p class="error-msg">Aucun invité trouvé avec ce nom. Vérifiez l'orthographe.</p>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function handleSearch(query) {
    const matches = Storage.findGuests(weddingId, query);
    if (matches.length === 0) {
      showNoMatch();
    } else if (matches.length === 1) {
      showSingleGuest(matches[0]);
    } else {
      showMatchList(matches);
    }
  }

  if (!weddingId) {
    showWeddingPicker();
    return;
  }

  const wedding = Storage.getWedding(weddingId);
  if (!wedding) {
    showWeddingPicker();
    return;
  }

  titleEl.textContent = wedding.name;
  subtitleEl.textContent = 'Tapez votre nom pour découvrir votre table';
  searchSectionEl.hidden = false;

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch(inputEl.value);
  });
})();
