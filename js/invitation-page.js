import { Storage, generateId } from './storage.js';
import { initErrorLogging } from './error-log.js';

const params = new URLSearchParams(window.location.search);
const weddingId = params.get('id');
const isEditMode = params.get('edit') === '1';
initErrorLogging({ page: 'invitation-page', weddingId });

const canvasRoot = document.getElementById('canvas-root');
const DEFAULT_FONT_FAMILY = "Georgia, 'Times New Roman', serif";

let widgets = [];
let selectedId = null;
let saveTimer = null;

function scheduleSave() {
  if (!isEditMode || !weddingId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    Storage.setInvitation(weddingId, { widgets }).catch((err) => {
      console.warn('setInvitation failed', err);
    });
  }, 500);
}

function normalizeWidget(w) {
  return {
    id: w.id || generateId(),
    type: 'text',
    x: typeof w.x === 'number' ? w.x : 40,
    y: typeof w.y === 'number' ? w.y : 40,
    width: typeof w.width === 'number' ? w.width : undefined,
    text: typeof w.text === 'string' ? w.text : 'Votre texte ici',
    fontSize: typeof w.fontSize === 'number' ? w.fontSize : 20,
    fontFamily: typeof w.fontFamily === 'string' ? w.fontFamily : DEFAULT_FONT_FAMILY,
    bold: !!w.bold,
    italic: !!w.italic,
    underline: !!w.underline,
    align: ['left', 'center', 'right'].includes(w.align) ? w.align : 'left',
    color: w.color || '#2c2420',
  };
}

function applyTextStyle(node, w) {
  node.style.left = `${w.x}px`;
  node.style.top = `${w.y}px`;
  node.style.width = w.width ? `${w.width}px` : '';
  const content = node.querySelector('.widget-text-content');
  if (!content) return;
  content.style.fontFamily = w.fontFamily;
  content.style.fontSize = `${w.fontSize}px`;
  content.style.fontWeight = w.bold ? '700' : '400';
  content.style.fontStyle = w.italic ? 'italic' : 'normal';
  content.style.textDecoration = w.underline ? 'underline' : 'none';
  content.style.textAlign = w.align;
  content.style.color = w.color;
}

// The Text Settings panel lives in the parent page (invitation.html), not in
// this iframe — there's no room for a real Wix-style side panel inside a
// 320px-wide phone mockup. Both pages are same-origin, so we just call
// functions on window.parent directly instead of postMessage.
function notifyParentSelected(w) {
  window.parent.onInvitationWidgetSelected?.({ ...w });
}

function notifyParentDeselected() {
  window.parent.onInvitationWidgetDeselected?.();
}

function deselect() {
  blurActiveEditing(null);
  selectedId = null;
  canvasRoot.querySelectorAll('.widget').forEach((n) => {
    n.classList.remove('selected', 'is-editing');
  });
  notifyParentDeselected();
}

function blurActiveEditing(exceptId) {
  const editingNode = canvasRoot.querySelector('.widget.is-editing');
  if (editingNode && editingNode.dataset.id !== exceptId) {
    const content = editingNode.querySelector('.widget-text-content');
    if (content) content.blur();
  }
}

function selectWidget(id) {
  blurActiveEditing(id);
  selectedId = id;
  const w = widgets.find((item) => item.id === id);
  if (!w) {
    deselect();
    return;
  }
  canvasRoot.querySelectorAll('.widget').forEach((n) => {
    n.classList.toggle('selected', n.dataset.id === id);
  });
  notifyParentSelected(w);
}

function updateSelected(mutator) {
  const w = widgets.find((item) => item.id === selectedId);
  if (!w) return;
  mutator(w);
  const node = canvasRoot.querySelector(`[data-id="${selectedId}"]`);
  if (node) applyTextStyle(node, w);
  notifyParentSelected(w);
  scheduleSave();
}

// Exposed for the parent page's Text Settings panel to call directly.
window.updateSelectedWidgetProps = function updateSelectedWidgetProps(props) {
  updateSelected((w) => Object.assign(w, props));
};

window.deleteSelectedWidget = function deleteSelectedWidget() {
  if (!selectedId) return;
  widgets = widgets.filter((w) => w.id !== selectedId);
  const node = canvasRoot.querySelector(`[data-id="${selectedId}"]`);
  if (node) node.remove();
  deselect();
  scheduleSave();
};

window.deselectInvitationWidget = function deselectInvitationWidget() {
  deselect();
};

// Pointer Events so dragging/resizing works with touch input too.
function wirePointerDrag(handle, onStart) {
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pointerId = e.pointerId;
    const { onMove, onEnd } = onStart(e);

    function cleanup() {
      try {
        handle.releasePointerCapture(pointerId);
      } catch (_) {
        // pointer capture may already be lost — ignore
      }
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
    }
    function onPointerMove(ev) {
      if (ev.pointerId !== pointerId) return;
      onMove(ev);
    }
    function onPointerUp(ev) {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      onEnd();
    }
    function onPointerCancel(ev) {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      onEnd();
    }

    try {
      handle.setPointerCapture(pointerId);
    } catch (_) {
      // best-effort only
    }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
  });
}

function wireWidthResize(handle, node, w, { side }) {
  wirePointerDrag(handle, (e) => {
    selectWidget(w.id);
    const startX = e.clientX;
    const startWidth = w.width || node.offsetWidth;
    const startLeft = w.x;

    return {
      onMove(ev) {
        const dx = ev.clientX - startX;
        if (side === 'right') {
          w.width = Math.max(40, startWidth + dx);
        } else {
          const nextWidth = Math.max(40, startWidth - dx);
          w.x = startLeft + (startWidth - nextWidth);
          w.width = nextWidth;
        }
        applyTextStyle(node, w);
      },
      onEnd() {
        scheduleSave();
      },
    };
  });
}

function wireFontSizeResize(handle, node, w) {
  wirePointerDrag(handle, (e) => {
    selectWidget(w.id);
    const startY = e.clientY;
    const startSize = w.fontSize;

    return {
      onMove(ev) {
        const dy = ev.clientY - startY;
        w.fontSize = Math.min(120, Math.max(8, Math.round(startSize + dy / 2)));
        applyTextStyle(node, w);
        if (selectedId === w.id) notifyParentSelected(w);
      },
      onEnd() {
        scheduleSave();
      },
    };
  });
}

function enterEditMode(node, content, clientX, clientY) {
  node.classList.add('is-editing');
  content.contentEditable = 'true';
  content.focus();
  const sel = window.getSelection();
  // Caret at the click point feels natural for editing existing text; falls
  // back to select-all (e.g. right after creating a brand new widget, where
  // there's no click point to place a caret from).
  const range = (document.caretRangeFromPoint && typeof clientX === 'number')
    ? document.caretRangeFromPoint(clientX, clientY)
    : null;
  if (range) {
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    const fallback = document.createRange();
    fallback.selectNodeContents(content);
    sel.removeAllRanges();
    sel.addRange(fallback);
  }
}

function createTextNode(w) {
  const node = document.createElement('div');
  node.className = 'widget widget-text';
  node.dataset.id = w.id;

  const tag = document.createElement('span');
  tag.className = 'widget-tag';
  tag.innerHTML = `Texte <span class="widget-tag-id">#${w.id}</span>`;
  node.appendChild(tag);

  const content = document.createElement('div');
  content.className = 'widget-text-content';
  content.spellcheck = false;
  content.textContent = w.text;
  content.contentEditable = 'false';
  node.appendChild(content);

  if (isEditMode) {
    const handleLeft = document.createElement('span');
    handleLeft.className = 'widget-handle widget-handle-left';
    node.appendChild(handleLeft);

    const handleRight = document.createElement('span');
    handleRight.className = 'widget-handle widget-handle-right';
    node.appendChild(handleRight);

    const handleBottom = document.createElement('span');
    handleBottom.className = 'widget-handle widget-handle-bottom';
    node.appendChild(handleBottom);

    // A plain click (no movement) selects/edits; a press-and-drag beyond a
    // small threshold moves the widget instead. Without this split, dragging
    // and "click to edit" can't coexist on the same element — the very first
    // pointerdown would always have to commit to one or the other.
    const DRAG_THRESHOLD = 4;
    node.addEventListener('pointerdown', (e) => {
      if (node.classList.contains('is-editing')) return; // let native caret placement happen
      e.preventDefault();
      selectWidget(w.id);
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = w.x;
      const startTop = w.y;
      let dragging = false;

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
        w.x = Math.max(0, startLeft + dx);
        w.y = Math.max(0, startTop + dy);
        node.style.left = `${w.x}px`;
        node.style.top = `${w.y}px`;
      }
      function onUp(ev) {
        if (ev.pointerId !== pointerId) return;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (dragging) {
          scheduleSave();
        } else {
          enterEditMode(node, content, ev.clientX, ev.clientY);
        }
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
    wireWidthResize(handleLeft, node, w, { side: 'left' });
    wireWidthResize(handleRight, node, w, { side: 'right' });
    wireFontSizeResize(handleBottom, node, w);

    content.addEventListener('blur', () => {
      w.text = content.textContent;
      content.contentEditable = 'false';
      node.classList.remove('is-editing');
      scheduleSave();
    });
    content.addEventListener('input', () => {
      w.text = content.textContent;
    });
  }

  applyTextStyle(node, w);
  canvasRoot.appendChild(node);
  return node;
}

window.addTextWidget = function addTextWidget() {
  if (!isEditMode) return;
  const w = normalizeWidget({
    x: 40 + (widgets.length % 5) * 14,
    y: 40 + (widgets.length % 5) * 28,
  });
  widgets.push(w);
  const node = createTextNode(w);
  const content = node.querySelector('.widget-text-content');
  selectWidget(w.id);
  enterEditMode(node, content);
  scheduleSave();
};

if (isEditMode) {
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.widget')) return;
    deselect();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (!selectedId) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    e.preventDefault();
    window.deleteSelectedWidget();
  });
}

(async function init() {
  if (!weddingId) return;
  let wedding;
  try {
    wedding = await Storage.getWedding(weddingId);
  } catch (err) {
    console.error('getWedding failed', err);
    return;
  }
  if (!wedding) return;

  const saved = wedding.invitation && Array.isArray(wedding.invitation.widgets) ? wedding.invitation.widgets : [];
  widgets = saved.map(normalizeWidget);
  widgets.forEach((w) => createTextNode(w));
})();
