// js/components/before-after.js — Before & After image slider

function renderBeforeAfter(beforeUrl, afterUrl, opts = {}) {
  const id = 'ba-' + Math.random().toString(36).slice(2, 8);
  const labelBefore = opts.labelBefore || 'Before';
  const labelAfter = opts.labelAfter || 'After';

  setTimeout(() => initBeforeAfter(id), 50);

  return `
    <div class="ba-container" id="${id}">
      <div class="ba-img ba-before">
        <img src="${escapeHtml(beforeUrl)}" alt="Before">
        <span class="ba-label ba-label-before">${escapeHtml(labelBefore)}</span>
      </div>
      <div class="ba-img ba-after">
        <img src="${escapeHtml(afterUrl)}" alt="After">
        <span class="ba-label ba-label-after">${escapeHtml(labelAfter)}</span>
      </div>
      <div class="ba-handle" onmousedown="baStartDrag(event, '${id}')" ontouchstart="baStartDrag(event, '${id}')">
        <i class="bi bi-arrow-left-right"></i>
      </div>
      <input type="range" class="ba-range" min="0" max="100" value="50" oninput="baSlide(this.value, '${id}')">
    </div>
  `;
}

function initBeforeAfter(id) {
  const container = document.getElementById(id);
  if (!container) return;
  const range = container.querySelector('.ba-range');
  const after = container.querySelector('.ba-after');
  if (range && after) {
    after.style.clipPath = `inset(0 0 0 ${range.value}%)`;
  }
}

function baSlide(val, id) {
  const container = document.getElementById(id);
  if (!container) return;
  const after = container.querySelector('.ba-after');
  const handle = container.querySelector('.ba-handle');
  if (after) after.style.clipPath = `inset(0 0 0 ${val}%)`;
  if (handle) handle.style.left = `${val}%`;
}

function baStartDrag(e, id) {
  e.preventDefault();
  const container = document.getElementById(id);
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const range = container.querySelector('.ba-range');

  function onMove(ev) {
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (range) range.value = pct;
    baSlide(pct, id);
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onUp);
}
