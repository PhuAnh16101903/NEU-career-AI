import { act, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
export function authFrame() { return screen.getByTitle('Đăng nhập và đăng ký NEU Career AI'); }
export async function frameMessage(data, overrides = {}) {
  await act(async () => window.dispatchEvent(new MessageEvent('message', {
    origin: location.origin, source: authFrame().contentWindow,
    data: { channel:'neu-christmas-auth', ...data }, ...overrides,
  })));
}
export async function loginThroughFrame() {
  const outgoing = vi.spyOn(authFrame().contentWindow, 'postMessage');
  await frameMessage({type:'authenticate',id:'test-login',mode:'login',payload:{email:'an@example.com',password:'secret123'}});
  await waitFor(() => expect(outgoing).toHaveBeenCalledWith(expect.objectContaining({type:'result',success:true}),location.origin));
  await frameMessage({type:'complete',id:'test-login'});
}
