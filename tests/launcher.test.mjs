import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const deployedRoot = new URL('https://example.test/number-game/');

function readPage(url) {
  const path = url.pathname.slice(deployedRoot.pathname.length);
  return readFileSync(new URL(path || 'index.html', root), 'utf8');
}

test('the installed app opens the launcher under the project path', () => {
  const launcher = readPage(deployedRoot);
  const [, manifestLink] = launcher.match(/<link rel="manifest" href="([^"]+)"/);
  const manifestUrl = new URL(manifestLink, deployedRoot);
  const manifest = JSON.parse(readPage(manifestUrl));

  assert.equal(new URL(manifest.start_url, manifestUrl).href, deployedRoot.href);
  assert.equal(new URL(manifest.scope, manifestUrl).href, deployedRoot.href);
  assert.ok(launcher.includes(`name="apple-mobile-web-app-title" content="${manifest.short_name}"`));
});

test('the three game cards open their own pages and each game links back to the launcher', () => {
  const launcher = readPage(deployedRoot);
  const choices = [...launcher.matchAll(/<a class="game-choice [^"]+" href="([^"]+)"/g)]
    .map(([, href]) => new URL(href, deployedRoot).href);
  const games = [
    { path: 'town.html', entry: './game.js', backClass: 'town-menu-link' },
    { path: 'words.html', entry: './word-game.js', backClass: 'back-link' },
    { path: 'doll-park/', entry: './main.js', backClass: 'park-home' },
  ];

  assert.equal(choices.length, games.length);
  for (const { path, entry, backClass } of games) {
    const gameUrl = new URL(path, deployedRoot);
    assert.ok(choices.includes(gameUrl.href), path);
    const pageUrl = path.endsWith('/') ? new URL('index.html', gameUrl) : gameUrl;
    const page = readPage(pageUrl);
    assert.ok(page.includes(`src="${entry}"`), path);
    assert.ok(readPage(new URL(entry, gameUrl)).length > 0, entry);
    const backLink = [...page.matchAll(/<a\s[^>]*>/g)]
      .find(([tag]) => tag.match(/\bclass="([^"]+)"/)?.[1].split(/\s+/).includes(backClass));
    assert.ok(backLink, path);
    const [, href] = backLink[0].match(/\bhref="([^"]+)"/);
    assert.equal(new URL(href, gameUrl).href, deployedRoot.href);
  }
});
