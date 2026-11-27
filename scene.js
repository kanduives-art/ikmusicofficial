import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.min.js';

const host = document.getElementById('webgl-stage');
const hero = document.querySelector('.hero');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
const captureTime = params.has('t') ? Number(params.get('t')) : null;
let manualFrame = Number.isFinite(captureTime);
let motionEnabled = !document.body.classList.contains('motion-off') && !reduceMotion.matches;
let heroVisible = true;
let pointerX = 0, pointerY = 0, scrollProgress = 0;
let frameCount = 0, fpsStarted = performance.now();

function seededRandom(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed); value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value; return ((value ^ value >>> 14) >>> 0) / 4294967296; }; }
function createGlow() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(216,185,143,.34)'); gradient.addColorStop(.35, 'rgba(200,167,123,.12)'); gradient.addColorStop(1, 'rgba(200,167,123,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(canvas);
}
function createMonogram(material) {
  const monogram = new THREE.Group();
  const bar = (width, height, x, y, angle = 0) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, .035), material); mesh.position.set(x, y, .13); mesh.rotation.z = angle; monogram.add(mesh); };
  bar(.075, .48, -.28, 0); bar(.075, .5, .05, 0); bar(.075, .34, .19, .11, -.72); bar(.075, .34, .19, -.11, .72); return monogram;
}
function createRecord() {
  const record = new THREE.Group(), radius = 2.05;
  const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x151713, metalness: .82, roughness: .28, clearcoat: 1, clearcoatRoughness: .2 });
  const edgeGold = new THREE.MeshStandardMaterial({ color: 0xc8a77b, metalness: .88, roughness: .25, emissive: 0x2a1d0d, emissiveIntensity: .35 });
  const grooveMaterial = new THREE.MeshStandardMaterial({ color: 0x756b59, metalness: .9, roughness: .36, transparent: true, opacity: .48 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .12, 96), darkMetal); body.rotation.x = Math.PI / 2; record.add(body);
  const grooveCount = 22;
  for (let index = 0; index < grooveCount; index += 1) { const progress = index / (grooveCount - 1), grooveRadius = .62 + progress * 1.31; const groove = new THREE.Mesh(new THREE.TorusGeometry(grooveRadius, .006, 4, 128), grooveMaterial); groove.position.z = .066; record.add(groove); }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, .018, 8, 128), edgeGold); rim.position.z = .02; record.add(rim);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .025, 64), edgeGold); label.rotation.x = Math.PI / 2; label.position.z = .075; record.add(label);
  const labelRing = new THREE.Mesh(new THREE.TorusGeometry(.55, .012, 6, 80), darkMetal); labelRing.position.z = .096; record.add(labelRing);
  const ink = new THREE.MeshStandardMaterial({ color: 0x171914, metalness: .45, roughness: .5 }); record.add(createMonogram(ink));
  const spindle = new THREE.Mesh(new THREE.TorusGeometry(.055, .014, 8, 32), darkMetal); spindle.position.z = .15; record.add(spindle); return record;
}
function createOrbit(radius, tiltX, tiltY, material, satelliteCount) {
  const orbit = new THREE.Group(); orbit.add(new THREE.Mesh(new THREE.TorusGeometry(radius, .014, 6, 160), material));
  const satelliteGeometry = new THREE.SphereGeometry(.035, 12, 8);
  for (let index = 0; index < satelliteCount; index += 1) { const angle = (index / satelliteCount) * Math.PI * 2, satellite = new THREE.Mesh(satelliteGeometry, material); satellite.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0); satellite.scale.setScalar(index % 3 === 0 ? 1.8 : 1); orbit.add(satellite); }
  orbit.rotation.set(tiltX, tiltY, 0); return orbit;
}
function createParticles() {
  const random = seededRandom(120193), count = 150, positions = new Float32Array(count * 3), sizes = new Float32Array(count);
  for (let index = 0; index < count; index += 1) { const angle = random() * Math.PI * 2, radius = 2.5 + random() * 3.6; positions[index * 3] = Math.cos(angle) * radius; positions[index * 3 + 1] = (random() - .5) * 6.5; positions[index * 3 + 2] = (random() - .5) * 4 - .5; sizes[index] = random(); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('seed', new THREE.BufferAttribute(sizes, 1));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd8b98f, size: .022, transparent: true, opacity: .68, depthWrite: false, blending: THREE.AdditiveBlending }));
}

try {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 60); camera.position.set(0, 0, 10);
  const world = new THREE.Group(); scene.add(world); const record = createRecord(); record.rotation.set(-.16, -.34, -.12); world.add(record);
  const orbitMaterial = new THREE.MeshStandardMaterial({ color: 0xc8a77b, metalness: .92, roughness: .2, emissive: 0x5a3b17, emissiveIntensity: .5, transparent: true, opacity: .72 });
  const orbitA = createOrbit(2.48, .88, .25, orbitMaterial, 5), orbitB = createOrbit(2.72, -.48, .76, orbitMaterial, 4); world.add(orbitA, orbitB);
  const particles = createParticles(); scene.add(particles);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .75 })); glow.scale.set(7.5, 7.5, 1); glow.position.z = -1.2; world.add(glow);
  scene.add(new THREE.AmbientLight(0xd9cdb8, 1.4)); const key = new THREE.DirectionalLight(0xffe4bd, 3.4); key.position.set(4, 5, 7); scene.add(key);
  const rimLight = new THREE.PointLight(0xc8a77b, 38, 18, 2); rimLight.position.set(-3, -1, 4); scene.add(rimLight); const coolLight = new THREE.DirectionalLight(0xb9c4b6, 1.3); coolLight.position.set(-4, 2, -1); scene.add(coolLight);
  function resize() { const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight), mobile = innerWidth <= 760; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.2 : 1.5)); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); world.position.set(mobile ? 1.18 : .45, mobile ? .82 : .05, 0); world.scale.setScalar(mobile ? .78 : 1); renderAt(manualFrame && Number.isFinite(captureTime) ? captureTime : 0); }
  function renderAt(seconds) {
    const time = motionEnabled || manualFrame ? seconds : 0;
    record.rotation.z = -.12 + time * .105 + scrollProgress * .55; record.rotation.x = -.16 + Math.sin(time * .42) * .045 + pointerY * .08; record.rotation.y = -.34 + Math.sin(time * .31) * .08 + pointerX * .13;
    world.rotation.x = pointerY * .09 + scrollProgress * .13; world.rotation.y = pointerX * .12; world.position.y += ((innerWidth <= 760 ? .82 : .05) + scrollProgress * .55 - world.position.y) * .08;
    orbitA.rotation.z = time * .12; orbitB.rotation.z = -time * .085; particles.rotation.z = time * .012; particles.rotation.y = Math.sin(time * .08) * .08; glow.material.opacity = .67 + Math.sin(time * .7) * .08; renderer.render(scene, camera);
  }
  function updateScroll() { const rect = hero.getBoundingClientRect(); scrollProgress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height))); if (!motionEnabled || !heroVisible) renderAt(0); }
  hero.addEventListener('pointermove', event => { if (!motionEnabled) return; const rect = hero.getBoundingClientRect(); pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2; pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2; }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }); window.addEventListener('scroll', updateScroll, { passive: true }); window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('ik:3d-motion', event => { motionEnabled = event.detail.enabled && !reduceMotion.matches; if (!motionEnabled) renderAt(0); });
  new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; }, { threshold: .01 }).observe(hero);
  window.__seek = seconds => { manualFrame = true; renderAt(Number(seconds) || 0); };
  window.__IK3D_STATS__ = { fps: 0, calls: 0, triangles: 0, particles: 150, dpr: renderer.getPixelRatio(), fallback: false };
  function loop(now) { requestAnimationFrame(loop); if (manualFrame || !motionEnabled || !heroVisible || document.hidden) return; renderAt(now / 1000); frameCount += 1; const elapsed = now - fpsStarted; if (elapsed >= 1000) { window.__IK3D_STATS__ = { fps: Math.round(frameCount * 1000 / elapsed), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, particles: 150, dpr: renderer.getPixelRatio(), fallback: false }; frameCount = 0; fpsStarted = now; } }
  resize(); updateScroll(); renderAt(manualFrame ? captureTime : 0); document.body.classList.add('webgl-ready'); window.__SCENE_READY__ = true; requestAnimationFrame(loop);
} catch (error) { window.__SCENE_READY__ = false; window.__IK3D_STATS__ = { fallback: true, message: error.message }; console.warn('IK 3D: composition statique utilisée.', error.message); }
