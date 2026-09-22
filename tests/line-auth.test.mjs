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
function setup(inClient = false, options = {}) {
  const calls = [];
  const liff = {
    init: options.init || (async () => {}),
    isLoggedIn: () => true,
    isInClient: () => inClient,
    logout: () => calls.push('logout'),
    login: (o) => calls.push(o.redirectUri),
    getIDToken: () => 'existing-token',
  };
  const module = { exports: {} };
  const document = {
    createElement: () => ({remove:()=>calls.push('remove-script')}),
    head: { append: (node) => {if(!options.hangScript)node.onload();} },
  };
  new Function(
    'module',
    'exports',
    'window',
    'document',
    'location',
    'setTimeout',
    built.outputFiles[0].text,
  )(module, module.exports, { liff }, document, {
    origin: 'https://amanhung.github.io',
  }, options.fastTimeout ? (fn)=>setTimeout(fn,5) : setTimeout);
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

test('a stalled SDK download times out, removes the failed script and permits retry',async()=>{
  const options={hangScript:true,fastTimeout:true};const {auth,calls}=setup(true,options);
  await assert.rejects(auth(),/載入逾時/);assert.deepEqual(calls,['remove-script']);
  options.hangScript=false;assert.equal((await auth()).token,'existing-token');
});
test('a stalled LIFF init exits waiting and never starts overlapping initializations',async()=>{
  let inits=0;const {auth}=setup(true,{fastTimeout:true,init:()=>{inits++;return new Promise(()=>{});}});
  await assert.rejects(auth(),/LINE 連線逾時/);await assert.rejects(auth(true),/重新載入/);assert.equal(inits,1);
});

test('cancelling while LIFF initializes cannot trigger a late login redirect',async()=>{
  let finish;const ready=new Promise(resolve=>{finish=resolve;});
  const {auth,calls}=setup(false,{init:()=>ready});const controller=new AbortController();
  const pending=auth(true,controller.signal);controller.abort();finish();
  assert.equal(await pending,null);assert.deepEqual(calls,[]);
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
