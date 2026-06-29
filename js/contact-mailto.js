import { t } from './i18n.js';

const CONTACT_EMAIL = 'boagiualexandru@gmail.com';

// A mailto: can't have actual form fields, so the body is pre-filled with
// labelled blanks (email/phone/message) asking for the info needed to
// reply — the sender's own email address also comes through for free as
// the message's "From", but phone never would without asking explicitly.
export function buildContactMailtoHref(lang) {
  const subject = encodeURIComponent(t(lang, 'contactMailtoSubject'));
  const body = encodeURIComponent(t(lang, 'contactMailtoBody'));
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export function applyContactMailto(link, lang) {
  if (!link) return;
  link.href = buildContactMailtoHref(lang);
  link.removeAttribute('target');
  link.removeAttribute('rel');
}
