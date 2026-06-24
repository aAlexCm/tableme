import { t } from './i18n.js';

const ICONS = {
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07l1.39-1.39"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  qrcode: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17h3v3h-3z"/><path d="M21 14v3"/><path d="M14 21h3"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
};

export function createShareControls({ getLang, weddingNameEl }) {
  const guestPageLink = document.getElementById('guest-page-link');
  const guestLinkInput = document.getElementById('guest-link');
  const copyLinkBtn = document.getElementById('copy-link');
  const qrCodeBtn = document.getElementById('qr-code-btn');
  const qrModal = document.getElementById('qr-modal');
  const qrModalClose = document.getElementById('qr-modal-close');
  const qrCanvasContainer = document.getElementById('qr-canvas-container');
  const qrDownloadBtn = document.getElementById('qr-download-btn');
  const qrShareBtn = document.getElementById('qr-share-btn');

  function updateLabels() {
    const lang = getLang();
    const copyLabel = t(lang, 'copyGuestLinkBtn');
    copyLinkBtn.title = copyLabel;
    copyLinkBtn.setAttribute('aria-label', copyLabel);

    const qrLabel = t(lang, 'qrCodeBtn');
    qrCodeBtn.title = qrLabel;
    qrCodeBtn.setAttribute('aria-label', qrLabel);

    qrDownloadBtn.innerHTML = ICONS.download;
    const downloadLabel = t(lang, 'qrDownloadBtn');
    qrDownloadBtn.title = downloadLabel;
    qrDownloadBtn.setAttribute('aria-label', downloadLabel);

    qrShareBtn.innerHTML = ICONS.share;
    const shareLabel = t(lang, 'qrShareBtn');
    qrShareBtn.title = shareLabel;
    qrShareBtn.setAttribute('aria-label', shareLabel);
  }

  copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(guestLinkInput.value).catch(() => {});
    copyLinkBtn.innerHTML = ICONS.check;
    setTimeout(() => (copyLinkBtn.innerHTML = ICONS.link), 1200);
  });

  function openQrModal() {
    const url = guestLinkInput.value;
    qrCanvasContainer.innerHTML = '';
    new window.QRCode(qrCanvasContainer, {
      text: url,
      width: 220,
      height: 220,
      colorDark: '#38362f',
      colorLight: '#fffdf9',
    });
    qrShareBtn.hidden = !navigator.share;
    qrModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeQrModal() {
    qrModal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  qrCodeBtn.addEventListener('click', openQrModal);
  qrModalClose.addEventListener('click', closeQrModal);
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) closeQrModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !qrModal.hidden) closeQrModal();
  });

  qrDownloadBtn.addEventListener('click', () => {
    const canvas = qrCanvasContainer.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qrcode-tableme.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  qrShareBtn.addEventListener('click', async () => {
    const canvas = qrCanvasContainer.querySelector('canvas');
    if (!canvas) return;
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'qrcode-tableme.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: weddingNameEl.textContent, url: guestLinkInput.value });
      } else {
        await navigator.share({ title: weddingNameEl.textContent, url: guestLinkInput.value });
      }
    } catch {
      // user cancelled the share sheet
    }
  });

  function init(weddingId) {
    guestPageLink.href = `index.html?id=${weddingId}`;
    guestLinkInput.value = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}index.html?id=${weddingId}`;
    copyLinkBtn.innerHTML = ICONS.link;
    qrCodeBtn.innerHTML = ICONS.qrcode;
    updateLabels();
  }

  return { init, updateLabels };
}
