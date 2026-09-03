import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const { outputFiles } = await build({
  stdin: { contents: `import React from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    import Home from './app/page.tsx';
    import {HomeLeaderboard} from './components/home-leaderboard.tsx';
    import {ProfileMenu} from './components/profile-menu.tsx';
    export const home = renderToStaticMarkup(<Home />);
    export const menu = renderToStaticMarkup(<ProfileMenu nickname="測試暱稱" onNavigate={()=>{}} />);
    export const rank = (participating) => renderToStaticMarkup(<HomeLeaderboard nickname="我的測試暱稱" steps={1616} participating={participating} onParticipating={()=>{}} />);`,
    loader: 'tsx', resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs',
});
const compiled = {exports:{}};
new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const rendered = compiled.exports;

test('home renders one calendar and one leaderboard, with no sidebar',()=>{
  assert.equal((rendered.home.match(/aria-label="每日任務月曆"/g) ?? []).length,1);
  assert.equal((rendered.home.match(/aria-label="首頁步數排行榜"/g) ?? []).length,1);
  assert.doesNotMatch(rendered.home, /<aside/);
  assert.match(rendered.home,/aria-label="健康航程，回到首頁"/);
  const page = readFileSync('app/page.tsx','utf8');
  assert.equal((page.match(/<TaskCalendar\b/g) ?? []).length,1);
  const history = page.slice(page.indexOf("{view === 'history' &&"), page.indexOf("{view === 'account' &&"));
  assert.doesNotMatch(history, /<TaskCalendar|<HomeLeaderboard/);
});
test('profile trigger is a labelled menu and secondary routes remain reachable',()=>{
  assert.match(rendered.menu,/aria-haspopup="menu"/);
  assert.match(rendered.menu,/個人選單：測試暱稱/);
  const source = readFileSync('components/profile-menu.tsx','utf8');
  for(const view of ['today','history','account','admin']) assert.ok(source.includes(`onNavigate('${view}')`));
  assert.match(source,/DropdownMenuContent/);
});
test('home ranking keeps voluntary participation and only exposes nickname and steps',()=>{
  assert.doesNotMatch(rendered.rank(false),/我的測試暱稱/);
  assert.match(rendered.rank(true),/我的測試暱稱/);
  assert.match(rendered.rank(true),/4,816/);
  assert.match(rendered.rank(false),/示範榜單/);
});
