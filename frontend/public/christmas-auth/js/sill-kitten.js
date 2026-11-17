(() => {
  'use strict';
  const CELL_W = 151, CELL_H = 128, COLUMNS = 12;
  const POSE_W = 320, POSE_H = 272;
  const START = 196, LEFT = 152, RIGHT = 504, STRIDE = 44;
  const SIZE = .45, GROUND = 547, CRUISE = 31, ACCELERATION = 44;
  const COUNTS = { walk: 96, wake: 91, stretch: 103, turn: 103 };

  window.createSillKitten = canvas => {
    if (!window.OKLOGIN_SETTINGS.effects.kitten) {
      if (canvas) canvas.style.display = 'none';
      return () => {};
    }
    const context = canvas?.getContext('2d', { alpha: true });
    if (!context) return () => {};
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pictures = {};
    let state = 'sleeping', x = START, direction = 1, speed = 0;
    let elapsed = 0, progress = 0, target = RIGHT, distance = 0;
    let night = false, ready = false, handle = 0, previous = 0;
    let hoverReaction = false, pointerInside = false;

    function setState(next) {
      state = next;
      elapsed = 0;
    }

    function startWalking(destination) {
      target = destination;
      speed = 0;
      distance = 0;
      setState('walking');
    }

    function chooseNext() {
      if (hoverReaction) {
        progress = 1;
        setState('settling');
        return;
      }
      if (night) {
        const destination = direction > 0 ? RIGHT : LEFT;
        if (Math.abs(x - destination) < .05) setState('turning');
        else startWalking(destination);
        return;
      }
      progress = 1;
      setState('settling');
    }

    function update(seconds) {
      elapsed += seconds;
      switch (state) {
        case 'sleeping':
          if (night) { progress = 0; setState('waking'); }
          break;
        case 'waking':
          progress = Math.min(1, progress + seconds / 2.8);
          if (progress === 1) {
            if (night || hoverReaction) setState('stretching');
            else setState('settling');
          }
          break;
        case 'settling':
          progress = Math.max(0, progress - seconds / 2.8);
          if (progress === 0) {
            hoverReaction = false;
            setState('sleeping');
          }
          break;
        case 'stretching':
          if (elapsed >= 3.5) chooseNext();
          break;
        case 'walking': {
          const remaining = Math.abs(target - x);
          const wanted = Math.min(CRUISE, Math.sqrt(2 * ACCELERATION * remaining));
          const nextSpeed = speed + Math.max(-ACCELERATION * seconds, Math.min(ACCELERATION * seconds, wanted - speed));
          const travel = Math.min(remaining, (speed + nextSpeed) * .5 * seconds);
          speed = nextSpeed;
          x += direction * travel;
          distance += travel;
          if (remaining - travel < .015) {
            x = target;
            speed = 0;
            distance = 0;
            setState('pausing');
          }
          break;
        }
        case 'pausing':
          if (elapsed >= (night ? .65 : .25)) chooseNext();
          break;
        case 'turning':
          if (elapsed >= 1.8) {
            direction *= -1;
            chooseNext();
          }
          break;
      }
    }

    function pose() {
      if (state === 'sleeping') return ['wake', 0];
      if (state === 'waking' || state === 'settling') return ['wake', progress * (COUNTS.wake - 1)];
      if (state === 'stretching') return ['stretch', Math.min(1, elapsed / 3.5) * (COUNTS.stretch - 1)];
      if (state === 'turning') return ['turn', Math.min(1, elapsed / 1.8) * (COUNTS.turn - 1)];
      if (state === 'walking') return ['walk', (distance / STRIDE % 1) * COUNTS.walk];
      return ['walk', 0];
    }

    function paint() {
      if (!ready) return;
      context.clearRect(0, 0, 680, 600);
      const [sheet, value] = pose();
      const frame = Math.min(COUNTS[sheet] - 1, Math.max(0, Math.floor(value)));
      context.save();
      context.fillStyle = 'rgba(48, 65, 55, .15)';
      context.beginPath();
      context.ellipse(x, GROUND + 1, state === 'sleeping' ? 38 : 30, 2.5, 0, 0, Math.PI * 2);
      context.fill();
      context.translate(x, GROUND);
      context.scale(direction * SIZE, SIZE);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(pictures[sheet], frame % COLUMNS * CELL_W, Math.floor(frame / COLUMNS) * CELL_H,
        CELL_W, CELL_H, -POSE_W / 2, -248, POSE_W, POSE_H);
      context.restore();
    }

    function tick(timestamp) {
      handle = 0;
      const seconds = previous ? Math.min((timestamp - previous) / 1000, .05) : 0;
      previous = timestamp;
      update(seconds);
      paint();
      schedule();
    }

    function schedule() {
      if (ready && !handle && !document.hidden && !window.popupMotion.active && !motion.matches && state !== 'sleeping') handle = requestAnimationFrame(tick);
    }

    function stop() {
      if (handle) cancelAnimationFrame(handle);
      handle = 0;
      previous = 0;
    }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(680 * ratio);
      canvas.height = Math.round(600 * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    }

    function applyReducedMotion() {
      stop();
      hoverReaction = false;
      if (motion.matches) {
        progress = night ? 1 : 0;
        speed = 0;
        setState(night ? 'resting' : 'sleeping');
      } else if (state === 'resting') chooseNext();
      paint();
      schedule();
    }

    function setNight(level) {
      const next = level >= .65 ? true : level <= .35 ? false : night;
      if (next === night) return;
      night = next;
      hoverReaction = false;
      if (motion.matches) { applyReducedMotion(); return; }
      if (state === 'sleeping' && night) { progress = 0; setState('waking'); }
      else if (state === 'waking' && !night) setState('settling');
      else if (state === 'settling' && night) setState('waking');
      else if (state === 'walking') {
        if (night) target = direction > 0 ? RIGHT : LEFT;
        else {
          const braking = speed * speed / (2 * ACCELERATION) + 8;
          const grid = (x + direction * braking - START) / STRIDE;
          const stopAt = START + (direction > 0 ? Math.ceil(grid) : Math.floor(grid)) * STRIDE;
          target = Math.max(LEFT, Math.min(RIGHT, stopAt));
        }
      }
      paint();
      schedule();
    }

    const hoverArea = canvas.parentElement;
    function clearHover() {
      pointerInside = false;
      hoverArea.style.removeProperty('cursor');
    }
    hoverArea.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const pointerX = (event.clientX - bounds.left) * 680 / bounds.width;
      const pointerY = (event.clientY - bounds.top) * 600 / bounds.height;
      const inside = Math.abs(pointerX - x) <= 60 && pointerY >= GROUND - 50 && pointerY <= GROUND + 8;
      const entered = inside && !pointerInside;
      pointerInside = inside;
      hoverArea.style.cursor = inside && ready && !motion.matches ? 'pointer' : '';
      if (!entered || !ready || motion.matches || state !== 'sleeping' || hoverReaction) return;
      hoverReaction = true;
      progress = 0;
      previous = 0;
      setState('waking');
      paint();
      schedule();
    });
    hoverArea.addEventListener('pointerleave', clearHover);
    hoverArea.addEventListener('pointercancel', clearHover);

    window.popupMotion.subscribe(() => { if (window.popupMotion.active) stop(); else schedule(); });
    motion.addEventListener('change', applyReducedMotion);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else { previous = 0; schedule(); }
    });
    resize();
    Promise.all(Object.keys(COUNTS).map(async name => {
      const picture = new Image();
      picture.decoding = 'async';
      picture.src = `image/sill-kitten-${name}.png?v=fit-150-1`;
      await picture.decode();
      pictures[name] = picture;
    })).then(() => {
      ready = true;
      paint();
      schedule();
    }).catch(error => {
      console.error('Không tải được bộ ảnh mèo mới.', error);
    });
    return setNight;
  };
})();
