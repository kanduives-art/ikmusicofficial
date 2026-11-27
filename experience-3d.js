(() => {
  'use strict';
  const body = document.body, toggle = document.getElementById('toggle3D');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'), finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let savedPreference = null; try { savedPreference = localStorage.getItem('ik-3d-motion'); } catch {}
  let enabled = savedPreference ? savedPreference === 'on' : !reduceMotion.matches;
  function setMotion(next, persist = true) {
    enabled = Boolean(next); body.classList.toggle('motion-off', !enabled); body.classList.toggle('motion-3d', enabled); toggle.setAttribute('aria-pressed', String(enabled)); toggle.textContent = enabled ? '3D / ON' : '3D / OFF';
    if (!enabled) { document.querySelectorAll('.ambient-video').forEach(video => video.pause()); resetTilt(); } else if (typeof window.updateMotion === 'function') window.updateMotion();
    if (persist) { try { localStorage.setItem('ik-3d-motion', enabled ? 'on' : 'off'); } catch {} }
    window.dispatchEvent(new CustomEvent('ik:3d-motion', { detail: { enabled } }));
  }
  toggle.addEventListener('click', () => setMotion(!enabled)); reduceMotion.addEventListener('change', event => { if (event.matches) setMotion(false, false); });
  const tiltSelector = '.record, .show-film, .gallery-preview, .bio-portrait, .spotify-container, .social-card, .album-tile';
  document.querySelectorAll(tiltSelector).forEach(element => element.classList.add('depth-surface'));
  let tiltFrame = 0, tiltEvent = null, tiltElement = null;
  function paintTilt() {
    tiltFrame = 0; if (!tiltElement || !tiltEvent || !enabled) return; const rect = tiltElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (tiltEvent.clientX - rect.left) / rect.width)), y = Math.max(0, Math.min(1, (tiltEvent.clientY - rect.top) / rect.height));
    const strength = tiltElement.classList.contains('spotify-container') ? 1.5 : 5;
    tiltElement.style.setProperty('--ry', `${((x - .5) * strength).toFixed(2)}deg`); tiltElement.style.setProperty('--rx', `${((.5 - y) * strength).toFixed(2)}deg`); tiltElement.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`); tiltElement.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  }
  document.addEventListener('pointermove', event => { if (!enabled || !finePointer.matches || event.pointerType === 'touch') return; const element = event.target.closest(tiltSelector); if (!element) return; element.classList.add('depth-surface', 'is-tilting'); if (element.classList.contains('album-tile')) element.style.animation = 'none'; tiltElement = element; tiltEvent = event; if (!tiltFrame) tiltFrame = requestAnimationFrame(paintTilt); }, { passive: true });
  document.addEventListener('pointerout', event => { const element = event.target.closest(tiltSelector); if (!element || (event.relatedTarget && element.contains(event.relatedTarget))) return; resetElement(element); if (tiltElement === element) { tiltElement = null; tiltEvent = null; } }, { passive: true });
  function resetElement(element) { element.classList.remove('is-tilting'); element.style.setProperty('--rx', '0deg'); element.style.setProperty('--ry', '0deg'); element.style.setProperty('--lift', '0px'); }
  function resetTilt() { document.querySelectorAll('.is-tilting').forEach(resetElement); document.documentElement.style.setProperty('--hero-x', '0px'); document.documentElement.style.setProperty('--hero-y', '0px'); }
  document.addEventListener('focusin', event => { const element = event.target.closest(tiltSelector); if (element && enabled) { element.classList.add('depth-surface', 'is-tilting'); element.style.setProperty('--rx', '-2deg'); } });
  document.addEventListener('focusout', event => { const element = event.target.closest(tiltSelector); if (element) resetElement(element); });
  const hero = document.querySelector('.hero'); let heroFrame = 0, lastHeroEvent;
  hero.addEventListener('pointermove', event => { if (!enabled || !finePointer.matches) return; lastHeroEvent = event; if (heroFrame) return; heroFrame = requestAnimationFrame(() => { const rect = hero.getBoundingClientRect(), x = (lastHeroEvent.clientX - rect.left) / rect.width - .5, y = (lastHeroEvent.clientY - rect.top) / rect.height - .5; hero.style.setProperty('--hero-x', `${(x * 7).toFixed(2)}px`); hero.style.setProperty('--hero-y', `${(y * 5).toFixed(2)}px`); heroFrame = 0; }); }, { passive: true });
  hero.addEventListener('pointerleave', () => { hero.style.setProperty('--hero-x', '0px'); hero.style.setProperty('--hero-y', '0px'); });
  function syncModalState() { body.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]'))); }
  function animateOpen(dialog) { if (!dialog) return; dialog.classList.remove('closing'); syncModalState(); }
  function animateClose(dialog, closeOriginal) { if (!dialog || !dialog.open || dialog.classList.contains('closing')) return; if (!enabled || reduceMotion.matches) { closeOriginal(); return; } dialog.classList.add('closing'); setTimeout(() => { dialog.classList.remove('closing'); closeOriginal(); syncModalState(); }, 180); }
  const originalOpenAlbum = window.openAlbum; window.openAlbum = function (...args) { const result = originalOpenAlbum.apply(this, args); animateOpen(document.getElementById('galleryModal')); return result; };
  const originalOpenGallery = window.openGalleryModal; window.openGalleryModal = function (...args) { const result = originalOpenGallery.apply(this, args); animateOpen(document.getElementById('galleryModal')); return result; };
  const originalOpenShow = window.openShow; window.openShow = function (...args) { const result = originalOpenShow.apply(this, args); animateOpen(document.getElementById('showDialog')); return result; };
  const originalCloseGallery = window.closeGalleryModal; window.closeGalleryModal = function () { animateClose(document.getElementById('galleryModal'), originalCloseGallery); };
  const originalCloseShow = window.closeShow; window.closeShow = function () { animateClose(document.getElementById('showDialog'), originalCloseShow); };
  document.querySelectorAll('dialog').forEach(dialog => { dialog.addEventListener('cancel', event => { event.preventDefault(); if (dialog.id === 'galleryModal') window.closeGalleryModal(); else if (dialog.id === 'showDialog') window.closeShow(); }); dialog.addEventListener('close', () => { dialog.classList.remove('closing'); syncModalState(); }); });
  const originalRenderGrid = window.renderGrid; window.renderGrid = function (...args) { const result = originalRenderGrid.apply(this, args); document.querySelectorAll('.album-tile').forEach((tile, index) => { tile.classList.add('depth-surface'); tile.style.setProperty('--tile-order', index); }); return result; };
  const originalRenderPhoto = window.renderPhoto; window.renderPhoto = function (...args) { const result = originalRenderPhoto.apply(this, args); const image = document.getElementById('galleryImage'); image.classList.remove('photo-depth-enter'); void image.offsetWidth; if (enabled) image.classList.add('photo-depth-enter'); return result; };
  const originalStart = window.startExperience; window.startExperience = function (...args) { const result = originalStart.apply(this, args); body.classList.add('experience-entered'); return result; };
  document.addEventListener('keydown', event => { if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return; document.getElementById('navbar').classList.remove('menu-open'); document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false'); document.querySelector('.language-selector').classList.remove('open'); document.getElementById('langToggle').setAttribute('aria-expanded', 'false'); });
  setMotion(enabled, false);
  window.__IK_UI__ = { get motionEnabled() { return enabled; }, get openDialog() { return document.querySelector('dialog[open]')?.id || null; }, resetTilt };
})();
