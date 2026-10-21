/* Tecnilunas — interacciones propias + respaldo de la intro (parabrisas que se aclara) */
(function () {
  'use strict';
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rgb(c1, c2, t) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(mix(c1[i], c2[i], t)); }).join(',') + ')'; }

  /* ---------- Intro: lluvia y grieta → barrido → amanecer ---------- */
  var intro = document.querySelector('.intro');
  var canvas = intro.querySelector('canvas.glass'), ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1, drops = [];
  function seedDrops() {
    drops = []; var n = Math.round(W * H / 5200);
    for (var i = 0; i < n; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, r: 1.2 + Math.random() * Math.random() * 7, s: Math.random() });
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var nw = canvas.clientWidth, nh = canvas.clientHeight;
    if (Math.abs(nw - W) < 2 && Math.abs(nh - H) < 120 && drops.length) return;
    W = nw; H = nh; canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); seedDrops();
  }
  window.addEventListener('resize', resize); resize();

  // grieta en estrella (determinista)
  var crack = []; (function () {
    var s = 7; function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 11; i++) {
      var a = i / 11 * Math.PI * 2 + rnd() * .4, len = .12 + rnd() * .22, pts = [[0, 0]], x = 0, y = 0;
      for (var k = 1; k <= 5; k++) { var aa = a + (rnd() - .5) * .5; x += Math.cos(aa) * len / 5; y += Math.sin(aa) * len / 5; pts.push([x, y]); }
      crack.push(pts);
    }
  })();

  function draw(p, t) {
    var day = seg(p, .25, .85);
    // cielo: noche → amanecer
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgb([9, 17, 34], [110, 160, 255], day));
    sky.addColorStop(.55, rgb([20, 32, 58], [205, 222, 255], day));
    sky.addColorStop(1, rgb([12, 18, 30], [255, 214, 160], day));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // sol que sale
    var sy = mix(H * .9, H * .38, day);
    var sun = ctx.createRadialGradient(W * .5, sy, 0, W * .5, sy, Math.max(W, H) * .45);
    sun.addColorStop(0, 'rgba(255,240,200,' + .9 * day + ')'); sun.addColorStop(.12, 'rgba(255,210,140,' + .55 * day + ')'); sun.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
    // carretera
    var hz = H * .62;
    ctx.fillStyle = rgb([8, 12, 20], [70, 84, 104], day);
    ctx.beginPath(); ctx.moveTo(W * .47, hz); ctx.lineTo(W * .53, hz); ctx.lineTo(W * 1.1, H); ctx.lineTo(-W * .1, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb([30, 40, 60], [140, 165, 140], day);
    ctx.fillRect(0, hz, W * .47, 2); ctx.fillRect(W * .53, hz, W * .47, 2);
    // líneas de la carretera que avanzan con el scroll
    ctx.fillStyle = 'rgba(255,255,255,' + (.35 + .4 * day) + ')';
    for (var i = 0; i < 10; i++) {
      var z = ((i / 10) + p * 1.6) % 1, yy = hz + (H - hz) * z * z, w = 2 + 10 * z * z, hh = 4 + 40 * z * z;
      ctx.fillRect(W / 2 - w / 2, yy, w, hh);
    }
    // luces de noche (bokeh) que se apagan
    for (var b = 0; b < 14; b++) {
      var bx = (b * 173) % W, by = hz - 20 + (b * 37) % 60, br = 10 + (b * 13) % 26;
      var g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, 'rgba(255,190,120,' + .35 * (1 - day) + ')'); g.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = g; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    // escobilla: barrido en arco desde abajo-centro
    var sweep = seg(p, .08, .55), ang = Math.PI * (1 - sweep), px = W / 2, py = H * 1.08, R = Math.hypot(W, H);
    // gotas (solo las que la escobilla aún no ha limpiado)
    for (var d = 0; d < drops.length; d++) {
      var dr = drops[d], a = Math.atan2(py - dr.y, dr.x - px);
      var cleared = a > ang - .02 && sweep > 0;
      var back = seg(p, .9, 1) * 0; // sin lluvia al final
      if (cleared && dr.s > back) continue;
      var dy = (dr.y + t * 6 * dr.s) % H;
      ctx.fillStyle = 'rgba(200,220,255,.18)'; ctx.beginPath(); ctx.arc(dr.x, dy, dr.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(dr.x - dr.r * .3, dy - dr.r * .3, dr.r * .3, 0, 6.283); ctx.fill();
    }
    if (sweep > 0 && sweep < 1) {
      ctx.strokeStyle = 'rgba(10,14,20,.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * R * .9, py - Math.sin(ang) * R * .9); ctx.stroke();
    }
    // grieta que se repara
    var fix = seg(p, .18, .5), cx = W * .68, cy = H * .3, sc = Math.min(W, H) * (1 - fix);
    if (fix < 1) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (.75 * (1 - fix)) + ')'; ctx.lineWidth = 1.2;
      crack.forEach(function (pts) {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        pts.forEach(function (q) { ctx.lineTo(cx + q[0] * sc, cy + q[1] * sc); }); ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255,255,255,' + (.6 * (1 - fix)) + ')'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.283); ctx.fill();
    }
    // reflejo del cristal
    var rf = ctx.createLinearGradient(0, 0, W, H);
    rf.addColorStop(.25, 'rgba(255,255,255,0)'); rf.addColorStop(.33, 'rgba(255,255,255,.07)'); rf.addColorStop(.4, 'rgba(255,255,255,0)');
    ctx.fillStyle = rf; ctx.fillRect(0, 0, W, H);
    // marco del parabrisas
    ctx.fillStyle = '#05080d';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H * .1); ctx.quadraticCurveTo(W / 2, H * .02, 0, H * .1); ctx.closePath(); ctx.fill();
  }
  var P = 0, t0 = performance.now();
  intro.addEventListener('scrub', function (e) { P = e.detail.p; });
  (function loop(now) {
    if (!intro.classList.contains('has-video')) draw(P, (now - t0) / 1000);
    requestAnimationFrame(loop);
  })(t0);

  /* ---------- Manifiesto: palabras que se enfocan al leerlas ---------- */
  var ct = document.querySelector('.clear-text');
  (function split(node) {
    [].slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
          else { var s = document.createElement('span'); s.className = 'wd'; s.textContent = w; frag.appendChild(s); }
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1) split(n);
    });
  })(ct);
  var wds = [].slice.call(ct.querySelectorAll('.wd')), best = 0;
  function focusWords() {
    var r = ct.getBoundingClientRect(), vh = window.innerHeight;
    var f = best = Math.max(best, clamp((vh * .85 - r.top) / (r.height + vh * .35)));
    wds.forEach(function (w, i) { var th = i / wds.length; w.style.setProperty('--b', clamp(1 - (f - th * .8) * 5).toFixed(2)); });
  }
  window.addEventListener('scroll', focusWords, { passive: true }); focusWords();

  /* ---------- ¿Reparar o cambiar? ---------- */
  var size = document.getElementById('size'), out = document.getElementById('size-out');
  var res = document.querySelector('.result'), rt = res.querySelector('.r-title'), rx = res.querySelector('.r-text');
  var imp = document.querySelector('.impact');
  function judge() {
    var v = parseFloat(size.value), z = document.querySelector('input[name=zona]:checked').value;
    out.textContent = String(v).replace('.', ',') + ' cm';
    imp.style.setProperty('--s', (0.18 + v / 6 * 0.95).toFixed(2));
    var swap = v > 2 || z !== 'lejos';
    res.classList.toggle('swap', swap);
    if (!swap) { rt.textContent = 'Probablemente reparable'; rx.textContent = 'Una reparación de impacto suele hacerse en poco tiempo y evita que la grieta avance.'; }
    else if (z === 'vista') { rt.textContent = 'Mejor sustituir'; rx.textContent = 'En el campo de visión del conductor la reparación puede dejar marca: lo seguro es cambiar la luna.'; }
    else if (z === 'borde') { rt.textContent = 'Mejor sustituir'; rx.textContent = 'Cerca del borde la luna pierde resistencia y la grieta avanza rápido.'; }
    else { rt.textContent = 'Probablemente sustitución'; rx.textContent = 'Más grande que una moneda de 2 € suele requerir luna nueva. Tráelo y lo valoramos.'; }
  }
  size.addEventListener('input', judge);
  [].forEach.call(document.querySelectorAll('input[name=zona]'), function (r) { r.addEventListener('change', judge); });
  judge();

  /* ---------- Simulador de tintado ---------- */
  var film = document.querySelector('.film'), vlt = document.getElementById('vlt');
  var tb = [].slice.call(document.querySelectorAll('.tint-steps button'));
  function setTint(b) {
    tb.forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); x.tabIndex = x === b ? 0 : -1; });
    var v = parseInt(b.getAttribute('data-v'), 10);
    film.style.setProperty('--tint', (1 - v / 100) * .95);
    vlt.textContent = v + ' %';
  }
  tb.forEach(function (b, i) {
    b.addEventListener('click', function () { setTint(b); });
    b.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!k) return; e.preventDefault(); var n = tb[(i + k + tb.length) % tb.length]; n.focus(); setTint(n);
    });
  });
  setTint(document.querySelector('.tint-steps [aria-checked="true"]'));

  /* ---------- Tarjetas: brillo que sigue al ratón ---------- */
  [].forEach.call(document.querySelectorAll('.card'), function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Aparición ---------- */
  var els = document.querySelectorAll('.repair-copy, .repair-tool, .tint-view, .tint-copy, .services-head, .card, .fleet, .faq h2, details, .contact-card');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    [].forEach.call(els, function (el, i) { el.classList.add('rv'); el.style.transitionDelay = (el.classList.contains('card') ? (i % 3) * 70 : 0) + 'ms'; io.observe(el); });
  }
})();
