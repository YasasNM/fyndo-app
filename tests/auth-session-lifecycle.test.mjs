import test from 'node:test';
import assert from 'node:assert/strict';
import { runSessionScenario } from './auth-session-browser.mjs';

async function check(name, scenario) {
  const result = await runSessionScenario(name, scenario);
  assert.equal(result.ok, true, result.error);
}

test('stale lookup failures cannot erase the latest validated user or change their role', async () => {
  await check('stale-failure', async h => {
    await h.mount('hook');
    h.emit();
    const user = { id: 'latest-user', role: 'user', name: 'Current profile' };
    await h.settle(1, user);
    h.assert(h.updates.at(-1) === user, 'useUser must return the exact latest profile without role escalation');
    const renders = h.updates.length;
    await h.settle(0, new Error('obsolete session failed'), true);
    h.assert(h.updates.at(-1) === user && h.updates.length === renders, 'stale failure must be inert');
  });
});

test('older successes and failures stay inert while a newer session is pending', async () => {
  await check('pending-latest', async h => {
    await h.mount();
    h.emit();
    h.emit();
    await h.settle(0, { id: 'obsolete-admin', role: 'admin' });
    h.assert(h.locked(), 'stale success must not reopen access before latest validation');
    await h.settle(1, new Error('obsolete failure'), true);
    h.assert(h.locked() && h.redirects.length === 0, 'stale failure must neither unlock nor redirect pending validation');
    await h.settle(2, { id: 'current-user', role: 'user' });
    h.assert(h.private === 1 && h.nav === 1, 'latest valid ordinary user must open access');
  });
});

test('sign-in, sign-out and latest validation failure remain fail-closed in actual AuthGate', async () => {
  await check('sign-in-out', async h => {
    await h.mount();
    await h.settle(0, null);
    h.assert(h.locked(), 'initial sign-out must remain locked');
    h.emit();
    h.assert(h.locked(), 'sign-in event alone must not authorize access');
    await h.settle(1, { id: 'signed-in', role: 'admin' });
    h.assert(h.private === 1, 'validated sign-in must open access');
    h.emit();
    h.assert(h.locked(), 'sign-out event must immediately remove access');
    await h.settle(2, null);
    h.assert(h.locked(), 'validated sign-out must remain locked');
    h.emit();
    await h.settle(3, { id: 'signed-in-again', role: 'user' });
    h.assert(h.private === 1, 'later sign-in must work');
    h.emit();
    await h.settle(4, new Error('latest validation failed'), true);
    h.assert(h.locked() && document.body.textContent.includes('Opening login'), 'latest failure must fail closed and redirect');
  });
});

test('unmount unsubscribes and makes outstanding lookup settlements inert', async () => {
  await check('unmount', async h => {
    await h.mount('hook');
    h.emit();
    await h.unmount();
    h.assert(h.listeners.size === 0, 'unmount must remove the auth subscription');
    const renders = h.updates.length;
    const requests = h.requests.length;
    h.emit();
    await h.settle(0, { id: 'unmounted-admin', role: 'admin' });
    await h.settle(1, new Error('unmounted failure'), true);
    h.assert(h.requests.length === requests && h.updates.length === renders, 'unmounted hook must not reload or render on stale completion');
  });
});

test('StrictMode effect cleanup isolates an obsolete mount from the replacement session', async () => {
  await check('strict-remount', async h => {
    await h.mount('gate', true);
    h.assert(h.requests.length === 2 && h.listeners.size === 1, 'React must replay effect setup and cleanup');
    await h.settle(1, null);
    await h.settle(0, { id: 'old-effect-admin', role: 'admin' });
    h.assert(h.locked(), 'old effect cannot reopen replacement session even when request numbers match');
    h.emit();
    await h.settle(2, { id: 'replacement-user', role: 'user' });
    h.assert(h.private === 1 && h.nav === 1, 'replacement effect still accepts latest validation');
  });
});
