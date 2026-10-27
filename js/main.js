// Sahifa harakatlari: matn harflab chiqishi, loyihalar sahnasi (scroll bilan telefonlar almashadi),
// magnit tugmalar, kursor nuri, yulduzlar foni, FAQ ochilishi va bosh qismdagi 3D telefonlar.
const root = document.documentElement;
root.classList.add('motion-ok');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const back = (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : sysDark.matches);

/* 0. Kunduzgi / tungi rejim: tugmadan boshlab doira bo'lib almashadi, tanlov eslab qolinadi */
function syncThemeColor() {
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
}
const themeBtn = document.querySelector('.theme');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch {}
      syncThemeColor();
    };
    if (!document.startViewTransition || reduce) {
      apply();
      return;
    }
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  });
  if (root.dataset.theme) syncThemeColor();
}

/* 1. Sarlavhalarni harflarga bo'lish */
function split(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  let i = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
        continue;
      }
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const frag = document.createDocumentFragment();
      for (const part of child.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.append(document.createTextNode(' '));
          continue;
        }
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        for (const ch of part) {
          const c = document.createElement('span');
          c.className = 'c';
          c.textContent = ch;
          c.style.setProperty('--i', i++);
          w.append(c);
        }
        frag.append(w);
      }
      child.replaceWith(frag);
    }
  };
  walk(el);
  el.querySelectorAll('.grad').forEach((g) => {
    const cs = g.querySelectorAll('.c');
    cs.forEach((c, k) => c.style.setProperty('--p', (k / Math.max(1, cs.length - 1)).toFixed(3)));
  });
  el.classList.add('split-done');
}

/* 2. Ko'ringanda paydo bo'lish */
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealer.unobserve(e.target);
    }
  }
}, { rootMargin: '0px 0px -10% 0px' });
if (!reduce) document.querySelectorAll('[data-split]').forEach(split);
document.querySelectorAll('[data-reveal],[data-split]').forEach((el) => (reduce ? el.classList.add('in') : revealer.observe(el)));

/* 3. Raqamlar sanog'i */
if (!reduce) {
  const counter = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counter.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now() + 500;
      const tick = (now) => {
        const k = clamp((now - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  });
  document.querySelectorAll('[data-count]').forEach((el) => counter.observe(el));
}

/* 4. Kasb so'zlari yozilib-o'chib turadi */
const type = document.querySelector('.type');
if (type && !reduce) {
  const words = JSON.parse(type.dataset.words);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    let w = 0;
    await sleep(2800);
    for (;;) {
      for (let k = words[w].length; k >= 0; k--) {
        type.textContent = words[w].slice(0, k);
        await sleep(32);
      }
      w = (w + 1) % words.length;
      for (let k = 1; k <= words[w].length; k++) {
        type.textContent = words[w].slice(0, k);
        await sleep(75);
      }
      await sleep(2300);
    }
  })();
}

/* 5. Loyihalar sahnasi: bir tomonda telefonlar, ikkinchisida matn; scroll bilan
   asosiy iPhone qarama-qarshi tomonga uchib o'tadi, yon telefonlar yo'qolib, yangilari chiqadi */
function showcase() {
  const sec = document.querySelector('.showcase');
  if (!sec || reduce) return null;
  const track = sec.querySelector('.sc-track');
  const stick = sec.querySelector('.sc-sticky');
  const holder = sec.querySelector('.sc-phones');
  const glow = sec.querySelector('.sc-glow');
  const bar = sec.querySelector('.sc-bar i');
  const items = [...sec.querySelectorAll('.sc-item')];
  const n = items.length;
  sec.classList.add('sc-on');

  const shotsOf = (it) => [...it.querySelectorAll('.sc-shots > *')];
  const makePhone = (pick) => {
    const el = document.createElement('div');
    el.className = 'phone sc-phone';
    const scr = document.createElement('div');
    scr.className = 'sc-screen';
    el.append(scr);
    holder.append(el);
    const layers = items.map((it) => {
      const src = pick(shotsOf(it));
      let node;
      if (!src) node = document.createElement('div');
      else if (src.tagName === 'IMG') {
        node = document.createElement('img');
        node.src = src.getAttribute('src');
        node.alt = '';
        node.loading = 'lazy';
        node.decoding = 'async';
      } else node = src.cloneNode(true);
      node.classList.add('sc-layer');
      scr.append(node);
      return node;
    });
    return { el, layers, shown: -1 };
  };
  // yon telefonlar orqada turadi, asosiysi oldinda
  const sideA = makePhone((s) => (s[0]?.tagName === 'IMG' ? s[1] : null));
  const sideB = makePhone((s) => (s[0]?.tagName === 'IMG' ? s[2] : null));
  const main = makePhone((s) => s[0]);
  const hasSide = items.map((it) => shotsOf(it).filter((x) => x.tagName === 'IMG').length >= 3);
  items.forEach((it, k) => it.classList.add(k % 2 === 0 ? 'l' : 'r'));

  const NS = 'http://www.w3.org/2000/svg';
  const road = document.createElementNS(NS, 'svg');
  road.setAttribute('class', 'sc-road');
  road.setAttribute('aria-hidden', 'true');
  stick.insertBefore(road, holder);
  let segH = 0;
  let fills = [];
  let pads = [];
  let signs = [];
  const names = items.map((it) => it.querySelector('h3').textContent);
  const colors = items.map((it) => it.style.getPropertyValue('--c'));

  let w = 0;
  let h = 0;
  let pw = 0;
  let side = 0;
  let mobile = false;
  // klaster markazi: juft loyihalar o'ngda, toq loyihalar chapda
  const X = (k) => (k % 2 === 0 ? 1 : -1) * side;
  function measure() {
    w = stick.clientWidth;
    h = stick.clientHeight;
    mobile = w < 760;
    pw = mobile ? Math.min(150, w * 0.34, h * 0.22) : Math.min(250, w * 0.19, h * 0.3);
    side = mobile ? w * 0.14 : w * 0.24;
    holder.style.setProperty('--pw', `${pw.toFixed(1)}px`);
    buildRoad();
  }

  function buildRoad() {
    segH = h * 0.95;
    const phoneH = pw * 2.18 + 14;
    const y0 = h / 2 + (mobile ? -h * 0.2 : 0) + phoneH / 2 + (mobile ? 12 : 26);
    const nodes = items.map((_, k) => [w / 2 + X(k), y0 + k * segH]);
    const total = y0 + (n - 1) * segH + h;
    const c = (a, b) => `C${a[0]} ${a[1] + segH / 2} ${b[0]} ${b[1] - segH / 2} ${b[0]} ${b[1]}`;
    let d = `M${nodes[0][0]} ${nodes[0][1] - segH}L${nodes[0][0]} ${nodes[0][1]}`;
    for (let k = 0; k < n - 1; k++) d += c(nodes[k], nodes[k + 1]);
    d += `L${nodes[n - 1][0]} ${nodes[n - 1][1] + segH}`;
    const rx = pw * (mobile ? 0.85 : 0.95);
    const ry = rx * 0.22;
    let html = `<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C3AED"/>
<stop offset=".5" stop-color="var(--accent)"/><stop offset="1" stop-color="#F97316"/></linearGradient>
<filter id="rb" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="6"/></filter></defs>
<path id="road-path" class="road-base" d="${d}"/><path class="road-dash" d="${d}"/>`;
    for (let k = 0; k < n - 1; k++) {
      const seg = `M${nodes[k][0]} ${nodes[k][1]}${c(nodes[k], nodes[k + 1])}`;
      html += `<path class="road-glow" d="${seg}" filter="url(#rb)"/><path class="road-fill" d="${seg}"/>`;
      // keyingi bekat nomi yo'lning o'rtasida
      const mx = (nodes[k][0] + nodes[k + 1][0]) / 2;
      const my = (nodes[k][1] + nodes[k + 1][1]) / 2;
      html += `<g class="road-sign" transform="translate(${mx} ${my})"><rect x="-90" y="-17" width="180" height="34" rx="17"/>
<text text-anchor="middle" dy="5">${String(k + 2).padStart(2, '0')} · ${names[k + 1].replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></g>`;
    }
    nodes.forEach(([x, y], k) => {
      html += `<g class="road-pad" style="--pc:${colors[k]}" transform="translate(${x} ${y})">
<ellipse class="pad-glow" rx="${rx * 1.25}" ry="${ry * 1.6}"/><ellipse class="pad-ring" rx="${rx}" ry="${ry}"/>
<ellipse class="pad-ring2" rx="${rx * 0.62}" ry="${ry * 0.62}"/><circle class="pad-dot" r="5"/></g>`;
    });
    // yo'lda yurib turadigan chiroqlar
    for (let i = 0; i < 6; i++) {
      html += `<circle class="road-car" r="${i % 2 ? 2.5 : 3.5}"><animateMotion dur="${16 + i * 3}s" begin="${-i * 4.3}s"
repeatCount="indefinite" rotate="auto"><mpath href="#road-path"/></animateMotion></circle>`;
    }
    road.setAttribute('viewBox', `0 0 ${w} ${total}`);
    road.style.height = `${total}px`;
    road.innerHTML = html;
    fills = [...road.querySelectorAll('.road-fill, .road-glow')].map((el) => {
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len}`;
      return { el, len, k: Math.floor([...road.querySelectorAll(`.${el.classList[0]}`)].indexOf(el)) };
    });
    pads = [...road.querySelectorAll('.road-pad')];
    signs = [...road.querySelectorAll('.road-sign')];
  }
  measure();
  new ResizeObserver(measure).observe(stick);

  const show = (ph, idx, alpha = 1) => {
    ph.layers.forEach((l, j) => {
      const o = j === idx ? alpha : 0;
      if (l._o !== o) {
        l.style.opacity = o;
        l._o = o;
      }
    });
  };
  let mx = 0;
  let my = 0;
  let pmx = 0;
  let pmy = 0;
  if (fine) {
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function progress() {
    const r = track.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total) * (n - 1) : 0;
  }

  let lastColor = '';
  function frame(now) {
    const t = now / 1000;
    const p = progress();
    const k = Math.min(n - 1, Math.floor(p));
    const next = Math.min(n - 1, k + 1);
    // har loyihada avval biroz to'xtab turadi, keyin sekin o'tadi
    const tr = k >= n - 1 ? 0 : smooth(clamp((p - k - 0.45) / 0.55));
    const dirK = k % 2 === 0 ? 1 : -1;
    const arc = Math.sin(tr * Math.PI);
    pmx += (mx - pmx) * 0.06;
    pmy += (my - pmy) * 0.06;
    const baseY = mobile ? -h * 0.2 : 0;

    // asosiy iPhone: yoy bo'ylab bir tomondan ikkinchisiga, aylanib o'tadi
    const x = lerp(X(k), X(next), smooth(tr));
    const s = 1.5 * tr - 1.5 * tr * tr + tr * tr * tr;
    road.style.transform = `translate3d(0,${(-(k + s) * segH).toFixed(1)}px,0)`;
    fills.forEach((f) => {
      const fill = f.k < k ? 1 : f.k === k ? tr : 0;
      f.el.style.strokeDashoffset = (f.len * (1 - fill)).toFixed(1);
    });
    pads.forEach((pad, j) => {
      const act = j === k ? 1 - tr : j === next && next !== k ? tr : 0;
      pad.style.opacity = (0.35 + act * 0.65).toFixed(3);
    });
    // keyingi bekat nomi faqat o'tish paytida ko'rinadi
    signs.forEach((sg, j) => {
      sg.style.opacity = j === k ? Math.sin(tr * Math.PI).toFixed(3) : 0;
    });
    const facing = lerp(-16 * dirK, 16 * dirK, tr);
    const mainRY = facing + arc * 34 * dirK + pmx * 8 + Math.sin(t * 0.8) * 2.5;
    const mainRX = 4 + arc * 8 - pmy * 5;
    const mainY = baseY - arc * (mobile ? 12 : 22) + Math.sin(t * 1.1) * 7;
    main.el.style.transform = `translate3d(${x.toFixed(1)}px,${mainY.toFixed(1)}px,${(arc * 60).toFixed(1)}px) rotateX(${mainRX.toFixed(2)}deg) rotateY(${mainRY.toFixed(2)}deg) rotateZ(${(-arc * 7 * dirK).toFixed(2)}deg) scale(${(1 - arc * 0.06).toFixed(3)})`;
    // ekran uchish o'rtasida keyingi loyihaga almashadi
    const swap = smooth(clamp((tr - 0.38) / 0.24));
    main.layers.forEach((l, j) => {
      const o = j === k ? 1 - swap : j === next && next !== k ? swap : 0;
      if (l._o !== o) {
        l.style.opacity = o;
        l._o = o;
      }
    });

    // yon telefonlar: asosiysi uchishidan oldin orqasiga yashirinadi, yetib borgach chiqib keladi
    const leaving = tr < 0.5;
    const idx = leaving ? k : next;
    let v = leaving ? 1 - smooth(clamp((tr - 0.05) / 0.3)) : back(clamp((tr - 0.58) / 0.34));
    if (!hasSide[idx]) v = 0;
    const dirS = idx % 2 === 0 ? 1 : -1;
    const cx = leaving ? x : X(next);
    [sideA, sideB].forEach((ph, s) => {
      const sgn = s === 0 ? 1 : -1;
      const off = pw * (mobile ? 0.6 : 0.66) * v * sgn;
      const y = baseY + (s === 0 ? 26 : 50) * v + Math.sin(t * 1.1 + 1.4 + s) * 8;
      const ry = -16 * dirS + sgn * 12 * v + pmx * 8;
      const sc = 0.62 + 0.24 * v;
      ph.el.style.transform = `translate3d(${(cx + off).toFixed(1)}px,${y.toFixed(1)}px,${(-140 * v - 20).toFixed(1)}px) rotateX(${(4 - pmy * 5).toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${(sgn * 4 * v).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      const op = clamp(v * 1.6).toFixed(3);
      if (ph._op !== op) {
        ph.el.style.opacity = op;
        ph._op = op;
      }
      if (ph.shown !== idx) {
        show(ph, idx);
        ph.shown = idx;
      }
    });

    // matn: eskisi chiqib ketadi, yangisi qarama-qarshi tomondan kirib keladi
    items.forEach((it, j) => {
      let a = 0;
      let dx = 0;
      if (j === k) {
        a = 1 - smooth(clamp((tr - 0.12) / 0.3));
        dx = -(1 - a) * 60 * (j % 2 === 0 ? 1 : -1);
      } else if (j === next && next !== k) {
        a = smooth(clamp((tr - 0.5) / 0.3));
        dx = (1 - a) * 80 * (j % 2 === 0 ? -1 : 1);
      }
      if (mobile) dx *= 0.5;
      const live = a > 0.02;
      if (it._a !== a) {
        it.style.opacity = a.toFixed(3);
        it.style.visibility = live ? 'visible' : 'hidden';
        it.classList.toggle('live', a > 0.6);
        it._a = a;
      }
      if (live) {
        const ty = mobile ? `${((1 - a) * 24).toFixed(1)}px` : `calc(-50% + ${((1 - a) * 24).toFixed(1)}px)`;
        it.style.transform = `translate3d(${dx.toFixed(1)}px,${ty},0)`;
      }
    });

    const cur = tr < 0.5 ? k : next;
    const color = items[cur].style.getPropertyValue('--c');
    if (color !== lastColor) {
      stick.style.setProperty('--c', color);
      lastColor = color;
    }
    glow.style.transform = `translate3d(${x.toFixed(1)}px,${baseY.toFixed(1)}px,0) scale(${(1 + arc * 0.2).toFixed(3)})`;
    bar.style.transform = `scaleX(${(p / Math.max(1, n - 1)).toFixed(4)})`;
  }

  let visible = false;
  let running = false;
  const loop = (now) => {
    if (!visible) {
      running = false;
      return;
    }
    frame(now);
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }).observe(track);
  frame(performance.now());

  // bosh qismdagi telefon bosilganda — o'sha loyihaga scroll
  return (href) => {
    const idx = items.findIndex((it) => `#${it.id}` === href);
    if (idx < 0) return false;
    const r = track.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    window.scrollTo({ top: window.scrollY + r.top + (total * idx) / Math.max(1, n - 1), behavior: 'smooth' });
    return true;
  };
}
const goTo = showcase();
window.showProject = (href) => (goTo && goTo(href)) || document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

/* 6. Scroll: o'qish chizig'i, sarlavha yashirinishi, tajriba chizig'i */
const bar = document.querySelector('.progress');
const header = document.querySelector('.top');
const timeline = document.querySelector('.timeline');
const tlItems = timeline ? [...timeline.children] : [];
let lastY = window.scrollY;
let ticking = false;
function onScroll() {
  ticking = false;
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = root.scrollHeight - vh;
  if (bar) bar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
  if (header) header.classList.toggle('hide', y > lastY + 2 && y > 240);
  if (y < lastY - 2 && header) header.classList.remove('hide');
  lastY = y;
  if (timeline) {
    const line = vh * 0.62;
    const r = timeline.getBoundingClientRect();
    timeline.style.setProperty('--prog', clamp((line - r.top) / r.height).toFixed(3));
    tlItems.forEach((li) => li.classList.toggle('on', li.getBoundingClientRect().top + 30 < line));
  }
}
window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* 7. Magnit tugmalar, taklif kartalaridagi yorug'lik va kursor ortidagi nur */
if (fine && !reduce) {
  document.querySelectorAll('.offer-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
      card.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
    });
  });
  document.querySelectorAll('.btn, a.pill').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) * 0.28;
      const dy = (e.clientY - r.top - r.height / 2) * 0.4;
      el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.translate = '';
    });
  });
  const glow = document.querySelector('.glow');
  if (glow) {
    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 3;
    let tx = gx;
    let ty = gy;
    let moving = false;
    const follow = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx.toFixed(1)}px,${gy.toFixed(1)}px)`;
      if (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5) requestAnimationFrame(follow);
      else moving = false;
    };
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      glow.classList.add('on');
      if (!moving) {
        moving = true;
        requestAnimationFrame(follow);
      }
    }, { passive: true });
  }
}

/* 8. Yulduzlar foni */
const sky = document.querySelector('.stars');
if (sky && !reduce) {
  const ctx = sky.getContext('2d');
  let sw = 0;
  let sh = 0;
  let stars = [];
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    sw = window.innerWidth;
    sh = window.innerHeight;
    sky.width = sw * dpr;
    sky.height = sh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(150, (sw * sh) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * sw, y: Math.random() * sh, r: Math.random() * 1.1 + 0.35, z: Math.random() * 0.8 + 0.2, t: Math.random() * 6.28,
    }));
  };
  size();
  window.addEventListener('resize', size);
  let prevY = window.scrollY;
  const draw = (now) => {
    const dy = window.scrollY - prevY;
    prevY = window.scrollY;
    ctx.clearRect(0, 0, sw, sh);
    const dk = isDark();
    const rgb = dk ? '255,255,255' : '43,89,255';
    const amp = dk ? 0.85 : 0.32;
    for (const s of stars) {
      s.y -= 0.05 * s.z + dy * s.z * 0.18;
      if (s.y < -4) s.y += sh + 8;
      else if (s.y > sh + 4) s.y -= sh + 8;
      const a = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now / 900 + s.t))) * amp * s.z;
      ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.6 + s.z * 0.6), 0, 6.283);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

/* 9. Nuqtali portret: rasm nuqtalardan yig'iladi, kursor yaqinlashsa nuqtalar qochadi */
function dotPortrait(canvas) {
  const ctx = canvas.getContext('2d');
  const radius = Number(canvas.dataset.radius || 10); // qochish radiusi, px
  const gap = 5; // nuqtalar oralig'i, px
  const img = new Image();
  let dots = [];
  let cw = 0;
  let ch = 0;
  let mx = -1e4;
  let my = -1e4;
  let running = false;
  let started = false;

  function build() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return;
    cw = r.width;
    ch = r.height;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // rasm kartaga sig'adi va pastga tekislanadi
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    const off = document.createElement('canvas');
    off.width = Math.ceil(cw);
    off.height = Math.ceil(ch);
    const o = off.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, (cw - iw) / 2, ch - ih, iw, ih);
    const data = o.getImageData(0, 0, off.width, off.height).data;
    dots = [];
    for (let y = gap / 2; y < ch; y += gap) {
      for (let x = gap / 2; x < cw; x += gap) {
        const i = ((y | 0) * off.width + (x | 0)) * 4;
        if (data[i + 3] < 128) continue;
        const lum = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255;
        const a = Math.random() * 6.283;
        const far = reduce || started ? 0 : 0.6 + Math.random() * 0.6;
        dots.push({
          hx: x, hy: y,
          x: x + Math.cos(a) * cw * far, y: y + Math.sin(a) * ch * far,
          vx: 0, vy: 0,
          r: 0.8 + lum * 1.5,
          c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
        });
      }
    }
    canvas.classList.add('ready');
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, cw, ch);
    for (const d of dots) {
      ctx.fillStyle = d.c;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, 6.283);
      ctx.fill();
    }
  }

  function step() {
    let moving = false;
    const r2 = radius * radius;
    for (const d of dots) {
      const dx = d.x - mx;
      const dy = d.y - my;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < r2) {
        const dist = Math.sqrt(dist2) || 0.01;
        const f = (radius - dist) / radius;
        d.vx += (dx / dist) * f * 4;
        d.vy += (dy / dist) * f * 4;
      }
      d.vx = (d.vx + (d.hx - d.x) * 0.05) * 0.84;
      d.vy = (d.vy + (d.hy - d.y) * 0.05) * 0.84;
      d.x += d.vx;
      d.y += d.vy;
      if (!moving && (Math.abs(d.vx) + Math.abs(d.vy) > 0.03 || Math.abs(d.hx - d.x) + Math.abs(d.hy - d.y) > 0.2)) moving = true;
    }
    draw();
    if (moving || mx > -1e3) requestAnimationFrame(step);
    else running = false;
  }
  const kick = () => {
    if (!running && !reduce) {
      running = true;
      requestAnimationFrame(step);
    }
  };

  img.onload = () => {
    build();
    new ResizeObserver(() => {
      build();
      kick();
    }).observe(canvas);
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        started = true;
        kick();
      }
    }, { threshold: 0.25 }).observe(canvas);
  };
  img.src = canvas.dataset.src;

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    kick();
  });
  canvas.addEventListener('pointerleave', () => {
    mx = -1e4;
    my = -1e4;
  });
}
document.querySelectorAll('canvas.dots').forEach(dotPortrait);

/* 10. Bosh qismdagi 3D telefonlar */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
const stage = document.getElementById('stage');
if (stage && !reduce && hasWebGL()) {
  const go = () => import('./phones3d.js').then((m) => m.init(stage)).catch((err) => console.warn('3D:', err));
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle);
}
