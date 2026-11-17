(() => {
  'use strict';

  let instance = 0;

  function perimeter(width, height, inset, radius) {
    const x = inset, y = inset, w = width - inset * 2, h = height - inset * 2;
    const r = Math.max(0, Math.min(radius - inset, w / 2, h / 2));
    const horizontal = w - r * 2, vertical = h - r * 2, arc = Math.PI * r / 2;
    const segments = [
      { length: horizontal, point: t => [x + r + t, y, 0, -1] },
      { length: arc, point: t => corner(x + w - r, y + r, -Math.PI / 2 + t / r) },
      { length: vertical, point: t => [x + w, y + r + t, 1, 0] },
      { length: arc, point: t => corner(x + w - r, y + h - r, t / r) },
      { length: horizontal, point: t => [x + w - r - t, y + h, 0, 1] },
      { length: arc, point: t => corner(x + r, y + h - r, Math.PI / 2 + t / r) },
      { length: vertical, point: t => [x, y + h - r - t, -1, 0] },
      { length: arc, point: t => corner(x + r, y + r, Math.PI + t / r) }
    ].filter(segment => segment.length > 0);
    function corner(cx, cy, angle) {
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, Math.cos(angle), Math.sin(angle)];
    }
    const length = segments.reduce((sum, segment) => sum + segment.length, 0);
    return {
      length,
      path: `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
      at(distance) {
        let remaining = distance % length;
        for (const segment of segments) {
          if (remaining < segment.length) return segment.point(remaining);
          remaining -= segment.length;
        }
        return segments[0].point(0);
      }
    };
  }

  window.createFrameLights = ({ shell, layout = shell, formCard = layout,
    compactLayout = window.matchMedia('(max-width: 850px)'), popup = false, variant = 'frame' }) => {
    const header = variant === 'mobile-header';
    const settings = window.OKLOGIN_SETTINGS.lights;
    if (popup) shell.classList.add('popup-decorated');
    if (!(popup ? settings.popups : settings.frame)) return () => {};
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefix = `holiday-lights-${++instance}`;
    const svg = window.svgAssets.clone('frame-light-template.svg');
    svg.setAttribute('class', `frame-lights${popup ? ' popup-lights' : ''}${header ? ' mobile-header-lights' : ''}`);
    const definitions = svg.querySelector('defs');
    for (const paint of definitions.querySelectorAll('[id]')) {
      const id = paint.getAttribute('id');
      paint.setAttribute('id', `${prefix}-${id}`);
      for (const shape of definitions.querySelectorAll(`[fill="url(#${id})"]`)) shape.setAttribute('fill', `url(#${prefix}-${id})`);
    }
    const bulbTemplates = [...definitions.querySelectorAll('[data-light-bulb]')];
    const shineTemplates = [...definitions.querySelectorAll('[data-light-shine]')];
    const phaseTemplate = definitions.querySelector('[data-light-phase]');
    const wire = svg.querySelector('[data-light-wire]');
    const bulbs = svg.querySelector('[data-light-bulbs]');
    const glow = svg.querySelector('.frame-lights-glow');
    shell.append(svg);
    let level = 0, frame = 0, previousGeometry = '';

    function playback() {
      svg.dataset.twinkling = String(settings.twinkle && level > .02 && (!header || compactLayout.matches) && (!popup || shell.open) && (!window.popupMotion.active || popup) && !document.hidden && !motion.matches);
    }

    function setNight(night) {
      level = Math.max(0, Math.min(1, night));
      glow.style.opacity = String(level);
      playback();
    }

    function redraw() {
      if (header && !compactLayout.matches) {
        svg.style.display = 'none';
        previousGeometry = '';
        playback();
        return;
      }
      if (header) svg.style.removeProperty('display');
      const compact = popup || header || compactLayout.matches;
      const target = compact ? formCard : layout;
      const parent = shell.getBoundingClientRect(), bounds = target.getBoundingClientRect();
      if (!parent.width || !bounds.width || !bounds.height) return;
      // Convert screen coordinates back to local CSS pixels, including the shell's zoom.
      const scale = shell.clientWidth / parent.width;
      const width = popup ? shell.clientWidth : bounds.width * scale;
      const height = popup ? shell.clientHeight : bounds.height * scale;
      const left = popup ? 0 : (bounds.left - parent.left) * scale;
      const top = popup ? 0 : (bounds.top - parent.top) * scale;
      const radius = parseFloat(window.getComputedStyle(target).borderTopLeftRadius) || 0;
      const key = [width, height, left, top, radius, compact].join('/');
      if (key === previousGeometry) return;
      previousGeometry = key;
      Object.assign(svg.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const route = header ? {
        length: width,
        path: `M0 ${height - 1}H${width}`,
        at: distance => [distance, height - 1, 0, 1]
      } : perimeter(width, height, popup ? 1 : compact ? -1 : 1, radius);
      const count = header ? Math.max(6, Math.round(width / 36))
        : Math.max(12, Math.round(route.length / (compact ? 42 : 46)));
      const size = compact ? .72 : 1;
      wire.setAttribute('d', route.path);
      bulbs.replaceChildren();
      const phases = Array.from({ length: 3 }, (_, phase) => {
        const group = phaseTemplate.cloneNode(true);
        group.removeAttribute('data-light-phase');
        group.style.animationDelay = `-${phase * .6}s`;
        return group;
      });
      glow.replaceChildren(...phases);
      for (let index = 0; index < count; index++) {
        const [x, y, nx, ny] = route.at((index + .5) * route.length / count);
        const angle = Math.atan2(ny, nx) * 180 / Math.PI - 90;
        const transform = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${size})`;
        const bulb = bulbTemplates[index % bulbTemplates.length].cloneNode(true);
        bulb.removeAttribute('data-light-bulb');
        bulb.setAttribute('transform', transform);
        bulbs.append(bulb);
        const shine = shineTemplates[index % shineTemplates.length].cloneNode(true);
        shine.removeAttribute('data-light-shine');
        shine.setAttribute('transform', transform);
        phases[index % phases.length].append(shine);
      }
      playback();
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; redraw(); });
    }
    const observer = new ResizeObserver(schedule);
    [shell, layout, formCard].forEach(target => observer.observe(target));
    compactLayout.addEventListener('change', schedule);
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', playback);
    window.popupMotion.subscribe(playback);
    motion.addEventListener('change', playback);
    if (popup) {
      const visibility = new MutationObserver(() => {
        if (shell.open) redraw();
        playback();
      });
      visibility.observe(shell, { attributes: true, attributeFilter: ['open'] });
    }
    redraw();
    setNight(popup ? 1 : 0);
    return setNight;
  };
})();
