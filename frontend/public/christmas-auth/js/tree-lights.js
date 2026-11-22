(() => {
  'use strict';
  const COUNT = 96, FPS = 24, CELL_W = 316, CELL_H = 403;
  const SOURCE_SCALE = 3600 / 3072;
  const CROP_X = 1664 * SOURCE_SCALE, CROP_Y = -724 + 800 * SOURCE_SCALE;
  const WORLD_W = 464 * SOURCE_SCALE, WORLD_H = 592 * SOURCE_SCALE;
  const PERIOD = 7200, ORIGIN = -720;

  window.createTreeLights = (canvas, getScene) => {
    if (!window.OKLOGIN_SETTINGS.lights.tree) {
      if (canvas) canvas.style.display = 'none';
      return () => {};
    }
    const context = canvas?.getContext('2d', { alpha: true });
    if (!context) return () => {};
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const views = [{ canvas, context, frame: -1 }];
    let width = 0, height = 0, visibleCount = 0, ready = false, handle = 0;
    let elapsed = 0, previous = 0, lastFrame = -1, paintPixels;
    canvas.width = CELL_W;
    canvas.height = CELL_H;

    function style(view, key, value) {
      if (view.style[key] !== value) view.style[key] = value;
    }

    function getView(index) {
      if (!views[index]) {
        const copy = document.createElement('canvas');
        copy.className = 'tree-light-copy';
        copy.width = CELL_W;
        copy.height = CELL_H;
        copy.setAttribute('aria-hidden', 'true');
        canvas.parentNode.insertBefore(copy, canvas.nextSibling);
        views[index] = { canvas: copy, context: copy.getContext('2d', { alpha: true }), frame: -1 };
      }
      return views[index];
    }

    function syncCopies() {
      for (let i = 1; i < visibleCount; i++) {
        const view = views[i];
        if (!view.context || view.frame === lastFrame) continue;
        view.context.clearRect(0, 0, CELL_W, CELL_H);
        view.context.drawImage(canvas, 0, 0);
        view.frame = lastFrame;
      }
    }

    function project() {
      const scene = getScene();
      visibleCount = 0;
      if (ready && scene.night >= .005 && scene.scale > 0) {
        const drawWidth = WORLD_W * scene.scale, drawHeight = WORLD_H * scene.scale;
        const y = scene.top + CROP_Y * scene.scale;
        const visibleLeft = -scene.left / scene.scale + scene.pan;
        const visibleRight = (width - scene.left) / scene.scale + scene.pan;
        const first = Math.floor((visibleLeft - ORIGIN) / PERIOD) - 1;
        const last = Math.ceil((visibleRight - ORIGIN) / PERIOD);
        function place(worldX, mirrored) {
          const x = scene.left + (worldX - scene.pan) * scene.scale;
          if (x + drawWidth < 0 || x > width || y + drawHeight < 0 || y > height) return;
          const view = getView(visibleCount++).canvas;
          style(view, 'width', `${drawWidth}px`);
          style(view, 'height', `${drawHeight}px`);
          style(view, 'opacity', String(Math.min(1, scene.night)));
          style(view, 'transform', `translate3d(${mirrored ? x + drawWidth : x}px,${y}px,0) scaleX(${mirrored ? -1 : 1})`);
          style(view, 'display', 'block');
        }
        for (let tile = first; tile <= last; tile++) {
          place(ORIGIN + tile * PERIOD + CROP_X, false);
          place(ORIGIN + tile * PERIOD + PERIOD - CROP_X - WORLD_W, true);
        }
      }
      for (let i = visibleCount; i < views.length; i++) style(views[i].canvas, 'display', 'none');
      syncCopies();
    }

    function paint(frame) {
      if (!ready || !visibleCount) return;
      paintPixels(frame);
      lastFrame = frame;
      views[0].frame = frame;
      syncCopies();
    }

    function stop() {
      if (handle) cancelAnimationFrame(handle);
      handle = 0;
      previous = 0;
    }

    function tick(timestamp) {
      handle = 0;
      if (document.hidden || window.popupMotion.active || motion.matches || !window.OKLOGIN_SETTINGS.lights.twinkle || !visibleCount) { previous = 0; return; }
      if (previous) elapsed += Math.min((timestamp - previous) / 1000, .1);
      previous = timestamp;
      const frame = Math.floor(elapsed * FPS) % COUNT;
      if (frame !== lastFrame) paint(frame);
      handle = requestAnimationFrame(tick);
    }

    function request() {
      project();
      if (!ready) return;
      if (!visibleCount || document.hidden || window.popupMotion.active) stop();
      else if (motion.matches || !window.OKLOGIN_SETTINGS.lights.twinkle) {
        stop();
        if (lastFrame !== 0) paint(0);
      } else if (!handle) handle = requestAnimationFrame(tick);
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      request();
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', request);
    window.popupMotion.subscribe(request);
    motion.addEventListener('change', request);
    resize();
    window.loadTreeLightPixels().then(patterns => {
      if (patterns.width !== CELL_W || patterns.height !== CELL_H || patterns.count !== COUNT) {
        throw new Error('Tree light dimensions do not match the scene.');
      }
      paintPixels = patterns.createPainter(context);
      ready = true;
      request();
    }).catch(error => {
      console.error('Không tải được hiệu ứng đèn cây thông.', error);
    });
    return request;
  };
})();
