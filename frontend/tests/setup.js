import { beforeEach } from "vitest";
import { setLanguage } from "../src/i18n";
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
