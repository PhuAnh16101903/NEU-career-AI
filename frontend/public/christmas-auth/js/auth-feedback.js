(() => {
  'use strict';

  const loading = document.getElementById('auth-loading-dialog');
  const error = document.getElementById('auth-error-dialog');
  const retry = document.getElementById('auth-error-retry');
  const close = document.getElementById('auth-error-close');
  const settings = window.OKLOGIN_SETTINGS.feedback;
  document.getElementById('auth-error-description').textContent = settings.errorMessage;
  let pendingForm = null;

  loading.querySelector('.auth-sleigh-sprite img')?.decode?.().catch(() => {});

  window.showAuthFeedback = form => {
    if (pendingForm || loading.open || error.open) return;
    pendingForm = form;
    const submit = form.querySelector('button[type="submit"]');
    const wasDisabled = submit.disabled;
    const previousBusy = form.getAttribute('aria-busy');
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    window.popupMotion.show(loading);

    window.setTimeout(async () => {
      if (!await window.popupMotion.hide(loading)) return;
      submit.disabled = wasDisabled;
      if (previousBusy === null) form.removeAttribute('aria-busy');
      else form.setAttribute('aria-busy', previousBusy);
      window.popupMotion.show(error);
      retry.focus({ preventScroll: true });
    }, settings.loadingMs);
  };

  loading.addEventListener('cancel', event => event.preventDefault());
  retry.addEventListener('click', () => { window.popupMotion.hide(error); });
  close.addEventListener('click', () => { window.popupMotion.hide(error); });
  error.addEventListener('click', event => {
    if (event.target !== error) return;
    const bounds = error.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) window.popupMotion.hide(error);
  });
  error.addEventListener('close', () => {
    const email = pendingForm?.querySelector('input[type="email"]');
    pendingForm = null;
    email?.focus({ preventScroll: true });
  });
})();
