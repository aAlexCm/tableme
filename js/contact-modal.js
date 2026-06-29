import { t } from './i18n.js';

const ICONS = {
  phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// A pure launcher for a guest's contact methods (call now, more to come
// later — email, WhatsApp, etc.) — it never edits guest data itself, that
// still happens in the main guest-modal. New methods just push another
// entry into `actions` below.
export function createContactModal({ getLang }) {
  const modal = document.getElementById('contact-modal');
  const closeBtn = document.getElementById('contact-modal-close');
  const titleEl = document.getElementById('contact-modal-title');
  const actionsEl = document.getElementById('contact-modal-actions');
  const emptyEl = document.getElementById('contact-modal-empty');

  function buildActionsHtml(guest) {
    const lang = getLang();
    const actions = [];
    if (guest.phone) {
      actions.push(`
        <a class="contact-modal-action" href="tel:${escapeHtml(guest.phone)}">
          <span class="contact-modal-action-icon" aria-hidden="true">${ICONS.phone}</span>
          <span class="contact-modal-action-text">
            <span class="contact-modal-action-label">${escapeHtml(t(lang, 'contactModalCallLabel'))}</span>
            <span class="contact-modal-action-value">${escapeHtml(guest.phone)}</span>
          </span>
        </a>
      `);
    }
    return actions;
  }

  function open(guest) {
    titleEl.textContent = guest.name;
    const actions = buildActionsHtml(guest);
    actionsEl.innerHTML = actions.join('');
    emptyEl.textContent = t(getLang(), 'contactModalEmpty');
    emptyEl.hidden = actions.length > 0;
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  return { open, close };
}
