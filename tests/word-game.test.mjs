import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mountWordGame, shuffleDeck } from '../word-game.js';
import { WORDS } from '../word-vocabulary.js';

test('every round contains 100 unique words without a repeat across the boundary', () => {
  assert.equal(WORDS.length, 100);
  assert.equal(new Set(WORDS.map(word => word.english)).size, 100);
  const random = () => 0;
  const first = shuffleDeck(WORDS, undefined, random);
  const previousWord = first.at(-1);
  const second = shuffleDeck(WORDS, previousWord, random);
  assert.deepEqual(new Set(first), new Set(WORDS));
  assert.deepEqual(new Set(second), new Set(WORDS));
  assert.notEqual(second[0], previousWord);
  assert.notEqual(shuffleDeck(WORDS, first[0], random)[0], first[0]);
});

test('each card ships with a distinct local illustration and pronunciation clip', () => {
  const fingerprints = new Set();
  const illustrations = new Set();
  for (const word of WORDS) {
    assert.match(word.korean, /[가-힣]/, word.english);
    assert.equal(word.image, `./images/words/${word.english.replaceAll(' ', '-')}.webp`);
    const picture = readFileSync(new URL('../' + word.image, import.meta.url));
    assert.equal(picture.toString('ascii', 0, 4), 'RIFF', word.english);
    assert.equal(picture.toString('ascii', 8, 12), 'WEBP', word.english);
    assert.equal(picture.readUInt32LE(4) + 8, picture.length, word.english);
    illustrations.add(createHash('sha256').update(picture).digest('hex'));
    const clip = readFileSync(new URL('../' + word.audio, import.meta.url));
    assert.equal(clip.subarray(0, 3).toString(), 'ID3', word.english);
    assert.ok(clip.length > 2_000, word.english);
    fingerprints.add(createHash('sha256').update(clip).digest('hex'));
  }
  assert.equal(fingerprints.size, WORDS.length);
  assert.equal(illustrations.size, WORDS.length);
});

function setup() {
  const elements = new Map();
  const audio = [];
  const host = new EventTarget();
  const doc = new EventTarget();
  doc.getElementById = id => {
    if (!elements.has(id)) elements.set(id, new EventTarget());
    return elements.get(id);
  };
  host.Audio = class {
    constructor() {
      this.currentTime = 0;
      this.playRequests = [];
      audio.push(this);
    }
    load() {
      this.loadedSource = this.src;
    }
    play() {
      return new Promise((resolve, reject) => {
        this.playRequests.push({ resolve, reject });
      });
    }
    pause() {
      this.paused = true;
    }
    removeAttribute(name) {
      delete this[name];
    }
  };
  mountWordGame(doc, host);
  const element = name => doc.getElementById(`word-${name}`);
  return {
    audio, doc, element, host,
    click: name => element(name).dispatchEvent(new Event('click')),
  };
}

test('the current word preloads without playback and first tap reuses its clip', () => {
  const { audio, click, element } = setup();
  const word = WORDS.find(entry => entry.english === element('english').textContent);
  assert.equal(audio.length, 1);
  assert.equal(audio[0].preload, 'auto');
  assert.equal(audio[0].loadedSource, word.audio);
  assert.equal(audio[0].playRequests.length, 0);
  click('card');
  assert.equal(audio.length, 1);
  assert.equal(audio[0].playRequests.length, 1);
  click('next');
  const next = WORDS.find(entry => entry.english === element('english').textContent);
  assert.equal(audio.length, 2);
  assert.equal(audio[0].src, undefined);
  assert.equal(audio[1].loadedSource, next.audio);
  assert.equal(audio[1].playRequests.length, 0);
});

test('rapid replays, advancing and exiting stop audio and suppress stale failures', async () => {
  const { audio, click, element, host } = setup();
  assert.equal(element('progress').textContent, '1 / 100');
  assert.equal(element('card').disabled, false);
  assert.equal(element('next').disabled, false);
  const firstWord = element('english').textContent;
  click('card');
  audio[0].currentTime = 0.5;
  click('card');
  assert.equal(audio[0].currentTime, 0);
  assert.equal(audio[0].paused, true);
  audio[0].playRequests[0].reject(Error('stale'));
  await Promise.resolve();
  assert.equal(element('status').textContent, '');

  click('next');
  assert.equal(audio[0].paused, true);
  assert.notEqual(element('english').textContent, firstWord);
  assert.equal(element('progress').textContent, '2 / 100');
  assert.match(element('announcement').textContent, /[가-힣]/);
  click('card');
  const source = audio[1].src;
  host.dispatchEvent(new Event('pagehide'));
  assert.equal(audio[1].paused, true);
  assert.equal(audio[1].src, undefined);
  host.dispatchEvent(new Event('pageshow'));
  assert.equal(audio[2].loadedSource, source);
  assert.equal(audio[2].playRequests.length, 0);
});

test('the next button completes and restarts a round', () => {
  const { click, element } = setup();
  const words = new Set([element('english').textContent]);
  for (let index = 1; index < WORDS.length; index++) {
    click('next');
    words.add(element('english').textContent);
  }
  assert.equal(words.size, WORDS.length);
  assert.equal(element('progress').textContent, '100 / 100');
  const lastWord = element('english').textContent;
  click('next');
  assert.notEqual(element('english').textContent, lastWord);
  assert.equal(element('progress').textContent, '1 / 100');
});

test('fallback selects an on-device English voice and reports failures once', async () => {
  const { audio, click, element, host } = setup();
  const english = { lang: 'en-US', localService: true };
  const remote = { lang: 'en-US', localService: false };
  const korean = { lang: 'ko-KR', localService: true };
  let spoken;
  let cancelled = false;
  host.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  host.speechSynthesis = {
    getVoices: () => [korean, remote, english],
    speak(utterance) { spoken = utterance; },
    cancel() { cancelled = true; },
  };

  click('card');
  const mediaFailure = audio[0].onerror;
  mediaFailure();
  const firstUtterance = spoken;
  audio[0].playRequests[0].reject(Error('media failed'));
  await Promise.resolve();
  assert.equal(audio[0].paused, true);
  assert.equal(spoken, firstUtterance);
  assert.equal(spoken.voice, english);
  assert.equal(spoken.text, element('english').textContent);

  spoken.onerror();
  assert.match(element('status').textContent, /발음/);
  click('next');
  assert.equal(cancelled, true);
  assert.equal(element('status').textContent, '');
});
