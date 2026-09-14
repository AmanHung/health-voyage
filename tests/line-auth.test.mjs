import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const built = await build({
  entryPoints: ['production/auth.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  define: { 'import.meta.env': '{"BASE_URL":"/health-voyage/"}' },
});
function setup(inClient = false) {
  const calls = [];
  const liff = {
    init: async () => {},
    isLoggedIn: () => true,
    isInClient: () => inClient,
    logout: () => calls.push('logout'),
    login: (o) => calls.push(o.redirectUri),
    getIDToken: () => 'existing-token',
  };
  const module = { exports: {} };
  const document = {
    createElement: () => ({}),
    head: { append: (node) => node.onload() },
  };
  new Function(
    'module',
    'exports',
    'window',
    'document',
    'location',
    built.outputFiles[0].text,
  )(module, module.exports, { liff }, document, {
    origin: 'https://amanhung.github.io',
  });
  return { auth: module.exports.lineAuth, calls };
}
test('desktop explicit sign-in replaces a stale logged-in session with a fresh LINE login', async () => {
  const { auth, calls } = setup();
  assert.equal(await auth(true), null);
  assert.deepEqual(calls, [
    'logout',
    'https://amanhung.github.io/health-voyage/',
  ]);
});
test('automatic callback and in-client sign-in keep the existing token without a redirect loop', async () => {
  for (const inClient of [false, true]) {
    const { auth, calls } = setup(inClient);
    assert.deepEqual(await auth(inClient), {
      provider: 'line',
      token: 'existing-token',
    });
    assert.deepEqual(calls, []);
  }
});
