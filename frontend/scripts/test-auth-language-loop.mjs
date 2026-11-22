// Guard against two observers triggering one another and freezing Chrome.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const dom = new JSDOM(read('../public/christmas-auth/index.html'), {
  url: 'https://test.example/christmas-auth/index.html', runScripts:'outside-only'
});
const {window} = dom;
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
window.layout = window.document.getElementById('auth-layout');
window.currentMode = 'login';
window.activeTransition = null;
window.switchMode = () => {};
window.popupMotion = {active:false, show(){}, async hide(){return true}};
window.eval(read('../public/christmas-auth/js/neu-bridge.js'));
window.eval(read('../public/christmas-auth/js/neu-register-steps.js'));
const progress = window.document.querySelector('#register-form .neu-register-progress-caption');
assert.equal(progress.textContent, 'Câu hỏi 1/6');
let domChanges = 0;
const observer = new window.MutationObserver(records => {domChanges += records.length; });
observer.observe(window.document.body, {characterData:true,childList:true,subtree:true});
function postLanguage(locale) {
  window.dispatchEvent(new window.MessageEvent('message', {
    origin: window.location.origin, source:window,
    data:{channel:'neu-christmas-auth',type:'locale',locale,translations:{}}
  }));
}
postLanguage('vi');
await new Promise(resolve => setTimeout(resolve, 40));
assert.equal(progress.textContent, 'Câu hỏi 1/6');
assert(domChanges < 100, `Unexpected DOM mutation storm on Vietnamese locale: ${domChanges}`);
postLanguage('en');
await new Promise(resolve => setTimeout(resolve, 40));
assert.equal(progress.textContent, 'Question 1/6');
assert(domChanges < 200, `Unexpected DOM mutation storm on English locale: ${domChanges}`);
postLanguage('vi');
await new Promise(resolve => setTimeout(resolve, 40));
assert.equal(progress.textContent, 'Câu hỏi 1/6');
assert(domChanges < 300, `Unexpected DOM mutation storm on back-to-Vietnamese locale: ${domChanges}`);
console.log(`PASS: locale vi -> en -> vi, responsive event loop, ${domChanges} DOM mutations, no feedback loop.`);
observer.disconnect();
window.close();
