const updateSillKittenNight = window.createSillKitten(document.getElementById('sill-kitten'));
const updateWindowVisitorsNight = window.createWindowVisitors(document.getElementById('window-visitors'));
let updateSnowfallNight = () => {};
let updateCourtyardChildrenNight = () => {};
let updateCourtyardChildrenCamera = () => {};
(() => {
  const canvas = document.getElementById('winter-snowfall');
  const settings = window.OKLOGIN_SETTINGS.snow;
  if (!settings.enabled || (!settings.dayDensity && !settings.nightDensity)) {
    canvas.style.display = 'none'; return;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let flakes = [], width = 0, height = 0, frame = 0, previous = 0;
  let dayCount = 0, nightCount = 0, nightLevel = 0;
  const visibleSnowCount = () => dayCount + (nightCount - dayCount) * nightLevel;
  function resizeSnow() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / Math.max(1, width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const baseCount = Math.min(220, Math.max(80, Math.round(width * height / 8000)));
    dayCount = Math.round(baseCount * settings.dayDensity);
    nightCount = Math.round(baseCount * settings.nightDensity);
    const count = Math.max(dayCount, nightCount);
    flakes = Array.from({ length: count }, () => {
      const depth = Math.random();
      return { x: Math.random() * width, y: Math.random() * height,
        radius: .65 + depth * 2.1, speed: 10 + depth * 26,
        opacity: .23 + depth * .5, phase: Math.random() * Math.PI * 2,
        sway: 3 + Math.random() * 8, drift: -1 + Math.random() * 4 };
    });
    paintSnow(0, 0);
  }
  function paintSnow(delta, time) {
    context.clearRect(0, 0, width, height);
    const fallSpeed = settings.daySpeed + (settings.nightSpeed - settings.daySpeed) * nightLevel;
    const size = 1 + nightLevel * .45;
    for (let index = 0; index < flakes.length; index++) {
      const flake = flakes[index];
      flake.y += flake.speed * fallSpeed * delta;
      flake.x += flake.drift * (1 + nightLevel * .4) * delta;
      if (flake.y > height + 6) { flake.y = -6; flake.x = Math.random() * width; }
      if (flake.x > width + 12) flake.x = -12;
      if (flake.x < -12) flake.x = width + 12;
      const visibility = Math.min(1, Math.max(0, visibleSnowCount() - index));
      if (!visibility) continue;
      const x = flake.x + Math.sin(time * .00035 + flake.phase) * flake.sway * (1 - nightLevel * .2);
      const opacity = Math.min(.9, flake.opacity * (1 + nightLevel * .16)) * visibility;
      context.beginPath();
      context.fillStyle = `rgba(249,253,255,${opacity})`;
      context.ellipse(x, flake.y, flake.radius * size, flake.radius * size * (.9 + nightLevel * .15), 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  function tickSnow(time) {
    const delta = previous ? Math.min((time - previous) / 1000, .05) : 0;
    previous = time;
    paintSnow(delta, time);
    frame = requestAnimationFrame(tickSnow);
  }
  function updateSnowMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (visibleSnowCount() > 0 && !document.hidden && !window.popupMotion.active && !motion.matches) frame = requestAnimationFrame(tickSnow);
    else if (!window.popupMotion.active) paintSnow(0, 0);
  }
  updateSnowfallNight = level => {
    nightLevel = Math.min(1, Math.max(0, level));
    if (visibleSnowCount() <= 0 || !frame) updateSnowMotion();
    else if (motion.matches || document.hidden) paintSnow(0, 0);
  };
  window.addEventListener('resize', resizeSnow, { passive: true });
  document.addEventListener('visibilitychange', updateSnowMotion);
  window.popupMotion.subscribe(updateSnowMotion);
  motion.addEventListener('change', updateSnowMotion);
  resizeSnow();
  updateSnowMotion();
})();

(() => {
  const canvas = document.getElementById('courtyard-children');
  if (!window.OKLOGIN_SETTINGS.effects.courtyardChildren) {
    canvas.style.display = 'none'; return;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FRAME_W = 384, FRAME_H = 512;
  const children = [
    { role: 'runner', source: 'children-run-red-v3.png',
      height: 96, baseline: 480,
      anchors: [[175.837,473],[179.879,483],[183.043,483],[180.648,471],[180.531,475],[182.213,482],[179.708,483],[179.199,475]] },
    { role: 'thrower', source: 'children-play-green-v2.png', x: 672, y: 811,
      height: 102, baseline: 500, facing: -1,
      anchors: [[203.056,499],[191.82,499],[200.794,499],[200.772,499],[190.511,500],[192.936,500],[192.181,500],[206.916,500]] },
    { role: 'builder', source: 'children-play-blue-v2.png', x: 585, y: 853,
      height: 93, baseline: 480, facing: 1,
      anchors: [[201.115,480],[172.123,480],[180.372,479],[157.002,479],[191.475,479],[179.48,480],[186.892,480],[193.445,480]] }
  ];
  let ready = false, camera = null, frame = 0, previous = 0;
  let width = 0, height = 0, time = 0, night = 0;
  const ease = value => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };

  function runnerAt(seconds) {
    const clock = (seconds + .9) % 9;
    const progress = Math.min(1, clock / 7.2);
    return { visible: clock < 7.2, x: 120 + progress * 820,
      y: 789 + Math.sin(progress * Math.PI) * 7, gait: clock * 10.5 % 8 };
  }
  function stateAt(child) {
    if (child.role === 'runner') {
      const run = runnerAt(time), pose = Math.floor(run.gait);
      return { child, ...run, facing: 1,
        bob: -(Math.sin(run.gait * Math.PI / 4) ** 2) * 1.5,
        sample: { a: pose, b: (pose + 1) % 8, mix: run.gait - pose } };
    }
    return { child, visible: true, x: child.x, y: child.y, facing: child.facing, bob: 0 };
  }
  function makeSurface() {
    const surface = document.createElement('canvas');
    surface.width = 192; surface.height = 256;
    return surface;
  }
  function outline(target, points) {
    target.beginPath();
    points.forEach(([x, y], index) => index ? target.lineTo(x, y) : target.moveTo(x, y));
    target.closePath();
  }
  function isolate(source, points) {
    const surface = makeSurface(), target = surface.getContext('2d');
    outline(target, points); target.clip(); target.drawImage(source, 0, 0);
    return surface;
  }
  function poseSurface(child, pose) {
    const surface = makeSurface(), target = surface.getContext('2d');
    const sw = child.image.naturalWidth / 4, sh = child.image.naturalHeight / 2;
    const anchor = child.anchors[pose];
    target.drawImage(child.image, pose % 4 * sw, Math.floor(pose / 4) * sh, sw, sh,
      96 - anchor.x / 2, (child.baseline - anchor.y) / 2, 192, 256);
    return surface;
  }
  function prepareRig(child) {
    const throwing = child.role === 'thrower';
    const source = poseSurface(child, throwing ? 5 : 2);
    const upper = throwing
      ? [[72,83],[96,82],[116,87],[120,105],[109,119],[83,115],[73,105]]
      : [[79,141],[124,146],[142,180],[123,198],[105,197],[90,179],[78,160]];
    const lower = throwing
      ? [[101,82],[126,79],[148,73],[170,80],[171,112],[139,119],[105,119],[99,105]]
      : [[103,169],[138,170],[160,205],[164,243],[143,246],[124,236],[109,210],[99,190]];
    const body = makeSurface(), target = body.getContext('2d');
    target.save();
    outline(target, throwing
      ? [[43,4],[140,4],[143,69],[120,81],[121,124],[139,142],[136,159],
          [124,164],[125,216],[140,252],[61,254],[61,218],[54,150],[48,104],[35,91]]
      : [[90,66],[136,66],[159,108],[151,144],[126,166],[115,207],[131,234],
          [127,243],[48,243],[31,196],[42,145],[37,122],[87,115]]);
    target.clip();
    target.drawImage(source, 0, 0);
    target.restore();
    target.globalCompositeOperation = 'destination-out';
    for (const polygon of [upper, lower]) { outline(target, polygon); target.fill(); }
    target.globalCompositeOperation = 'destination-over';
    target.save();
    outline(target, throwing
      ? [[61,78],[113,76],[122,149],[62,150]]
      : [[46,145],[90,146],[118,183],[105,205],[43,202]]);
    target.clip();
    if (throwing) target.drawImage(poseSurface(child, 0), 0, 0);
    else target.drawImage(source, 54, 151, 35, 44, 72, 151, 43, 51);
    target.restore(); target.globalCompositeOperation = 'source-over';
    child.rig = { body, upper: isolate(source, upper), lower: isolate(source, lower), output: makeSurface() };
  }
  function prepareFrames(child) {
    child.anchors = child.anchors.map(([x, y]) => ({ x, y }));
    if (child.role !== 'runner') { prepareRig(child); return; }
    child.buffer = document.createElement('canvas');
    child.buffer.width = FRAME_W; child.buffer.height = FRAME_H;
    child.bufferContext = child.buffer.getContext('2d');
  }
  function blendFrames(child, sample) {
    const mix = sample.a === sample.b ? 0 : Math.min(1, Math.max(0, sample.mix));
    const key = `${sample.a}:${sample.b}:${Math.round(mix * 120)}`;
    if (key === child.lastMix) return child.buffer;
    child.lastMix = key;
    const target = child.bufferContext, sw = child.image.naturalWidth / 4, sh = child.image.naturalHeight / 2;
    target.clearRect(0, 0, FRAME_W, FRAME_H);
    function draw(pose, opacity, operation) {
      if (opacity < .001) return;
      const anchor = child.anchors[pose];
      target.globalAlpha = opacity;
      target.globalCompositeOperation = operation;
      target.drawImage(child.image, pose % 4 * sw, Math.floor(pose / 4) * sh,
        sw, sh, FRAME_W / 2 - anchor.x, child.baseline - anchor.y, FRAME_W, FRAME_H);
    }
    // Add premultiplied pixels so the body stays opaque while the limbs interpolate.
    draw(sample.a, 1 - mix, 'source-over');
    draw(sample.b, mix, 'lighter');
    target.globalAlpha = 1;
    target.globalCompositeOperation = 'source-over';
    return child.buffer;
  }
  function curve(clock, points) {
    let index = 0;
    while (index + 1 < points.length - 1 && points[index + 1][0] <= clock) index++;
    const a = points[index], b = points[index + 1];
    return a[1] + (b[1] - a[1]) * ease((clock - a[0]) / (b[0] - a[0]));
  }
  function rigState(child, seconds = time) {
    if (child.role === 'thrower') {
      const clock = (seconds + 1.4) % 6;
      return {
        shoulder: [80, 99], elbow: [109, 100],
        angle: curve(clock, [[0,1.04],[.8,1.04],[1.5,.35],[2.35,-.52],[2.68,-.58],
          [2.94,.03],[3.28,.18],[4.4,1.04],[6,1.04]]),
        flex: curve(clock, [[0,.08],[1.4,-.35],[2.4,-.65],[2.68,-.7],[2.94,.04],
          [3.4,.12],[4.4,.08],[6,.08]]),
        lean: curve(clock, [[0,0],[1.5,-1],[2.65,-3],[3.08,5],[3.6,2],[4.6,0],[6,0]]),
        lift: Math.sin(seconds * 1.8) * .55
      };
    }
    const clock = (seconds + .8) % 9;
    return {
      shoulder: [89,154], elbow: [111,184],
      angle: curve(clock, [[0,-.13],[.9,.08],[1.3,.18],[1.75,-.08],[2.15,.18],
        [2.65,-.09],[3,.1],[3.65,-.3],[4.3,-.1],[5.4,-.17],[6.5,.1],[7.2,.16],[8.3,-.13],[9,-.13]]),
      flex: curve(clock, [[0,-.26],[1.15,.06],[1.55,-.22],[2,.08],[2.4,-.22],
        [2.9,.06],[3.7,-.3],[4.4,-.42],[5.4,-.3],[6.8,.08],[7.3,-.22],[8.3,-.26],[9,-.26]]),
      lean: curve(clock, [[0,-3],[1.2,2],[2,4],[2.8,2],[3.65,9],[4.5,2],[5.4,-4],
        [6.7,2],[7.4,4],[8.4,-3],[9,-3]]),
      lift: curve(clock, [[0,-4],[1.3,1],[2.3,0],[3.6,3],[4.5,-4],[5.4,-10],
        [6.7,0],[7.4,1],[8.4,-4],[9,-4]])
    };
  }
  function upperWeight(child, y) {
    return 1 - ease((y - 100) / ((child.role === 'thrower' ? 165 : 212) - 100));
  }
  function throwingHand(child, pose) {
    const [sx, sy] = pose.shoulder, [ex, ey] = pose.elbow;
    const rotate = (x, y, angle) => [x * Math.cos(angle) - y * Math.sin(angle),
      x * Math.sin(angle) + y * Math.cos(angle)];
    const wrist = rotate(146 - ex, 94 - ey, pose.flex);
    const arm = rotate(ex - sx + wrist[0], ey - sy + wrist[1], pose.angle);
    return { x: sx + pose.lean * upperWeight(child, sy) + arm[0],
      y: sy + pose.lift * upperWeight(child, sy) + arm[1] };
  }
  function drawRig(child) {
    const rig = child.rig, pose = rigState(child), target = rig.output.getContext('2d');
    const upperOffset = y => upperWeight(child, y);
    target.clearRect(0, 0, 192, 256);
    for (let y = 0; y < 256; y += 2) {
      const weight = upperOffset(y);
      target.drawImage(rig.body, 0, y, 192, 2,
        pose.lean * weight, y + pose.lift * weight, 192, 2.5);
    }
    const [sx, sy] = pose.shoulder, [ex, ey] = pose.elbow;
    target.save();
    target.translate(sx + pose.lean * upperOffset(sy), sy + pose.lift * upperOffset(sy));
    target.rotate(pose.angle);
    target.drawImage(rig.upper, -sx, -sy);
    target.translate(ex - sx, ey - sy); target.rotate(pose.flex);
    target.drawImage(rig.lower, -ex, -ey);
    target.restore();
    const clock = (time + 1.4) % 6;
    if (child.role === 'thrower' && clock > .8 && clock < 2.88) {
      const hand = throwingHand(child, pose);
      const radius = 7.5 * ease((clock - .8) / .45);
      target.beginPath(); target.fillStyle = '#f6fbff';
      target.ellipse(hand.x, hand.y - 5, radius, radius, 0, 0, Math.PI * 2); target.fill();
    }
    return rig.output;
  }
  function drawActor(actor) {
    const child = actor.child, rigged = child.role !== 'runner';
    const sprite = rigged ? drawRig(child) : blendFrames(child, actor.sample);
    const scale = child.height / (rigged ? 230 : 460);
    context.save();
    context.translate(actor.x, actor.y + actor.bob);
    context.scale(actor.facing, 1);
    context.filter = `brightness(${1 - night * .25}) saturate(${1 - night * .1})`;
    context.drawImage(sprite, -sprite.width * scale / 2, -child.baseline * (rigged ? .5 : 1) * scale,
      sprite.width * scale, sprite.height * scale);
    context.restore();
  }
  function drawThrownSnow() {
    const clock = (time + 1.4) % 6, age = clock - 2.88;
    if (age < 0 || age > 1.42) return;
    const child = children.find(child => child.role === 'thrower' && child.loaded);
    if (!child) return;
    const hand = throwingHand(child, rigState(child, time - age)), size = child.height / 230;
    const originX = child.x + (hand.x - 96) * size * child.facing;
    const originY = child.y + (hand.y - 5 - child.baseline / 2) * size;
    const target = runnerAt(time - age + .92);
    const landingX = target.visible ? Math.max(265, Math.min(555, target.x - 42)) : 380;
    const landingY = target.visible ? target.y + 2 : 800;
    if (age <= .92) {
      const progress = age / .92;
      const x = originX + (landingX - originX) * progress;
      const y = originY + (landingY - originY) * progress - Math.sin(progress * Math.PI) * 72;
      context.beginPath(); context.fillStyle = '#f7fbff';
      context.ellipse(x, y, 3.4, 3.4, 0, 0, Math.PI * 2); context.fill();
    } else {
      const spread = (age - .92) / .5;
      context.fillStyle = `rgba(245,251,255,${(1 - spread) * .8})`;
      for (let i = 0; i < 6; i++) {
        const direction = i * Math.PI / 3;
        context.beginPath();
        context.ellipse(landingX + Math.cos(direction) * spread * 17,
          landingY - Math.sin(direction) * spread * 8 - Math.sin(spread * Math.PI) * 7,
          2.6 - spread, 1.8 - spread, 0, 0, Math.PI * 2); context.fill();
      }
    }
  }
  function drawRollingSnow() {
    const child = children.find(child => child.role === 'builder' && child.loaded);
    const clock = (time + .8) % 9;
    if (!child || clock < 3.1 || clock > 7.25) return;
    const progress = (clock - 3.1) / 4.15;
    const travel = 360 * (1 - (1 - progress) ** 1.55);
    const radius = 7.5 + progress * 4;
    const x = child.x + 26 + travel, ground = child.y + 1;
    context.beginPath(); context.fillStyle = '#435f7838';
    context.ellipse(x, ground + 1, radius * .95, radius * .24, 0, 0, Math.PI * 2); context.fill();
    context.save();
    context.translate(x, ground - radius);
    const light = context.createRadialGradient(-radius * .35, -radius * .45, radius * .08, 0, 0, radius);
    light.addColorStop(0, night > .5 ? '#e9f4fc' : '#ffffff');
    light.addColorStop(.55, night > .5 ? '#c7dceb' : '#edf6fc');
    light.addColorStop(1, night > .5 ? '#92b2c9' : '#b8d1e1');
    context.beginPath(); context.fillStyle = light;
    context.ellipse(0, 0, radius, radius, 0, 0, Math.PI * 2); context.fill();
    context.rotate(travel / radius);
    context.fillStyle = '#86a7bd55';
    for (const [px, py, size] of [[-.38,-.2,.13],[.26,.32,.16],[.32,-.4,.1]]) {
      context.beginPath();
      context.ellipse(px * radius, py * radius, size * radius, size * radius * .7, .3, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  function paint() {
    if (!ready || !camera || !width || !height) return;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(camera.left - camera.pan * camera.scale, camera.top);
    context.scale(camera.scale, camera.scale);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const actors = children.filter(child => child.loaded).map(stateAt).filter(actor => actor.visible).sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      context.beginPath(); context.fillStyle = `rgba(42,61,85,${.17 + night * .07})`;
      context.ellipse(actor.x, actor.y + 1, actor.child.height * .16,
        actor.child.height * .035, 0, 0, Math.PI * 2); context.fill();
      drawActor(actor);
    }
    drawRollingSnow();
    drawThrownSnow();
    context.restore();
  }
  function tick(timestamp) {
    frame = 0;
    if (previous) time += Math.min((timestamp - previous) / 1000, .1);
    previous = timestamp;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function updatePlayback() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    paint();
    if (ready && !document.hidden && !window.popupMotion.active && !motion.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / Math.max(1, width * height)));
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    paint();
  }
  updateCourtyardChildrenNight = level => { night = level; if (!frame) paint(); };
  updateCourtyardChildrenCamera = projection => { camera = projection; if (!frame) paint(); };
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', updatePlayback);
  window.popupMotion.subscribe(updatePlayback);
  motion.addEventListener('change', updatePlayback);
  resize();
  Promise.allSettled(children.map(async child => {
    child.image = new Image(); child.image.src = `image/${child.source}?v=fit-150-1`;
    await child.image.decode(); prepareFrames(child); child.loaded = true;
  })).then(results => {
    ready = children.some(child => child.loaded);
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) console.warn('Some courtyard sprites could not load.', failures.map(result => result.reason));
    updatePlayback();
  });
})();

const forms = ['login-form', 'register-form'].map(id => document.getElementById(id));
const registerPassword = document.getElementById('register-password');
const registerConfirm = document.getElementById('register-confirm');
const layout = document.getElementById('auth-layout');
const formCard = document.getElementById('auth-card');
const banner = document.getElementById('auth-banner');
const holidayLogo = banner.querySelector('.holiday-logo');
const bannerCopy = document.getElementById('banner-copy');
const modeButton = document.getElementById('mode-switch');
const mobileModeButtons = [...document.querySelectorAll('[data-mobile-mode]')];
layout.insertBefore(banner, formCard);
const compactLayout = window.matchMedia('(max-width: 850px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const headerBrand = banner.querySelector('.hotel-brand');
const menuToggle = layout.querySelector('.frame-menu-toggle');
function syncMenuPlacement() {
  const parent = compactLayout.matches ? headerBrand : layout;
  if (menuToggle.parentElement === parent) return;
  if (compactLayout.matches) headerBrand.append(menuToggle);
  else layout.insertBefore(menuToggle, layout.firstChild);
}
syncMenuPlacement();
const updateFrameLightsNight = window.createFrameLights({
  shell: document.querySelector('.auth-shell'), layout, formCard, compactLayout
});
const updateHeaderLightsNight = window.createFrameLights({ shell: headerBrand, compactLayout, variant: 'mobile-header' });
const slideDuration = window.OKLOGIN_SETTINGS.ui.slideDurationMs;
layout.style.setProperty('--auth-slide-duration', `${slideDuration}ms`);
let currentMode = 'login';
let activeTransition = null;
let scenePosition = 0;
let nightLightLevel = 0;
let requestLightGlints = () => {};

const rightWing = document.querySelector('.wave-right');
const leftWing = document.querySelector('.wave-left');
const wavePaths = [rightWing.querySelector('path'), leftWing.querySelector('path')];

const worldScene = document.getElementById('winter-world');
// Separate SVG roots let the browser composite the day/night fade without
// repainting both high-resolution paintings for every opacity change.
const nightScene = document.getElementById('winter-world-night');
const worldLayers = [worldScene, nightScene];
const foregroundPatterns = [...document.querySelectorAll('.garden-foreground-pattern')];
const gardenSources = ['christmas-festive-garden-day-v1-2x.jpg', 'christmas-festive-garden-night-v1-2x.jpg'];
Promise.allSettled(gardenSources.map(source => {
  const artwork = new Image();
  artwork.src = `image/${source}`;
  return artwork.decode();
}));

const worldCamera = { scale: 1, left: 0, top: 0 };
const sunsetWash = document.querySelector('.winter-sunset-wash');
const nightPainting = nightScene;
const mobileGardenTravel = 650;
const gardenPan = () => (compactLayout.matches ? mobileGardenTravel : -45) * scenePosition;
function projectGardenPan() {
  const transform = `translate3d(${-gardenPan() * worldCamera.scale}px,0,0)`;
  worldLayers.forEach(layer => { if (layer.style.transform !== transform) layer.style.transform = transform; });
}
const smoothPhase = value => { const x = Math.min(1, Math.max(0, value)); return x * x * (3 - 2 * x); };
// Match the padding transition's cubic-bezier(.76, 0, .24, 1).
function slideProgress(elapsed) {
  if (elapsed <= 0 || elapsed >= 1) return Math.min(1, Math.max(0, elapsed));
  let low = 0, high = 1;
  for (let i = 0; i < 16; i++) {
    const t = (low + high) / 2;
    const x = 3 * (1 - t) * (1 - t) * t * .76 + 3 * (1 - t) * t * t * .24 + t * t * t;
    if (x < elapsed) low = t; else high = t;
  }
  return smoothPhase((low + high) / 2);
}

const restingEdgePath = wavePaths[0].getAttribute('d');
const cubic = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
const fluidRows = Array.from({ length: 41 }, (_, i) => {
  const y = i * 20, upper = y <= 466;
  const ys = upper ? [0, 160, 302, 466] : [466, 615, 735, 800];
  const xs = upper ? [0, 0, 72, 72] : [72, 72, 18, 18];
  let low = 0, high = 1;
  for (let j = 0; j < 20; j++) {
    const t = (low + high) / 2;
    if (cubic(...ys, t) < y) low = t; else high = t;
  }
  const x = cubic(...xs, (low + high) / 2);
  const u = y / 800;
  const weight = .14 + .96 * Math.sin(Math.PI * u) ** 1.1;
  const release = .32 + .22 * u + .025 * Math.sin(2 * Math.PI * u);
  const releaseTravel = slideProgress(release);
  const releaseSpeed = (slideProgress(release + .0005) - slideProgress(release - .0005)) / .001;
  return { x, y, u, weight, release, releaseTravel, releaseSpeed };
});
function edgePath(points) {
  const pair = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const slope = i => {
    if (i === 0) return (points[1][0] - points[0][0]) / 20;
    if (i === points.length - 1) return (points[i][0] - points[i - 1][0]) / 20;
    return (points[i + 1][0] - points[i - 1][0]) / 40;
  };
  let path = `M0 0L${pair(...points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x, y] = points[i], [nextX, nextY] = points[i + 1];
    const third = (nextY - y) / 3;
    path += `C${pair(x + slope(i) * third, y + third)} ${pair(nextX - slope(i + 1) * third, nextY - third)} ${pair(nextX, nextY)}`;
  }
  return `${path}H0V0Z`;
}
function slimeEdges(position, { elapsed, registering }) {
  const travel = registering ? position : 1 - position;
  const width = activeTransition?.geometry?.bannerUnits || banner.clientWidth;
  const movement = Math.sin(Math.PI * elapsed) ** 2;
  const settle = 1 - smoothPhase((elapsed - .86) / .14);
  const trailing = fluidRows.map(row => {
    let displacement;
    if (elapsed <= row.release) {
      displacement = row.weight * Math.max(0, travel * width + 10 - row.x);
    } else {
      const seconds = (elapsed - row.release) * slideDuration / 1000;
      const amplitude = row.weight * Math.max(0, row.releaseTravel * width + 10 - row.x);
      const speed = 320 * Math.tanh(row.weight * row.releaseSpeed * width / (slideDuration / 1000) * .35 / 320);
      const damping = 7.8, frequency = 17 - 2 * row.u;
      displacement = Math.exp(-damping * seconds) * (amplitude * Math.cos(frequency * seconds) + (speed + damping * amplitude) / frequency * Math.sin(frequency * seconds));
    }
    const wave = 12 * movement * Math.sin(2.2 * Math.PI * row.u - 3 * Math.PI * elapsed);
    return [Math.max(0, row.x + (displacement + wave) * settle), row.y];
  });
  const leading = fluidRows.map(row => {
    const wave = (32 + 22 * Math.sin(2 * Math.PI * row.u - 2.2 * Math.PI * elapsed)) * row.weight * movement * settle;
    return [row.x + wave, row.y];
  });
  return registering ? [leading, trailing] : [trailing, leading];
}

function renderDayNight(position) {
  const night = smoothPhase((position - .08) / .92);
  // Keep the night layer rasterized before its first reveal. This opacity is
  // below one display-channel level and avoids a cold paint mid-slide.
  nightPainting.style.opacity = String(Math.max(.001, night));
  projectGardenPan();
  sunsetWash.style.opacity = String(Math.sin(position * Math.PI) * .25);
  document.documentElement.style.setProperty('--winter-night-blend', `${night * 100}%`);
  updateSnowfallNight(night);
  updateCourtyardChildrenNight(night);
  updateSillKittenNight(night);
  updateWindowVisitorsNight(night);
  nightLightLevel = smoothPhase((position - .32) / .68);
  updateFrameLightsNight(nightLightLevel);
  updateHeaderLightsNight(nightLightLevel);
  requestLightGlints();
}

function renderDivider(position, effect = null) {
  scenePosition = position;
  if (!compactLayout.matches) {
    formCard.style.transform = `translateX(${-100 * position}%)`;
    banner.style.transform = `translateX(${100 * position}%)`;
  } else {
    formCard.style.removeProperty('transform');
    banner.style.removeProperty('transform');
  }
  renderDayNight(position);
  if (effect && !compactLayout.matches && !reducedMotion.matches) {
    slimeEdges(position, effect).forEach((points, i) => wavePaths[i].setAttribute('d', edgePath(points)));
    rightWing.style.opacity = leftWing.style.opacity = '1';
  } else {
    wavePaths.forEach(path => path.setAttribute('d', restingEdgePath));
    rightWing.style.opacity = position < .5 ? '1' : '0';
    leftWing.style.opacity = position >= .5 ? '1' : '0';
  }
  syncWindowMask();
}
const windowFrame = document.querySelector('.winter-window');
const slidingSurface = document.querySelector('.sliding-surface');
const formTexture = document.getElementById('form-noel-texture');
const formSurface = document.getElementById('form-noel-surface');
const movingWindowHole = document.getElementById('moving-window-hole');
const pageWinterScene = document.querySelector('.page-winter-scene');
function sceneAttribute(node, name, value) {
  const text = String(value);
  if (node.getAttribute(name) !== text) node.setAttribute(name, text);
}
function syncWindowMask() {
  const desktopSlide = activeTransition && !compactLayout.matches;
  let geometry = desktopSlide && activeTransition.geometry;
  if (!geometry) {
    const bounds = layout.getBoundingClientRect();
    geometry = {
      position: scenePosition, bounds,
      frame: windowFrame.getBoundingClientRect(),
      form: formCard.getBoundingClientRect(),
      bannerWidth: banner.getBoundingClientRect().width,
      bannerUnits: banner.clientWidth,
      layoutWidth: layout.clientWidth, layoutHeight: layout.clientHeight,
      scale: layout.clientWidth / bounds.width
    };
    if (desktopSlide) activeTransition.geometry = geometry;
  }
  // Panel dimensions stay fixed during desktop slides. Project their transforms
  // from one measurement instead of forcing layout after every style write.
  const travel = desktopSlide ? scenePosition - geometry.position : 0;
  const frame = { left: geometry.frame.left + travel * geometry.bannerWidth,
    top: geometry.frame.top, width: geometry.frame.width, height: geometry.frame.height };
  const formBounds = { left: geometry.form.left - travel * geometry.form.width,
    top: geometry.form.top, width: geometry.form.width, height: geometry.form.height };
  const bounds = geometry.bounds;
  const logoTransform = compactLayout.matches ? '' : `translate3d(${-scenePosition * geometry.bannerUnits}px,0,0)`;
  if (holidayLogo.style.transform !== logoTransform) holidayLogo.style.transform = logoTransform;
  if (compactLayout.matches) {
    const right=frame.left+frame.width,bottom=frame.top+frame.height;
    const clip=`polygon(${frame.left}px ${frame.top}px,${right}px ${frame.top}px,${right}px ${bottom}px,${frame.left}px ${bottom}px)`;
    if(pageWinterScene.style.getPropertyValue('--mobile-scene-clip')!==clip) pageWinterScene.style.setProperty('--mobile-scene-clip',clip);
  } else {
    pageWinterScene.style.removeProperty('--mobile-scene-clip');
  }
  if (!activeTransition || compactLayout.matches) {
    const slideOffset = compactLayout.matches ? 0 : scenePosition * geometry.bannerWidth;
    const mobileFrameHeight = 360;
    const windowAnchorY = frame.top + frame.height * (compactLayout.matches ? (mobileFrameHeight-19) / (2*mobileFrameHeight) : .52);
    const frameScale = compactLayout.matches ? frame.height * (mobileFrameHeight-125) / mobileFrameHeight / 760 : frame.width / 950;
    // The painting begins at world y=-724; its focal point is y=576.
    // A two-pixel bleed prevents an exposed strip from fractional pixel rounding.
    const skyCoverageScale = (windowAnchorY + 2) / (576 + 724);
    worldCamera.scale = compactLayout.matches ? frameScale : Math.max(frameScale, skyCoverageScale);
    worldCamera.left = frame.left - slideOffset + frame.width * .5 - 522 * worldCamera.scale;
    worldCamera.top = windowAnchorY - 576 * worldCamera.scale;
    const k = worldCamera.scale;
    const margin = compactLayout.matches ? Math.ceil(mobileGardenTravel * k + 32) : 64;
    const view = { x: (-worldCamera.left - margin) / k, y: -worldCamera.top / k,
      width: (window.innerWidth + margin * 2) / k, height: window.innerHeight / k };
    worldLayers.forEach(layer => {
      layer.style.left = `${-margin}px`;
      layer.style.width = `calc(100% + ${margin * 2}px)`;
      sceneAttribute(layer, 'viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
      layer.classList.add('is-positioned');
    });
    const foregroundHeight = Math.max(234.375, view.y + view.height - 1441.625 + 80);
    foregroundPatterns.forEach(pattern => sceneAttribute(pattern, 'height', foregroundHeight));
  }
  projectGardenPan();
  updateCourtyardChildrenCamera({ left: worldCamera.left, top: worldCamera.top,
    scale: worldCamera.scale, pan: gardenPan() });
  const scale = geometry.scale;
  sceneAttribute(slidingSurface, 'viewBox', `0 0 ${geometry.layoutWidth} ${geometry.layoutHeight}`);
  sceneAttribute(formTexture, 'x', (formBounds.left - bounds.left) * scale);
  sceneAttribute(formTexture, 'y', (formBounds.top - bounds.top) * scale);
  sceneAttribute(formTexture, 'width', formBounds.width * scale * 2);
  sceneAttribute(formTexture, 'height', formBounds.height * scale);
  sceneAttribute(movingWindowHole, 'transform', `translate(${(frame.left - bounds.left) * scale} ${(frame.top - bounds.top) * scale}) scale(${frame.width * scale / 680} ${frame.height * scale / 600})`);
  sceneAttribute(formSurface, 'mask', 'url(#sliding-surface-mask)');
  sceneAttribute(formSurface, 'x', '0');
  sceneAttribute(formSurface, 'width', '100%');
  requestLightGlints();
}
const sceneObserver = new ResizeObserver(syncWindowMask);
sceneObserver.observe(layout);
sceneObserver.observe(document.querySelector('.winter-window'));
let sceneFrame = 0;
function scheduleSceneSync() {
  if (activeTransition) activeTransition.geometry = null;
  if (sceneFrame) return;
  sceneFrame = requestAnimationFrame(() => { sceneFrame = 0; syncWindowMask(); });
}
window.addEventListener('resize', scheduleSceneSync, { passive: true });
window.addEventListener('scroll', scheduleSceneSync, { passive: true });
window.visualViewport?.addEventListener('resize', scheduleSceneSync, { passive: true });
window.visualViewport?.addEventListener('scroll', scheduleSceneSync, { passive: true });
document.fonts.ready.then(scheduleSceneSync);
renderDivider(0);

function applyMode(mode) {
  if (activeTransition) activeTransition.geometry = null;
  layout.dataset.mode = mode;
  ['login', 'register'].forEach(name => {
    const panel = document.getElementById(`${name}-panel`);
    const active = name === mode;
    panel.hidden = !active;
    panel.inert = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
  const registering = mode === 'register';
  document.getElementById('account-switch-prompt').textContent = registering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?';
  document.getElementById('banner-title').innerHTML = registering
    ? 'Bắt đầu với<br><em>tài khoản mới.</em>'
    : 'Chào mừng<br><em>bạn trở lại.</em>';
  document.getElementById('banner-description').textContent = registering
    ? 'Đăng ký để tạo tài khoản và bắt đầu sử dụng.'
    : 'Đăng nhập bằng email và mật khẩu của bạn.';
  document.getElementById('mode-switch-label').textContent = registering ? 'Đăng nhập' : 'Đăng ký';
  modeButton.dataset.switch = registering ? 'login' : 'register';
  modeButton.setAttribute('aria-controls', registering ? 'login-panel' : 'register-panel');
  mobileModeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mobileMode === mode)));
  document.title = registering ? 'Đăng ký' : 'Đăng nhập';
}

function finishModeTransition(transition) {
  if (activeTransition !== transition) return;
  cancelAnimationFrame(transition.frame);
  applyMode(transition.mode);
  currentMode = transition.mode;
  renderDivider(currentMode === 'register' ? 1 : 0);
  activeTransition = null;
  transition.animations.forEach(animation => animation.cancel());
  if (transition.mobileForm) {
    const { panels, previousHeight } = transition.mobileForm;
    if (previousHeight) panels.style.height = previousHeight;
    else panels.style.removeProperty('height');
  }
  formCard.style.removeProperty('transform');
  banner.style.removeProperty('transform');
  delete layout.dataset.transitionPhase;
  syncWindowMask();
  formCard.inert = false;
  modeButton.disabled = false;
  mobileModeButtons.forEach(button => { button.disabled = false; });
  layout.setAttribute('aria-busy', 'false');
  document.getElementById('mode-status').textContent = currentMode === 'register' ? 'Đã mở form đăng ký.' : 'Đã mở form đăng nhập.';
  const focusTarget = compactLayout.matches
    ? mobileModeButtons.find(button => button.dataset.mobileMode === currentMode)
    : document.getElementById(currentMode === 'register' ? 'register-name' : 'login-email');
  focusTarget.focus({ preventScroll: true });
}

function animateMobileScene(transition) {
  const panels = formCard.querySelector('.auth-panels');
  const outgoing = document.getElementById(`${currentMode}-panel`);
  const incoming = document.getElementById(`${transition.mode}-panel`);
  const direction = transition.mode === 'register' ? 1 : -1;
  const fromHeight = outgoing.getBoundingClientRect().height;
  transition.mobileForm = { panels, previousHeight: panels.style.height };
  panels.style.height = `${fromHeight}px`;
  layout.dataset.transitionPhase = 'form-slide';
  const toHeight = incoming.getBoundingClientRect().height;
  const timing = { duration: slideDuration, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' };
  const slideOut = outgoing.animate([
    { transform:'translate3d(0,0,0)' },
    { transform:`translate3d(${-direction * 108}%,0,0)` }
  ], timing);
  const slideIn = incoming.animate([
    { transform:`translate3d(${direction * 108}%,0,0)` },
    { transform:'translate3d(0,0,0)' }
  ], timing);
  const resize = panels.animate([{ height:`${fromHeight}px` },{ height:`${toHeight}px` }], timing);
  transition.animations.push(slideOut, slideIn, resize);
  const timelineStart = document.timeline.currentTime;
  if (timelineStart !== null) transition.animations.forEach(animation => { animation.startTime = timelineStart; });
  applyMode(transition.mode);
  document.getElementById('mode-status').textContent = 'Đang chuyển biểu mẫu và cảnh.';
  const from = scenePosition, to = transition.mode === 'register' ? 1 : 0;
  function tick() {
    if (activeTransition !== transition) return;
    const elapsed = Math.min(1, Math.max(0, Number(slideOut.currentTime) / slideDuration));
    renderDivider(from+(to-from)*slideProgress(elapsed));
    if (elapsed < 1) transition.frame = requestAnimationFrame(tick);
    else transition.frame = 0;
  }
  transition.frame = requestAnimationFrame(tick);
  Promise.all(transition.animations.map(animation => animation.finished)).then(
    () => finishModeTransition(transition),
    () => finishModeTransition(transition)
  );
}

function switchMode(mode) {
  if (activeTransition || mode === currentMode || !['login', 'register'].includes(mode)) return;
  const transition = { mode, animations: [], frame: 0, swapped: false };
  activeTransition = transition;
  renderDivider(scenePosition);
  formCard.inert = true;
  modeButton.disabled = true;
  mobileModeButtons.forEach(button => { button.disabled = true; });
  layout.setAttribute('aria-busy', 'true');
  if (reducedMotion.matches || typeof formCard.animate !== 'function') {
    finishModeTransition(transition);
    return;
  }
  if (compactLayout.matches) { animateMobileScene(transition); return; }
  layout.dataset.mode = mode;
  const registering = mode === 'register';
  const timing = { duration: slideDuration, easing: 'cubic-bezier(.76, 0, .24, 1)' };
  const fade = [
    { opacity: 1, offset: 0 }, { opacity: 0, offset: .44 },
    { opacity: 0, offset: .56 }, { opacity: 1, offset: 1 }
  ];
  const formFade = [
    { opacity: 1, offset: 0 }, { opacity: 0, offset: .15 },
    { opacity: 0, offset: .88 }, { opacity: 1, offset: 1 }
  ];
  [...formCard.children].filter(child => !child.classList.contains('mobile-mode-switch')).forEach(child => transition.animations.push(child.animate(formFade, timing)));
  [...bannerCopy.children].forEach(child => transition.animations.push(child.animate(fade, timing)));
  const timelineStart = document.timeline.currentTime;
  if (timelineStart !== null) transition.animations.forEach(animation => { animation.startTime = timelineStart; });
  const lead = transition.animations[0];
  function tick() {
    if (activeTransition !== transition) return;
    const elapsed = Math.min(1, Math.max(0, Number(lead.currentTime) / slideDuration));
    const travel = slideProgress(elapsed);
    renderDivider(registering ? travel : 1 - travel, { elapsed, registering });
    if (!transition.swapped && Number(lead.currentTime) >= slideDuration / 2) {
      applyMode(mode);
      transition.swapped = true;
    }
    transition.frame = requestAnimationFrame(tick);
  }
  transition.frame = requestAnimationFrame(tick);
  Promise.all(transition.animations.map(animation => animation.finished)).then(
    () => finishModeTransition(transition),
    () => finishModeTransition(transition)
  );
}

modeButton.addEventListener('click', () => switchMode(modeButton.dataset.switch));
mobileModeButtons.forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mobileMode)));
[compactLayout, reducedMotion].forEach(query => query.addEventListener('change', () => {
  syncMenuPlacement();
  if (activeTransition) finishModeTransition(activeTransition);
  renderDayNight(scenePosition);
  scheduleSceneSync();
}));

document.querySelectorAll('.password-toggle').forEach(button => {
  const field = document.getElementById(button.getAttribute('aria-controls'));
  const label = button.getAttribute('aria-label');
  button.addEventListener('click', () => {
    const visible = field.type === 'password';
    field.type = visible ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', visible ? label.replace('Hiện', 'Ẩn') : label);
  });
});

function validateField(field) {
  let error = '';
  if (!field.value.trim()) error = field.type === 'email' ? 'Vui lòng nhập email.' : field.name === 'name' ? 'Vui lòng nhập họ và tên.' : 'Vui lòng nhập mật khẩu.';
  else if (field.name === 'email' && field.validity.typeMismatch) error = 'Email chưa đúng định dạng.';
  else if (field.name === 'name' && field.value.trim().length < 2) error = 'Họ và tên cần ít nhất 2 ký tự.';
  else if (field.id === 'register-password' && field.value.length < 8) error = 'Mật khẩu cần ít nhất 8 ký tự.';
  else if (field.id === 'register-confirm' && field.value !== registerPassword.value) error = 'Mật khẩu nhập lại chưa khớp.';

  const message = document.getElementById(`${field.id}-error`);
  message.textContent = error;
  message.hidden = !error;
  field.setAttribute('aria-invalid', String(Boolean(error)));
  return !error;
}

forms.forEach(form => {
  const fields = [...form.querySelectorAll('input[required]')];
  fields.forEach(field => {
    field.addEventListener('blur', () => { if (field.value || field.getAttribute('aria-invalid') === 'true') validateField(field); });
    field.addEventListener('input', () => {
      if (field.hasAttribute('aria-invalid')) validateField(field);
      if (field === registerPassword && registerConfirm.hasAttribute('aria-invalid')) validateField(registerConfirm);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      fields.find(field => field.getAttribute('aria-invalid') === 'true').focus();
      return;
    }
    window.showAuthFeedback(form);
  });
});

registerPassword.addEventListener('input', () => {
  const value = registerPassword.value;
  const strength = document.getElementById('password-strength');
  strength.hidden = !value;
  let score = value.length >= 8 ? 1 : 0;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^a-zA-Z0-9]/.test(value)) score++;
  score = value.length < 8 ? 1 : Math.max(1, score);
  const levels = ['Yếu', 'Tạm ổn', 'Tốt', 'Mạnh'];
  const colors = ['#bf7b83', '#b49b60', '#7d9b83', '#426e5c'];
  strength.style.setProperty('--strength-color', colors[score - 1]);
  strength.querySelectorAll('i').forEach((bar, index) => bar.classList.toggle('filled', index < score));
  document.getElementById('strength-text').textContent = levels[score - 1];
});

const recoveryDialog = document.getElementById('recovery-dialog');
const recoveryEmail = document.getElementById('recovery-email');
const recoveryNotice = document.getElementById('recovery-notice');
function openRecoveryDialog() {
  recoveryEmail.value = document.getElementById('login-email').value;
  recoveryEmail.removeAttribute('aria-invalid');
  document.getElementById('recovery-email-error').hidden = true;
  recoveryNotice.hidden = true;
  window.popupMotion.show(recoveryDialog);
  recoveryEmail.focus();
}
document.getElementById('recovery-open').addEventListener('click', openRecoveryDialog);
document.getElementById('recovery-close').addEventListener('click', () => { window.popupMotion.hide(recoveryDialog); });
document.getElementById('recovery-back').addEventListener('click', () => { window.popupMotion.hide(recoveryDialog); });
document.getElementById('recovery-form').addEventListener('submit', event => {
  event.preventDefault();
  recoveryNotice.hidden = true;
  if (!validateField(recoveryEmail)) { recoveryEmail.focus(); return; }
  recoveryNotice.textContent = 'Hệ thống hiện chưa hỗ trợ khôi phục mật khẩu. Vui lòng liên hệ quản trị viên NEU Career AI; chưa có email nào được gửi.';
  recoveryNotice.hidden = false;
});
recoveryEmail.addEventListener('input', () => {
  recoveryNotice.hidden = true;
  if (recoveryEmail.hasAttribute('aria-invalid')) validateField(recoveryEmail);
});
recoveryDialog.addEventListener('click', event => {
  if (event.target !== recoveryDialog) return;
  const bounds = recoveryDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) window.popupMotion.hide(recoveryDialog);
});

window.createFrameMenu({
  layout,
  beforeOpen() { if (activeTransition) finishModeTransition(activeTransition); },
  getMode: () => currentMode,
  onNavigate(route) {
    const behavior = reducedMotion.matches ? 'auto' : 'smooth';
    if (route === 'recovery') { openRecoveryDialog(); return; }
    if (route === 'home') {
      window.parent.postMessage({ channel: 'neu-christmas-auth', type: 'navigate', route: 'home' }, location.origin);
      return;
    }
    if (route === 'login' || route === 'register') {
      switchMode(route);
      if (compactLayout.matches) formCard.scrollIntoView({ block: 'start', behavior });
      if (!activeTransition) {
        const target = compactLayout.matches
          ? mobileModeButtons.find(button => button.dataset.mobileMode === route)
          : document.getElementById(route === 'register' ? 'register-name' : 'login-email');
        target.focus({ preventScroll: true });
      }
    }
  }
});

document.querySelectorAll('dialog').forEach(dialog => {
  window.createFrameLights({ shell: dialog, popup: true });
});

requestLightGlints = window.createTreeLights(document.getElementById('winter-light-glints'), () => ({
  left: worldCamera.left, top: worldCamera.top, scale: worldCamera.scale,
  pan: gardenPan(), night: nightLightLevel
}));
requestLightGlints();

if (window.OKLOGIN_SETTINGS.ui.initialMode === 'register') {
  currentMode = 'register';
  applyMode(currentMode);
  renderDivider(1);
  scheduleSceneSync();
}
