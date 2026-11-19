import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAuth } from './auth-render.mjs';

const unsafe = [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/login', '/login/?next=/saved', '/log%69n', '/a/../login', '/%2f%2fevil.example', '/%252f%252fevil.example', '/%5cevil.example', '/%255cevil.example', '/\nevil.example', '/%0aevil.example', '/%250devil.example', '/bad%ZZ', '/saved\\x', '/ saved', 'javascript:alert(1)'];
for (const next of unsafe) test(`demo login falls back to Home for unsafe next ${JSON.stringify(next)}`, async () => {
  const result = await renderAuth({ file: 'app/login/page.js', pathname: '/login/', search: next === null ? '' : '?next=' + encodeURIComponent(next), data: { signIn: async () => {} } });
  await result.handlers.find(h => h.children === 'User').click();
  assert.equal(result.window.location.href, '/');
});

test('demo login preserves safe encoded search values', async () => {
  const next = '/?q=rice%20%26%20curry&area=Colombo%207';
  const result = await renderAuth({ file: 'app/login/page.js', pathname: '/login/', search: '?next=' + encodeURIComponent(next), data: { signIn: async () => {} } });
  await result.handlers.find(h => h.children === 'User').click();
  assert.equal(result.window.location.href, next);
});

test('demo login retains a safe internal route including query and fragment', async () => {
  const next = '/spot/?id=demo-1#menu';
  const result = await renderAuth({ file: 'app/login/page.js', pathname: '/login/', search: '?next=' + encodeURIComponent(next), data: { signIn: async () => {} } });
  await result.handlers.find(h => h.children === 'User').click();
  assert.equal(result.window.location.href, next);
});
