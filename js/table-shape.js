export const DEFAULT_SEATS = 8;

const CHAIR_SIZE = 22;
const CHAIR_RADIUS_PX = CHAIR_SIZE / 2;
const CHAIR_GAP = 2;
const ROUND_TABLE_R = 44;
const ROUND_CHAIR_RADIUS = ROUND_TABLE_R + CHAIR_GAP + CHAIR_RADIUS_PX;
const RECT_HALF_W_MIN = 65;
const RECT_HALF_H = 32;
const RECT_INSET = 18;
const RECT_USABLE_HALF_MIN = RECT_HALF_W_MIN - RECT_INSET;
const RECT_Y_OFFSET = RECT_HALF_H + CHAIR_GAP + CHAIR_RADIUS_PX;
const CHAIR_SPACING = CHAIR_SIZE + CHAIR_GAP;

export function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRectDimensions(seatCount) {
  const topCount = Math.ceil(seatCount / 2);
  const neededUsableHalf = topCount > 1 ? ((topCount - 1) * CHAIR_SPACING) / 2 : 0;
  const usableHalf = Math.max(RECT_USABLE_HALF_MIN, neededUsableHalf);
  const halfWidth = usableHalf + RECT_INSET;
  return { halfWidth, usableHalf };
}

export function getTableReach(table) {
  if ((table.shape || 'round') !== 'rectangle') {
    const r = ROUND_CHAIR_RADIUS + CHAIR_RADIUS_PX;
    return { x: r, y: r };
  }
  const seatCount = table.seats != null ? table.seats : DEFAULT_SEATS;
  const { halfWidth } = getRectDimensions(seatCount);
  return { x: halfWidth, y: RECT_Y_OFFSET + CHAIR_RADIUS_PX };
}

export function buildChairs(unitEl, shape, seatCount, guests, highlightGuestId) {
  const guestCount = guests.length;
  if (shape === 'round') {
    for (let i = 0; i < seatCount; i += 1) {
      const angle = (360 / seatCount) * i;
      const occupied = i < guestCount;
      const isYou = occupied && highlightGuestId != null && guests[i].id === highlightGuestId;
      const chairEl = document.createElement('div');
      chairEl.className = `chair${occupied ? ' occupied' : ''}${isYou ? ' chair-you' : ''}`;
      if (occupied) {
        chairEl.dataset.name = guests[i].name;
        const initialsEl = document.createElement('span');
        initialsEl.className = 'chair-initials';
        initialsEl.style.setProperty('--chair-counter-angle', `-${angle}deg`);
        initialsEl.textContent = getInitials(guests[i].name);
        chairEl.appendChild(initialsEl);
      }
      chairEl.style.setProperty('--chair-angle', `${angle}deg`);
      chairEl.style.setProperty('--chair-radius', `-${ROUND_CHAIR_RADIUS}px`);
      unitEl.appendChild(chairEl);
    }
    return;
  }

  const { usableHalf } = getRectDimensions(seatCount);
  const topCount = Math.ceil(seatCount / 2);
  const bottomCount = seatCount - topCount;
  const positions = [];
  const placeRow = (count, y) => {
    if (count <= 0) return;
    if (count === 1) {
      positions.push({ x: 0, y });
      return;
    }
    const span = usableHalf * 2;
    for (let i = 0; i < count; i += 1) {
      positions.push({ x: -usableHalf + (i * span) / (count - 1), y });
    }
  };
  placeRow(topCount, -RECT_Y_OFFSET);
  placeRow(bottomCount, RECT_Y_OFFSET);

  positions.forEach((pos, i) => {
    const occupied = i < guestCount;
    const isYou = occupied && highlightGuestId != null && guests[i].id === highlightGuestId;
    const chairEl = document.createElement('div');
    chairEl.className = `chair chair-fixed${occupied ? ' occupied' : ''}${isYou ? ' chair-you' : ''}`;
    if (occupied) {
      chairEl.dataset.name = guests[i].name;
      const initialsEl = document.createElement('span');
      initialsEl.className = 'chair-initials';
      initialsEl.textContent = getInitials(guests[i].name);
      chairEl.appendChild(initialsEl);
    }
    chairEl.style.left = `${pos.x}px`;
    chairEl.style.top = `${pos.y}px`;
    unitEl.appendChild(chairEl);
  });
}
