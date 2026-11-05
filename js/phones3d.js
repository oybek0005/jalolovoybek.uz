// Bosh qismdagi 3D telefonlar (three.js). main.js sahifa yuklangach shu modulni chaqiradi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// O'lchamlar: ekran nisbati skrinshotlar bilan bir xil (600x1299)
const SW = 0.728;
const SH = (SW * 1299) / 600;
const W = SW + 0.052;
const H = SH + 0.052;
const D = 0.082;
const R = 0.125;
const B = 0.016;

const LAYOUT = [
  { p: [-0.84, -0.1, -0.4], r: [0.04, 0.5, 0.06], color: 0x2e3136 },
  { p: [0, 0.05, 0.3], r: [0.05, -0.24, 0], color: 0xa39d92 },
  { p: [0.86, 0.15, -0.6], r: [0.03, -0.56, -0.06], color: 0x4f5a6b },
];

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = w / 2 - r;
  const y = h / 2 - r;
  s.moveTo(-w / 2, -y);
  s.lineTo(-w / 2, y);
  s.absarc(-x, y, r, Math.PI, Math.PI / 2, true);
  s.lineTo(x, h / 2);
  s.absarc(x, y, r, Math.PI / 2, 0, true);
  s.lineTo(w / 2, -y);
  s.absarc(x, -y, r, 0, -Math.PI / 2, true);
  s.lineTo(-x, -h / 2);
  s.absarc(-x, -y, r, -Math.PI / 2, -Math.PI, true);
  return s;
}

function planeGeometry(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 24);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

function extruded(w, h, r, depth, bevel, segments = 32) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, h - 2 * bevel, r - bevel), {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: segments,
  });
  g.center();
  return g;
}

const geo = {
  body: extruded(W, H, R, D, B),
  front: planeGeometry(W - 2 * B + 0.004, H - 2 * B + 0.004, R - B + 0.002),
  screen: planeGeometry(SW, SH, R - B - 0.012),
  bump: extruded(0.3, 0.3, 0.085, 0.024, 0.006, 16),
  lens: new THREE.CylinderGeometry(0.046, 0.046, 0.03, 32),
  ring: new THREE.CylinderGeometry(0.056, 0.056, 0.026, 32),
  button: new THREE.BoxGeometry(0.012, 1, 0.028),
};

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x050506, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03,
});
const lensMat = new THREE.MeshPhysicalMaterial({
  color: 0x08080a, metalness: 0.4, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02,
});

function buildPhone(texture, color) {
  const phone = new THREE.Group();
  const frame = new THREE.MeshPhysicalMaterial({
    color, metalness: 1, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2,
  });
  const backMat = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.25, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.35,
  });

  phone.add(new THREE.Mesh(geo.body, frame));

  const glass = new THREE.Mesh(geo.front, glassMat);
  glass.position.z = D / 2 + 0.0006;
  phone.add(glass);

  const screen = new THREE.Mesh(
    geo.screen,
    new THREE.MeshPhysicalMaterial({
      color: 0x000000, emissive: 0xffffff, emissiveMap: texture, roughness: 0.2,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.45,
    }),
  );
  screen.position.z = D / 2 + 0.0014;
  phone.add(screen);

  const back = new THREE.Mesh(geo.front, backMat);
  back.rotation.y = Math.PI;
  back.position.z = -D / 2 - 0.0006;
  phone.add(back);

  // orqa kamera bloki (orqadan qaraganda chap tepada)
  const bump = new THREE.Group();
  bump.position.set(W / 2 - 0.2, H / 2 - 0.21, -D / 2 - 0.012);
  bump.add(new THREE.Mesh(geo.bump, backMat));
  for (const [x, y] of [[0.065, 0.065], [0.065, -0.065], [-0.065, 0]]) {
    const ring = new THREE.Mesh(geo.ring, frame);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, -0.014);
    const lens = new THREE.Mesh(geo.lens, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, -0.018);
    bump.add(ring, lens);
  }
  phone.add(bump);

  for (const [x, y, h] of [[W / 2 + 0.003, 0.3, 0.2], [-W / 2 - 0.003, 0.4, 0.12], [-W / 2 - 0.003, 0.24, 0.12], [-W / 2 - 0.003, 0.56, 0.06]]) {
    const b = new THREE.Mesh(geo.button, frame);
    b.scale.y = h;
    b.position.set(x, y, 0);
    phone.add(b);
  }
  return phone;
}

const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const TAU = Math.PI * 2;

export function init(stage) {
  const items = JSON.parse(stage.dataset.phones);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-3, 4, 6);
  const rim = new THREE.DirectionalLight(0x9bb0ff, 1.6);
  rim.position.set(4, 1, -3);
  scene.add(key, rim);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const rig = new THREE.Group();
  scene.add(rig);
  let spread = 1;
  let scrollK = 0;

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // tor ekranda telefonlar bir-biriga yaqinroq turadi, shunda kattaroq ko'rinadi
    spread = w < 600 ? 0.72 : 1;
    const span = Math.max(2.1, (w < 600 ? 2.5 : 2.55) / camera.aspect);
    camera.position.set(0, 0, span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const load = (src) => new Promise((resolve, reject) => {
    loader.load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      resolve(t);
    }, undefined, reject);
  });

  // boshqaruv: sichqoncha parallaksi, sudrab aylantirish, telefon ustiga bosish
  const pointer = new THREE.Vector2(9, 9);
  const raycaster = new THREE.Raycaster();
  let px = 0;
  let py = 0;
  let parY = 0;
  let parX = 0;
  let spin = 0;
  let vel = 0;
  let drag = null;
  let hovered = null;
  let phones = [];

  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const pick = () => {
    raycaster.setFromCamera(pointer, camera);
    let o = raycaster.intersectObjects(phones, true)[0]?.object || null;
    while (o && !phones.includes(o)) o = o.parent;
    return o;
  };

  window.addEventListener('pointermove', (e) => {
    px = (e.clientX / window.innerWidth) * 2 - 1;
    py = (e.clientY / window.innerHeight) * 2 - 1;
    aim(e);
    if (drag) {
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.moved += Math.abs(dx);
      vel = dx * 0.006;
      spin += vel;
    }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, moved: 0 };
  });
  const release = (e) => {
    if (drag && drag.moved < 6) {
      aim(e);
      const ph = pick();
      if (ph) window.showProject?.(ph.userData.href);
    }
    drag = null;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => pointer.set(9, 9));

  let start = 0;
  function update(now) {
    const t = now / 1000;
    if (!start) start = now;

    parY += (px * 0.22 - parY) * 0.05;
    parX += (py * 0.1 - parX) * 0.05;
    if (!drag) {
      spin += vel;
      vel *= 0.93;
      if (Math.abs(vel) < 0.002) spin += (Math.round(spin / TAU) * TAU - spin) * 0.035;
    }
    const r = stage.getBoundingClientRect();
    scrollK += (clamp01(-r.top / r.height) - scrollK) * 0.12;
    rig.rotation.set(parX + scrollK * 0.35, parY + spin + scrollK * 0.9 + Math.sin(t * 0.35) * 0.07, 0);
    rig.position.y = scrollK * 0.9;

    hovered = pick();
    canvas.style.cursor = drag ? 'grabbing' : hovered ? 'pointer' : 'grab';

    phones.forEach((ph, i) => {
      const L = LAYOUT[i];
      const k = easeOut(clamp01((now - start - i * 140) / 1400));
      const d = ph.userData;
      d.hover += ((hovered === ph ? 1 : 0) - d.hover) * 0.12;
      ph.position.set(
        L.p[0] * spread * (1 + scrollK * 0.6),
        L.p[1] + (1 - k) * -0.3 + Math.sin(t * 0.9 + i * 2.1) * 0.045,
        L.p[2] + d.hover * 0.22,
      );
      ph.rotation.set(
        L.r[0] + Math.cos(t * 0.6 + i) * 0.02,
        L.r[1] + (1 - k) * (i % 2 ? 0.6 : -0.6),
        L.r[2] + Math.sin(t * 0.7 + i) * 0.02,
      );
      ph.scale.setScalar(1 + d.hover * 0.03);
    });
  }

  let visible = true;
  let running = false;
  function frame(now) {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    update(now);
    renderer.render(scene, camera);
    // CSS telefonlar birinchi 3D kadr chizilgandan keyin yashiriladi
    stage.classList.add('ready');
    requestAnimationFrame(frame);
  }
  function kick() {
    if (!running && visible && !document.hidden && phones.length) {
      running = true;
      requestAnimationFrame(frame);
    }
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  }).observe(stage);
  document.addEventListener('visibilitychange', kick);

  return Promise.all(items.map((it) => load(it.src))).then((textures) => {
    phones = textures.map((tex, i) => {
      const ph = buildPhone(tex, LAYOUT[i].color);
      ph.userData = { href: items[i].href, hover: 0 };
      ph.position.y = -10;
      rig.add(ph);
      return ph;
    });
    kick();
  });
}
