import { afterEach, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const root = process.cwd() + '/public/christmas-auth/';
const documents=[];
afterEach(()=>{documents.splice(0).forEach(d=>d.window.close());});
function scene() {
 const dom=new JSDOM(readFileSync(root + 'index.html','utf8'),{url:'http://localhost/christmas-auth/index.html',runScripts:'outside-only'});
 documents.push(dom);const w=dom.window, d=w.document;
 w.matchMedia=()=>({matches:true});
 w.layout=d.getElementById('auth-layout');w.activeTransition=null;w.currentMode='login';
 w.switchMode=vi.fn(mode=>{w.currentMode=mode;});
 w.popupMotion={show:vi.fn(async dialog=>{dialog.setAttribute('open','');return true}),hide:vi.fn(async dialog=>{dialog.removeAttribute('open');return true})};
 w.postMessage=vi.fn();w.eval(readFileSync(root + 'js/neu-bridge.js','utf8'));
 const response=data=>w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:w.parent,data:{channel:'neu-christmas-auth',...data}}));
 return {w,d,response};
}
it('sends the entered credentials and completes only after actual API success',async()=>{
 const {w,d,response}=scene();
 d.getElementById('login-email').value='student@neu.edu.vn';d.getElementById('login-password').value='secret';
 w.showAuthFeedback(d.getElementById('login-form'));
 const message=w.postMessage.mock.calls.find(([m])=>m.type==='authenticate')[0];
 expect(message.payload.email).toBe('student@neu.edu.vn');expect(message.payload.password).toBe('secret');
 expect(w.postMessage.mock.calls.some(([m])=>m.type==='complete')).toBe(false);
 response({type:'result',id:message.id,success:true});
 await new Promise(r=>setTimeout(r,20));
 expect(w.postMessage.mock.calls.some(([m])=>m.type==='complete'&&m.id===message.id)).toBe(true);
});
it('keeps API errors visible and collects the enterprise profile before registration',async()=>{
 const {w,d,response}=scene();
 d.getElementById('register-name').value='NEU HR';d.getElementById('register-email').value='hr@neu.edu.vn';d.getElementById('register-password').value='secret123';
 w.showAuthFeedback(d.getElementById('register-form'));
 expect(w.postMessage.mock.calls.some(([m])=>m.type==='authenticate')).toBe(false);
 const role=d.getElementById('neu-role');role.value='enterprise';role.dispatchEvent(new w.Event('change'));
 d.getElementById('neu-profile-detail').value='NEU';
 d.getElementById('neu-profile-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await new Promise(r=>setTimeout(r,20));
 const message=w.postMessage.mock.calls.find(([m])=>m.type==='authenticate')[0];
 expect(message.payload).toMatchObject({role:'enterprise',company_name:'NEU',full_name:'NEU HR'});
 response({type:'result',id:message.id,error:'Email đã tồn tại'});
 await new Promise(r=>setTimeout(r,20));
 expect(d.getElementById('auth-error-description').textContent).toBe('Email đã tồn tại');
 expect(d.querySelector('#register-form [type="submit"]').disabled).toBe(false);
});
it('does not revert a user-initiated mode switch and preserves typed values during translation',async()=>{
 const {w,d,response}=scene();
 response({type:'mode',mode:'login'});
 w.currentMode='register';w.layout.setAttribute('aria-busy','false');await Promise.resolve();
 expect(w.postMessage.mock.calls.some(([m])=>m.type==='navigate'&&m.route==='register')).toBe(true);
 const input=d.getElementById('login-email');input.value='keep@neu.edu.vn';input.focus();
 response({type:'locale',locale:'en',translations:{'Đăng nhập':'Sign in'}});
 expect(d.getElementById('login-title').textContent).toBe('Sign in');
 expect(input.value).toBe('keep@neu.edu.vn');expect(d.activeElement).toBe(input);
 response({type:'locale',locale:'vi'});expect(d.getElementById('login-title').textContent).toBe('Đăng nhập');
});
