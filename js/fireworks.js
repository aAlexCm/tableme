// Lightweight canvas fireworks animation for the guest page hero — rockets
// alternate launching from the left and right edges, arc toward the center,
// and burst into a fading particle shower (Spider Solitaire win-screen style).
const PALETTE = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#ffffff'];

export function startFireworks(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let scale = 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let rockets = [];
  let particles = [];
  let nextSide = 'left';
  let lastLaunch = 0;
  let lastFrame = performance.now();
  let rafId = null;

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    scale = Math.max(1, Math.min(2.4, Math.min(width, height) / 220));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launchRocket() {
    const fromLeft = nextSide === 'left';
    nextSide = fromLeft ? 'right' : 'left';
    const startX = fromLeft ? 0 : width;
    const startY = height * (0.35 + Math.random() * 0.4);
    const targetX = width / 2 + (Math.random() - 0.5) * width * 0.16;
    const targetY = height * (0.15 + Math.random() * 0.25);
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    rockets.push({ x: startX, y: startY, startX, startY, targetX, targetY, t: 0, duration: 650 + Math.random() * 300, color });
  }

  function explode(x, y, color) {
    const count = Math.round((30 + Math.random() * 16) * scale);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const speed = (2.2 + Math.random() * 3.4) * scale;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 750 + Math.random() * 550,
        color,
      });
    }
  }

  function frame(now) {
    const dt = Math.min(48, now - lastFrame);
    lastFrame = now;

    if (now - lastLaunch > 1100 + Math.random() * 700) {
      lastLaunch = now;
      launchRocket();
    }

    ctx.clearRect(0, 0, width, height);

    rockets = rockets.filter((r) => {
      r.t += dt;
      const p = Math.min(1, r.t / r.duration);
      const ease = 1 - (1 - p) * (1 - p);
      r.x = r.startX + (r.targetX - r.startX) * ease;
      const arc = Math.sin(p * Math.PI) * -height * 0.12;
      r.y = r.startY + (r.targetY - r.startY) * ease + arc;
      ctx.beginPath();
      ctx.fillStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10 * scale;
      ctx.globalAlpha = 1;
      ctx.arc(r.x, r.y, 3.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (p >= 1) {
        explode(r.targetX, r.targetY, r.color);
        return false;
      }
      return true;
    });

    particles = particles.filter((pt) => {
      pt.life += dt;
      if (pt.life >= pt.maxLife) return false;
      pt.vy += dt * 0.0018;
      pt.x += pt.vx * (dt / 16);
      pt.y += pt.vy * (dt / 16);
      const fade = 1 - pt.life / pt.maxLife;
      ctx.beginPath();
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 6 * scale;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.arc(pt.x, pt.y, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
  }

  resize();
  let resizeObserver = null;
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
  } else {
    window.addEventListener('resize', resize);
  }

  rafId = requestAnimationFrame(frame);

  return function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    if (resizeObserver) resizeObserver.disconnect();
    else window.removeEventListener('resize', resize);
  };
}
