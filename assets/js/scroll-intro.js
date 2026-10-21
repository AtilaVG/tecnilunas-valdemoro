/* _kit · scroll-intro.js — pieza técnica SIN estilo visual.
 * Intro con vídeo que avanza con el scroll (scroll-scrubbing).
 * Uso:
 *   <section data-scrub data-src="assets/intro.mp4" style="height:300vh">
 *     <div data-scrub-stage>  (lo que se queda fijo: position:sticky lo pone cada web)
 *       <video muted playsinline preload="auto"></video>
 *       <canvas></canvas>     (opcional: respaldo dibujado por la web)
 *     </div>
 *   </section>
 * Qué hace:
 *   - Calcula el progreso 0..1 del scroll dentro de la sección y lo expone como
 *     CSS var --p en la sección y como evento 'scrub' (detail.p) para el respaldo.
 *   - Intenta cargar data-src; si existe añade .has-video; si falla añade .no-video
 *     (la web decide cómo es su animación de respaldo).
 *   - Suaviza currentTime con interpolación para que el scrubbing sea fluido.
 *   - Respeta prefers-reduced-motion (añade .reduced y no anima).
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  [].forEach.call(document.querySelectorAll('[data-scrub]'), function (sec) {
    var video = sec.querySelector('video');
    var src = sec.getAttribute('data-src');
    var target = 0, shown = 0, ready = false, top = 0, total = 1;
    if (reduce) sec.classList.add('reduced');

    function measure() {
      top = sec.getBoundingClientRect().top + window.scrollY;
      total = Math.max(1, sec.offsetHeight - window.innerHeight);
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    function fail() { sec.classList.remove('has-video'); sec.classList.add('no-video'); if (video) video.removeAttribute('src'); }
    if (video && src && !reduce) {
      video.muted = true; video.playsInline = true;
      video.addEventListener('loadedmetadata', function () {
        if (!isFinite(video.duration) || !video.duration) return fail();
        ready = true; sec.classList.add('has-video'); video.pause();
      });
      video.addEventListener('error', fail);
      var source = document.createElement('source');
      source.src = src; source.type = /webm$/.test(src) ? 'video/webm' : 'video/mp4';
      source.addEventListener('error', fail);
      video.appendChild(source);
      video.load();
      // iOS: desbloquear el decodificador con el primer toque
      window.addEventListener('touchstart', function once() {
        var pr = video.play(); if (pr && pr.then) pr.then(function () { video.pause(); }).catch(function () {});
        window.removeEventListener('touchstart', once);
      }, { passive: true });
    } else { fail(); }

    function tick() {
      target = Math.min(1, Math.max(0, (window.scrollY - top) / total));
      shown += (target - shown) * (reduce ? 1 : 0.14);
      if (Math.abs(target - shown) < 0.0005) shown = target;
      sec.style.setProperty('--p', shown.toFixed(4));
      sec.dispatchEvent(new CustomEvent('scrub', { detail: { p: shown } }));
      if (ready && video.duration) {
        var t = shown * (video.duration - 0.05);
        if (Math.abs(video.currentTime - t) > 0.01) { try { video.currentTime = t; } catch (e) {} }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
