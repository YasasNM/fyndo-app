import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAuth } from './auth-render.mjs';
import { readdir } from 'node:fs/promises';

// All page routes are protected by default; new features need no per-page guard.
test('every feature route is locked when signed out, including SPA pathname changes', async () => {
  const entries = await readdir(new URL('../app/', import.meta.url), { withFileTypes: true });
  const publicNames = new Set(['login', 'reset-password', 'terms', 'privacy']);
  const paths = ['/', ...entries.filter(e => e.isDirectory() && !publicNames.has(e.name)).map(e => '/' + e.name + '/')];
  for (const pathname of paths) {
    const result = await renderAuth({ user: null, pathname });
    assert.equal(result.mounts, 0, pathname);
    assert.equal(result.navMounts, 0, pathname);
    assert.equal(result.redirects.length, 1, pathname);
  }
});

test('user, owner and admin sessions retain access and logout re-locks the same route', async () => {
  for (const role of ['user', 'owner', 'admin']) {
    const loggedIn = await renderAuth({ user: { role }, pathname: '/dashboard/' });
    assert.equal(loggedIn.mounts, 1);
    const loggedOut = await renderAuth({ user: null, pathname: '/dashboard/' });
    assert.equal(loggedOut.mounts, 0);
    assert.equal(loggedOut.navMounts, 0);
  }
});

test('auth loading never mounts protected pages or feature navigation', async () => {
  const result = await renderAuth();
  assert.equal(result.mounts, 0, 'protected page must not mount during auth resolution');
  assert.equal(result.navMounts, 0);
  assert.match(result.html, /Checking your session/);
  assert.deepEqual(result.redirects, []);
});

test('signed-out deep links unmount protected content and preserve the requested route', async () => {
  const result = await renderAuth({ user: null, pathname: '/spot/', search: '?id=demo-1', hash: '#menu' });
  assert.equal(result.mounts, 0);
  assert.equal(result.navMounts, 0);
  assert.deepEqual(result.redirects, ['/login?next=%2Fspot%2F%3Fid%3Ddemo-1%23menu']);
});

test('auth and legal routes stay public without feature navigation or redirects', async () => {
  for (const pathname of ['/login', '/login/', '/reset-password/', '/terms/', '/privacy/']) {
    for (const user of [undefined, null, { role: 'user' }]) {
      const result = await renderAuth({ pathname, user });
      assert.equal(result.mounts, 1, pathname);
      assert.equal(result.navMounts, 0, pathname);
      assert.deepEqual(result.redirects, [], pathname);
    }
  }
});

test('a resolved signed-in session mounts the page and feature navigation', async () => {
  const result = await renderAuth({ user: { role: 'user' }, pathname: '/saved/' });
  assert.equal(result.mounts, 1);
  assert.equal(result.navMounts, 1);
  assert.deepEqual(result.redirects, []);
});
