(() => {
  'use strict';
  const records = new Map();
  const sceneListeners = new Set();
  let scenePaused = false;
  function syncScene() {
    const next = window.OKLOGIN_SETTINGS.motion.pauseBackgroundOnPopup && [...records.values()].some(record => record.dialog.open);
    if (next === scenePaused) return;
    scenePaused = next;
    sceneListeners.forEach(listener => listener());
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const enterDuration = window.OKLOGIN_SETTINGS.motion.popupEnterMs;
  const exitDuration = window.OKLOGIN_SETTINGS.motion.popupExitMs;
  const easing = 'cubic-bezier(.42,0,.58,1)';

  function cancelAnimation(record) {
    record.animation?.cancel();
    record.animation = null;
  }

  function clearState(record) {
    delete record.dialog.dataset.popupState;
    record.dialog.style.removeProperty('--popup-backdrop-from');
    record.dialog.style.removeProperty('--popup-motion-duration');
    record.dialog.style.removeProperty('--popup-motion-easing');
  }

  function finishOpen(record, version) {
    if (record.version !== version || record.state !== 'opening') return;
    record.state = 'open';
    record.dialog.dataset.popupState = 'open';
    record.dialog.style.removeProperty('--popup-backdrop-from');
    record.dialog.style.removeProperty('--popup-motion-duration');
    record.dialog.style.removeProperty('--popup-motion-easing');
    cancelAnimation(record);
    record.resolveShow?.(true);
    record.resolveShow = null;
  }

  function finishClose(record, version) {
    if (record.version !== version || record.state !== 'closing') return;
    record.state = 'closed';
    if (record.dialog.open) record.dialog.close();
    syncScene();
    cancelAnimation(record);
    clearState(record);
    record.resolveHide?.(true);
    record.resolveHide = null;
    record.hidePromise = null;
  }

  function getRecord(dialog) {
    if (records.has(dialog)) return records.get(dialog);
    const record = { dialog, state: dialog.open ? 'open' : 'closed', version: 0,
      animation: null, showPromise: null, resolveShow: null, hidePromise: null, resolveHide: null };
    records.set(dialog, record);
    dialog.addEventListener('cancel', event => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      hide(dialog);
    });
    dialog.addEventListener('close', () => {
      if (dialog.open || record.state === 'closed') return;
      record.version++;
      record.state = 'closed';
      syncScene();
      cancelAnimation(record);
      clearState(record);
      record.resolveShow?.(false);
      record.resolveHide?.(true);
      record.resolveShow = record.resolveHide = null;
      record.hidePromise = null;
    });
    return record;
  }

  function show(dialog) {
    const record = getRecord(dialog);
    if (dialog.open && record.state === 'open') return Promise.resolve(true);
    if (dialog.open && record.state === 'opening') return record.showPromise;
    const visible = dialog.open;
    const from = visible ? getComputedStyle(dialog) : null;
    const transform = from?.transform || 'scale(.84)';
    const opacity = visible ? from.opacity : 0;
    const backdrop = visible ? getComputedStyle(dialog, '::backdrop').opacity : 0;
    const version = ++record.version;
    record.state = 'opening';
    record.resolveShow?.(false);
    record.resolveShow = null;
    record.resolveHide?.(false);
    record.resolveHide = null;
    record.hidePromise = null;
    cancelAnimation(record);
    const done = new Promise(resolve => { record.resolveShow = resolve; });
    record.showPromise = done;
    dialog.style.setProperty('--popup-backdrop-from', String(backdrop));
    dialog.style.setProperty('--popup-motion-duration', `${enterDuration}ms`);
    dialog.style.setProperty('--popup-motion-easing', easing);
    dialog.dataset.popupState = 'opening';
    if (!visible) dialog.showModal();
    syncScene();
    if (motion.matches || typeof dialog.animate !== 'function') finishOpen(record, version);
    else {
      record.animation = dialog.animate([
        { transform, opacity }, { transform: 'scale(1)', opacity: 1 }
      ], { duration: enterDuration, easing, fill: 'both' });
      record.animation.finished.then(() => finishOpen(record, version), () => finishOpen(record, version));
    }
    return done;
  }

  function hide(dialog) {
    const record = getRecord(dialog);
    if (!dialog.open) return Promise.resolve(true);
    if (record.state === 'closing') return record.hidePromise;
    const from = getComputedStyle(dialog);
    const transform = from.transform, opacity = from.opacity;
    const backdrop = getComputedStyle(dialog, '::backdrop').opacity;
    const version = ++record.version;
    record.state = 'closing';
    record.resolveShow?.(false);
    record.resolveShow = null;
    cancelAnimation(record);
    const done = new Promise(resolve => { record.resolveHide = resolve; });
    record.hidePromise = done;
    dialog.style.setProperty('--popup-backdrop-from', backdrop);
    dialog.style.setProperty('--popup-motion-duration', `${exitDuration}ms`);
    dialog.style.setProperty('--popup-motion-easing', easing);
    dialog.dataset.popupState = 'closing';
    if (motion.matches || typeof dialog.animate !== 'function') finishClose(record, version);
    else {
      record.animation = dialog.animate([
        { transform, opacity }, { transform: 'scale(.84)', opacity: 0 }
      ], { duration: exitDuration, easing, fill: 'both' });
      record.animation.finished.then(() => finishClose(record, version), () => finishClose(record, version));
    }
    return done;
  }

  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    records.forEach(record => {
      if (record.state === 'opening') finishOpen(record, record.version);
      else if (record.state === 'closing') finishClose(record, record.version);
    });
  });
  window.popupMotion = { show, hide, get active() { return scenePaused; },
    subscribe(listener) { sceneListeners.add(listener); } };
})();
