import { t } from './i18n.js';

const ICONS = {
  phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  sms: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-1.73-.87-2.87-1.55-4.01-3.52-.3-.52.3-.48.86-1.6.1-.19.05-.36-.05-.5-.1-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.04 3.12 4.95 4.25 2.46.97 2.46.64 3.41.56.94-.09 2.04-.85 2.33-1.67.3-.82.3-1.52.2-1.67-.1-.15-.3-.2-.6-.35z"/><path d="M12.04 2C6.52 2 2.04 6.48 2.04 12c0 1.83.49 3.53 1.36 5.01L2 22l5.18-1.36A9.95 9.95 0 0 0 12.04 22c5.52 0 10-4.48 10-10S17.56 2 12.04 2zm0 18.18a8.13 8.13 0 0 1-4.14-1.13l-.3-.18-3.07.81.82-3-.19-.31a8.12 8.12 0 0 1-1.25-4.35c0-4.49 3.66-8.15 8.15-8.15 4.49 0 8.15 3.66 8.15 8.15 0 4.5-3.66 8.16-8.17 8.16z"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07l1.39-1.39"/></svg>',
};

function digitsOnly(phone) {
  return String(phone).replace(/[^0-9]/g, '');
}

// Each guest's RSVP page is just their own personal link — the wedding's
// page (origin + path) plus this guest's id, same scheme as the "Page
// invité" link built in share-controls.js.
function buildRsvpUrl(weddingId, guestId, lang) {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}rsvp/${lang}?id=${weddingId}&guest=${guestId}`;
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

// A pure launcher for a guest's contact methods (call now, more to come
// later — email, WhatsApp, etc.) — it never edits guest data itself, that
// still happens in the main guest-modal. New methods just push another
// entry into `actions` below.
export function createContactModal({ weddingId, getLang }) {
  const modal = document.getElementById('contact-modal');
  const closeBtn = document.getElementById('contact-modal-close');
  const titleEl = document.getElementById('contact-modal-title');
  const actionsEl = document.getElementById('contact-modal-actions');

  function buildActionsHtml(guest) {
    const lang = getLang();
    const actions = [];
    const rsvpUrl = buildRsvpUrl(weddingId, guest.id, lang);
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
    // RSVP reminders only make sense while we're still waiting on an answer
    // — once confirmed or declined there's nothing left to chase.
    if (guest.phone && (guest.rsvp || 'pending') === 'pending') {
      const firstName = (guest.name || '').trim().split(/\s+/)[0] || guest.name;
      const message = `${t(lang, 'contactModalReminderMessage', firstName)}\n\n${rsvpUrl}`;
      const encodedMessage = encodeURIComponent(message);
      actions.push(`
        <a class="contact-modal-action" href="sms:${escapeHtml(guest.phone)}?&body=${encodedMessage}">
          <span class="contact-modal-action-icon" aria-hidden="true">${ICONS.sms}</span>
          <span class="contact-modal-action-text">
            <span class="contact-modal-action-value">${escapeHtml(t(lang, 'contactModalSmsLabel'))}</span>
          </span>
        </a>
        <a class="contact-modal-action" href="https://wa.me/${digitsOnly(guest.phone)}?text=${encodedMessage}" target="_blank" rel="noopener">
          <span class="contact-modal-action-icon contact-modal-action-icon-whatsapp" aria-hidden="true">${ICONS.whatsapp}</span>
          <span class="contact-modal-action-text">
            <span class="contact-modal-action-value">${escapeHtml(t(lang, 'contactModalWhatsappLabel'))}</span>
          </span>
        </a>
      `);
    }
    // Always available, regardless of phone/RSVP state — a direct way to
    // reach the guest's own confirmation page without going through a
    // messaging app at all (share it however you like).
    actions.push(`
      <a class="contact-modal-action" href="${escapeHtml(rsvpUrl)}" target="_blank" rel="noopener">
        <span class="contact-modal-action-icon" aria-hidden="true">${ICONS.link}</span>
        <span class="contact-modal-action-text">
          <span class="contact-modal-action-label">${escapeHtml(t(lang, 'contactModalRsvpLinkLabel'))}</span>
          <span class="contact-modal-action-value">${escapeHtml(rsvpUrl.replace(/^https?:\/\//, ''))}</span>
        </span>
      </a>
    `);
    return actions;
  }

  function open(guest) {
    titleEl.textContent = guest.name;
    const actions = buildActionsHtml(guest);
    actionsEl.innerHTML = actions.join('');
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
