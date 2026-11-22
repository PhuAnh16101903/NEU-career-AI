// Connect the unchanged Christmas scene to the host application's real auth API.
(() => {
  'use strict';
  const channel = 'neu-christmas-auth';
  const send = data => parent.postMessage({ channel, ...data }, location.origin);
  const loading = document.getElementById('auth-loading-dialog');
  const error = document.getElementById('auth-error-dialog');
  const profile = document.getElementById('neu-profile-dialog');
  const detail = document.getElementById('neu-profile-detail');
  const role = document.getElementById('neu-role');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let locale = 'vi', dictionary = {};
  const originals = new WeakMap();
  const extras = {
    'Đăng nhập để tiếp tục.':'Sign in to continue.', 'Điền thông tin bên dưới để đăng ký.':'Fill in your details to create an account.',
    'Họ tên':'Full name', 'Địa chỉ email':'Email address', 'Nhập họ tên':'Enter your full name',
    'Nhập lại mật khẩu':'Confirm password', 'Ghi nhớ đăng nhập':'Remember me', 'Quên mật khẩu?':'Forgot password?',
    'Chưa có tài khoản?':'New here?', 'Đã có tài khoản?':'Already have an account?',
    'Chào mừng':'Welcome', 'bạn trở lại.':'back.', 'Đăng nhập bằng email và mật khẩu của bạn.':'Sign in with your email and password.',
    'Thành công!':'Success!', 'Đang vào không gian làm việc của bạn.':'Opening your workspace.',
    'Vui lòng chờ trong giây lát.':'Please wait a moment.', 'Thông tin tài khoản NEU':'NEU account details',
    'Tạo tài khoản':'Create account', 'Quay lại':'Back', 'Thử lại':'Try again', 'Đóng':'Close',
    'Bạn là':'Your role', 'Tên doanh nghiệp':'Company name', 'Chuyên ngành':'Major',
  };
  const translate = text => (locale === 'en' ? ({...dictionary,...extras})[text.trim()] : null) || text;
  function localize() {
    observer.disconnect();
    if (!window.document?.body) return;
    document.documentElement.lang = locale;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script,style,svg,textarea')) continue;
      const prior = originals.get(node);
      const source = prior && node.textContent === prior.output ? prior.source : node.textContent;
      const output = translate(source);
      originals.set(node,{source,output});
      if (node.textContent !== output) node.textContent = output;
    }
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  const observer = new MutationObserver(localize);
  document.getElementById('neu-language').addEventListener('click',()=>send({type:'locale',locale:locale === 'vi' ? 'en' : 'vi'}));
  let request = null, formPending = null, desiredMode = null, startedAt = 0;
  const unlock = () => {
    if (formPending) {
      formPending.querySelector('[type="submit"]').disabled = false;
      formPending.removeAttribute('aria-busy');
    }
  };
  const payloadFor = form => {
    const values = new FormData(form);
    return { email: String(values.get('email') || '').trim(), password: String(values.get('password') || ''),
      full_name: String(values.get('name') || '').trim(), role: role.value,
      student_major: role.value === 'student' ? detail.value.trim() : null,
      company_name: role.value === 'enterprise' ? detail.value.trim() : null };
  };
  const start = form => {
    if (request) return;
    formPending = form;
    request = crypto.randomUUID();
    startedAt = performance.now();
    form.querySelector('[type="submit"]').disabled = true;
    form.setAttribute('aria-busy', 'true');
    loading.classList.remove('neu-auth-success');
    document.getElementById('auth-loading-title').textContent = 'Đang xử lý…';
    document.getElementById('auth-loading-description').textContent = 'Vui lòng chờ trong giây lát.';
    window.popupMotion.show(loading);
    send({ type: 'authenticate', id: request, mode: form.id === 'register-form' ? 'register' : 'login', payload: payloadFor(form) });
  };
  window.showAuthFeedback = form => {
    if (request || profile.open) return;
    if (form.id === 'register-form') {
      formPending = form;
      window.popupMotion.show(profile);
      role.focus();
    } else start(form);
  };
  role.addEventListener('change', () => {
    document.getElementById('neu-profile-label').textContent = role.value === 'enterprise' ? 'Tên doanh nghiệp' : 'Chuyên ngành';
    detail.required = role.value === 'enterprise';
  });
  document.getElementById('neu-profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    if (role.value === 'enterprise' && !detail.value.trim()) { detail.focus(); return; }
    const form = formPending;
    if (await window.popupMotion.hide(profile)) start(form);
  });
  document.getElementById('neu-profile-cancel').addEventListener('click', () => window.popupMotion.hide(profile));
  error.addEventListener('close', () => {
    unlock();
    formPending?.querySelector('input[type="email"]')?.focus();
    request = null;
  });
  window.addEventListener('message', async event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.channel !== channel) return;
    const data = event.data;
    if (data.type === 'locale') { locale = data.locale === 'en' ? 'en' : 'vi'; dictionary = data.translations || {}; localize(); return; }
    if (data.type === 'mode' && ['login', 'register'].includes(data.mode)) {
      desiredMode = activeTransition && activeTransition.mode !== data.mode ? data.mode : null;
      if (!activeTransition && !request) switchMode(data.mode);
      return;
    }
    if (data.type !== 'result' || data.id !== request) return;
    if (data.error) {
      await window.popupMotion.hide(loading);
      document.getElementById('auth-error-description').textContent = data.error;
      unlock();
      window.popupMotion.show(error);
      document.getElementById('auth-error-retry').focus();
      return;
    }
    if (!data.success) return;
    const remaining = reduced.matches ? 0 : Math.max(0, (window.OKLOGIN_SETTINGS?.feedback.loadingMs ?? 2000) - (performance.now() - startedAt));
    await new Promise(resolve => setTimeout(resolve, remaining));
    loading.classList.add('neu-auth-success');
    document.getElementById('auth-loading-title').textContent = 'Thành công!';
    document.getElementById('auth-loading-description').textContent = 'Đang vào không gian làm việc của bạn.';
    const id = request;
    await new Promise(resolve => setTimeout(resolve, reduced.matches ? 0 : 650));
    await window.popupMotion.hide(loading);
    send({ type: 'complete', id });
  });
  // Sync host URL after the source's own 1500ms form/scene transition.
  new MutationObserver(() => {
    if (layout.getAttribute('aria-busy') === 'true') return;
    if (desiredMode && desiredMode !== currentMode) {
      const target = desiredMode; desiredMode = null; switchMode(target); return;
    }
    desiredMode = null;
    send({ type: 'navigate', route: currentMode });
  }).observe(layout, { attributes: true, attributeFilter: ['aria-busy'] });
  send({ type: 'ready' });
})();
