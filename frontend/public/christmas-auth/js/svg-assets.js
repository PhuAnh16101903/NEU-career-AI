(() => {
  'use strict';
  const templates = new Map(), requests = new Map(), pending = new Map();
  const imageDirectory = new URL('image/', document.baseURI);
  const keyFor = name => new URL(name.replace(/^image\//, ''), imageDirectory).pathname;

  function parse(source, url) {
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    const root = parsed.documentElement;
    if (root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg' || parsed.querySelector('parsererror')) {
      throw new Error(`Invalid SVG: ${url}`);
    }
    root.querySelectorAll('script').forEach(script => script.remove());
    for (const node of [root, ...root.querySelectorAll('*')]) {
      for (const attribute of [...node.attributes]) {
        if (attribute.localName === 'href' && attribute.value && !attribute.value.startsWith('#')) {
          node.setAttributeNS(attribute.namespaceURI, attribute.name, new URL(attribute.value, url).href);
        }
      }
    }
    return document.importNode(root, true);
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || data.type !== 'svg-asset' || typeof data.token !== 'string') return;
    const record = pending.get(data.token);
    if (!record || data.url !== record.url || event.source !== record.frame.contentWindow) return;
    const localFile = location.protocol === 'file:' && new URL(record.url).protocol === 'file:';
    const validOrigin = localFile
      ? ['null', 'file://', ''].includes(event.origin)
      : event.origin === location.origin;
    if (!validOrigin) return;
    try {
      const root = parse(data.source, record.url);
      templates.set(record.key, root);
      record.resolve();
    } catch (error) { record.reject(error); }
    finally { record.dispose(); }
  });

  function load(name) {
    const key = keyFor(name);
    if (requests.has(key)) return requests.get(key);
    const promise = new Promise((resolve, reject) => {
      const url = new URL(name.replace(/^image\//, ''), imageDirectory);
      const nonce = new Uint32Array(4);
      crypto.getRandomValues(nonce);
      const token = [...nonce].map(value => value.toString(16)).join('-');
      url.searchParams.set('svg-asset', token);
      const frame = document.createElement('iframe');
      frame.className = 'svg-asset-loader';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.src = url.href;
      const timeout = setTimeout(() => {
        dispose();
        reject(new Error(`SVG load timed out: ${name}`));
      }, 15000);
      function dispose() {
        clearTimeout(timeout);
        pending.delete(token);
        frame.remove();
      }
      pending.set(token, { key, url: url.href, frame, resolve, reject, dispose });
      frame.addEventListener('error', () => {
        dispose();
        reject(new Error(`SVG could not load: ${name}`));
      }, { once: true });
      document.body.append(frame);
    });
    requests.set(key, promise);
    return promise;
  }

  function clone(name) {
    const root = templates.get(keyFor(name));
    if (!root) throw new Error(`SVG was not preloaded: ${name}`);
    return root.cloneNode(true);
  }

  async function mount(extra = []) {
    const slots = [...document.querySelectorAll('[data-svg-src]')];
    await Promise.all([...slots.map(slot => slot.dataset.svgSrc), ...extra].map(load));
    for (const slot of slots) {
      const root = clone(slot.dataset.svgSrc);
      for (const attribute of [...slot.attributes]) {
        if (attribute.name !== 'data-svg-src') root.setAttribute(attribute.name, attribute.value);
      }
      slot.replaceWith(root);
    }
  }

  window.svgAssets = { load, clone, mount };
})();
