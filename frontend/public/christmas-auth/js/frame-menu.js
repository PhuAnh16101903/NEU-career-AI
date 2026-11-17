(() => {
  let rowInstance = 0;
  window.createFrameMenu = ({ layout, beforeOpen, getMode, onNavigate }) => {
    const toggle = layout.querySelector('.frame-menu-toggle');
    const overlay = layout.querySelector('.frame-menu-overlay');
    const panel = overlay.querySelector('.frame-menu-panel');
    const curveEdge = panel.querySelector('.frame-menu-curve-edge');
    const curveStroke = curveEdge.querySelector('path');
    const restingStroke = curveStroke.getAttribute('d');
    const motionMask = document.getElementById('frame-menu-motion-path');
    const header = panel.querySelector('.frame-menu-header');
    const closeButton = overlay.querySelector('.frame-menu-close');
    const backdrop = overlay.querySelector('.frame-menu-backdrop');
    const routes = [...panel.querySelectorAll('[data-frame-route]')];
    const rowPrefix = `frame-menu-row-${++rowInstance}`;
    const rowShapes = routes.map((button, index) => {
      const id = `${rowPrefix}-${index}`;
      const svg = window.svgAssets.clone('frame-menu-row.svg');
      const clip = svg.querySelector('[data-row-clip]');
      const mask = svg.querySelector('[data-row-mask]');
      const surface = svg.querySelector('[data-row-surface]');
      clip.setAttribute('id', id);
      button.append(svg);
      return { button, svg, mask, surface, id };
    });
    const about = panel.querySelector('.frame-menu-about');
    const aboutButton = routes.find(button => button.dataset.frameRoute === 'about');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 850px)');
    let state = 'closed', generation = 0, animations = [], background = [];
    let closing = null, resolveClose = null;
    let gel = null;

    const smoothPhase = value => {
      const x = Math.max(0, Math.min(1, value));
      return x * x * (3 - 2 * x);
    };
    function slideProgress(elapsed) {
      if (elapsed <= 0 || elapsed >= 1) return Math.max(0, Math.min(1, elapsed));
      let low = 0, high = 1;
      for (let index = 0; index < 16; index++) {
        const t = (low + high) / 2;
        const x = 3 * (1-t)**2*t*.76 + 3*(1-t)*t*t*.24 + t**3;
        if (x < elapsed) low = t; else high = t;
      }
      return smoothPhase((low + high) / 2);
    }

    function curveAt(y, height, reverse) {
      const position = Math.max(0, Math.min(1, y / height));
      const upper = position <= .5825;
      const xs = upper ? [0, 0, 72, 72] : [72, 72, 18, 18];
      const ys = upper ? [0, .2, .3775, .5825] : [.5825, .76875, .91875, 1];
      const cubic = (values, t) => (1-t)**3*values[0]+3*(1-t)**2*t*values[1]+3*(1-t)*t*t*values[2]+t**3*values[3];
      let low = 0, high = 1;
      for (let index = 0; index < 18; index++) {
        const t = (low + high) / 2;
        if (cubic(ys, t) < position) low = t; else high = t;
      }
      const x = cubic(xs, (low + high) / 2);
      return (reverse ? 72 - x : x) * panel.clientWidth / 412;
    }

    function paintRowShape(row, rect, edgeAt) {
      const { width, height, top, left } = rect;
      if (!width || !height) return;
      const radius = Math.min(12, height / 3);
      const edge = y => Math.min(width - radius * 2 - 1, Math.max(0, edgeAt(top + y) + 24 - left));
      const derivative = y => (edge(y + .1) - edge(y - .1)) / .2;
      const paths = [false, true].map(normalized => {
        const x = value => (value / (normalized ? width : 1)).toFixed(normalized ? 6 : 2);
        const y = value => (value / (normalized ? height : 1)).toFixed(normalized ? 6 : 2);
        const pair = (a, b) => `${x(a)} ${y(b)}`;
        let path = `M${pair(edge(0) + radius, 0)}H${x(width - radius)}Q${pair(width, 0)} ${pair(width, radius)}V${y(height - radius)}Q${pair(width, height)} ${pair(width - radius, height)}H${x(edge(height) + radius)}Q${pair(edge(height), height)} ${pair(edge(height - radius), height - radius)}`;
        for (let index = 0; index < 4; index++) {
          const current = height - radius - (height - radius * 2) * index / 4;
          const next = height - radius - (height - radius * 2) * (index + 1) / 4;
          const third = (next - current) / 3;
          path += `C${pair(edge(current) + derivative(current) * third, current + third)} ${pair(edge(next) - derivative(next) * third, next - third)} ${pair(edge(next), next)}`;
        }
        return `${path}Q${pair(edge(0), 0)} ${pair(edge(0) + radius, 0)}Z`;
      });
      row.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      row.surface.setAttribute('d', paths[0]);
      row.mask.setAttribute('d', paths[1]);
      row.button.style.setProperty('clip-path', `url(#${row.id})`);
    }

    function measureGeometry() {
      const bounds = panel.getBoundingClientRect();
      const width = panel.clientWidth, height = panel.clientHeight;
      if (!bounds.height || !width || !height) return null;
      const scale = height / bounds.height;
      return { width, height, reverse: overlay.dataset.mode === 'register',
        content: [header, ...routes].map((element, index) => {
          const rect = element.getBoundingClientRect();
          return { element, index, top: (rect.top - bounds.top) * scale,
            bottom: (rect.bottom - bounds.top) * scale, left: (rect.left - bounds.left) * scale,
            width: rect.width * scale, height: rect.height * scale };
        }) };
    }

    function paintGeometry(geometry, points) {
      const { width, height, content } = geometry;
      const step = height / 40;
      const slope = index => {
        if (!index) return (points[1][0] - points[0][0]) / step;
        if (index === 40) return (points[40][0] - points[39][0]) / step;
        return (points[index + 1][0] - points[index - 1][0]) / (2 * step);
      };
      const handle = value => Math.max(0, Math.min(width - .5, value));
      const paths = [false, true].map(normalized => {
        const pair = (x, y) => `${(x / (normalized ? width : 1)).toFixed(normalized ? 6 : 2)} ${(y / (normalized ? height : 1)).toFixed(normalized ? 6 : 2)}`;
        let path = `M${pair(...points[0])}`;
        for (let index = 0; index < 40; index++) {
          const [x, y] = points[index], [nextX, nextY] = points[index + 1];
          path += `C${pair(handle(x + slope(index) * step / 3), y + step / 3)} ${pair(handle(nextX - slope(index + 1) * step / 3), nextY - step / 3)} ${pair(nextX, nextY)}`;
        }
        return path;
      });
      panel.style.setProperty('clip-path', 'url(#frame-menu-motion-clip)');
      curveEdge.style.setProperty('width', '100%');
      curveEdge.style.setProperty('transform', 'none');
      curveEdge.setAttribute('viewBox', `0 0 ${width} ${height}`);
      curveStroke.setAttribute('d', paths[0]);
      motionMask.setAttribute('d', `${paths[1]}H1V0Z`);
      const edgeAt = y => {
        const position = Math.max(0, Math.min(40, y / step));
        const index = Math.min(39, Math.floor(position)), t = position - index;
        const a = points[index][0], b = points[index + 1][0];
        const c = handle(a + slope(index) * step / 3);
        const d = handle(b - slope(index + 1) * step / 3);
        return (1-t)**3*a+3*(1-t)**2*t*c+3*(1-t)*t*t*d+t**3*b;
      };
      content.forEach(item => {
        if (item.index) paintRowShape(rowShapes[item.index - 1], item, edgeAt);
      });
    }

    function syncCurve() {
      const elements = [header, ...routes];
      if (compact.matches) {
        elements.forEach(element => element.style.removeProperty('--frame-menu-inset'));
        routes.forEach(element => element.style.removeProperty('clip-path'));
        panel.style.removeProperty('clip-path');
        curveEdge.style.removeProperty('width');
        curveEdge.style.removeProperty('transform');
        curveEdge.setAttribute('viewBox', '0 0 72 800');
        curveStroke.setAttribute('d', restingStroke);
        return;
      }
      if (overlay.hidden || gel) return;
      const geometry = measureGeometry();
      if (!geometry) return;
      const { height, reverse, content } = geometry;
      // Lay out the text once. The gel deforms only vector surfaces, never
      // per-frame padding, line wrapping, or independently gated icon opacity.
      content.forEach(({ element, index, top, bottom }) => {
        const turn = Math.max(top, Math.min(bottom, height * .5825));
        const inset = Math.max(...[top, bottom, turn].map(y => curveAt(y, height, reverse))) + (index ? 38 : 24);
        element.style.setProperty('--frame-menu-inset', `${inset.toFixed(3)}px`);
      });
      const points = Array.from({ length: 41 }, (_, index) => {
        const y = index / 40 * height;
        return [curveAt(y, height, reverse), y];
      });
      paintGeometry(geometry, points);
    }

    function stopGel(restore = true) {
      if (!gel) return;
      cancelAnimationFrame(gel.frame);
      gel.frame = 0;
      if (!restore) return;
      gel = null;
      syncCurve();
    }

    function startGel(lead, duration, from = 0, to = 1) {
      const geometry = measureGeometry();
      if (!geometry) return;
      const { width, height, reverse } = geometry;
      const rows = Array.from({ length: 41 }, (_, index) => {
        const u = index / 40, y = u * height;
        const release = .32 + .22 * u + .025 * Math.sin(2 * Math.PI * u);
        return { y, u, x: curveAt(y, height, reverse),
          weight: .14 + .96 * Math.sin(Math.PI * u) ** 1.1, release,
          travel: slideProgress(release),
          speed: (slideProgress(release + .0005) - slideProgress(release - .0005)) / .001 };
      });
      const effect = gel = { width, height, frame: 0, phase: from };
      const version = generation;
      const expectedState = to === 0 ? 'closing' : 'open';
      const springDuration = parseFloat(layout.style.getPropertyValue('--auth-slide-duration')) || 1500;
      function paint() {
        if (gel !== effect || state !== expectedState || generation !== version) return;
        const elapsed = Math.max(0, Math.min(1, Number(lead.currentTime) / duration));
        const phase = from + (to - from) * elapsed;
        effect.phase = phase;
        const travel = slideProgress(phase);
        const movement = Math.sin(Math.PI * phase) ** 2;
        const settle = 1 - smoothPhase((phase - .86) / .14);
        const points = rows.map(row => {
          let displacement;
          if (phase <= row.release) {
            displacement = row.weight * Math.max(0, travel * width + 10 - row.x);
          } else {
            const seconds = (phase - row.release) * springDuration / 1000;
            const amplitude = row.weight * Math.max(0, row.travel * width + 10 - row.x);
            const speed = 320 * Math.tanh(row.weight * row.speed * width / (springDuration / 1000) * .35 / 320);
            const damping = 7.8, frequency = 17 - 2 * row.u;
            displacement = Math.exp(-damping * seconds) * (amplitude * Math.cos(frequency * seconds)
              + (speed + damping * amplitude) / frequency * Math.sin(frequency * seconds));
          }
          const wave = 12 * movement * Math.sin(2.2 * Math.PI * row.u - 3 * Math.PI * phase);
          return [Math.max(0, Math.min(width - .5, row.x + (displacement + wave) * settle)), row.y];
        });
        paintGeometry(geometry, points);
        effect.frame = elapsed < 1 ? requestAnimationFrame(paint) : 0;
      }
      paint();
    }

    function syncSurface() {
      // Mobile covers the viewport, including the landscape below the form.
      // Mounting on body avoids the frame's height, zoom, and clipping bounds.
      const mobile = compact.matches && state !== 'closed';
      const parent = mobile ? document.body : layout;
      if (overlay.parentElement !== parent) parent.append(overlay);
      document.documentElement.classList.toggle('frame-menu-scroll-locked', mobile);
      syncCurve();
    }

    function cancelAnimations(keepGel = false) {
      animations.forEach(animation => animation.cancel());
      animations = [];
      stopGel(!keepGel);
    }

    function animatePanel(from, to, fromOpacity, toOpacity, options = {}) {
      if (motion.matches || typeof panel.animate !== 'function') return [];
      const timing = { duration: 360, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'both', ...options };
      return [
        panel.animate([{ transform: from }, { transform: to }], timing),
        backdrop.animate([{ opacity: fromOpacity }, { opacity: toOpacity }], timing)
      ];
    }

    function finishClose() {
      if (state !== 'closing') return;
      overlay.hidden = true;
      cancelAnimations();
      background.forEach(([element, inert]) => { element.inert = inert; });
      background = [];
      state = 'closed';
      delete layout.dataset.menuOpen;
      syncSurface();
      toggle.focus({ preventScroll: true });
      const resolve = resolveClose;
      resolveClose = null;
      closing = null;
      resolve?.();
    }

    function close() {
      if (state === 'closed') return Promise.resolve();
      if (state === 'closing') return closing;
      const version = ++generation;
      const from = getComputedStyle(panel).transform;
      const opacity = getComputedStyle(backdrop).opacity;
      const phase = gel?.phase ?? 1;
      const useGel = !compact.matches && !motion.matches && motionMask && typeof panel.animate === 'function';
      const timing = useGel ? { duration: Math.max(220, (parseFloat(layout.style.getPropertyValue('--auth-slide-duration')) || 1500) * phase),
        easing: 'cubic-bezier(.76,0,.24,1)' } : {};
      cancelAnimations(true);
      state = 'closing';
      toggle.setAttribute('aria-expanded', 'false');
      const done = new Promise(resolve => { resolveClose = resolve; });
      closing = done;
      animations = animatePanel(from, 'translateX(100%)', opacity, 0, timing);
      if (useGel) startGel(animations[0], timing.duration, phase, 0);
      if (!animations.length) finishClose();
      else Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (version === generation) finishClose();
      });
      return done;
    }

    function open() {
      if (state !== 'closed') return;
      beforeOpen?.();
      const version = ++generation;
      const mode = getMode();
      overlay.dataset.mode = mode;
      routes.forEach(button => {
        if (button.dataset.frameRoute === mode) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      about.hidden = true;
      aboutButton.setAttribute('aria-expanded', 'false');
      overlay.hidden = false;
      panel.scrollTop = 0;
      state = 'open';
      layout.dataset.menuOpen = 'true';
      syncSurface();
      toggle.setAttribute('aria-expanded', 'true');
      background = [...layout.children]
        .filter(element => element !== overlay && typeof element.inert === 'boolean')
        .map(element => { const previous = element.inert; element.inert = true; return [element, previous]; });
      const useGel = !compact.matches && !motion.matches && motionMask && typeof panel.animate === 'function';
      const timing = useGel ? { duration: parseFloat(layout.style.getPropertyValue('--auth-slide-duration')) || 1500,
        easing: 'cubic-bezier(.76,0,.24,1)' } : {};
      animations = animatePanel('translateX(100%)', 'translateX(0)', 0, 1, timing);
      if (useGel) startGel(animations[0], timing.duration);
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (version === generation && state === 'open') cancelAnimations();
      });
      closeButton.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', open);
    closeButton.addEventListener('click', () => { close(); });
    backdrop.addEventListener('click', () => { close(); });
    routes.forEach(button => button.addEventListener('click', () => {
      if (state !== 'open') return;
      const route = button.dataset.frameRoute;
      if (route === 'about') {
        about.hidden = !about.hidden;
        button.setAttribute('aria-expanded', String(!about.hidden));
        if (!about.hidden) about.querySelector('h3').focus({ preventScroll: true });
        return;
      }
      close().then(() => onNavigate(route));
    }));
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'Tab') {
        const focusable = [...panel.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')]
          .filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    });
    motion.addEventListener('change', () => {
      if (!motion.matches) return;
      if (state === 'closing') finishClose();
      else cancelAnimations();
    });
    compact.addEventListener('change', () => {
      if (gel) {
        if (state === 'closing') finishClose();
        else cancelAnimations();
      }
      syncSurface();
    });
    const resize = new ResizeObserver(() => {
      if (gel && (gel.width !== panel.clientWidth || gel.height !== panel.clientHeight)) {
        if (state === 'closing') finishClose();
        else cancelAnimations();
      }
      syncCurve();
    });
    resize.observe(panel);
    return { open, close };
  };
})();
