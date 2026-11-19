import test from 'node:test';
import assert from 'node:assert/strict';
import { runSessionScenario } from './auth-session-browser.mjs';

 test('newer signed-out validation cannot be overwritten by stale admin success in actual AuthGate', async () => {
  const result = await runSessionScenario('stale-admin', async h => {
    await h.mount();
    h.assert(h.locked(), 'unresolved initial session must lock protected children and Nav');
    h.emit(); // The live/demo callback deliberately has no event arguments.
    await h.settle(1, null);
    h.assert(h.locked(), 'newer signed-out session must lock access');
    await h.settle(0, { id: 'old-admin', role: 'admin' });
    h.assert(h.locked(), 'stale admin lookup reopened actual AuthGate after newer logout');
    h.assert(h.redirects.some(url => url.startsWith('/login?next=')), 'signed-out session redirects to login');
  });
  assert.equal(result.ok, true, result.error);
});

test('auth-change immediately unmounts protected access until latest session validates', async () => {
  const result = await runSessionScenario('immediate-lock', async h => {
    await h.mount();
    const admin = { id: 'current-admin', role: 'admin' };
    await h.settle(0, admin);
    h.assert(h.private === 1 && h.nav === 1, 'validated session must open actual AuthGate');
    h.emit();
    h.assert(h.locked(), 'auth-change left protected children mounted during session validation');
    h.assert(document.body.textContent.includes('Checking your session'), 'revalidation must show loading state');
    await h.settle(1, admin);
    h.assert(h.private === 1 && h.nav === 1, 'latest successful validation must restore access');
  });
  assert.equal(result.ok, true, result.error);
});
