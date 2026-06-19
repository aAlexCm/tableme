(function () {
  let selectedWeddingId = null;

  const weddingForm = document.getElementById('wedding-form');
  const weddingNameInput = document.getElementById('wedding-name');
  const weddingDateInput = document.getElementById('wedding-date');
  const weddingListEl = document.getElementById('wedding-list');
  const weddingEmptyEl = document.getElementById('wedding-empty');

  const guestsCard = document.getElementById('guests-card');
  const guestsTitle = document.getElementById('guests-title');
  const guestLinkInput = document.getElementById('guest-link');
  const copyLinkBtn = document.getElementById('copy-link');
  const guestForm = document.getElementById('guest-form');
  const guestNameInput = document.getElementById('guest-name');
  const guestTableInput = document.getElementById('guest-table');
  const guestListEl = document.getElementById('guest-list');
  const guestEmptyEl = document.getElementById('guest-empty');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function renderWeddings() {
    const weddings = Storage.getWeddings();
    weddingListEl.innerHTML = '';
    weddingEmptyEl.hidden = weddings.length > 0;

    weddings.forEach((w) => {
      const li = document.createElement('li');
      li.className = 'wedding-item';
      const dateLabel = w.date ? new Date(w.date).toLocaleDateString('fr-FR') : 'Date non définie';
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(w.name)}</strong>
          <span class="muted">${escapeHtml(dateLabel)} &middot; ${w.guests.length} invité(s)</span>
        </div>
        <div class="actions">
          <button type="button" class="secondary" data-action="manage" data-id="${w.id}">Gérer</button>
          <button type="button" class="danger" data-action="delete" data-id="${w.id}">Supprimer</button>
        </div>
      `;
      weddingListEl.appendChild(li);
    });

    if (selectedWeddingId && !weddings.some((w) => w.id === selectedWeddingId)) {
      selectedWeddingId = null;
      guestsCard.hidden = true;
    }
  }

  function renderGuests() {
    const wedding = Storage.getWedding(selectedWeddingId);
    if (!wedding) {
      guestsCard.hidden = true;
      return;
    }

    guestsCard.hidden = false;
    guestsTitle.textContent = `Invités — ${wedding.name}`;
    guestLinkInput.value = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}index.html?id=${wedding.id}`;

    guestListEl.innerHTML = '';
    guestEmptyEl.hidden = wedding.guests.length > 0;

    wedding.guests.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'guest-item';
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(g.name)}</strong>
          <span class="muted">Table ${escapeHtml(g.table)}</span>
        </div>
        <div class="actions">
          <button type="button" class="danger" data-action="delete-guest" data-id="${g.id}">Supprimer</button>
        </div>
      `;
      guestListEl.appendChild(li);
    });
  }

  weddingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = weddingNameInput.value.trim();
    if (!name) return;
    Storage.addWedding(name, weddingDateInput.value);
    weddingForm.reset();
    renderWeddings();
  });

  weddingListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'manage') {
      selectedWeddingId = id;
      renderGuests();
    } else if (action === 'delete') {
      const wedding = Storage.getWedding(id);
      if (wedding && confirm(`Supprimer le mariage "${wedding.name}" et tous ses invités ?`)) {
        Storage.deleteWedding(id);
        renderWeddings();
      }
    }
  });

  guestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedWeddingId) return;
    const name = guestNameInput.value.trim();
    const table = guestTableInput.value.trim();
    if (!name || !table) return;
    Storage.addGuest(selectedWeddingId, name, table);
    guestForm.reset();
    renderGuests();
    renderWeddings();
  });

  guestListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'delete-guest' && selectedWeddingId) {
      Storage.deleteGuest(selectedWeddingId, id);
      renderGuests();
      renderWeddings();
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    guestLinkInput.select();
    navigator.clipboard?.writeText(guestLinkInput.value).catch(() => {});
    copyLinkBtn.textContent = 'Copié !';
    setTimeout(() => (copyLinkBtn.textContent = 'Copier'), 1500);
  });

  renderWeddings();
})();
