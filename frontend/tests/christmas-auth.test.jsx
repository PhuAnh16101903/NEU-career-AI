import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import ChristmasAuth from '../src/components/ChristmasAuth';
import { careerApi } from '../src/services/api';
import { authFrame, frameMessage } from './christmas-test-helper';
vi.mock('../src/services/api',()=>({careerApi:{login:vi.fn(),register:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();vi.useRealTimers();});
function setup() {
 const success=vi.fn(),navigate=vi.fn();
 render(<ChristmasAuth mode="login" onAuthSuccess={success} onNavigate={navigate}/>);
 const outgoing=vi.spyOn(authFrame().contentWindow,'postMessage');
 return {success,navigate,outgoing};
}
const login={type:'authenticate',id:'one',mode:'login',payload:{email:'a@b.com',password:'secret123'}};
it('rejects messages from another origin or another frame',async()=>{
 setup();
 await frameMessage(login,{origin:'https://untrusted.example'});
 await frameMessage(login,{source:window});
 expect(careerApi.login).not.toHaveBeenCalled();
});
it('blocks duplicate submission and waits for the success animation acknowledgement',async()=>{
 const {success,outgoing}=setup();
 const user={id:'one',role:'student'};
 careerApi.login.mockResolvedValue({user});
 await frameMessage(login);await frameMessage(login);
 expect(careerApi.login).toHaveBeenCalledTimes(1);
 expect(success).not.toHaveBeenCalled();
 expect(outgoing).toHaveBeenCalledWith(expect.objectContaining({success:true}),location.origin);
 await frameMessage({type:'complete',id:'wrong'});expect(success).not.toHaveBeenCalled();
 await frameMessage({type:'complete',id:'one'});expect(success).toHaveBeenCalledWith(user);
});
it('reports real errors and permits retry',async()=>{
 const {outgoing}=setup();
 careerApi.login.mockRejectedValue(new Error('Network unavailable'));
 await frameMessage(login);
 await waitFor(()=>expect(outgoing).toHaveBeenCalledWith(expect.objectContaining({type:'result',error:expect.any(String)}),location.origin));
 await frameMessage({...login,id:'two'});expect(careerApi.login).toHaveBeenCalledTimes(2);
});
it('passes enterprise profile fields without allowing admin self-registration',async()=>{
 setup();careerApi.register.mockResolvedValue({user:{id:'hr',role:'enterprise'}});
 await frameMessage({...login,mode:'register',payload:{...login.payload,full_name:'HR',role:'admin'}});
 expect(careerApi.register).not.toHaveBeenCalled();
 await frameMessage({...login,mode:'register',payload:{...login.payload,full_name:'HR',role:'enterprise',company_name:'NEU'}});
 expect(careerApi.register).toHaveBeenCalledWith({...login.payload,full_name:'HR',role:'enterprise',company_name:'NEU',student_major:null});
});
it('does not redirect after the iframe has unmounted',async()=>{
 let resolve;careerApi.login.mockReturnValue(new Promise(r=>{resolve=r}));
 const {success}=setup();await frameMessage(login);cleanup();
 resolve({user:{id:'one',role:'student'}});await Promise.resolve();
 expect(success).not.toHaveBeenCalled();
});
