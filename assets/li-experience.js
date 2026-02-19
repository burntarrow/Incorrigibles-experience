(() => {
  const cfg = window.LI_EXPERIENCE || {};
  const sel = cfg.selectors || {};

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Helpers
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  const easeInQuint = (t) => t * t * t * t * t;
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

  function getSectionProgress(section) {
    const rect = section.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const h = section.offsetHeight;
    const denom = h - window.innerHeight;
    const p = denom > 0 ? (window.scrollY - top) / denom : 0;
    return clamp01(p);
  }

  function fadeValue(p, s, e) {
    if (p <= s) return 1;
    if (p >= e) return 0;
    return 1 - clamp01((p - s) / (e - s));
  }

  function windowT(p, s, e) {
    if (p <= s) return 0;
    if (p >= e) return 1;
    return clamp01((p - s) / (e - s));
  }

  // -------------------------
  // 1) Fade logic (hero-only)
  // -------------------------
  function initFade(hero) {
    const cube = hero.querySelector(sel.cube || ".fade-cube");
    const title = hero.querySelector(sel.title || ".fade-title");
    if (!cube && !title) return;

    const fadeCfg = cfg.fade || {};
    const cubeFade = fadeCfg.cube || { start: 0.9, end: 0.97 };
    const titleFade = fadeCfg.title || { start: 0.94, end: 1.0 };
    const titleMotion = fadeCfg.titleMotion || {
      start: 0.94,
      end: 1.0,
      scaleFrom: 1,
      scaleTo: 1.14,
      yFrom: 0,
      yTo: -30,
    };

    let ticking = false;

    const update = () => {
      ticking = false;
      const p = getSectionProgress(hero);

      if (cube) {
        const o = fadeValue(p, cubeFade.start, cubeFade.end);
        cube.style.opacity = o;
        cube.style.pointerEvents = o < 0.05 ? "none" : "";
      }

      if (title) {
        const o = fadeValue(p, titleFade.start, titleFade.end);
        title.style.opacity = o;
        title.style.pointerEvents = o < 0.05 ? "none" : "";

        const tRaw = windowT(p, titleMotion.start, titleMotion.end);
        const t = easeInQuint(tRaw);

        const scale = lerp(titleMotion.scaleFrom, titleMotion.scaleTo, t);
        const y = lerp(titleMotion.yFrom, titleMotion.yTo, t);

        title.style.transform = `translateY(${y}px) scale(${scale})`;
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }
    // -----------------------------------
  // Cube Scroll Scale (hero-only)
  // -----------------------------------
function initCubeScrollScale(hero) {
  const cubeOuter = hero.querySelector(sel.cube || ".fade-cube");
  if (!cubeOuter) return;

  const cs = cfg.cubeScale || {};
  const rawStart = typeof cs.start === "number" ? cs.start : 0.0;
  const rawEnd   = typeof cs.end === "number" ? cs.end : 0.20; // how quickly it scales down
  const to    = typeof cs.to === "number" ? cs.to : 0.95;

  // Guard against inverted or invalid ranges so a bad config doesn't disable the effect.
  const hasValidRange = Number.isFinite(rawStart) && Number.isFinite(rawEnd) && rawStart < rawEnd;
  const start = hasValidRange ? clamp01(rawStart) : 0.0;
  const end = hasValidRange ? clamp01(rawEnd) : 0.20;

  // Keep any existing transform from the theme/builder and append our scale animation.
  const inlineTransform = cubeOuter.style.transform || "";
  const baseTransform = inlineTransform.trim();

  let ticking = false;

  const update = () => {
    ticking = false;
    const p = getSectionProgress(hero);

    // 0..1 only within start..end
    const tRaw = windowT(p, start, end);
    const t = easeInQuint(tRaw); // smooth ease-in

    const scale = lerp(1.0, to, t);
    cubeOuter.style.transform = baseTransform
      ? `${baseTransform} scale(${scale})`
      : `scale(${scale})`;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update);
  update();
}

  // -----------------------------------
  // 2) Cube mouse interactions (hero-only)
  // -----------------------------------
  // Effect: cursor position nudges the cube slightly in the opposite direction + subtle rotation.
  function initCubeMouse(hero) {
  if (prefersReduced) return;

  const cubeOuter = hero.querySelector(sel.cube || ".fade-cube");
  if (!cubeOuter) return;

  // Transform target for mouse motion
  const cubeWrap = cubeOuter.querySelector(".et_pb_image_wrap");
  if (!cubeWrap) return;

  const cm = cfg.cubeMouse || {};
  const baseMaxT = typeof cm.maxTranslate === "number" ? cm.maxTranslate : 18;
  const baseMaxR = typeof cm.maxRotate === "number" ? cm.maxRotate : 5;
  const ease = typeof cm.ease === "number" ? cm.ease : 0.1;

  // Boost window (as hero scroll progress 0..1)
  // Example: starts boosting at 0.80, max at 1.00
  const boostStart = cm.boostStart ?? 0.80;
  const boostEnd   = cm.boostEnd   ?? 1.00;
  const boostTo    = cm.boostTo    ?? 1.6; // 1.0 -> 1.6x intensity

  const container = cubeOuter;

  let targetX = 0, targetY = 0, targetR = 0;
  let currentX = 0, currentY = 0, currentR = 0;
  let raf = 0;

  function getBoost() {
    const p = getSectionProgress(hero);
    const t = windowT(p, boostStart, boostEnd);
    // ease-in so it feels like pressure building
    const k = easeInQuint(t);
    return lerp(1.0, boostTo, k);
  }

  function apply() {
    raf = 0;

    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    currentR += (targetR - currentR) * ease;

    cubeWrap.style.transform =
      `translate3d(${currentX}px, ${currentY}px, 0) rotate(${currentR}deg)`;
  }

  function requestApply() {
    if (!raf) raf = requestAnimationFrame(apply);
  }

  function onMove(e) {
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    const boost = getBoost();
    const maxT = baseMaxT * boost;
    const maxR = baseMaxR * boost;

    // resistance opposite motion
    targetX = -nx * maxT;
    targetY = -ny * maxT * 0.8;
    targetR = nx * maxR;

    requestApply();
  }

  function onLeave() {
    targetX = 0;
    targetY = 0;
    targetR = 0;
    requestApply();
  }

  container.addEventListener("pointermove", onMove, { passive: true });
  container.addEventListener("pointerleave", onLeave, { passive: true });

  onLeave();
}

  // ------------------------------------------------
  // 3) "Misbehave" word: scatter + micro-shake (hero-only)
  // ------------------------------------------------
  function initMisbehave(hero) {
    if (prefersReduced) return;

    const wordSel = sel.misbehave || ".misbehave-word";
    const wordEl =
      hero.querySelector(wordSel) || document.querySelector(wordSel);
    if (!wordEl) return;

    const mb = cfg.misbehave || {};
    const scatterWin = mb.scatter || { start: 0.55, end: 0.7 };
    const strength = mb.strength || { dx: 22, dy: 18, rot: 10 };
    const shakeCfg = mb.shake || { durationMs: 600, freqHz: 22, rotateDeg: 1.2 };
    const resetMargin = typeof mb.resetMargin === "number" ? mb.resetMargin : 0.02;

    // Split into letters once (do not double-split)
    if (wordEl.dataset.mbSplit === "1") return;
    wordEl.dataset.mbSplit = "1";

    const original = wordEl.textContent;
    wordEl.textContent = "";

    // Deterministic seeded value 0..1
    function seeded(i) {
      const x = Math.sin((i + 1) * 999) * 10000;
      return x - Math.floor(x);
    }

    const letters = [];
    for (let i = 0; i < original.length; i++) {
      const ch = original[i];
      const span = document.createElement("span");
      span.className = "mb-letter";
      span.textContent = ch === " " ? "\u00A0" : ch;

      const r1 = seeded(i);
      const r2 = seeded(i + 7);
      const r3 = seeded(i + 13);

      // Base scatter
      const dx = (r1 * 2 - 1) * strength.dx;
      const dy = (r2 * 2 - 1) * strength.dy;
      const rot = (r3 * 2 - 1) * strength.rot;

      // Per-letter shake personality
      const s1 = seeded(i + 21);
      const s2 = seeded(i + 33);

      span.dataset.dx = dx.toFixed(2);
      span.dataset.dy = dy.toFixed(2);
      span.dataset.rot = rot.toFixed(2);

      // Shake amplitude (subtle)
      span.dataset.sx = ((s1 * 2 - 1) * 2.2).toFixed(2);
      span.dataset.sy = ((s2 * 2 - 1) * 1.8).toFixed(2);

      wordEl.appendChild(span);
      letters.push(span);
    }

    let ticking = false;
    let shaking = false;
    let shakeStart = 0;
    let passedEnd = false;

    function setScatterIntensity(k) {
      letters.forEach((span, i) => {
        const phase = (i % 3) * 0.06;
        const kk = clamp01(k + phase);

        const dx = parseFloat(span.dataset.dx) * kk;
        const dy = parseFloat(span.dataset.dy) * kk;
        const rot = parseFloat(span.dataset.rot) * kk;

        span.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
      });
    }

    function settleToFullScatter() {
      letters.forEach((span) => {
        const dx = parseFloat(span.dataset.dx);
        const dy = parseFloat(span.dataset.dy);
        const rot = parseFloat(span.dataset.rot);
        span.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
      });
    }

    function loopShake(now) {
      if (!shaking) return;

      const elapsed = now - shakeStart;
      const t = clamp01(elapsed / shakeCfg.durationMs);

      // Fade shake out
      const fade = 1 - easeOutQuint(t);

      const w = 2 * Math.PI * (shakeCfg.freqHz / 1000); // radians per ms

      letters.forEach((span, i) => {
        const baseDx = parseFloat(span.dataset.dx);
        const baseDy = parseFloat(span.dataset.dy);
        const baseRot = parseFloat(span.dataset.rot);

        const ampX = parseFloat(span.dataset.sx) * fade;
        const ampY = parseFloat(span.dataset.sy) * fade;

        const phase = i * 0.65;

        const jx = ampX * Math.sin((now + phase * 10) * w);
        const jy = ampY * Math.sin((now + phase * 14) * w * 1.12);

        // tiny rotational jitter
        const jr =
          shakeCfg.rotateDeg *
          fade *
          0.6 *
          Math.sin((now + phase * 8) * w * 0.9) *
          (seeded(i + 50) * 2 - 1);

        span.style.transform = `translate3d(${baseDx + jx}px, ${baseDy + jy}px, 0) rotate(${baseRot + jr}deg)`;
      });

      if (t < 1) {
        requestAnimationFrame(loopShake);
      } else {
        shaking = false;
        settleToFullScatter();
      }
    }

    function startShake() {
      shaking = true;
      shakeStart = performance.now();
      requestAnimationFrame(loopShake);
    }

    function update() {
      ticking = false;

      const p = getSectionProgress(hero);

      // scatter intensity 0..1 inside scatter window
      let t = 0;
      if (p <= scatterWin.start) t = 0;
      else if (p >= scatterWin.end) t = 1;
      else t = (p - scatterWin.start) / (scatterWin.end - scatterWin.start);

      const k = easeOutQuint(clamp01(t));

      // Apply scatter transforms only if shake loop is not owning transforms
      if (!shaking) setScatterIntensity(k);

      // Trigger shake once when crossing end
      if (!passedEnd && p >= scatterWin.end) {
        passedEnd = true;
        startShake();
      }

      // Reset trigger if user scrolls back up a bit
      if (passedEnd && p < scatterWin.end - resetMargin) {
        passedEnd = false;
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  // -----------------------------------
  // 4) Audio helper (sitewide)
  // -----------------------------------
  function initAudio() {
    const audio = document.querySelector(sel.audio || "#site-audio");
    const btn = document.querySelector(sel.audioToggle || "#audio-toggle");
    if (!audio || !btn) return;

    const acfg = cfg.audio || {};
    const remember = acfg.remember !== false;
    const defaultOn = (acfg.defaultState || "muted") === "on";
    const unlockOnFirstGesture = acfg.unlockOnFirstGesture !== false;

    const key = "li_audio_enabled";

    const setUI = (on) => {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      // keep your preferred labels if you want
      btn.textContent = on ? "Sound On" : "Tap For Sound";
    };

    const enableAudio = async () => {
      try {
        audio.muted = false;
        // playsinline already on your markup
        await audio.play();
        setUI(true);
        if (remember) localStorage.setItem(key, "1");
      } catch (e) {
        // Autoplay policies may block without a gesture; button click covers it.
      }
    };

    const disableAudio = () => {
      audio.pause();
      audio.muted = true;
      setUI(false);
      if (remember) localStorage.setItem(key, "0");
    };

    const saved = remember ? localStorage.getItem(key) : null;
    const shouldOn = saved === null ? defaultOn : saved === "1";

    // Start state
    if (shouldOn) enableAudio();
    else disableAudio();

    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") === "true";
      on ? disableAudio() : enableAudio();
    });

    // Optional: first gesture anywhere can unlock audio if user previously enabled it
    if (unlockOnFirstGesture) {
      const unlock = () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
        if (btn.getAttribute("aria-pressed") === "true") enableAudio();
      };
      window.addEventListener("pointerdown", unlock, { passive: true, once: true });
      window.addEventListener("touchstart", unlock, { passive: true, once: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
  }

  // -------------------------
  // BOOT
  // -------------------------
  // Audio runs sitewide but no-ops if elements missing
  initAudio();

  // Hero-ish modules: run only when a hero section exists
  const hero = document.querySelector(sel.heroSection || ".grain-wrap");
  if (hero) {
    initFade(hero);
    initCubeScrollScale(hero);
    initCubeMouse(hero);
    initMisbehave(hero);
  }
})();
