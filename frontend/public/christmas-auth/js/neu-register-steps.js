// Progressive presentation only. Existing form, validation, profile bridge, API payload
// and animated login/register scene are intentionally retained without modification.
(() => {
  'use strict';
  const registerForm = document.getElementById('register-form');
  const registerPanel = document.getElementById('register-panel');
  const profile = document.getElementById('neu-profile-dialog');
  const profileForm = document.getElementById('neu-profile-form');
  if (!registerForm || !registerPanel || !profile || !profileForm) return;

  const registerFields = Array.from(registerForm.children).filter(el => el.classList.contains('field'));
  const profileFields = Array.from(profileForm.children).filter(el => el.classList.contains('field'));
  if (registerFields.length !== 4 || profileFields.length !== 2) return;

  const labels = {
    vi: {
      step: number => `Câu hỏi ${number}/6`,
      next: 'Tiếp theo', back: 'Quay lại',
      prompts: [
        'Bạn tên là gì?', 'Email của bạn là gì?',
        'Bạn muốn đặt mật khẩu nào?', 'Nhập lại mật khẩu để xác nhận.'
      ],
      required: 'Vui lòng điền thông tin trước khi tiếp tục.',
      email: 'Email chưa đúng định dạng.',
      name: 'Họ và tên cần ít nhất 2 ký tự.',
      password: 'Mật khẩu cần ít nhất 8 ký tự.',
      confirmation: 'Mật khẩu nhập lại chưa khớp.'
    },
    en: {
      step: number => `Question ${number}/6`,
      next: 'Continue', back: 'Back',
      prompts: [
        'What is your name?', 'What is your email?',
        'Choose a password.', 'Confirm your password.'
      ],
      required: 'Please answer this question to continue.',
      email: 'Please enter a valid email address.',
      name: 'Full name must have at least 2 characters.',
      password: 'Password must contain at least 8 characters.',
      confirmation: 'Passwords do not match.'
    }
  };
  const messages = () => labels[document.documentElement.lang === 'en' ? 'en' : 'vi'];

  function setup(form, fields, submitButton, startingIndex, initialPage) {
    let page = initialPage;
    const progress = document.createElement('div');
    progress.className = 'neu-register-progress';
    const progressLabel = document.createElement('span');
    progressLabel.className = 'neu-register-progress-caption';
    progressLabel.setAttribute('aria-live', 'polite');
    const track = document.createElement('div');
    track.className = 'neu-register-progress-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'neu-register-progress-fill';
    track.append(fill);
    progress.append(progressLabel, track);
    form.prepend(progress);

    const controls = document.createElement('div');
    controls.className = 'neu-register-nav';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'neu-register-back';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'neu-register-next';
    controls.append(back, next);
    submitButton.before(controls);

    const firstInvalid = () => {
      const current = fields[page];
      const input = current.querySelector('input,select');
      if (!input) return false;
      let error = '';
      const m = messages();
      if (!input.value.trim() && input.required) error = m.required;
      else if (input.type === 'email' && input.validity.typeMismatch) error = m.email;
      else if (input.name === 'name' && input.value.trim().length < 2) error = m.name;
      else if (input.id === 'register-password' && input.value.length < 8) error = m.password;
      else if (input.id === 'register-confirm' && input.value !== document.getElementById('register-password').value) error = m.confirmation;
      const feedback = document.getElementById(`${input.id}-error`);
      if (feedback) { feedback.textContent = error; feedback.hidden = !error; }
      if (error) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
      else if (input.getAttribute('aria-invalid') === 'true') input.setAttribute('aria-invalid', 'false');
      return Boolean(error);
    };

    function render(index, focus = false) {
      page = Math.max(0, Math.min(fields.length - 1, index));
      fields.forEach((field, i) => {
        field.hidden = i !== page;
        field.inert = i !== page;
      });
      const final = page === fields.length - 1;
      back.hidden = page === 0;
      next.hidden = final;
      submitButton.hidden = !final;
      progressLabel.textContent = messages().step(startingIndex + page);
      fill.style.width = `${(startingIndex + page) / 6 * 100}%`;
      back.textContent = messages().back;
      next.textContent = messages().next;
      if (form === registerForm) {
        const description = registerPanel.querySelector('.form-heading p');
        if (description) description.textContent = messages().prompts[page];
      }
      if (focus) fields[page].querySelector('input, select')?.focus({preventScroll:true});
    }
    function advance() {
      if (form.getAttribute('aria-busy') === 'true' || firstInvalid()) return;
      render(page + 1, true);
    }
    next.addEventListener('click', advance);
    back.addEventListener('click', () => render(page - 1, true));
    form.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing || page >= fields.length - 1 ||
          event.target.closest('button, textarea')) return;
      event.preventDefault();
      advance();
    });
    // Prevent hidden/previous questions being treated as the current question.
    // The original submit listener is used unaltered once every step is valid.
    form.addEventListener('submit', event => {
      if (page < fields.length - 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        advance();
        return;
      }
      if (form === registerForm) {
        for (let i = 0; i < fields.length; i++) {
          page = i;
          if (firstInvalid()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            render(i, true);
            return;
          }
        }
        page = fields.length - 1;
      }
    }, true);
    render(page);
    return { render, refresh: () => render(page) };
  }

  registerForm.classList.add('neu-register-wizard');
  profile.classList.add('neu-profile-wizard');
  const register = setup(registerForm, registerFields, registerForm.querySelector(':scope > .submit'), 1, 0);
  const profileWizard = setup(profileForm, profileFields, profileForm.querySelector(':scope > .submit'), 5, 0);

  let wasOpen = profile.open;
  new MutationObserver(() => {
    if (profile.open && !wasOpen) profileWizard.render(0);
    wasOpen = profile.open;
  }).observe(profile, {attributes:true, attributeFilter:['open']});
  let wasVisible = registerPanel.getAttribute('aria-hidden') === 'false';
  new MutationObserver(() => {
    const visible = registerPanel.getAttribute('aria-hidden') === 'false';
    if (visible && !wasVisible) register.render(0);
    wasVisible = visible;
  }).observe(registerPanel, {attributes:true, attributeFilter:['aria-hidden']});
  // The original auth bridge's localize() sets html.lang whenever text changes.
  // Assigning the same value still queues an attribute mutation. Without this
  // guard, refreshing labels edits body text, which calls localize() again and
  // produces an endless MutationObserver loop that freezes the browser tab.
  let lastLanguage = document.documentElement.lang;
  new MutationObserver(() => {
    const language = document.documentElement.lang;
    if (language === lastLanguage) return;
    lastLanguage = language;
    register.refresh();
    profileWizard.refresh();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
