import { beforeEach } from "vitest";
import { setLanguage } from "../src/i18n";
// Provide an in-memory localStorage for Node.js 26 + jsdom.
const storage = new Map();

const localStorageMock = {
  get length() {
    return storage.size;
  },

  key(index) {
    return [...storage.keys()][index] ?? null;
  },

  getItem(key) {
    return storage.get(String(key)) ?? null;
  },

  setItem(key, value) {
    storage.set(String(key), String(value));
  },

  removeItem(key) {
    storage.delete(String(key));
  },

  clear() {
    storage.clear();
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});
beforeEach(() => setLanguage("vi"));
// jsdom does not implement native dialog methods.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};

HTMLMediaElement.prototype.play = function () {
  return Promise.resolve();
};
HTMLMediaElement.prototype.pause = function () {};
